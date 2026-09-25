import { reportError } from './errorStore';
import { create } from 'zustand';
import { catalogApi, categoriesApi } from '../lib/api/endpoints';
import { catalogRepo, categoriesRepo } from '../lib/storage/repos';
import type { CatalogItem, Category } from '../types/domain';

interface CatalogState {
  status: 'idle' | 'loading' | 'ready';
  items: CatalogItem[];
  categories: Category[];
  init: (familyId: string) => Promise<void>;
  /** Mescla itens devolvidos pelo servidor (criação/edição) no estado e no armazenamento local. */
  upsertItems: (items: CatalogItem[]) => Promise<void>;
  /** Remove um item do catálogo (estado + armazenamento local). */
  removeItem: (id: string) => Promise<void>;
  upsertCategory: (category: Category) => Promise<void>;
  /** Remove a categoria; itens que a usavam passam a `reassignTo` (ou ficam sem). */
  removeCategory: (id: string, reassignTo?: string) => Promise<void>;
  categoryById: (id: string | null) => Category | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  status: 'idle',
  items: [],
  categories: [],

  init: async (familyId) => {
    set({ status: 'loading' });

    // Pintura instantânea a partir do local.
    const [localItems, localCategories] = await Promise.all([
      catalogRepo.byFamily(familyId),
      categoriesRepo.byFamily(familyId),
    ]);
    set({ items: localItems, categories: localCategories, status: 'ready' });

    try {
      const [items, categories] = await Promise.all([
        catalogApi.listForFamily(familyId),
        categoriesApi.listForFamily(familyId),
      ]);
      await Promise.all([
        catalogRepo.replaceForFamily(familyId, items),
        categoriesRepo.replaceForFamily(familyId, categories),
      ]);
      set({ items, categories });
    } catch (err) {
      reportError(err, 'Carregar catálogo e categorias');
    }
  },

  upsertItems: async (incoming) => {
    const byId = new Map(get().items.map((i) => [i.id, i]));
    for (const i of incoming) byId.set(i.id, i);
    const items = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    set({ items });
    await catalogRepo.putMany(incoming);
  },

  removeItem: async (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    await catalogRepo.remove(id);
  },

  upsertCategory: async (category) => {
    set((s) => ({
      categories: [...s.categories.filter((c) => c.id !== category.id), category].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      ),
    }));
    await categoriesRepo.putMany([category]);
  },

  removeCategory: async (id, reassignTo) => {
    const moved = get().items.filter((i) => i.categoryId === id);
    const items = get().items.map((i) => (i.categoryId === id ? { ...i, categoryId: reassignTo ?? null } : i));
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id), items }));
    await categoriesRepo.remove(id);
    await catalogRepo.putMany(items.filter((i) => moved.some((m) => m.id === i.id)));
  },

  categoryById: (id) => (id ? get().categories.find((c) => c.id === id) : undefined),
}));
