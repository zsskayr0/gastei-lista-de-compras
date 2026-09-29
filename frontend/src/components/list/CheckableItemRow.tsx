import { useState } from 'react';
import { Inbox, Trash2 } from 'lucide-react';
import { useListsStore } from '../../state/listsStore';
import { useMembersStore } from '../../state/membersStore';
import { Stepper } from '../ui/Stepper';
import { IconButton } from '../ui/IconButton';
import { InitialAvatar } from '../ui/InitialAvatar';
import { TextInputSheet } from '../ui/TextInputSheet';
import { showUndoSnackbar } from '../../state/snackbarStore';
import { checkFeedback } from '../../utils/feedback';
import { cascadeStyle } from '../../utils/cascade';
import type { ListItem } from '../../types/domain';

interface CheckableItemRowProps {
  item: ListItem;
  index?: number;
  highlighted?: boolean;
  highlightedBy?: string | null;
  /** Selo de diferença (Corporativo/Montar) — "+2"/"−1", cor neutra (§6). */
  diffBadge?: number | null;
  /** Casa: mostra o botão que tira o item da lista e o devolve ao Inbox. */
  returnToInbox?: boolean;
}

/** Linha de item riscável — usada em Casa e no Comprar do Corporativo
 * (§6, §9): riscar anima transform/opacity, vibra e toca um "tique";
 * tocar de novo devolve à lista ativa. Nunca falha silenciosamente: se
 * outra pessoa riscar quase junto, mostra quem foi. */
export function CheckableItemRow({ item, index = 99, highlighted, highlightedBy, diffBadge, returnToInbox }: CheckableItemRowProps) {
  const toggleChecked = useListsStore((s) => s.toggleChecked);
  const incrementItemQuantity = useListsStore((s) => s.incrementItemQuantity);
  const softDeleteItem = useListsStore((s) => s.softDeleteItem);
  const undoSoftDeleteItem = useListsStore((s) => s.undoSoftDeleteItem);
  const renameItem = useListsStore((s) => s.renameItem);
  const returnItemToInbox = useListsStore((s) => s.returnItemToInbox);
  const nameFor = useMembersStore((s) => s.nameFor);
  const [editing, setEditing] = useState(false);

  const onToggle = () => {
    checkFeedback();
    void toggleChecked(item);
  };

  return (
    <li
      style={cascadeStyle(index)}
      className={`flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-[background-color] duration-[var(--motion-base)] ease-[var(--motion-ease)] ${
        highlighted ? 'bg-[var(--color-accent)]/10' : ''
      }`}
    >
      <button
        aria-label={item.state === 'checked' ? 'Desmarcar item' : 'Marcar item como comprado'}
        onClick={onToggle}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-[6px] border-2 transition-[background-color,border-color] duration-[var(--motion-fast)] ${
            item.state === 'checked'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
              : 'border-[var(--color-border-strong)]'
          }`}
        >
          {item.state === 'checked' && (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-[var(--color-accent-fg)] stroke-[2.5]">
              <path d="M3 8l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 text-left"
        aria-label="Renomear item"
      >
        <span
          className={`text-[15px] transition-colors duration-[var(--motion-base)] ${
            item.state === 'checked' ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'
          }`}
        >
          {item.name}
        </span>
        {item.note && (
          <p className="truncate text-xs italic text-[var(--color-text-muted)]">“{item.note}”</p>
        )}
        {highlighted && highlightedBy && (
          <p className="text-xs text-[var(--color-accent)]">riscado por {highlightedBy}</p>
        )}
      </button>

      {diffBadge != null && diffBadge !== 0 && (
        <span className="tabular-nums rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
          {diffBadge > 0 ? `+${diffBadge}` : diffBadge}
        </span>
      )}

      {item.checkedByUserId && item.state === 'checked' && (
        <InitialAvatar name={nameFor(item.checkedByUserId)} userId={item.checkedByUserId} size={22} />
      )}

      <Stepper
        value={item.quantityPlanned}
        onIncrement={() => void incrementItemQuantity(item, 1)}
        onDecrement={() => void incrementItemQuantity(item, -1)}
        onSet={(n) => void incrementItemQuantity(item, n - item.quantityPlanned)}
        min={1}
      />

      {returnToInbox && (
        <IconButton
          label="Devolver ao Inbox"
          onClick={() => {
            void returnItemToInbox(item).then((back) => {
              if (!back) return;
              showUndoSnackbar(
                'Item voltou pro Inbox.',
                () => {
                  void softDeleteItem(back);
                  void undoSoftDeleteItem(item);
                },
                { key: 'item-to-inbox', plural: (n) => `${n} itens voltaram pro Inbox.` },
              );
            });
          }}
        >
          <Inbox size={18} />
        </IconButton>
      )}

      <IconButton
        label="Remover"
        onClick={() => {
          void softDeleteItem(item);
          showUndoSnackbar('Item removido.', () => void undoSoftDeleteItem(item), { key: 'item-removed', plural: (n) => `${n} itens removidos.` });
        }}
      >
        <Trash2 size={18} />
      </IconButton>

      <TextInputSheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Renomear item"
        initialValue={item.name}
        confirmLabel="Salvar"
        onSubmit={(name) => void renameItem(item, name)}
      />
    </li>
  );
}
