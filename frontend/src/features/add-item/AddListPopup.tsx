import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useListsStore } from '../../state/listsStore';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { ListIconPicker } from '../../components/ui/ListIconPicker';

interface AddListPopupProps {
  open: boolean;
  onClose: () => void;
  folder: 'casa' | 'corporativo';
}

const EXIT_MS = 260;

const COPY = {
  casa: { heading: 'Nova lista em Casa', initial: '' },
  corporativo: { heading: 'Nova lista no Corporativo', initial: '' },
} as const;

/** Popup de criar lista (§5): sobe com fade ao abrir e desce com fade ao
 * fechar. Continua montado durante a animação de saída. */
export function AddListPopup({ open, onClose, folder }: AddListPopupProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const createList = useListsStore((s) => s.createList);
  const keyboardInset = useKeyboardInset();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTitle(COPY[folder].initial);
      setIcon(null);
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, folder]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const created = await createList(folder, trimmed, icon ?? undefined);
    onClose();
    if (created) navigate(`/${folder}/${created.id}`);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className={clsx(
          'pointer-events-auto absolute inset-0 bg-black/25 transition-opacity duration-[var(--motion-slow)]',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 flex justify-center"
        style={{ bottom: keyboardInset > 0 ? keyboardInset + 16 : 96 }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-label={COPY[folder].heading}
          className={clsx(
            'pointer-events-auto w-[min(92vw,420px)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)]',
            'transition-[translate,opacity] duration-[260ms] ease-[var(--motion-ease)] motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          <p className="mb-3 text-base font-medium text-[var(--color-text)]">{COPY[folder].heading}</p>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            placeholder="Nome da lista"
            className="mb-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <p className="mb-1.5 text-xs text-[var(--color-text-faint)]">Ícone (opcional)</p>
          <div className="mb-3">
            <ListIconPicker value={icon} onChange={setIcon} />
          </div>
          <button
            onClick={() => void submit()}
            disabled={!title.trim()}
            className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] font-medium text-[var(--color-accent-fg)] disabled:opacity-40"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
