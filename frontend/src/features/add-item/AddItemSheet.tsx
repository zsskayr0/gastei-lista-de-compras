import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Stepper } from '../../components/ui/Stepper';
import { CatalogThumb } from '../../components/ui/CatalogThumb';
import { ItemGlyph } from '../../components/ui/ItemGlyph';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { useListsStore, EMPTY_ITEMS } from '../../state/listsStore';
import { useCatalogStore } from '../../state/catalogStore';
import { useAuthStore } from '../../lib/auth/authStore';
import { normalizeText } from '../../utils/text';
import type { CatalogItem } from '../../types/domain';

interface AddItemSheetProps {
  open: boolean;
  onClose: () => void;
  listId: string | null;
  listLabel: string;
}

interface Suggestion {
  key: string;
  name: string;
  catalog: CatalogItem | null;
}

const MAX_SUGGESTIONS = 12;

/** Entrada (§5): confirmar não fecha o sheet — volta ao campo vazio,
 * focado, pronto pro próximo item. Fecha por arrasto ou toque fora.
 *
 * Sugestões são o coração da Entrada: com o campo vazio mostram o que a
 * família mais usa; ao digitar, filtram o catálogo (começo de palavra
 * primeiro) e os itens já digitados em outras listas. Um toque adiciona. */
export function AddItemSheet({ open, onClose, listId, listLabel }: AddItemSheetProps) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();
  const addItem = useListsStore((s) => s.addItem);
  const session = useAuthStore((s) => s.session);

  const catalog = useCatalogStore((s) => s.items);
  const catalogStatus = useCatalogStore((s) => s.status);
  const categoryById = useCatalogStore((s) => s.categoryById);
  const allItems = useListsStore((s) => s.itemsByList);
  const targetItems = useListsStore((s) => (listId ? s.itemsByList[listId] : undefined)) ?? EMPTY_ITEMS;

  // O catálogo é carregado por quem precisa dele; a Entrada existe em toda tela.
  useEffect(() => {
    if (open && session && catalogStatus === 'idle') void useCatalogStore.getState().init(session.familyId);
  }, [open, session, catalogStatus]);

  const suggestions = useMemo<Suggestion[]>(() => {
    // Quanto cada nome/item de catálogo já foi usado — desempata o ranking.
    const usage = new Map<string, number>();
    const freeNames = new Map<string, string>(); // normalizado -> nome como digitado
    for (const items of Object.values(allItems)) {
      for (const it of items) {
        const norm = normalizeText(it.name);
        usage.set(it.catalogItemId ?? norm, (usage.get(it.catalogItemId ?? norm) ?? 0) + 1);
        if (!it.catalogItemId && !freeNames.has(norm)) freeNames.set(norm, it.name);
      }
    }

    // O que já está pendente nesta lista não vira sugestão.
    const inList = new Set<string>();
    for (const it of targetItems) {
      if (it.state === 'checked') continue;
      inList.add(it.catalogItemId ?? normalizeText(it.name));
      inList.add(normalizeText(it.name));
    }

    const pool: Suggestion[] = catalog.map((c) => ({ key: c.id, name: c.name, catalog: c }));
    const catalogNames = new Set(catalog.map((c) => normalizeText(c.name)));
    for (const [norm, original] of freeNames) {
      if (!catalogNames.has(norm)) pool.push({ key: `free:${norm}`, name: original, catalog: null });
    }

    const used = (s: Suggestion) => usage.get(s.catalog?.id ?? normalizeText(s.name)) ?? 0;
    const query = normalizeText(name);

    const scored: Array<{ s: Suggestion; score: number }> = [];
    for (const s of pool) {
      const norm = normalizeText(s.name);
      if (inList.has(s.catalog?.id ?? norm) || inList.has(norm)) continue;
      if (!query) {
        // Campo vazio: só recorrentes do catálogo e o que a família já digitou.
        if (s.catalog && s.catalog.frequency !== 'recorrente') continue;
        scored.push({ s, score: 0 });
        continue;
      }
      if (norm === query) continue; // já é exatamente o que está digitado
      const words = norm.split(' ');
      if (norm.startsWith(query)) scored.push({ s, score: 0 });
      else if (words.some((w) => w.startsWith(query))) scored.push({ s, score: 1 });
      else if (norm.includes(query)) scored.push({ s, score: 2 });
    }

    return scored
      .sort(
        (a, b) =>
          a.score - b.score ||
          used(b.s) - used(a.s) ||
          a.s.name.localeCompare(b.s.name, 'pt-BR'),
      )
      .slice(0, MAX_SUGGESTIONS)
      .map((x) => x.s);
  }, [name, catalog, allItems, targetItems]);

  useEffect(() => {
    if (open) {
      setName('');
      setQty(1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const confirm = (picked?: Suggestion) => {
    const finalName = (picked?.name ?? name).trim();
    if (!finalName || !listId) return;

    // Digitou o nome exato de um item do catálogo: liga a ele (foto, categoria).
    const match =
      picked?.catalog ?? catalog.find((c) => normalizeText(c.name) === normalizeText(finalName)) ?? null;

    void addItem(listId, finalName, {
      quantityPlanned: qty,
      ...(match
        ? {
            catalogItemId: match.id,
            categoryId: match.categoryId,
            quantityExpected: match.expectedQuantity,
          }
        : {}),
    });
    setName('');
    setQty(1);
    inputRef.current?.focus();
  };

  return (
    <BottomSheet open={open} onClose={onClose} bottomOffset={keyboardInset}>
      <div className="px-4 pb-4 pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
          Adicionar a {listLabel}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="O que precisa?"
            className="min-h-[44px] flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <Stepper
            value={qty}
            onIncrement={() => setQty((q) => q + 1)}
            onDecrement={() => setQty((q) => Math.max(1, q - 1))}
            min={1}
          />
        </form>

        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-[var(--color-text-faint)]">
              {name.trim() ? 'Sugestões' : 'Mais usados'}
            </p>
            <div className="flex max-h-[180px] flex-wrap gap-2 overflow-y-auto overscroll-contain">
              {suggestions.map((s) => {
                const color = s.catalog ? categoryById(s.catalog.categoryId)?.color : undefined;
                return (
                  <button
                    key={s.key}
                    type="button"
                    // Não rouba o foco do campo: o teclado fica aberto entre toques.
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => confirm(s)}
                    className="flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--color-border)] py-1 pl-1.5 pr-3 text-sm text-[var(--color-text)] transition-transform active:scale-95"
                  >
                    {s.catalog ? (
                      <CatalogThumb item={s.catalog} size={28} colorHex={color} />
                    ) : (
                      <ItemGlyph name={s.name} size={28} />
                    )}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => confirm()}
          disabled={!name.trim()}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] font-medium text-[var(--color-accent-fg)] disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </BottomSheet>
  );
}
