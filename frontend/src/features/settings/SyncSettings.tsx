import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { useAuthStore } from '../../lib/auth/authStore';
import { familiesApi } from '../../lib/api/endpoints';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { timeAgo } from '../../utils/text';
import { SettingsScreen } from './SettingsScreen';
import { Button } from '../../components/ui/Button';
import { ListRowSkeleton } from '../../components/ui/Skeleton';
import { InitialAvatar } from '../../components/ui/InitialAvatar';
import type { SyncStatusMember } from '../../types/domain';

const REFRESH_MS = 15_000;

/** Status de sincronização (§13): este aparelho (fila local) e a última
 * sincronização de cada aparelho de cada membro, segundo o servidor. */
export function SyncSettings() {
  const session = useAuthStore((s) => s.session);
  const local = useSyncStatus();
  const [members, setMembers] = useState<SyncStatusMember[] | null>(null);
  const [serverTime, setServerTime] = useState<number>(() => Date.now());
  const [error, setError] = useState<DescribedError | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const familyId = session?.familyId;

  const load = useCallback(async () => {
    if (!familyId) return;
    setRefreshing(true);
    try {
      const res = await familiesApi.syncStatus(familyId);
      setMembers(res.members);
      // Compara com o relógio do servidor, não do aparelho — evita "há 3 min"
      // falso quando o relógio do celular está fora.
      setServerTime(new Date(res.serverTime).getTime());
      setError(null);
    } catch (err) {
      setError(reportError(err, 'Carregar status de sincronização', { banner: false }));
      setMembers((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [familyId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <SettingsScreen title="Sincronização">
      <div className="mx-auto max-w-3xl">
        <section className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Este aparelho
          </p>
          <p className="text-[15px] text-[var(--color-text)]">
            {local.pendingCount === 0
              ? 'Nada pendente.'
              : `${local.pendingCount} mudança(s) aguardando envio.`}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Última sincronização: {timeAgo(local.lastSyncedAt)}
            {local.lastError && ' · última tentativa falhou'}
          </p>
        </section>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">Aparelhos da família</p>
          <Button variant="ghost" onClick={() => void load()} disabled={refreshing} aria-label="Atualizar">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </Button>
        </div>

        {error && (
          <div className="mb-3">
            <ErrorCard error={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {members === null && (
          <div>
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        )}

        <ul className="space-y-4">
          {members?.map((m) => (
            <li key={m.userId}>
              <div className="mb-1 flex items-center gap-3">
                <InitialAvatar name={m.name} userId={m.userId} />
                <span className="text-[15px] text-[var(--color-text)]">{m.name}</span>
                <span className="text-xs text-[var(--color-text-faint)]">
                  {m.role === 'owner' ? 'Dono' : 'Admin'}
                </span>
              </div>
              {m.devices.length === 0 ? (
                <p className="pl-12 text-sm text-[var(--color-text-muted)]">Nenhum aparelho ativo.</p>
              ) : (
                <ul className="pl-12">
                  {m.devices.map((d) => (
                    <li
                      key={d.deviceSessionId}
                      className="flex min-h-[44px] items-center justify-between border-b border-[var(--color-border)] text-sm"
                    >
                      <span className="text-[var(--color-text)]">{d.deviceName ?? 'Aparelho sem nome'}</span>
                      <span className="text-[var(--color-text-muted)]">{timeAgo(d.lastSyncedAt, serverTime)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </SettingsScreen>
  );
}
