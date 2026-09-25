import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // acessível — sempre obrigatório, botão de ícone nunca fica mudo pra leitor de tela
  active?: boolean;
}

// Alvo de toque ≥44px (§14) mesmo quando o ícone visual é menor.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, active, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,transform]',
        'duration-[var(--motion-fast)] ease-[var(--motion-ease)] active:scale-90',
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
        'hover:bg-[var(--color-surface-alt)] disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';
