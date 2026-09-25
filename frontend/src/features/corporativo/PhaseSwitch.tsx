import type { ListPhase } from '../../types/domain';

interface PhaseSwitchProps {
  phase: ListPhase;
  onChange: (phase: ListPhase) => void;
}

/** Controle de troca visível no topo — não são rotas separadas, o estado
 * persiste ao trocar (§6). */
export function PhaseSwitch({ phase, onChange }: PhaseSwitchProps) {
  return (
    <div className="mx-4 mt-2 flex rounded-[var(--radius-md)] border border-[var(--color-border)] p-0.5">
      {(['montar', 'comprar'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`min-h-[40px] flex-1 rounded-[calc(var(--radius-md)-2px)] text-sm font-medium capitalize transition-colors duration-[var(--motion-fast)] ${
            phase === p ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]' : 'text-[var(--color-text-muted)]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
