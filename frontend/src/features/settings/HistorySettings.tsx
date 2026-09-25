import { useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { useAuthStore } from '../../lib/auth/authStore';
import { historyApi } from '../../lib/api/endpoints';
import { SettingsScreen } from './SettingsScreen';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListRowSkeleton } from '../../components/ui/Skeleton';
import type { ArchivedListEntry } from '../../types/domain';

const FOLDER_LABEL = { inbox: 'Inbox', casa: 'Casa', corporativo: 'Corporativo' } as const;
const PAGE_SIZE = 20;

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Listas encerradas, mais recentes primeiro, com paginação por cursor e sem
 * teto (§13 do FRONTEND.md). Só o Dono vê — a Thaty nunca. */
export function HistorySettings() {
  const familyId = useAuthStore((s) => s.session?.familyId);
  const [entries, setEntries] = useState<ArchivedListEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<DescribedError | null>(null);

  const loadMore = useCallback(
    async (from: string | null) => {
      if (!familyId) return;
      setLoading(true);
      setError(null);
      try {
        const page = await historyApi.list(familyId, from ?? undefined, PAGE_SIZE);
        setEntries((prev) => (from ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setLoaded(true);
      } catch (err) {
        setError(reportError(err, 'Carregar histórico', { banner: false }));
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    },
    [familyId],
  );

  useEffect(() => {
    void loadMore(null);
  }, [loadMore]);

  return (
    <SettingsScreen title="Histórico">
      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-3">
            <ErrorCard error={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {!loaded && (
          <div>
            <ListRowSkeleton />
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        )}
        {loaded && entries.length === 0 && !error && <EmptyState message="Nenhuma compra encerrada ainda." />}

        <ul>
          {entries.map((e) => {
            const open = openId === e.id;
            const bought = e.snapshot.filter((i) => i.checked).length;
            return (
              <li key={e.id} className="border-b border-[var(--color-border)]">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-[var(--color-text)]">{e.list.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {FOLDER_LABEL[e.folder]} · {dateFmt.format(new Date(e.closedAt))} · {bought}/
                      {e.snapshot.length} comprados
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={'text-[var(--color-text-faint)] transition-transform ' + (open ? 'rotate-180' : '')}
                  />
                </button>
                {open && (
                  <ul className="pb-3 pl-2">
                    {e.snapshot.length === 0 && (
                      <li className="py-1 text-sm text-[var(--color-text-muted)]">Lista vazia.</li>
                    )}
                    {e.snapshot.map((i, idx) => (
                      <li key={idx} className="flex items-center gap-2 py-1 text-sm">
                        <span
                          aria-hidden
                          className={
                            'inline-block h-4 w-4 shrink-0 rounded-[4px] border text-center text-[10px] leading-[14px] ' +
                            (i.checked
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                              : 'border-[var(--color-border-strong)]')
                          }
                        >
                          {i.checked ? '✓' : ''}
                        </span>
                        <span className={i.checked ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
                          {i.name}
                        </span>
                        <span className="ml-auto tabular-nums text-xs text-[var(--color-text-faint)]">
                          {i.quantityBought ?? i.quantityPlanned}
                          {i.isCarryover && ' · sobra'}
                        </span>
                        <span className="sr-only">{i.checked ? 'comprado' : 'não comprado'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {cursor && (
          <div className="py-4 text-center">
            <Button variant="secondary" disabled={loading} onClick={() => void loadMore(cursor)}>
              {loading ? 'Carregando…' : 'Carregar mais'}
            </Button>
          </div>
        )}
      </div>
    </SettingsScreen>
  );
}
