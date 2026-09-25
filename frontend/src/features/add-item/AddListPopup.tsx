import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListsStore } from '../../state/listsStore';

interface AddListPopupProps {
  open: boolean;
  onClose: () => void;
}

/** Popup de Lista (§5): balão ancorado acima do "+", some ao tocar fora.
 * Em Casa pergunta só a pasta de destino — aqui simplificado para o nome. */
export function AddListPopup({ open, onClose }: AddListPopupProps) {
  const [title, setTitle] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const createList = useListsStore((s) => s.createList);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setTitle('');
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const created = await createList('casa', trimmed);
    onClose();
    if (created) navigate(`/casa/${created.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-24">
      <div className="absolute inset-0 bg-black/20" aria-hidden onClick={onClose} />
      <div
        ref={ref}
        className="relative z-10 w-[280px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] animate-[fade-in_var(--motion-base)_ease-out]"
      >
        <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Nova lista em Casa</p>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="Nome da lista"
          className="mb-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={() => void submit()}
          disabled={!title.trim()}
          className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] font-medium text-[var(--color-accent-fg)] disabled:opacity-40"
        >
          Criar
        </button>
      </div>
    </div>
  );
}
