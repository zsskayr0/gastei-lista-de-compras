import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';

interface PlusButtonProps {
  disabled?: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

const LONG_PRESS_MS = 300;

function vibrate(ms: number) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}

/** Botão "+" com dois gestos (§5): toque abre Entrada, toque longo abre o
 * popup de Lista com vibração curta. */
export function PlusButton({ disabled, onTap, onLongPress }: PlusButtonProps) {
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);

  const start = () => {
    if (disabled) return;
    setPressed(true);
    firedLongPress.current = false;
    timer.current = setTimeout(() => {
      firedLongPress.current = true;
      vibrate(20);
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const end = () => {
    setPressed(false);
    if (timer.current) clearTimeout(timer.current);
    if (!firedLongPress.current && !disabled) onTap();
  };

  const cancel = () => {
    setPressed(false);
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <button
      type="button"
      aria-label="Adicionar"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={clsx(
        'flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-[var(--shadow-md)]',
        'transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)]',
        pressed && 'scale-90',
        disabled && 'opacity-40',
      )}
    >
      <Plus size={26} />
    </button>
  );
}
