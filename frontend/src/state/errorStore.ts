import { uuid } from '../utils/id';
import { create } from 'zustand';
import { describeError, type DescribedError } from '../lib/errors/describe';

/*
 * Registro central de erros. Regra do produto: nenhum erro some em
 * silêncio nem vira mensagem genérica — tudo passa por `reportError`,
 * que mostra causa provável + detalhes técnicos copiáveis e guarda um
 * histórico (Ajustes > Registro de erros).
 */

export interface ReportedError extends DescribedError {
  id: string;
  signature: string;
  context: string;
  count: number;
  firstAt: string;
  lastAt: string;
  dismissedAt: number | null;
  /** false = já exibido inline num formulário; não repete no banner global. */
  banner: boolean;
}

const STORAGE_KEY = 'gastei:errors';
const MAX_KEPT = 50;
const RESHOW_AFTER_MS = 5 * 60 * 1000;

function load(): ReportedError[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ReportedError[];
  } catch {
    return [];
  }
}

function persist(items: ReportedError[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_KEPT)));
  } catch {
    // sem localStorage — segue só em memória
  }
}

interface ErrorState {
  items: ReportedError[];
  report: (err: unknown, context: string, opts?: { banner?: boolean }) => DescribedError;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useErrorStore = create<ErrorState>((set, get) => ({
  items: load(),

  report: (err, context, opts) => {
    const described = describeError(err, context);
    const signature = `${context}|${described.title}|${described.technical.split('\n').find((l) => l.startsWith('Erro do navegador') || l.startsWith('Mensagem')) ?? ''}`;
    const now = new Date().toISOString();
    const existing = get().items.find((e) => e.signature === signature);

    let items: ReportedError[];
    if (existing) {
      const stale = existing.dismissedAt !== null && Date.now() - existing.dismissedAt > RESHOW_AFTER_MS;
      items = [
        { ...existing, ...described, count: existing.count + 1, lastAt: now, dismissedAt: stale ? null : existing.dismissedAt },
        ...get().items.filter((e) => e.id !== existing.id),
      ];
    } else {
      items = [
        {
          ...described,
          id: uuid(),
          signature,
          context,
          count: 1,
          firstAt: now,
          lastAt: now,
          dismissedAt: null,
          banner: opts?.banner ?? true,
        },
        ...get().items,
      ];
    }
    items = items.slice(0, MAX_KEPT);
    persist(items);
    set({ items });
    console.error(`[gastei] ${described.title}\n${described.technical}`);
    return described;
  },

  dismiss: (id) => {
    const items = get().items.map((e) => (e.id === id ? { ...e, dismissedAt: Date.now() } : e));
    persist(items);
    set({ items });
  },

  clear: () => {
    persist([]);
    set({ items: [] });
  },
}));

/** Atalho para código fora de componentes React. */
export function reportError(err: unknown, context: string, opts?: { banner?: boolean }): DescribedError {
  return useErrorStore.getState().report(err, context, opts);
}
