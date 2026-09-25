import { reportError } from '../state/errorStore';
import { useEffect } from 'react';
import { startPolling, stopPolling, onRemoteChange } from '../lib/sync/pollEngine';
import { familiesApi } from '../lib/api/endpoints';
import { useMembersStore } from '../state/membersStore';

const HEARTBEAT_MS = 5000;

/** Liga o poll curto da lista aberta e o heartbeat de presença enquanto a
 * tela está montada (§4.1 do BACKEND.md, §8 do FRONTEND.md). */
export function useListSync(listId: string | undefined, familyId: string | undefined) {
  useEffect(() => {
    if (!listId) return;
    startPolling(listId);
    return () => stopPolling(listId);
  }, [listId]);

  useEffect(() => {
    if (!listId || !familyId) return;
    let cancelled = false;
    const beat = () => {
      if (cancelled) return;
      void familiesApi.heartbeat(familyId, listId).catch((err) => reportError(err, 'Avisar presença na lista'));
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [listId, familyId]);
}

/** Notifica quando alguém risca um item remotamente — usado para o realce
 * sutil e para "não reverter silenciosamente" (§7, §8). */
export function useRemoteCheckNotice(listId: string | undefined, onChecked: (itemId: string, actorName: string) => void) {
  const nameFor = useMembersStore((s) => s.nameFor);
  useEffect(() => {
    if (!listId) return;
    return onRemoteChange((info) => {
      if (info.listId !== listId) return;
      for (const ev of info.checkedEvents) {
        onChecked(ev.itemId, nameFor(ev.actorUserId));
      }
    });
  }, [listId, onChecked, nameFor]);
}
