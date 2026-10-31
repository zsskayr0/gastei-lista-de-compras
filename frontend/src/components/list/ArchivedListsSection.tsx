import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveRestore, ChevronDown } from 'lucide-react';
import type { List } from '../../types/domain';
import { useListsStore } from '../../state/listsStore';
import { useSnackbarStore } from '../../state/snackbarStore';
import { ListIcon } from '../ui/ListIcon';
import { IconButton } from '../ui/IconButton';

/** Listas arquivadas de uma pasta: recolhidas por padrão, abrem para ver ou
 * desarquivar. Os itens ficam preservados. */
export function ArchivedListsSection({ lists, basePath }: { lists: List[]; basePath: string }) {
  const [open, setOpen] = useState(false);
  const setListArchived = useListsStore((s) => s.setListArchived);
  const showSnackbar = useSnackbarStore((s) => s.show);

  if (lists.length === 0) return null;

  return (
    <section className="px-4 pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]"
      >
        <span>Arquivadas ({lists.length})</span>
        <ChevronDown size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <ul className="grid grid-cols-1 gap-2">
          {lists.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 opacity-80"
            >
              <Link to={`${basePath}/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <ListIcon list={l} />
                <span className="font-display min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--color-text)]">
                  {l.title}
                </span>
              </Link>
              <IconButton
                label="Desarquivar"
                onClick={() => {
                  void setListArchived(l.id, false);
                  showSnackbar({ message: 'Lista desarquivada.', tone: 'neutral', durationMs: 3000 });
                }}
              >
                <ArchiveRestore size={20} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
