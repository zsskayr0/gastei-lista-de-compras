import { reportError } from '../../state/errorStore';
import { syncApi } from '../api/endpoints';
import { listItemsRepo, listsRepo, metaRepo } from '../storage/repos';
import { useListsStore } from '../../state/listsStore';
import type { RemoteSyncEvent } from '../../types/domain';
import type { ListItem } from '../../types/domain';

/*
 * Poll curto para a lista aberta (§4.1 do BACKEND.md: long-poll/WS por
 * família seria o ideal, mas o backend atual expõe pull por lista — poll
 * curto entrega o mesmo resultado prático dentro da meta de 10s do §2 do
 * FRONTEND.md, sem manter conexão persistente).
 *
 * O servidor já resolveu o last-write-wins por campo no momento do push
 * (sync.service.ts applyEvent) — cada evento que chega aqui com
 * `applied=true` é a palavra final para aquele (entidade, campo) até o
 * próximo. O cliente só aplica em ordem, sem recalcular nada.
 */

const POLL_INTERVAL_MS = 1500;

export interface RemoteChangeInfo {
  listId: string;
  checkedEvents: Array<{ itemId: string; actorUserId: string }>;
}

type ChangeListener = (info: RemoteChangeInfo) => void;
const changeListeners = new Set<ChangeListener>();
export function onRemoteChange(listener: ChangeListener): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

async function applyRemoteEvent(ev: RemoteSyncEvent): Promise<{ itemId: string; actorUserId: string } | null> {
  if (!ev.applied) return null;

  if (ev.entityType === 'list_item') {
    if (ev.field === '__create__') {
      const existing = await listItemsRepo.get(ev.entityId);
      if (existing) return null;
      const payload = ev.value as {
        name: string;
        categoryId?: string | null;
        catalogItemId?: string | null;
        quantityPlanned?: number | null;
        quantityExpected?: number | null;
      };
      const item: ListItem = {
        id: ev.entityId,
        listId: ev.listId,
        catalogItemId: payload.catalogItemId ?? null,
        name: payload.name,
        categoryId: payload.categoryId ?? null,
        quantityExpected: payload.quantityExpected ?? null,
        quantityPlanned: payload.quantityPlanned ?? 1,
        quantityBought: null,
        state: 'pending',
        isCarryover: false,
        addedByUserId: ev.actorUserId,
        addedAt: ev.clientTimestamp,
        checkedByUserId: null,
        checkedAt: null,
        lastModifiedByUserId: ev.actorUserId,
        lastModifiedAt: ev.clientTimestamp,
        lastModifiedField: '__create__',
        deletedAt: null,
      };
      await listItemsRepo.put(item);
      return null;
    }

    const current = await listItemsRepo.get(ev.entityId);
    if (!current) return null;

    const updated: ListItem = {
      ...current,
      [ev.field]: ev.value,
      lastModifiedByUserId: ev.actorUserId,
      lastModifiedAt: ev.clientTimestamp,
      lastModifiedField: ev.field,
    };
    if (ev.field === 'state' && ev.value === 'checked') {
      updated.checkedByUserId = ev.actorUserId;
      updated.checkedAt = ev.clientTimestamp;
    }
    if (ev.field === 'state' && ev.value === 'pending') {
      updated.checkedByUserId = null;
      updated.checkedAt = null;
    }
    if (ev.field === 'note') {
      updated.note = typeof ev.value === 'string' ? ev.value.trim() || null : null;
    }
    if (ev.field === 'deletedAt') {
      // O evento carrega um booleano (excluir/restaurar); o item guarda o timestamp.
      updated.deletedAt = ev.value ? ev.clientTimestamp : null;
    }
    await listItemsRepo.put(updated);

    if (ev.field === 'state' && ev.value === 'checked') {
      return { itemId: ev.entityId, actorUserId: ev.actorUserId };
    }
    return null;
  }

  // entityType === 'list' — só `title` é sincronizável por este canal.
  const current = await listsRepo.get(ev.entityId);
  if (!current) return null;
  await listsRepo.put({ ...current, [ev.field]: ev.value });
  return null;
}

const cursorKey = (listId: string) => `syncCursor:${listId}`;

async function pollOnce(listId: string): Promise<void> {
  const since = await metaRepo.get<string>(cursorKey(listId));
  const res = await syncApi.pull(listId, since);
  if (res.events.length > 0) {
    const checkedEvents: Array<{ itemId: string; actorUserId: string }> = [];
    for (const ev of res.events) {
      const result = await applyRemoteEvent(ev);
      if (result) checkedEvents.push(result);
    }
    // Os eventos só foram gravados no armazenamento local; a tela lê o store
    // em memória, então sem isso criações/exclusões remotas só apareciam
    // após recarregar. `byList` já exclui os itens com deletedAt.
    useListsStore.getState().applyLocalListItemsPatch(listId, await listItemsRepo.byList(listId));
    changeListeners.forEach((l) => l({ listId, checkedEvents }));
  }
  await metaRepo.set(cursorKey(listId), res.cursor);
}

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function startPolling(listId: string) {
  if (activeTimers.has(listId)) return;

  const tick = async () => {
    try {
      // Aba/app em segundo plano não precisa martelar o servidor; ao voltar,
      // o listener de visibilitychange abaixo puxa na hora.
      if (!document.hidden) await pollOnce(listId);
    } catch (err) {
      // O banner vermelho de sync continua sendo calculado pelo syncEngine;
      // aqui só garantimos que a causa real fique registrada.
      reportError(err, `Receber mudanças da lista ${listId}`);
    } finally {
      if (activeTimers.has(listId)) {
        activeTimers.set(listId, setTimeout(tick, POLL_INTERVAL_MS));
      }
    }
  };

  activeTimers.set(listId, setTimeout(tick, 0));
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  for (const [listId, timer] of activeTimers) {
    clearTimeout(timer);
    activeTimers.set(listId, setTimeout(() => void restartTick(listId), 0));
  }
});

function restartTick(listId: string) {
  activeTimers.delete(listId);
  startPolling(listId);
}

export function stopPolling(listId: string) {
  const timer = activeTimers.get(listId);
  if (timer) clearTimeout(timer);
  activeTimers.delete(listId);
}
