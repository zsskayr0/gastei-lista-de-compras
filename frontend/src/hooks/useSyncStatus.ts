import { useEffect, useState } from 'react';
import { subscribeSyncEngine, type SyncEngineState } from '../lib/sync/syncEngine';

const STALE_AFTER_MS = 2 * 60 * 1000; // §8: 2 min sem sincronizar + fila pendente

export interface SyncStatus extends SyncEngineState {
  showErrorBanner: boolean;
}

/** Recalcula "2 min sem sincronizar" no cliente (BACKEND.md §4.4: o servidor
 * só fornece `server_time`, quem decide mostrar o banner é o cliente). */
export function useSyncStatus(): SyncStatus {
  const [engineState, setEngineState] = useState<SyncEngineState>({
    pendingCount: 0,
    lastSyncedAt: null,
    lastAttemptAt: null,
    lastError: false,
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeSyncEngine(setEngineState), []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const staleSinceMs = engineState.lastSyncedAt
    ? now - new Date(engineState.lastSyncedAt).getTime()
    : Infinity;

  const showErrorBanner = engineState.pendingCount > 0 && staleSinceMs > STALE_AFTER_MS;

  return { ...engineState, showErrorBanner };
}
