import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListChecks, Plus, Inbox } from 'lucide-react';
import { useListsStore } from '../../state/listsStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { Button } from '../../components/ui/Button';
import { pickVoice } from '../../content/voice';
import { TextInputSheet } from '../../components/ui/TextInputSheet';
import { BuildFromInboxSheet } from './BuildFromInboxSheet';
import { ListIcon } from '../../components/ui/ListIcon';

export function CasaPage() {
  const allLists = useListsStore((s) => s.lists);
  const itemsByList = useListsStore((s) => s.itemsByList);
  const createList = useListsStore((s) => s.createList);
  const lists = useMemo(() => allLists.filter((l) => l.folder === 'casa'), [allLists]);
  const emptyMessage = useMemo(() => pickVoice('casaListaVazia'), [lists.length === 0]);
  const [creating, setCreating] = useState(false);
  const [buildingFromInbox, setBuildingFromInbox] = useState(false);
  const navigate = useNavigate();

  const onCreate = async (name: string) => {
    const created = await createList('casa', name);
    if (created) navigate(`/casa/${created.id}`);
  };

  const actions = (
    <>
      <TextInputSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Nova lista em Casa"
        confirmLabel="Criar"
        onSubmit={(name) => void onCreate(name)}
      />
      <BuildFromInboxSheet open={buildingFromInbox} onClose={() => setBuildingFromInbox(false)} />
    </>
  );

  if (lists.length === 0) {
    return (
      <>
        <EmptyState
          icon={<ListChecks size={32} />}
          message={emptyMessage}
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={() => setCreating(true)}>
                <Plus size={16} /> Nova lista
              </Button>
              <Button variant="secondary" onClick={() => setBuildingFromInbox(true)}>
                <Inbox size={16} /> Montar a partir do Inbox
              </Button>
            </div>
          }
        />
        {actions}
      </>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="font-display text-2xl font-semibold">Casa</h1>
        <div className="flex items-center gap-1">
          <IconButton label="Montar a partir do Inbox" onClick={() => setBuildingFromInbox(true)}>
            <Inbox size={20} />
          </IconButton>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 px-4">
        {lists.map((l) => {
          const items = itemsByList[l.id] ?? [];
          const pending = items.filter((i) => i.state === 'pending').length;
          return (
            <li key={l.id}>
              <Link
                to={`/casa/${l.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-transform active:scale-[0.99]"
              >
                <ListIcon list={l} />
                <span className="font-display min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--color-text)]">
                  {l.title}
                </span>
                <span className="tabular-nums text-sm text-[var(--color-text-muted)]">
                  {pending} pendente{pending === 1 ? '' : 's'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {actions}
    </div>
  );
}
