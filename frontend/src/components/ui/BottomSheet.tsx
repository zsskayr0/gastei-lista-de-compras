import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Distância do fundo, em px — usado pra acompanhar o teclado (§5). */
  bottomOffset?: number;
}

export function BottomSheet({ open, onClose, children, bottomOffset = 0 }: BottomSheetProps) {
  const startY = useRef<number | null>(null);
  const dragDistance = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Arrastar para fechar só vale a partir da barrinha do topo — no resto da
  // sheet o gesto é rolagem/toque, senão fechar por engano é fácil demais.
  const onHandleDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    dragDistance.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (startY.current === null || !sheetRef.current) return;
    const delta = Math.max(0, e.clientY - startY.current);
    dragDistance.current = delta;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onHandleUp = () => {
    if (startY.current === null) return;
    const el = sheetRef.current;
    if (el) el.style.transition = '';
    if (dragDistance.current > 80) onClose();
    else if (el) el.style.transform = '';
    startY.current = null;
    dragDistance.current = 0;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/30 transition-opacity duration-[var(--motion-base)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        style={{ marginBottom: bottomOffset }}
        className="relative z-10 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[var(--radius-lg)] border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[calc(var(--safe-bottom)+12px)] shadow-[var(--shadow-md)] transition-transform duration-[var(--motion-base)] ease-[var(--motion-ease)] animate-[sheet-up_var(--motion-slow)_var(--motion-ease)]"
      >
        <div
          role="separator"
          aria-label="Arraste para baixo para fechar"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          className="sticky top-0 z-20 flex h-8 cursor-grab touch-none items-center justify-center rounded-t-[var(--radius-lg)] bg-[var(--color-surface)] active:cursor-grabbing"
        >
          <div className="h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
