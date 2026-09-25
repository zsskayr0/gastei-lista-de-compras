import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { AddItemSheet } from '../../features/add-item/AddItemSheet';
import { AddListPopup } from '../../features/add-item/AddListPopup';
import { SnackbarHost } from '../ui/SnackbarHost';
import { useListsStore } from '../../state/listsStore';

function useAddItemTarget(): { listId: string | null; label: string } {
  const location = useLocation();
  const params = useParams();
  const lists = useListsStore((s) => s.lists);
  const inbox = useListsStore((s) => s.inboxList());

  if (location.pathname.startsWith('/casa/') && params.listId) {
    const list = lists.find((l) => l.id === params.listId);
    return { listId: params.listId, label: list?.title ?? 'lista' };
  }
  if (location.pathname.startsWith('/casa')) {
    return { listId: null, label: 'Casa' }; // sem lista aberta — "+" cria lista (toque curto não faz nada aqui)
  }
  return { listId: inbox?.id ?? null, label: 'Inbox' };
}

export function AppShell() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const target = useAddItemTarget();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <SnackbarHost />
      <BottomNav
        onAddTap={() => target.listId && setSheetOpen(true)}
        onAddLongPress={() => setPopupOpen(true)}
      />
      <AddItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        listId={target.listId}
        listLabel={target.label}
      />
      <AddListPopup open={popupOpen} onClose={() => setPopupOpen(false)} />
    </div>
  );
}
