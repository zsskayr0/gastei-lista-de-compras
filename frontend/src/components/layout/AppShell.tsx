import { useEffect, useState } from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { AddItemSheet } from '../../features/add-item/AddItemSheet';
import { AddListPopup } from '../../features/add-item/AddListPopup';
import { SnackbarHost } from '../ui/SnackbarHost';
import { useListsStore } from '../../state/listsStore';

type AddTarget =
  | { kind: 'item'; listId: string | null; label: string }
  | { kind: 'list'; folder: 'casa' | 'corporativo' }
  | { kind: 'off' };

/** O "+" muda de função conforme a tela: Inbox → item direto no Inbox;
 * Casa/Corporativo → cria uma lista na pasta; dentro de uma lista, item nela. */
function useAddTarget(): AddTarget {
  const { pathname } = useLocation();
  const lists = useListsStore((s) => s.lists);
  const inbox = useListsStore((s) => s.inboxList());

  for (const folder of ['casa', 'corporativo'] as const) {
    const open = matchPath(`/${folder}/:listId`, pathname);
    if (open?.params.listId) {
      const list = lists.find((l) => l.id === open.params.listId);
      return { kind: 'item', listId: open.params.listId, label: list?.title ?? 'lista' };
    }
    if (pathname.startsWith(`/${folder}`)) return { kind: 'list', folder };
  }
  if (pathname.startsWith('/inbox')) return { kind: 'item', listId: inbox?.id ?? null, label: 'Inbox' };
  return { kind: 'off' };
}

export function AppShell() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const target = useAddTarget();
  const { pathname } = useLocation();

  // Trocar de tela fecha qualquer painel aberto pelo "+".
  useEffect(() => {
    setSheetOpen(false);
    setPopupOpen(false);
  }, [pathname]);

  const open = sheetOpen || popupOpen;
  const closeAll = () => {
    setSheetOpen(false);
    setPopupOpen(false);
  };

  const onAddTap = () => {
    if (open) return closeAll();
    if (target.kind === 'item' && target.listId) setSheetOpen(true);
    else if (target.kind === 'list') setPopupOpen(true);
  };

  const label =
    target.kind === 'list'
      ? 'Nova lista'
      : target.kind === 'item'
        ? `Adicionar a ${target.label}`
        : 'Adicionar';

  return (
    <div className="safe-top flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <SnackbarHost />
      <BottomNav
        addOpen={open}
        addRaised={popupOpen}
        addLabel={label}
        addDisabled={target.kind === 'off' || (target.kind === 'item' && !target.listId)}
        onAddTap={onAddTap}
      />
      <AddItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        listId={target.kind === 'item' ? target.listId : null}
        listLabel={target.kind === 'item' ? target.label : ''}
      />
      <AddListPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        folder={target.kind === 'list' ? target.folder : 'casa'}
      />
    </div>
  );
}
