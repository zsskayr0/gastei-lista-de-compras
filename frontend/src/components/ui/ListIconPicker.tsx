import clsx from 'clsx';
import { LIST_ICONS, LIST_ICON_KEYS } from '../../content/listIcons';

interface ListIconPickerProps {
  value: string | null;
  onChange: (key: string) => void;
}

export function ListIconPicker({ value, onChange }: ListIconPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Ícone da lista"
      className="grid max-h-[176px] grid-cols-6 gap-2 overflow-y-auto overscroll-contain pr-1"
    >
      {LIST_ICON_KEYS.map((key) => {
        const Icon = LIST_ICONS[key];
        const on = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Ícone ${key}`}
            onClick={() => onChange(key)}
            className={clsx(
              'flex h-11 items-center justify-center rounded-[var(--radius-md)] border transition-[scale,background-color] duration-[var(--motion-base)] ease-[var(--motion-ease)] active:scale-90',
              on
                ? 'border-[var(--color-accent)] bg-[var(--color-surface-alt)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
            )}
          >
            <Icon size={20} />
          </button>
        );
      })}
    </div>
  );
}
