import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Smile, Trash2 } from 'lucide-react';
import { useListsStore, EMPTY_ITEMS } from '../../state/listsStore';
import { useAuthStore } from '../../lib/auth/authStore';
import { useListSync, useRemoteCheckNotice } from '../../hooks/useListSync';
import { IconButton } from '../../components/ui/IconButton';
import { OverflowMenu } from '../../components/ui/OverflowMenu';
import { SyncErrorBanner } from '../../components/ui/SyncErrorBanner';
import { EmptyState } from '../../components/ui/EmptyState';
import { CheckableItemRow } from '../../components/list/CheckableItemRow';
import { TextInputSheet } from '../../components/ui/TextInputSheet';
import { useSnackbarStore } from '../../state/snackbarStore';
import { ListIcon } from '../../components/ui/ListIcon';
import { ListIconSheet } from '../../components/ui/ListIconSheet';

export function CasaListPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const list = useListsStore((s) => s.lists.find((l) => l.id === listId));
  const items = useListsStore((s) => (listId ? s.itemsFor(listId) : EMPTY_ITEMS));
  const session = useAuthStore((s) => s.session);
  const renameList = useListsStore((s) => s.renameList);
  const deleteList = useListsStore((s) => s.deleteList);
  const setListIcon = useListsStore((s) => s.setListIcon);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [highlight, setHighlight] = useState<{ itemId: string; by: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const showSnackbar = useSnackbarStore((s) => s.show);

  useListSync(listId, session?.familyId);

  const onChecked = useCallback((itemId: string, actorName: string) => {
    setHighlight({ itemId, by: actorName });
    setTimeout(() => setHighlight((h) => (h?.itemId === itemId ? null : h)), 2000);
  }, []);
  useRemoteCheckNotice(listId, onChecked);

  const { pending, bought } = useMemo(() => {
    const pending = items.filter((i) => i.state !== 'checked');
    const bought = items.filter((i) => i.state === 'checked');
    return { pending, bought };
  }, [items]);

  if (!list) {
    return <EmptyState message="Lista não encontrada." />;
  }

  return (
    <div className="pb-4">
      <header className="flex items-center gap-2 px-2 pb-2 pt-3">
        <IconButton label="Voltar" onClick={() => navigate('/casa')}>
          <ChevronLeft size={20} />
        </IconButton>
        <ListIcon list={list} size={32} />
        <h1 className="font-display flex-1 truncate text-xl font-semibold">{list.title}</h1>
        <OverflowMenu
          actions={[
            { label: 'Renomear', icon: <Pencil size={16} />, onSelect: () => setRenaming(true) },
            { label: 'Trocar ícone', icon: <Smile size={16} />, onSelect: () => setPickingIcon(true) },
            {
              label: 'Excluir lista',
              icon: <Trash2 size={16} />,
              danger: true,
              onSelect: () => {
                void deleteList(list.id);
                showSnackbar({ message: 'Lista excluída.', tone: 'neutral', durationMs: 4000 });
                navigate('/casa');
              },
            },
          ]}
        />
      </header>

      <TextInputSheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Renomear lista"
        initialValue={list.title}
        confirmLabel="Salvar"
        onSubmit={(name) => void renameList(list.id, name)}
      />

      <ListIconSheet
        open={pickingIcon}
        onClose={() => setPickingIcon(false)}
        value={list.icon ?? null}
        onPick={(key) => void setListIcon(list.id, key)}
        onRemove={() => void setListIcon(list.id, null)}
      />

      <SyncErrorBanner />

      {items.length === 0 ? (
        <EmptyState message="Nada aqui ainda. Use o botão “+” para adicionar." />
      ) : (
        <>
          <ul>
            {pending.map((item, index) => (
              <CheckableItemRow
                key={item.id}
                item={item}
                index={index}
                returnToInbox
                highlighted={highlight?.itemId === item.id}
                highlightedBy={highlight?.itemId === item.id ? highlight.by : null}
              />
            ))}
          </ul>

          {bought.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                Comprados
              </p>
              <ul>
                {bought.map((item) => (
                  <CheckableItemRow
                    key={item.id}
                    item={item}
                    highlighted={highlight?.itemId === item.id}
                    highlightedBy={highlight?.itemId === item.id ? highlight.by : null}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
