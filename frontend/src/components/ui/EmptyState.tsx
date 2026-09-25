import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      {icon && <div className="text-[var(--color-text-faint)]">{icon}</div>}
      <p className="font-display text-lg text-[var(--color-text-muted)]">{message}</p>
      {action}
    </div>
  );
}
