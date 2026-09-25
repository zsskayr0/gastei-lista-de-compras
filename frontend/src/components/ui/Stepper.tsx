import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Se informado, o número vira um campo editável (digitar o valor direto). */
  onSet?: (value: number) => void;
  min?: number;
  max?: number;
}

/*
 * Alvo de toque ≥44px, algarismos tabulares (§14, §9).
 *
 * Emite incremento/decremento, nunca um valor absoluto calculado a partir
 * de `value` — dois toques rápidos no mesmo botão disparam dois cliques
 * antes do React re-renderizar com o `value` novo; se cada clique
 * calculasse "value + 1" a partir do prop capturado no fechamento, o
 * segundo toque perderia o primeiro (ou, pior, duas criações otimistas
 * do mesmo item colidiam em vez de somar). Quem resolve o valor final é
 * sempre a store, lendo o estado mais recente na hora de aplicar.
 */
const BTN =
  "relative flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text)] transition-transform duration-[var(--motion-fast)] active:scale-90 disabled:opacity-30 before:absolute before:-inset-2 before:content-['']";

export function Stepper({ value, onIncrement, onDecrement, onSet, min = 0, max = 99 }: StepperProps) {
  // Rascunho local só enquanto o campo está em edição; fora disso mostra `value`.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    if (!Number.isFinite(parsed)) return;
    const next = Math.min(max, Math.max(min, parsed));
    if (next !== value) onSet?.(next);
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={value <= min}
        onClick={onDecrement}
        className={BTN}
      >
        <Minus size={14} />
      </button>
      {onSet ? (
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Quantidade"
          value={draft ?? String(value)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          className="tabular-nums font-display h-9 w-[3ch] min-w-[36px] rounded-[var(--radius-sm)] bg-transparent text-center text-lg font-medium text-[var(--color-text)] outline-none focus:bg-[var(--color-surface-alt)]"
        />
      ) : (
        <span className="tabular-nums font-display min-w-[2ch] text-center text-lg font-medium">{value}</span>
      )}
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={value >= max}
        onClick={onIncrement}
        className={BTN}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
