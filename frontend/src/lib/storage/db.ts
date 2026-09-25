import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  AuthSession,
  CatalogItem,
  Category,
  DictionaryTerm,
  List,
  ListItem,
  SyncEvent,
} from '../../types/domain';

/*
 * Camada de armazenamento local — a fonte da verdade (§3 do FRONTEND.md).
 * Toda leitura de tela vem daqui; a rede só alimenta em segundo plano.
 * IndexedDB no alvo Web e dentro do WebView do Tauri em Android — mantém
 * a mesma implementação nas duas plataformas (§1: um único código,
 * plataforma trocável). Se um dia isso precisar virar SQLite nativo via
 * Tauri, só este arquivo muda — o resto do app fala com os `repos` abaixo.
 */

interface GasteiDB extends DBSchema {
  session: {
    key: 'current';
    value: AuthSession;
  };
  lists: {
    key: string;
    value: List;
    indexes: { 'by-folder': string; 'by-family': string };
  };
  listItems: {
    key: string;
    value: ListItem;
    indexes: { 'by-list': string };
  };
  catalogItems: {
    key: string;
    value: CatalogItem;
    indexes: { 'by-family': string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-family': string };
  };
  dictionaryTerms: {
    key: string;
    value: DictionaryTerm;
    indexes: { 'by-family': string };
  };
  syncQueue: {
    key: string;
    value: SyncEvent;
    indexes: { 'by-status': string };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<GasteiDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<GasteiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GasteiDB>('gastei', 1, {
      upgrade(db) {
        db.createObjectStore('session');

        const lists = db.createObjectStore('lists', { keyPath: 'id' });
        lists.createIndex('by-folder', 'folder');
        lists.createIndex('by-family', 'familyId');

        const items = db.createObjectStore('listItems', { keyPath: 'id' });
        items.createIndex('by-list', 'listId');

        const catalog = db.createObjectStore('catalogItems', { keyPath: 'id' });
        catalog.createIndex('by-family', 'familyId');

        const categories = db.createObjectStore('categories', { keyPath: 'id' });
        categories.createIndex('by-family', 'familyId');

        const dictionary = db.createObjectStore('dictionaryTerms', { keyPath: 'id' });
        dictionary.createIndex('by-family', 'familyId');

        const queue = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queue.createIndex('by-status', 'status');

        db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

export type { GasteiDB };
