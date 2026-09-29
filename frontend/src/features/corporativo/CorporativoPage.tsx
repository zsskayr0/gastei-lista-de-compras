import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import { useListsStore } from '../../state/listsStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { TextInputSheet } from '../../components/ui/TextInputSheet';
import { ListIcon } from '../../components/ui/ListIcon';

/** Corporativo: várias listas, como Casa — cada compra diferente tem a sua.
 * Cada lista tem Montar e Comprar (ver CorporativoListPage). */
export function CorporativoPage() {
  const allLists = useListsStore((s) => s.lists);
  const itemsByList = useListsStore((s) => s.itemsByList);
  const status = useListsStore((s) => s.status);
  const createList = useListsStore((s) => s.createList);
  const lists = useMemo(
    () => allLists.filter((l) => l.folder === 'corporativo' && l.status === 'active'),
    [allLists],
  );
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  if (status === 'loading') return null;

  const sheet = (
    <TextInputSheet
      open={creating}
      onClose={() => setCreating(false)}
      title="Nova lista no Corporativo"
      confirmLabel="Criar"
      onSubmit={(name) =>
        void createList('corporativo', name).then((created) => {
          if (created) navigate(`/corporativo/${created.id}`);
        })
      }
    />
  );

  if (lists.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Briefcase size={32} />}
          message="Nenhuma lista no Corporativo ainda."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> Nova lista
            </Button>
          }
        />
        {sheet}
      </>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pb-2 pt-4">
        <h1 className="font-display text-2xl font-semibold">Corporativo</h1>
      </div>
      <ul className="grid grid-cols-1 gap-2 px-4">
        {lists.map((l) => {
          const pending = (itemsByList[l.id] ?? []).filter((i) => i.state === 'pending').length;
          return (
            <li key={l.id}>
              <Link
                to={`/corporativo/${l.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-transform active:scale-[0.99]"
              >
                <ListIcon list={l} />
                <span className="font-display min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--color-text)]">{l.title}</span>
                <span className="tabular-nums text-sm text-[var(--color-text-muted)]">
                  {l.phase === 'comprar' ? 'Comprando · ' : 'Montando · '}
                  {pending} pendente{pending === 1 ? '' : 's'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {sheet}
    </div>
  );
}
