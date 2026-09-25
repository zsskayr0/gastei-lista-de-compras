import { useEffect } from 'react';
import { useAppStore } from '../state/appStore';

/** Tema automático segue o sistema (§9) — reage a mudanças em tempo real. */
export function useThemeSync() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      document.documentElement.removeAttribute('data-theme');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
}
