import type { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <img src="/icon.svg" alt="" className="mx-auto mb-4 h-14 w-14" />
        <h1 className="font-display mb-1 text-center text-2xl font-semibold text-[var(--color-text)]">{title}</h1>
        <p className="mb-6 text-center text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
