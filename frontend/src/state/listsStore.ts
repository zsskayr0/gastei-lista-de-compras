import { reportError } from './errorStore';
import { create } from 'zustand';
import { uuid } from '../utils/id';
import { listItemsRepo, listsRepo, syncQueueRepo } from '../lib/storage/repos';
import { enqueueSyncEvent } from '../lib/sync/syncEngine';
import { listsApi } from '../lib/api/endpoints';
import type { CatalogItem, List, ListItem, ListPhase, SyncEvent } from '../types/domain';

/*
 * Fonte da verdade em memória para Inbox + Casa (§4 do FRONTEND.md).
 * Toda mutação segue o mesmo padrão: calcula o novo estado, escreve no
 * IndexedDB, atualiza a store (a UI já reage) e só depois enfileira o
 * SyncEvent — nunca existe um "salvando…" bloqueando o toque (§3).
 */

interface Identity {
  userId: string;
  familyId: string;
  deviceId: string;
}

interface ListsState {
  status: 'idle' | 'loading' | 'ready';
  identity: Identity | null;
  lists: List[];
  itemsByList: Record<string, ListItem[]>;
  creatingListPlaceholderIds: Set<string>;

  init: (identity: Identity) => Promise<void>;
  refreshFromServer: () => Promise<void>;

  inboxList: () => List | undefined;
  corporativoList: () => List | undefined;
  itemsFor: (listId: string) => ListItem[];

  addItem: (
    listId: string,
    name: string,
    opts?: {
      categoryId?: string | null;
      quantityPlanned?: number;
      catalogItemId?: string;
      quantityExpected?: number | null;
      sourceInboxItemId?: string | null;
    },
  ) => Promise<ListItem>;
  addInboxItem: (name: string) => Promise<void>;
  /** Move um item do Inbox pra uma lista de Casa/Corporativo: cria uma
   * cópia lá (ligada por `sourceInboxItemId`) e soft-deleta o original —
   * o backend não tem "reparentar" item entre listas (§4.1 do
   * BACKEND.md), então é recriar + apagar, preservando o vínculo local
   * pra poder devolver depois. */
  moveInboxItemToList: (inboxItem: ListItem, targetListId: string) => Promise<void>;
  /** Cria uma lista de Casa e move todos os itens selecionados do Inbox
   * pra ela de uma vez (§4 do FRONTEND.md: "vira sugestão pronta ao
   * montar lista de Casa e some do Inbox"). */
  buildListFromInbox: (title: string, inboxItems: ListItem[]) => Promise<List | null>;
  /** Tira o item da lista e devolve ao Inbox (ressuscita o original se veio de
   * lá; senão cria um novo). Devolve o item que ficou no Inbox, pro desfazer. */
  returnItemToInbox: (item: ListItem) => Promise<ListItem | null>;
  setQuantity: (item: ListItem, quantityPlanned: number) => Promise<void>;
  renameItem: (item: ListItem, name: string) => Promise<void>;
  /** Define/limpa a observação do item (texto vazio limpa). */
  setNote: (item: ListItem, note: string) => Promise<void>;
  /** Incremento seguro contra duplo toque — resolve o item mais recente
   * pelo id em vez de confiar no `quantityPlanned` capturado no fechamento. */
  incrementItemQuantity: (item: ListItem, delta: number) => Promise<void>;
  toggleChecked: (item: ListItem) => Promise<void>;
  softDeleteItem: (item: ListItem) => Promise<void>;
  restoreItem: (item: ListItem) => Promise<void>;
  /** Desfazer de softDeleteItem — simétrico: se a remoção devolveu o item
   * pro Inbox automaticamente, desfazer precisa esconder de novo o item
   * do Inbox, senão ele fica duplicado (aqui e lá). */
  undoSoftDeleteItem: (item: ListItem) => Promise<void>;

  /** Montar (§6): stepper de um item do catálogo que pode ainda não ter
   * virado ListItem nesta lista. Delta, não valor absoluto — resolve o
   * item existente sempre do estado atual (nunca de um parâmetro
   * capturado no fechamento do clique, ver comentário na implementação).
   * Chega a 0 remove (soft delete); sobe de 0 cria. */
  setCatalogQuantity: (listId: string, catalogItem: CatalogItem, delta: number) => Promise<void>;
  setPhase: (listId: string, phase: ListPhase) => Promise<void>;

  createList: (folder: 'casa' | 'corporativo' | 'inbox', title: string, icon?: string) => Promise<List | null>;
  renameList: (listId: string, title: string) => Promise<void>;
  /** Troca (ou, com `null`, remove) o ícone da lista. Vai por REST — não é campo de sync. */
  setListIcon: (listId: string, icon: string | null) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;

  applyLocalListItemsPatch: (listId: string, items: ListItem[]) => void;
}

function now(): string {
  return new Date().toISOString();
}

// Referência estável para "sem itens" — evita criar um array novo a cada
// chamada do seletor (zustand/useSyncExternalStore compara por referência;
// um array novo a cada render causa loop infinito de re-render).
export const EMPTY_ITEMS: ListItem[] = [];

function baseEvent(identity: Identity, listId: string, partial: Omit<SyncEvent, keyof Identity | 'listId' | 'status' | 'attempts' | 'actorDeviceId' | 'clientTimestamp'>): SyncEvent {
  return {
    ...partial,
    listId,
    actorDeviceId: identity.deviceId,
    clientTimestamp: now(),
    status: 'pending',
    attempts: 0,
  };
}

export const useListsStore = create<ListsState>((set, get) => ({
  status: 'idle',
  identity: null,
  lists: [],
  itemsByList: {},
  creatingListPlaceholderIds: new Set(),

  init: async (identity) => {
    set({ status: 'loading', identity });

    // 1) Pintura instantânea a partir do local — nunca espera rede (§2).
    const localLists = await listsRepo.all();
    const itemsByList: Record<string, ListItem[]> = {};
    for (const list of localLists) {
      itemsByList[list.id] = await listItemsRepo.byList(list.id);
    }
    set({ lists: localLists, itemsByList, status: 'ready' });

    // 2) Atualização em segundo plano.
    void get().refreshFromServer();
  },

  refreshFromServer: async () => {
    const { identity } = get();
    if (!identity) return;
    try {
      const remoteLists = await listsApi.listForFamily(identity.familyId);
      await listsRepo.putMany(remoteLists.map(({ items: _items, ...l }) => l));

      const itemsByList = { ...get().itemsByList };
      for (const remote of remoteLists) {
        const currentLocal = itemsByList[remote.id] ?? [];
        // O servidor não conhece `sourceInboxItemId` (é campo só local,
        // nunca sincronizado) — sem isso, cada refresh apagaria o vínculo
        // e o item nunca mais voltaria pro Inbox ao excluir a lista.
        const activeItems = remote.items
          .filter((i) => !i.deletedAt)
          .map((ri) => {
            const local = currentLocal.find((li) => li.id === ri.id);
            return local?.sourceInboxItemId ? { ...ri, sourceInboxItemId: local.sourceInboxItemId } : ri;
          });
        await listItemsRepo.putMany(activeItems);
        // Só preserva item local que o servidor ainda não confirmou (criado
        // offline, pendente na fila) — um item já excluído localmente nunca
        // deveria "voltar" só porque o servidor também não o lista mais.
        // Item que o servidor não lista e que não tem nada na fila foi
        // excluído em outro dispositivo — descarta (senão a exclusão remota
        // nunca chega).
        const queued = await syncQueueRepo.queuedEntityIds();
        const notOnServer = currentLocal.filter((li) => !li.deletedAt && !activeItems.some((ri) => ri.id === li.id));
        const localOnly = notOnServer.filter((li) => queued.has(li.id));
        for (const gone of notOnServer.filter((li) => !queued.has(li.id))) {
          await listItemsRepo.put({ ...gone, deletedAt: now() });
        }
        itemsByList[remote.id] = [...activeItems, ...localOnly];
      }

      set({ lists: remoteLists.map(({ items: _items, ...l }) => l), itemsByList });

      // Garante que existe um Inbox — lazy, criado uma única vez por família.
      if (!remoteLists.some((l) => l.folder === 'inbox')) {
        await listsApi.create({ familyId: identity.familyId, folder: 'inbox', title: 'Inbox' });
        void get().refreshFromServer();
      }
    } catch (err) {
      // A tela já está pintada com o que existe localmente; a causa fica registrada.
      reportError(err, 'Atualizar listas a partir do servidor');
    }
  },

  inboxList: () => get().lists.find((l) => l.folder === 'inbox'),
  corporativoList: () => get().lists.find((l) => l.folder === 'corporativo' && l.status === 'active'),
  itemsFor: (listId) => get().itemsByList[listId] ?? EMPTY_ITEMS,

  applyLocalListItemsPatch: (listId, items) => {
    set((s) => ({ itemsByList: { ...s.itemsByList, [listId]: items } }));
  },

  addItem: async (listId, name, opts) => {
    const { identity } = get();
    if (!identity) throw new Error('sem sessão');

    const item: ListItem = {
      id: uuid(),
      listId,
      catalogItemId: opts?.catalogItemId ?? null,
      name,
      categoryId: opts?.categoryId ?? null,
      quantityExpected: opts?.quantityExpected ?? null,
      quantityPlanned: opts?.quantityPlanned ?? 1,
      quantityBought: null,
      state: 'pending',
      isCarryover: false,
      addedByUserId: identity.userId,
      addedAt: now(),
      checkedByUserId: null,
      checkedAt: null,
      lastModifiedByUserId: identity.userId,
      lastModifiedAt: now(),
      lastModifiedField: '__create__',
      deletedAt: null,
      sourceInboxItemId: opts?.sourceInboxItemId ?? null,
    };

    // `set` acontece ANTES do primeiro `await` de propósito: dois toques
    // rápidos disparam duas chamadas desta função em sequência, cada uma
    // rodando até seu primeiro `await` antes da próxima começar — se o
    // estado em memória só fosse atualizado depois de um `await`, a
    // segunda chamada ainda veria o item como inexistente e criaria um
    // duplicado (foi exatamente o bug observado no Montar do Corporativo).
    set((s) => ({
      itemsByList: { ...s.itemsByList, [listId]: [...(s.itemsByList[listId] ?? []), item] },
    }));
    await listItemsRepo.put(item);

    await enqueueSyncEvent(
      baseEvent(identity, listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: '__create__',
        value: {
          name: item.name,
          categoryId: item.categoryId,
          catalogItemId: item.catalogItemId,
          quantityPlanned: item.quantityPlanned,
          quantityExpected: item.quantityExpected,
        },
      }),
    );

    return item;
  },

  addInboxItem: async (name) => {
    let inbox = get().inboxList();
    if (!inbox) {
      // Ainda não sincronizou o Inbox lazy do servidor — cria já para não
      // travar o primeiro toque do primeiro uso.
      const created = await get().createList('inbox', 'Inbox');
      inbox = created ?? undefined;
    }
    if (!inbox) return;
    await get().addItem(inbox.id, name);
  },

  moveInboxItemToList: async (inboxItem, targetListId) => {
    await get().addItem(targetListId, inboxItem.name, {
      categoryId: inboxItem.categoryId,
      quantityPlanned: inboxItem.quantityPlanned,
      sourceInboxItemId: inboxItem.id,
    });
    await get().softDeleteItem(inboxItem);
  },

  returnItemToInbox: async (item) => {
    const source = item.sourceInboxItemId ? await listItemsRepo.get(item.sourceInboxItemId) : undefined;
    let back: ListItem | null = null;

    if (source?.deletedAt) {
      await get().restoreItem(source);
      back = get().itemsFor(source.listId).find((i) => i.id === source.id) ?? source;
    } else {
      let inbox = get().inboxList();
      if (!inbox) inbox = (await get().createList('inbox', 'Inbox')) ?? undefined;
      if (!inbox) return null;
      back = await get().addItem(inbox.id, item.name, {
        categoryId: item.categoryId,
        quantityPlanned: item.quantityPlanned,
      });
    }

    await get().softDeleteItem(item);
    return back;
  },

  buildListFromInbox: async (title, inboxItems) => {
    const created = await get().createList('casa', title);
    if (!created) return null;
    for (const item of inboxItems) {
      await get().moveInboxItemToList(item, created.id);
    }
    return created;
  },

  setQuantity: async (item, quantityPlanned) => {
    const { identity } = get();
    if (!identity) return;
    const updated: ListItem = {
      ...item,
      quantityPlanned,
      lastModifiedByUserId: identity.userId,
      lastModifiedAt: now(),
      lastModifiedField: 'quantityPlanned',
    };
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [item.listId]: (s.itemsByList[item.listId] ?? []).map((i) => (i.id === item.id ? updated : i)),
      },
    }));
    await listItemsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, item.listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: 'quantityPlanned',
        value: quantityPlanned,
      }),
    );
  },

  renameItem: async (item, name) => {
    const { identity } = get();
    if (!identity) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === item.name) return;
    const updated: ListItem = {
      ...item,
      name: trimmed,
      lastModifiedByUserId: identity.userId,
      lastModifiedAt: now(),
      lastModifiedField: 'name',
    };
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [item.listId]: (s.itemsByList[item.listId] ?? []).map((i) => (i.id === item.id ? updated : i)),
      },
    }));
    await listItemsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, item.listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: 'name',
        value: trimmed,
      }),
    );
  },

  setNote: async (item, note) => {
    const { identity } = get();
    if (!identity) return;
    const trimmed = note.trim().slice(0, 200);
    const current = (get().itemsByList[item.listId] ?? []).find((i) => i.id === item.id) ?? item;
    if (trimmed === (current.note ?? '')) return;
    const updated: ListItem = {
      ...current,
      note: trimmed || null,
      lastModifiedByUserId: identity.userId,
      lastModifiedAt: now(),
      lastModifiedField: 'note',
    };
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [item.listId]: (s.itemsByList[item.listId] ?? []).map((i) => (i.id === item.id ? updated : i)),
      },
    }));
    await listItemsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, item.listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: 'note',
        value: trimmed || null,
      }),
    );
  },

  toggleChecked: async (item) => {
    const { identity } = get();
    if (!identity) return;
    const nextState = item.state === 'checked' ? 'pending' : 'checked';
    const updated: ListItem = {
      ...item,
      state: nextState,
      checkedByUserId: nextState === 'checked' ? identity.userId : null,
      checkedAt: nextState === 'checked' ? now() : null,
      lastModifiedByUserId: identity.userId,
      lastModifiedAt: now(),
      lastModifiedField: 'state',
    };
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [item.listId]: (s.itemsByList[item.listId] ?? []).map((i) => (i.id === item.id ? updated : i)),
      },
    }));
    await listItemsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, item.listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: 'state',
        value: nextState,
      }),
    );
  },

  softDeleteItem: async (item) => {
    const { identity } = get();
    if (!identity) return;
    const updated: ListItem = { ...item, deletedAt: now() };
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [item.listId]: (s.itemsByList[item.listId] ?? []).filter((i) => i.id !== item.id),
      },
    }));
    await listItemsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, item.listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: 'deletedAt',
        value: true,
      }),
    );

    // Veio do Inbox e ninguém riscou ainda — devolve (§4 do FRONTEND.md:
    // "se removido da lista, volta"). Se já foi comprado, fica comprado —
    // não faz sentido reaparecer no Inbox como pendência.
    if (item.sourceInboxItemId && item.state !== 'checked') {
      const source = await listItemsRepo.get(item.sourceInboxItemId);
      if (source?.deletedAt) await get().restoreItem(source);
    }
  },

  undoSoftDeleteItem: async (item) => {
    await get().restoreItem(item);
    // Espelha a devolução automática do softDeleteItem: se ela reapareceu
    // no Inbox, esconde de novo — senão o item fica duplicado nos dois
    // lugares depois do desfazer.
    if (item.sourceInboxItemId && item.state !== 'checked') {
      const source = await listItemsRepo.get(item.sourceInboxItemId);
      if (source && !source.deletedAt) await get().softDeleteItem(source);
    }
  },

  restoreItem: async (item) => {
    const { identity } = get();
    if (!identity) return;
    const updated: ListItem = { ...item, deletedAt: null };
    set((s) => ({
      itemsByList: {
        ...s.itemsByList,
        [item.listId]: [...(s.itemsByList[item.listId] ?? []), updated],
      },
    }));
    await listItemsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, item.listId, {
        id: uuid(),
        entityType: 'list_item',
        entityId: item.id,
        field: 'deletedAt',
        value: false,
      }),
    );
  },

  setCatalogQuantity: async (listId, catalogItem, delta) => {
    // Nunca recebe o item existente por parâmetro — um valor capturado no
    // fechamento do clique fica velho entre dois toques rápidos. Resolve
    // sempre a partir do estado mais atual, e essa decisão roda inteira
    // antes de qualquer `await`, então o segundo clique de um duplo toque
    // já enxerga o efeito do primeiro.
    const current = get().itemsByList[listId] ?? [];
    const existing = current.find((i) => i.catalogItemId === catalogItem.id);
    const nextQty = (existing?.quantityPlanned ?? 0) + delta;

    if (nextQty <= 0) {
      if (existing) await get().softDeleteItem(existing);
      return;
    }
    if (existing) {
      await get().setQuantity(existing, nextQty);
      return;
    }
    await get().addItem(listId, catalogItem.name, {
      categoryId: catalogItem.categoryId,
      catalogItemId: catalogItem.id,
      quantityExpected: catalogItem.expectedQuantity,
      quantityPlanned: nextQty,
    });
  },

  incrementItemQuantity: async (item, delta) => {
    const current = (get().itemsByList[item.listId] ?? []).find((i) => i.id === item.id) ?? item;
    const nextQty = Math.max(1, current.quantityPlanned + delta);
    await get().setQuantity(current, nextQty);
  },

  setPhase: async (listId, phase) => {
    const list = get().lists.find((l) => l.id === listId);
    if (!list) return;
    const optimistic: List = {
      ...list,
      phase,
      purchasePhaseStartedAt: phase === 'comprar' ? now() : list.purchasePhaseStartedAt,
    };
    await listsRepo.put(optimistic);
    set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? optimistic : l)) }));
    try {
      // Fase é campo de controle do servidor (timer de 24h, encerramento) —
      // vai por PATCH direto, não pela fila de sync (BACKEND.md §4.2: só
      // "title" é sincronizável por list via SyncEvent).
      const updated = await listsApi.update(listId, { phase });
      await listsRepo.put(updated);
      set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
    } catch (err) {
      reportError(err, `Trocar fase da lista para "${phase}" (fica só neste aparelho até conseguir)`);
    }
  },

  createList: async (folder, title, icon) => {
    const { identity } = get();
    if (!identity) return null;
    try {
      const created = await listsApi.create({ familyId: identity.familyId, folder, title, icon });
      await listsRepo.put(created);
      set((s) => ({ lists: [...s.lists, created], itemsByList: { ...s.itemsByList, [created.id]: [] } }));
      return created;
    } catch (err) {
      reportError(err, `Criar lista "${title}"`);
      return null;
    }
  },

  setListIcon: async (listId, icon) => {
    const list = get().lists.find((l) => l.id === listId);
    if (!list) return;
    const updated: List = { ...list, icon };
    set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
    await listsRepo.put(updated);
    try {
      await listsApi.update(listId, { icon: icon ?? '' });
    } catch (err) {
      reportError(err, 'Trocar ícone da lista');
    }
  },

  renameList: async (listId, title) => {
    const { identity } = get();
    const list = get().lists.find((l) => l.id === listId);
    if (!identity || !list) return;
    const updated: List = { ...list, title };
    set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
    await listsRepo.put(updated);
    await enqueueSyncEvent(
      baseEvent(identity, listId, {
        id: uuid(),
        entityType: 'list',
        entityId: listId,
        field: 'title',
        value: title,
      }),
    );
  },

  deleteList: async (listId) => {
    const { identity } = get();
    if (!identity) return;

    // Antes de apagar a lista: todo item que veio do Inbox e ainda não foi
    // riscado volta pra lá — excluir a lista não pode fazer a pendência
    // sumir sem querer (§4 do FRONTEND.md).
    const itemsToRestore = get()
      .itemsFor(listId)
      .filter((i) => i.sourceInboxItemId && i.state !== 'checked');
    for (const item of itemsToRestore) {
      const source = await listItemsRepo.get(item.sourceInboxItemId!);
      if (source?.deletedAt) await get().restoreItem(source);
    }

    set((s) => ({
      lists: s.lists.filter((l) => l.id !== listId),
      itemsByList: Object.fromEntries(Object.entries(s.itemsByList).filter(([id]) => id !== listId)),
    }));
    await listsRepo.remove(listId);
    try {
      await listsApi.softDelete(listId);
    } catch (err) {
      reportError(err, 'Excluir lista no servidor (já saiu daqui, mas o servidor ainda a mantém)');
    }
  },
}));
