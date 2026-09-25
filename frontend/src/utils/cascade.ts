import type { CSSProperties } from 'react';

/** Cascata de entrada limitada aos primeiros ~6 itens (§9) — o resto entra
 * direto, por performance. Só anima transform/opacity. */
const CASCADE_LIMIT = 6;
const STEP_MS = 28;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function cascadeStyle(index: number): CSSProperties | undefined {
  if (index >= CASCADE_LIMIT || prefersReducedMotion()) return undefined;
  return {
    animationName: 'fade-in',
    animationDuration: 'var(--motion-slow)',
    animationTimingFunction: 'var(--motion-ease)',
    animationFillMode: 'backwards',
    animationDelay: `${index * STEP_MS}ms`,
  };
}
