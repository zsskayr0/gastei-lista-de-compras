import type { Frequency } from '../../types/domain';

const OPTIONS: Array<{ value: Frequency; label: string; hint: string }> = [
  { value: 'recorrente', label: 'Recorrente', hint: 'sempre na lista' },
  { value: 'rara', label: 'Rara', hint: 'só quando precisa' },
];

interface Props {
  /** `null` = nenhuma marcada (ação imediata, como no lote). */
  value: Frequency | null;
  onChange: (value: Frequency) => void;
}

/** Seletor segmentado de frequência — substitui o <select> nativo (que abre o
 * menu do sistema). Dois toques de alvo grande, com a explicação embaixo. */
export function FrequencyToggle({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Frequência">
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={
              'flex min-h-[52px] flex-col items-center justify-center rounded-[var(--radius-md)] border px-2 py-1.5 ' +
              'transition-[transform,background-color,border-color] duration-[var(--motion-base)] ease-[var(--motion-ease)] active:scale-[0.97] ' +
              (on
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-text)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)]')
            }
          >
            <span className={'text-[15px] ' + (on ? 'font-medium' : '')}>{o.label}</span>
            <span className="text-[11px] text-[var(--color-text-faint)]">{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
