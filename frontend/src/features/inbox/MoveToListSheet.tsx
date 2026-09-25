import { useMemo, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useListsStore } from '../../state/listsStore';
import type { ListItem } from '../../types/domain';

interface MoveToListSheetProps {
  item: ListItem | null;
  onClose: () => void;
  onMoved: (item: ListItem) => void;
}

/** Item vira sugestão pronta ao montar lista de Casa (§4) — aqui como ação
 * explícita "mover para" enquanto o catálogo completo de sugestões não
 * está no escopo desta passada. */
export function MoveToListSheet({ item, onClose, onMoved }: MoveToListSheetProps) {
  const allLists = useListsStore((s) => s.lists);
  const lists = useMemo(() => allLists.filter((l) => l.folder === 'casa'), [allLists]);
  const moveInboxItemToList = useListsStore((s) => s.moveInboxItemToList);
  const createList = useListsStore((s) => s.createList);
  const [newTitle, setNewTitle] = useState('');

  if (!item) return null;

  const moveTo = async (listId: string) => {
    await moveInboxItemToList(item, listId);
    onMoved(item);
    onClose();
  };

  const createAndMove = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const created = await createList('casa', trimmed);
    if (created) await moveTo(created.id);
  };

  return (
    <BottomSheet open={!!item} onClose={onClose}>
      <div className="px-4 pb-4 pt-3">
        <p className="mb-3 text-sm font-medium text-[var(--color-text)]">Mover “{item.name}” para</p>
        <ul className="mb-3 max-h-64 overflow-y-auto">
          {lists.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => void moveTo(l.id)}
                className="flex min-h-[44px] w-full items-center rounded-[var(--radius-sm)] px-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
              >
                {l.title}
              </button>
            </li>
          ))}
          {lists.length === 0 && (
            <li className="px-2 py-2 text-sm text-[var(--color-text-muted)]">
              Nenhuma lista em Casa ainda.
            </li>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ou crie uma lista nova"
            className="min-h-[44px] flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={() => void createAndMove()}
            disabled={!newTitle.trim()}
            className="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 font-medium text-[var(--color-accent-fg)] disabled:opacity-40"
          >
            Criar
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
