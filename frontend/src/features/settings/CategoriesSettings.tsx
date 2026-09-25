import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { ApiError } from '../../lib/api/client';
import { useAuthStore } from '../../lib/auth/authStore';
import { useCatalogStore } from '../../state/catalogStore';
import { useListsStore } from '../../state/listsStore';
import { categoriesApi, type CategoryInput } from '../../lib/api/endpoints';
import { SettingsScreen } from './SettingsScreen';
import { CategoryEditSheet } from './CategoryEditSheet';
import { Button } from '../../components/ui/Button';
import { CategoryBadge, CategoryPickerSheet } from '../../components/ui/CategoryPicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListRowSkeleton } from '../../components/ui/Skeleton';
import type { Category } from '../../types/domain';

/** Gerência de categorias do Dono: criar, renomear, trocar cor/ícone e excluir.
 * Excluir uma categoria em uso pede outra para receber os itens dela. */
export function CategoriesSettings() {
  const familyId = useAuthStore((s) => s.session?.familyId);
  const status = useCatalogStore((s) => s.status);
  const categories = useCatalogStore((s) => s.categories);
  const items = useCatalogStore((s) => s.items);
  const [target, setTarget] = useState<Category | 'new' | null>(null);
  const [reassigning, setReassigning] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DescribedError | null>(null);

  useEffect(() => {
    if (familyId) void useCatalogStore.getState().init(familyId);
  }, [familyId]);

  // Erro de uma tentativa anterior não deve reaparecer ao abrir outra sheet.
  useEffect(() => setError(null), [target]);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) if (i.categoryId) map.set(i.categoryId, (map.get(i.categoryId) ?? 0) + 1);
    return map;
  }, [items]);

  if (!familyId) return null;

  const run = async (context: string, fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(reportError(err, context, { banner: false }));
    } finally {
      setBusy(false);
    }
  };

  const save = (dto: CategoryInput) =>
    run(target === 'new' ? 'Criar categoria' : 'Salvar categoria', async () => {
      const saved =
        target === 'new' || target === null
          ? await categoriesApi.create(familyId, dto)
          : await categoriesApi.update(target.id, dto);
      await useCatalogStore.getState().upsertCategory(saved);
      setTarget(null);
    });

  const remove = (category: Category, reassignTo?: string) =>
    run(`Excluir a categoria “${category.name}”`, async () => {
      try {
        await categoriesApi.remove(category.id, reassignTo);
      } catch (err) {
        // Em uso (no catálogo ou em listas) e sem destino: pede para onde mover.
        if (err instanceof ApiError && err.status === 409 && !reassignTo) {
          setTarget(null);
          setReassigning(category);
          return;
        }
        throw err;
      }
      await useCatalogStore.getState().removeCategory(category.id, reassignTo);
      // Itens de lista que usavam a categoria mudaram no servidor.
      void useListsStore.getState().refreshFromServer();
      setTarget(null);
      setReassigning(null);
    });

  const onDelete = (category: Category) => {
    if ((usage.get(category.id) ?? 0) > 0) {
      setTarget(null);
      setReassigning(category);
    } else {
      void remove(category);
    }
  };

  return (
    <SettingsScreen title="Categorias">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            {categories.length} categoria(s). Toque para editar.
          </p>
          <Button onClick={() => setTarget('new')}>
            <Plus size={16} /> Nova
          </Button>
        </div>

        {error && (
          <div className="mb-3">
            <ErrorCard error={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {status !== 'ready' && (
          <div>
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        )}
        {status === 'ready' && categories.length === 0 && (
          <EmptyState message="Nenhuma categoria ainda. Crie a primeira." />
        )}

        <ul>
          {categories.map((c) => {
            const n = usage.get(c.id) ?? 0;
            return (
              <li key={c.id} className="border-b border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setTarget(c)}
                  className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-alt)]"
                >
                  <CategoryBadge category={c} size={36} />
                  <span className="flex-1 truncate text-[15px] text-[var(--color-text)]">{c.name}</span>
                  <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                    {n} {n === 1 ? 'item' : 'itens'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <CategoryEditSheet
        target={target}
        saving={busy}
        error={target !== null ? error : null}
        onClose={() => setTarget(null)}
        onSave={(dto) => void save(dto)}
        onDelete={onDelete}
      />
      <CategoryPickerSheet
        open={reassigning !== null}
        title={reassigning ? `Mover itens de “${reassigning.name}” para…` : ''}
        categories={categories.filter((c) => c.id !== reassigning?.id)}
        onClose={() => setReassigning(null)}
        onPick={(id) => reassigning && void remove(reassigning, id)}
      />
    </SettingsScreen>
  );
}
