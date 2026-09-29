import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Smile, Trash2 } from 'lucide-react';
import { useListsStore } from '../../state/listsStore';
import { useCatalogStore } from '../../state/catalogStore';
import { useCorporativoUiStore } from '../../state/corporativoUiStore';
import { useSnackbarStore } from '../../state/snackbarStore';
import { useAuthStore } from '../../lib/auth/authStore';
import { useListSync, useRemoteCheckNotice } from '../../hooks/useListSync';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { OverflowMenu } from '../../components/ui/OverflowMenu';
import { SyncErrorBanner } from '../../components/ui/SyncErrorBanner';
import { TextInputSheet } from '../../components/ui/TextInputSheet';
import { ListIcon } from '../../components/ui/ListIcon';
import { ListIconSheet } from '../../components/ui/ListIconSheet';
import { PhaseSwitch } from './PhaseSwitch';
import { MontarPhase } from './MontarPhase';
import { ComprarPhase } from './ComprarPhase';

/** Uma lista do Corporativo (§6): Montar e Comprar na mesma tela — o estado
 * persiste ao trocar de fase, não são rotas separadas. */
export function CorporativoListPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const list = useListsStore((s) => s.lists.find((l) => l.id === listId));
  const status = useListsStore((s) => s.status);
  const setPhase = useListsStore((s) => s.setPhase);
  const renameList = useListsStore((s) => s.renameList);
  const deleteList = useListsStore((s) => s.deleteList);
  const setListIcon = useListsStore((s) => s.setListIcon);
  const [pickingIcon, setPickingIcon] = useState(false);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [renaming, setRenaming] = useState(false);
  const [highlight, setHighlight] = useState<{ itemId: string; by: string } | null>(null);

  useListSync(listId, session?.familyId);

  const onChecked = useCallback((itemId: string, actorName: string) => {
    setHighlight({ itemId, by: actorName });
    setTimeout(() => setHighlight((h) => (h?.itemId === itemId ? null : h)), 2000);
  }, []);
  useRemoteCheckNotice(listId, onChecked);

  useEffect(() => {
    if (session) void useCatalogStore.getState().init(session.familyId);
  }, [session]);

  useEffect(() => {
    if (list) void useCorporativoUiStore.getState().loadForList(list.id);
  }, [list?.id]);

  if (status === 'loading') return null;
  if (!list) return <EmptyState message="Lista não encontrada." />;

  return (
    <div className="pb-4">
      <header className="flex items-center gap-2 px-2 pb-0 pt-3">
        <IconButton label="Voltar" onClick={() => navigate('/corporativo')}>
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
                navigate('/corporativo');
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

      <PhaseSwitch phase={list.phase ?? 'montar'} onChange={(phase) => void setPhase(list.id, phase)} />
      <SyncErrorBanner />

      {list.phase === 'comprar' ? (
        <ComprarPhase listId={list.id} onGoToMontar={() => void setPhase(list.id, 'montar')} highlight={highlight} />
      ) : (
        <MontarPhase listId={list.id} />
      )}
    </div>
  );
}
