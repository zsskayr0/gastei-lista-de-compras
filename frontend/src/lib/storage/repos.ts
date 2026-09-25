import { getDb } from './db';
import type {
  AuthSession,
  CatalogItem,
  Category,
  DictionaryTerm,
  List,
  ListItem,
  SyncEvent,
} from '../../types/domain';

export const sessionRepo = {
  async get(): Promise<AuthSession | undefined> {
    const db = await getDb();
    return db.get('session', 'current');
  },
  async set(session: AuthSession): Promise<void> {
    const db = await getDb();
    await db.put('session', session, 'current');
  },
  async clear(): Promise<void> {
    const db = await getDb();
    await db.delete('session', 'current');
  },
};

export const listsRepo = {
  async all(): Promise<List[]> {
    const db = await getDb();
    return db.getAll('lists');
  },
  async byFolder(folder: string): Promise<List[]> {
    const db = await getDb();
    return db.getAllFromIndex('lists', 'by-folder', folder);
  },
  async get(id: string): Promise<List | undefined> {
    const db = await getDb();
    return db.get('lists', id);
  },
  async put(list: List): Promise<void> {
    const db = await getDb();
    await db.put('lists', list);
  },
  async putMany(lists: List[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('lists', 'readwrite');
    await Promise.all([...lists.map((l) => tx.store.put(l)), tx.done]);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('lists', id);
  },
};

export const listItemsRepo = {
  async byList(listId: string): Promise<ListItem[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex('listItems', 'by-list', listId);
    // Excluídos (soft delete otimista ou já confirmado pelo servidor) nunca
    // aparecem numa leitura de tela — a linha continua no armazenamento
    // (para o desfazer), só não é "ativa" (§7 do FRONTEND.md).
    return all.filter((i) => !i.deletedAt);
  },
  async get(id: string): Promise<ListItem | undefined> {
    const db = await getDb();
    return db.get('listItems', id);
  },
  async put(item: ListItem): Promise<void> {
    const db = await getDb();
    await db.put('listItems', item);
  },
  async putMany(items: ListItem[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('listItems', 'readwrite');
    await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('listItems', id);
  },
};

export const catalogRepo = {
  async byFamily(familyId: string): Promise<CatalogItem[]> {
    const db = await getDb();
    return db.getAllFromIndex('catalogItems', 'by-family', familyId);
  },
  async putMany(items: CatalogItem[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('catalogItems', 'readwrite');
    await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('catalogItems', id);
  },
  /** Espelha o servidor: grava `items` e apaga o que sobrou local da família
   * (item excluído em outro aparelho não pode reaparecer na pintura local). */
  async replaceForFamily(familyId: string, items: CatalogItem[]): Promise<void> {
    const db = await getDb();
    const keep = new Set(items.map((i) => i.id));
    const tx = db.transaction('catalogItems', 'readwrite');
    const stale = (await tx.store.index('by-family').getAllKeys(familyId)).filter((k) => !keep.has(k as string));
    await Promise.all([...items.map((i) => tx.store.put(i)), ...stale.map((k) => tx.store.delete(k)), tx.done]);
  },
};

export const categoriesRepo = {
  async byFamily(familyId: string): Promise<Category[]> {
    const db = await getDb();
    return db.getAllFromIndex('categories', 'by-family', familyId);
  },
  async putMany(items: Category[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('categories', 'readwrite');
    await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('categories', id);
  },
  async replaceForFamily(familyId: string, items: Category[]): Promise<void> {
    const db = await getDb();
    const keep = new Set(items.map((i) => i.id));
    const tx = db.transaction('categories', 'readwrite');
    const stale = (await tx.store.index('by-family').getAllKeys(familyId)).filter((k) => !keep.has(k as string));
    await Promise.all([...items.map((i) => tx.store.put(i)), ...stale.map((k) => tx.store.delete(k)), tx.done]);
  },
};

export const dictionaryRepo = {
  async byFamily(familyId: string): Promise<DictionaryTerm[]> {
    const db = await getDb();
    return db.getAllFromIndex('dictionaryTerms', 'by-family', familyId);
  },
  async putMany(items: DictionaryTerm[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('dictionaryTerms', 'readwrite');
    await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
  },
};

export const syncQueueRepo = {
  async pending(): Promise<SyncEvent[]> {
    const db = await getDb();
    const all = await db.getAll('syncQueue');
    // 'sending' fica de fora — já está em voo, reenviar em paralelo é o que
    // causa a corrida de id duplicado (idempotência é rede de segurança,
    // não licença pra disparar o mesmo evento duas vezes de propósito).
    return all.filter((e) => e.status === 'pending' || e.status === 'failed');
  },
  /** Ids das entidades com qualquer evento ainda na fila (inclui 'sending'). */
  async queuedEntityIds(): Promise<Set<string>> {
    const db = await getDb();
    const all = await db.getAll('syncQueue');
    return new Set(all.map((e) => e.entityId));
  },
  async enqueue(event: SyncEvent): Promise<void> {
    const db = await getDb();
    await db.put('syncQueue', event);
  },
  async update(event: SyncEvent): Promise<void> {
    const db = await getDb();
    await db.put('syncQueue', event);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('syncQueue', id);
  },
  async count(): Promise<number> {
    const db = await getDb();
    return db.count('syncQueue');
  },
};

export const metaRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    const db = await getDb();
    const row = await db.get('meta', key);
    return row?.value as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.put('meta', { key, value });
  },
};
