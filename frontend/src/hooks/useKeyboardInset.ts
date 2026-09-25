import { useEffect, useState } from 'react';

/** Altura do teclado virtual aberto (via visualViewport) — usado para a
 * bottom bar sumir e o bottom sheet de Entrada acompanhar o topo do
 * teclado (§4 e §5 do FRONTEND.md). */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(diff)));
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  return inset;
}

export function useKeyboardOpen(): boolean {
  const inset = useKeyboardInset();
  return inset > 80;
}
