import { useEffect, useState } from 'react';

/** Verdadeiro enquanto a media query bate — usado para trocar de layout
 * (ex.: painel lateral em vez de bottom sheet) sem esperar um resize. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Breakpoint `lg` do Tailwind (1024px) — onde o painel do Dono vira layout largo. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
