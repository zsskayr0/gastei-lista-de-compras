import { useCallback, useEffect, useState } from 'react';
import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { useAuthStore } from '../../lib/auth/authStore';
import { useCatalogStore } from '../../state/catalogStore';
import { dictionaryApi } from '../../lib/api/endpoints';
import { SettingsScreen } from './SettingsScreen';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListRowSkeleton } from '../../components/ui/Skeleton';
import type { DictionaryTerm } from '../../types/domain';

/** Termos que apareceram em itens avulsos e ainda não estão no catálogo.
 * "Promover" cria o item de catálogo (frequência rara, categoria sugerida). */
export function TermsSettings() {
  const familyId = useAuthStore((s) => s.session?.familyId);
  const categories = useCatalogStore((s) => s.categories);
  const [terms, setTerms] = useState<DictionaryTerm[] | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [error, setError] = useState<DescribedError | null>(null);

  const load = useCallback(async () => {
    if (!familyId) return;
    try {
      const list = await dictionaryApi.listForFamily(familyId);
      // Mais usados primeiro: são os que mais valem entrar no catálogo.
      setTerms([...list].sort((a, b) => b.usageCount - a.usageCount));
    } catch (err) {
      setError(reportError(err, 'Carregar termos novos', { banner: false }));
      setTerms([]);
    }
  }, [familyId]);

  useEffect(() => {
    void load();
    if (familyId) void useCatalogStore.getState().init(familyId);
  }, [load, familyId]);

  const promote = async (term: DictionaryTerm) => {
    setPromoting(term.id);
    setError(null);
    try {
      const item = await dictionaryApi.promote(term.id);
      await useCatalogStore.getState().upsertItems([item]);
      setTerms((prev) => prev?.filter((t) => t.id !== term.id) ?? null);
    } catch (err) {
      setError(reportError(err, `Promover o termo “${term.term}”`, { banner: false }));
    } finally {
      setPromoting(null);
    }
  };

  return (
    <SettingsScreen title="Termos novos">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Nomes digitados em itens avulsos. Promova os que fazem sentido para o catálogo.
        </p>
        {error && (
          <div className="mb-3">
            <ErrorCard error={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {terms === null && (
          <div>
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        )}
        {terms?.length === 0 && !error && <EmptyState message="Nenhum termo novo por enquanto." />}
        <ul>
          {terms?.map((t) => {
            const cat = categories.find((c) => c.id === t.guessedCategoryId);
            return (
              <li key={t.id} className="flex min-h-[56px] items-center gap-3 border-b border-[var(--color-border)] py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-[var(--color-text)]">{t.term}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t.usageCount}× · {cat ? cat.name : 'sem categoria sugerida'}
                    {t.wasCorrected && ' · corrigido'}
                  </p>
                </div>
                <Button variant="secondary" disabled={promoting === t.id} onClick={() => void promote(t)}>
                  {promoting === t.id ? 'Promovendo…' : 'Promover'}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </SettingsScreen>
  );
}
