import { uuid } from '../utils/id';
import { create } from 'zustand';

export interface SnackbarItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone: 'neutral' | 'success';
  durationMs: number;
  /** Notificações com a mesma chave se fundem numa só, com contador. */
  groupKey?: string;
  count?: number;
  /** Texto para `count` ocorrências (a partir de 2). */
  messageFor?: (count: number) => string;
  /** Desfazeres acumulados do grupo — "Desfazer" roda todos. */
  undos?: Array<() => void>;
}

interface SnackbarState {
  items: SnackbarItem[];
  show: (item: Omit<SnackbarItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useSnackbarStore = create<SnackbarState>((set, get) => {
  const schedule = (id: string, ms: number) => {
    const old = timers.get(id);
    if (old) clearTimeout(old);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      }, ms),
    );
  };

  return {
    items: [],
    show: (item) => {
      // Mesmo grupo já na tela: acumula em vez de empilhar outra notificação.
      const existing = item.groupKey ? get().items.find((i) => i.groupKey === item.groupKey) : undefined;
      if (existing) {
        const count = (existing.count ?? 1) + 1;
        const undos = [...(existing.undos ?? []), ...(item.undos ?? [])];
        set((s) => ({
          items: s.items.map((i) =>
            i.id === existing.id
              ? {
                  ...i,
                  count,
                  undos,
                  message: item.messageFor ? item.messageFor(count) : i.message,
                  onAction: () => [...undos].reverse().forEach((fn) => fn()),
                }
              : i,
          ),
        }));
        schedule(existing.id, item.durationMs);
        return;
      }
      const id = uuid();
      set((s) => ({ items: [...s.items, { ...item, id }] }));
      schedule(id, item.durationMs);
    },
    dismiss: (id) => {
      const t = timers.get(id);
      if (t) clearTimeout(t);
      timers.delete(id);
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    },
  };
});

interface UndoGroup {
  key: string;
  /** Texto quando há vários: ex. (n) => `${n} itens removidos.` */
  plural: (count: number) => string;
}

/** Snackbar "Desfazer" — §6 (encerramento) e usado também para exclusões
 * reversíveis no Inbox/Casa. 5–10s, tom neutro (nunca humor em desfazer).
 * Com `group`, ações repetidas somam num único aviso e o desfazer reverte todas. */
export function showUndoSnackbar(message: string, onUndo: () => void, group?: UndoGroup) {
  useSnackbarStore.getState().show({
    message,
    actionLabel: 'Desfazer',
    onAction: onUndo,
    tone: 'neutral',
    durationMs: 7000,
    ...(group ? { groupKey: group.key, count: 1, messageFor: group.plural, undos: [onUndo] } : {}),
  });
}
