import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { useListsStore } from '../../state/listsStore';
import { useCatalogStore } from '../../state/catalogStore';
import { useCorporativoUiStore } from '../../state/corporativoUiStore';
import { useAuthStore } from '../../lib/auth/authStore';
import { useListSync, useRemoteCheckNotice } from '../../hooks/useListSync';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { SyncErrorBanner } from '../../components/ui/SyncErrorBanner';
import { AddItemSheet } from '../add-item/AddItemSheet';
import { PhaseSwitch } from './PhaseSwitch';
import { MontarPhase } from './MontarPhase';
import { ComprarPhase } from './ComprarPhase';

/** Corporativo (§6): uma lista "viva" por vez, Montar e Comprar na mesma
 * tela — o estado persiste ao trocar de fase, não são rotas separadas. */
export function CorporativoPage() {
  const session = useAuthStore((s) => s.session);
  const list = useListsStore((s) => s.corporativoList());
  const status = useListsStore((s) => s.status);
  const setPhase = useListsStore((s) => s.setPhase);
  const createList = useListsStore((s) => s.createList);
  const [creating, setCreating] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [highlight, setHighlight] = useState<{ itemId: string; by: string } | null>(null);

  useListSync(list?.id, session?.familyId);

  const onChecked = useCallback((itemId: string, actorName: string) => {
    setHighlight({ itemId, by: actorName });
    setTimeout(() => setHighlight((h) => (h?.itemId === itemId ? null : h)), 2000);
  }, []);
  useRemoteCheckNotice(list?.id, onChecked);

  useEffect(() => {
    if (session) void useCatalogStore.getState().init(session.familyId);
  }, [session]);

  useEffect(() => {
    if (list) void useCorporativoUiStore.getState().loadForList(list.id);
  }, [list]);

  if (status === 'loading') return null;

  if (!list) {
    return (
      <EmptyState
        icon={<Briefcase size={32} />}
        message="Nenhuma lista viva no Corporativo ainda."
        action={
          <Button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              await createList('corporativo', 'Corporativo');
              setCreating(false);
            }}
          >
            {creating ? 'Criando…' : 'Começar'}
          </Button>
        }
      />
    );
  }

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pb-0 pt-4">
        <h1 className="font-display truncate text-2xl font-semibold">{list.title}</h1>
        <IconButton label="Adicionar item avulso" onClick={() => setAddingCustom(true)}>
          <Plus size={20} />
        </IconButton>
      </div>
      <PhaseSwitch phase={list.phase ?? 'montar'} onChange={(phase) => void setPhase(list.id, phase)} />
      <SyncErrorBanner />

      {list.phase === 'comprar' ? (
        <ComprarPhase listId={list.id} onGoToMontar={() => void setPhase(list.id, 'montar')} highlight={highlight} />
      ) : (
        <MontarPhase listId={list.id} />
      )}

      <AddItemSheet
        open={addingCustom}
        onClose={() => setAddingCustom(false)}
        listId={list.id}
        listLabel={list.title}
      />
    </div>
  );
}
