import { useMemo, useState } from 'react';
import { AlertTriangle, X, Rows3, LayoutList } from 'lucide-react';
import { useCatalogStore } from '../../state/catalogStore';
import { useListsStore } from '../../state/listsStore';
import { useCorporativoUiStore, EMPTY_SILENCED } from '../../state/corporativoUiStore';
import { CheckableItemRow } from '../../components/list/CheckableItemRow';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { cascadeStyle } from '../../utils/cascade';

interface ComprarPhaseProps {
  listId: string;
  onGoToMontar: () => void;
  highlight: { itemId: string; by: string } | null;
}

/** Fase Comprar (§6): só itens com quantidade ≥ 1, agrupados por
 * categoria, com visão corrida opcional. Banner de recorrentes fora da
 * lista, não bloqueante, dispensável, não reaparece na mesma compra. */
export function ComprarPhase({ listId, onGoToMontar, highlight }: ComprarPhaseProps) {
  const items = useListsStore((s) => s.itemsFor(listId));
  const catalogItems = useCatalogStore((s) => s.items);
  const categories = useCatalogStore((s) => s.categories);
  const bannerDismissed = useCorporativoUiStore((s) => s.bannerDismissedByList[listId] ?? false);
  const dismissBanner = useCorporativoUiStore((s) => s.dismissBanner);
  const [flatView, setFlatView] = useState(false);

  const { pending, bought } = useMemo(() => {
    const pending = items.filter((i) => i.state !== 'checked');
    const bought = items.filter((i) => i.state === 'checked');
    return { pending, bought };
  }, [items]);

  const groups = useMemo(() => {
    if (flatView) return null;
    const byCategory = new Map<string, typeof pending>();
    for (const item of pending) {
      const key = item.categoryId ?? '__sem_categoria__';
      byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
    }
    return [...byCategory.entries()].map(([categoryId, items]) => ({
      categoryId,
      category: categories.find((c) => c.id === categoryId),
      items,
    }));
  }, [pending, flatView, categories]);

  const silencedIds = useCorporativoUiStore((s) => s.silencedByList[listId] ?? EMPTY_SILENCED);
  const missingRecurring = useMemo(() => {
    const activeCatalogIds = new Set(items.filter((i) => !i.deletedAt).map((i) => i.catalogItemId).filter(Boolean));
    const silencedSet = new Set(silencedIds);
    return catalogItems.filter(
      (c) =>
        c.frequency === 'recorrente' &&
        (c.expectedQuantity ?? 0) > 0 &&
        !activeCatalogIds.has(c.id) &&
        !silencedSet.has(c.id),
    );
  }, [catalogItems, items, silencedIds]);

  if (items.length === 0 && missingRecurring.length === 0) {
    return <EmptyState message="Nada marcado pra comprar ainda. Volte a Montar." />;
  }

  return (
    <div className="pb-4">
      {!bannerDismissed && missingRecurring.length > 0 && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <button onClick={onGoToMontar} className="flex-1 text-left">
            {missingRecurring.length} recorrente{missingRecurring.length === 1 ? '' : 's'} fora da lista:{' '}
            {missingRecurring
              .slice(0, 3)
              .map((c) => c.name)
              .join(', ')}
            {missingRecurring.length > 3 && '…'}
          </button>
          <button aria-label="Dispensar aviso" onClick={() => dismissBanner(listId)} className="shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-end px-4 pt-2">
        <IconButton
          label={flatView ? 'Agrupar por categoria' : 'Visão corrida'}
          active={flatView}
          onClick={() => setFlatView((v) => !v)}
        >
          {flatView ? <Rows3 size={18} /> : <LayoutList size={18} />}
        </IconButton>
      </div>

      {flatView ? (
        <ul>
          {pending.map((item, index) => (
            <CheckableItemRow
              key={item.id}
              item={item}
              index={index}
              highlighted={highlight?.itemId === item.id}
              highlightedBy={highlight?.itemId === item.id ? highlight.by : null}
            />
          ))}
        </ul>
      ) : (
        groups?.map((group) => (
          <div key={group.categoryId}>
            <p
              className="flex items-center gap-2 px-4 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]"
              style={cascadeStyle(0)}
            >
              {group.category && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: group.category.color }}
                  aria-hidden
                />
              )}
              {group.category?.name ?? 'Sem categoria'}
            </p>
            <ul>
              {group.items.map((item, index) => (
                <CheckableItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  highlighted={highlight?.itemId === item.id}
                  highlightedBy={highlight?.itemId === item.id ? highlight.by : null}
                />
              ))}
            </ul>
          </div>
        ))
      )}

      {bought.length > 0 && (
        <>
          <p className="px-4 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Comprados
          </p>
          <ul>
            {bought.map((item) => (
              <CheckableItemRow
                key={item.id}
                item={item}
                highlighted={highlight?.itemId === item.id}
                highlightedBy={highlight?.itemId === item.id ? highlight.by : null}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
