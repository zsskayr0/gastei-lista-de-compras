import { useMemo, useState } from 'react';
import { Trash2, FolderInput, Pencil } from 'lucide-react';
import { useListsStore, EMPTY_ITEMS } from '../../state/listsStore';
import { useListSync } from '../../hooks/useListSync';
import { useMembersStore } from '../../state/membersStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { InitialAvatar } from '../../components/ui/InitialAvatar';
import { IconButton } from '../../components/ui/IconButton';
import { TextInputSheet } from '../../components/ui/TextInputSheet';
import { normalizeText } from '../../utils/text';
import { pickVoice } from '../../content/voice';
import { showUndoSnackbar } from '../../state/snackbarStore';
import { cascadeStyle } from '../../utils/cascade';
import { MoveToListSheet } from './MoveToListSheet';
import type { ListItem } from '../../types/domain';

interface Group {
  key: string;
  items: ListItem[];
}

export function InboxPage() {
  const inbox = useListsStore((s) => s.inboxList());
  const items = useListsStore((s) => (inbox ? s.itemsFor(inbox.id) : EMPTY_ITEMS));
  useListSync(inbox?.id, inbox?.familyId);
  const softDeleteItem = useListsStore((s) => s.softDeleteItem);
  const restoreItem = useListsStore((s) => s.restoreItem);
  const renameItem = useListsStore((s) => s.renameItem);
  const [movingItem, setMovingItem] = useState<ListItem | null>(null);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const nameFor = useMembersStore((s) => s.nameFor);
  const emptyMessage = useMemo(() => pickVoice('inboxEmpty'), [items.length === 0]);

  // Duplicatas se agrupam visualmente com selo "2×" (§7) — sem apagar registro.
  const groups: Group[] = useMemo(() => {
    const byKey = new Map<string, ListItem[]>();
    for (const item of items) {
      const key = normalizeText(item.name);
      byKey.set(key, [...(byKey.get(key) ?? []), item]);
    }
    return [...byKey.entries()].map(([key, items]) => ({ key, items }));
  }, [items]);

  if (!inbox || groups.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="pb-4">
      <h1 className="font-display px-4 pb-2 pt-4 text-2xl font-semibold">Inbox</h1>
      <ul>
        {groups.map((group, index) => {
          const first = group.items[0];
          return (
            <li
              key={group.key}
              style={cascadeStyle(index)}
              className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3"
            >
              <div className="flex flex-1 items-center gap-2">
                <span className="text-[15px] text-[var(--color-text)]">{first.name}</span>
                {group.items.length > 1 && (
                  <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    {group.items.length}×
                  </span>
                )}
              </div>
              <div className="flex -space-x-1.5">
                {group.items.slice(0, 3).map((it) => (
                  <InitialAvatar
                    key={it.id}
                    name={nameFor(it.addedByUserId)}
                    userId={it.addedByUserId}
                    size={22}
                  />
                ))}
              </div>
              <IconButton label="Renomear" onClick={() => setEditingItem(first)}>
                <Pencil size={18} />
              </IconButton>
              <IconButton label="Mover para lista" onClick={() => setMovingItem(first)}>
                <FolderInput size={18} />
              </IconButton>
              <IconButton
                label="Remover"
                onClick={() => {
                  void softDeleteItem(first);
                  showUndoSnackbar('Item removido do Inbox.', () => void restoreItem(first), {
                    key: 'inbox-removed',
                    plural: (n) => `${n} itens removidos do Inbox.`,
                  });
                }}
              >
                <Trash2 size={18} />
              </IconButton>
            </li>
          );
        })}
      </ul>

      <MoveToListSheet
        item={movingItem}
        onClose={() => setMovingItem(null)}
        onMoved={(item) => {
          showUndoSnackbar('Item movido para a lista.', () => void restoreItem(item), {
            key: 'inbox-moved',
            plural: (n) => `${n} itens movidos para a lista.`,
          });
        }}
      />

      <TextInputSheet
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Renomear item"
        initialValue={editingItem?.name ?? ''}
        confirmLabel="Salvar"
        onSubmit={(name) => editingItem && void renameItem(editingItem, name)}
      />
    </div>
  );
}
