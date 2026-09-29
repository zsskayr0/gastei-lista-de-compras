import { BottomSheet } from './BottomSheet';
import { ListIconPicker } from './ListIconPicker';

interface ListIconSheetProps {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onPick: (key: string) => void;
  onRemove: () => void;
}

/** Escolher o ícone de uma lista que já existe. */
export function ListIconSheet({ open, onClose, value, onPick, onRemove }: ListIconSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pb-4 pt-1">
        <p className="mb-3 text-base font-medium text-[var(--color-text)]">Ícone da lista</p>
        <ListIconPicker
          value={value}
          onChange={(key) => {
            onPick(key);
            onClose();
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
          >
            Usar o ícone padrão
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
