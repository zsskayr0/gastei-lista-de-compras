import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-[transform,opacity,background-color]',
          'duration-[var(--motion-base)] ease-[var(--motion-ease)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
          'min-h-[44px] px-4',
          size === 'lg' && 'min-h-[52px] px-5 text-base',
          variant === 'primary' && 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:brightness-95',
          variant === 'secondary' &&
            'bg-[var(--color-surface-alt)] text-[var(--color-text)] border border-[var(--color-border)]',
          variant === 'ghost' && 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]',
          variant === 'danger' && 'bg-[var(--color-danger)] text-white',
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
