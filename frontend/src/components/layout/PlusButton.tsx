import { Plus } from 'lucide-react';
import clsx from 'clsx';

interface PlusButtonProps {
  disabled?: boolean;
  /** Painel aberto (Entrada ou popup de lista): o "+" gira até virar "×". */
  open: boolean;
  label: string;
  /** Fica acima do fundo escurecido do popup, para poder fechá-lo. Nunca
   * acima do sheet de Entrada, que precisa cobrir a barra inteira. */
  raised: boolean;
  onTap: () => void;
}

/** Botão central dinâmico: o destino do toque depende da tela (§5) e o ícone
 * gira ao abrir e desgira ao fechar. */
export function PlusButton({ disabled, open, label, raised, onTap }: PlusButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      disabled={disabled}
      onClick={onTap}
      className={clsx(
        'relative flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-[var(--shadow-md)]',
        'transition-[translate,scale,opacity] duration-[var(--motion-base)] ease-[var(--motion-ease)] active:scale-90',
        raised && 'z-[60]',
        disabled && 'opacity-40',
      )}
    >
      <Plus
        size={26}
        className={clsx(
          'transition-transform duration-[360ms] ease-[cubic-bezier(0.34,1.2,0.5,1)] motion-reduce:transition-none',
          open ? 'rotate-[225deg]' : 'rotate-0',
        )}
      />
    </button>
  );
}
