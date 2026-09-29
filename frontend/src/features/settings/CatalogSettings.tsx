import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardPaste, Repeat, Search, Sparkles, Tag } from 'lucide-react';
import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { useAuthStore } from '../../lib/auth/authStore';
import { useCatalogStore } from '../../state/catalogStore';
import { catalogApi, dictionaryApi, type BulkCatalogEntry, type CatalogUpdateDto } from '../../lib/api/endpoints';
import { normalizeText } from '../../utils/text';
import { resizeImage } from '../../utils/image';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { CatalogThumb } from '../../components/ui/CatalogThumb';
import { SettingsScreen } from './SettingsScreen';
import { CatalogEditSheet } from './CatalogEditSheet';
import { CatalogEditPanel } from './CatalogEditPanel';
import { CatalogPasteSheet } from './CatalogPasteSheet';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { FrequencyToggle } from '../../components/ui/FrequencyToggle';
import { CategoryBadge, CategoryPickerSheet } from '../../components/ui/CategoryPicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListRowSkeleton } from '../../components/ui/Skeleton';
import type { CatalogItem, Category } from '../../types/domain';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

interface RowProps {
  item: CatalogItem;
  category: Category | undefined;
  selected: boolean;
  /** Há alguma linha selecionada — o toque passa a marcar/desmarcar. */
  selecting: boolean;
  /** Linha com foco de teclado (desktop) — navegação por setas. */
  focused?: boolean;
  onToggle: (e?: MouseEvent) => void;
  onEdit: () => void;
  onPickCategory: () => void;
  onSetExpected: (quantity: number) => void;
}

/** Linha do catálogo. Pressão longa entra no modo de seleção múltipla; com a
 * seleção ativa, tocar em qualquer parte da linha marca/desmarca. No desktop,
 * a caixa de seleção só aparece com o mouse em cima (ou já marcada) — clicar
 * nela alterna, e Shift+clique seleciona o intervalo. */
function CatalogRow({ item, category, selected, selecting, focused, onToggle, onEdit, onPickCategory, onSetExpected }: RowProps) {
  // Rascunho só durante a digitação; fora dela mostra o valor salvo.
  const [draft, setDraft] = useState<string | null>(null);

  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  const onPointerDown = (e: PointerEvent<HTMLLIElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    fired.current = false;
    origin.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(() => {
      fired.current = true;
      timer.current = null;
      navigator.vibrate?.(12);
      onToggle();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent<HTMLLIElement>) => {
    const o = origin.current;
    if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_TOLERANCE_PX) cancel(); // virou rolagem
  };

  // Captura o clique antes dos botões filhos: o soltar do dedo depois da
  // pressão longa não pode abrir a edição, e na seleção o toque só alterna.
  const onClickCapture = (e: MouseEvent<HTMLLIElement>) => {
    if (fired.current) {
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    } else if (selecting) {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    }
  };

  const commitQty = () => {
    if (draft === null) return;
    const text = draft.trim().replace(',', '.');
    setDraft(null);
    if (text === '') return; // o backend não aceita "sem quantidade": volta ao valor salvo
    const n = Number(text);
    if (Number.isFinite(n) && n >= 0 && n !== item.expectedQuantity) onSetExpected(n);
  };

  return (
    <li
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClickCapture={onClickCapture}
      onContextMenu={(e) => e.preventDefault()}
      aria-selected={selecting ? selected : undefined}
      data-catalog-row={item.id}
      style={{ WebkitTouchCallout: 'none' }}
      className={
        'group relative flex select-none items-center gap-1 border-b border-[var(--color-border)] pl-3 transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ' +
        (selected ? 'bg-[var(--color-accent)]/12' : focused ? 'bg-[var(--color-surface-alt)]' : '')
      }
    >
      <span
        aria-hidden
        className={
          'absolute inset-y-1 left-0 w-[3px] rounded-full bg-[var(--color-accent)] transition-opacity duration-[var(--motion-base)] ' +
          (selected || focused ? 'opacity-100' : 'opacity-0')
        }
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(e);
        }}
        aria-label={selected ? `Desmarcar ${item.name}` : `Marcar ${item.name}`}
        className={
          'hidden shrink-0 items-center justify-center rounded-full p-1 text-[var(--color-text-faint)] transition-opacity duration-[var(--motion-fast)] hover:text-[var(--color-text)] lg:flex ' +
          (selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')
        }
      >
        <span
          className={
            'flex h-5 w-5 items-center justify-center rounded-full border ' +
            (selected
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
              : 'border-[var(--color-border-strong)]')
          }
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </span>
      </button>
      <CatalogThumb item={item} size={40} colorHex={category?.color} />
      <button
        type="button"
        onClick={onEdit}
        className="min-h-[60px] min-w-0 flex-1 truncate px-2 text-left text-[15px] text-[var(--color-text)]"
      >
        {item.name}
      </button>
      {selected && (
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] animate-[pop-in_var(--motion-base)_var(--motion-ease)] lg:hidden"
        >
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <input
        data-qty
        inputMode="decimal"
        enterKeyHint="next"
        aria-label={`Quantidade esperada de ${item.name}`}
        placeholder="—"
        value={draft ?? (item.expectedQuantity != null ? String(item.expectedQuantity) : '')}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 6))}
        onBlur={commitQty}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(null);
            e.currentTarget.blur();
          } else if (e.key === 'Enter') {
            // Pula para a quantidade da linha de baixo, para preencher em sequência.
            const next = e.currentTarget.closest('li')?.nextElementSibling?.querySelector<HTMLInputElement>('input[data-qty]');
            if (next) next.focus();
            else e.currentTarget.blur();
          }
        }}
        className="h-9 w-11 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] text-center text-[15px] tabular-nums text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)]"
      />
      <button
        type="button"
        onClick={onPickCategory}
        aria-label={`Categoria de ${item.name}: ${category ? category.name : 'nenhuma'}. Tocar para trocar`}
        className="flex min-h-[44px] items-center gap-1.5 rounded-full px-1.5 transition-transform active:scale-95 hover:bg-[var(--color-surface-alt)]"
      >
        {category ? (
          <CategoryBadge category={category} size={26} />
        ) : (
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-text-faint)]">
            <Tag size={13} />
          </span>
        )}
        <span className="hidden w-[84px] truncate text-left text-xs text-[var(--color-text-muted)] sm:block">
          {category ? category.name : 'Sem categoria'}
        </span>
      </button>
      <button type="button" onClick={onEdit} tabIndex={-1} aria-hidden className="flex min-h-[60px] items-center pl-1 pr-2">
        <span className="w-[68px] text-right text-xs text-[var(--color-text-faint)]">
          {item.frequency === 'recorrente' ? 'Recorrente' : 'Rara'}
        </span>
      </button>
    </li>
  );
}

/** Catálogo do Dono (§13 do FRONTEND.md): busca, edição de um item, edição em
 * lote (marcar várias linhas e aplicar categoria/frequência) e "colar lista". */
export function CatalogSettings() {
  const session = useAuthStore((s) => s.session);
  const status = useCatalogStore((s) => s.status);
  const items = useCatalogStore((s) => s.items);
  const categories = useCatalogStore((s) => s.categories);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [pasting, setPasting] = useState(false);
  // Seletor rápido: item avulso (troca na hora) ou o lote marcado.
  const [picking, setPicking] = useState<CatalogItem | 'bulk' | null>(null);
  const [pickingFrequency, setPickingFrequency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DescribedError | null>(null);
  const [termCount, setTermCount] = useState<number | null>(null);
  // Linha com foco de teclado (desktop) — independente da seleção/edição.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastToggled = useRef<string | null>(null);

  const isDesktop = useIsDesktop();
  const familyId = session?.familyId;

  useEffect(() => {
    if (familyId) void useCatalogStore.getState().init(familyId);
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    dictionaryApi
      .listForFamily(familyId)
      .then((t) => setTermCount(t.length))
      .catch((err) => reportError(err, 'Contar termos novos', { banner: false }));
  }, [familyId]);

  useEffect(() => setError(null), [editing]);

  // Esc sai do modo de seleção.
  useEffect(() => {
    if (selected.size === 0) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(new Set());
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected.size]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return q ? items.filter((i) => normalizeText(i.name).includes(q)) : items;
  }, [items, query]);

  // Atalhos de teclado do desktop: "/" foca a busca, setas navegam a lista,
  // Enter abre a edição da linha focada, Ctrl/Cmd+A seleciona tudo.
  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === '/' && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && !inField) {
        e.preventDefault();
        setSelected(new Set(filtered.map((i) => i.id)));
        return;
      }
      if (inField) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (filtered.length === 0) return;
        e.preventDefault();
        const idx = focusedId ? filtered.findIndex((i) => i.id === focusedId) : -1;
        const next = e.key === 'ArrowDown' ? Math.min(filtered.length - 1, idx + 1) : Math.max(0, idx === -1 ? 0 : idx - 1);
        setFocusedId(filtered[next].id);
        document.querySelector(`[data-catalog-row="${filtered[next].id}"]`)?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && focusedId) {
        const item = filtered.find((i) => i.id === focusedId);
        if (item) setEditing(item);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDesktop, filtered, focusedId]);

  if (!familyId) return null;

  const categoryOf = (id: string | null) => categories.find((c) => c.id === id);

  const toggle = (id: string, e?: MouseEvent) => {
    if (e?.shiftKey && lastToggled.current) {
      const ids = filtered.map((i) => i.id);
      const a = ids.indexOf(lastToggled.current);
      const b = ids.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelected((prev) => new Set([...prev, ...ids.slice(lo, hi + 1)]));
        return;
      }
    }
    lastToggled.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const saveOne = (id: string, dto: CatalogUpdateDto) =>
    run('Salvar item do catálogo', async () => {
      const updated = await catalogApi.update(id, dto);
      await useCatalogStore.getState().upsertItems([updated]);
      setEditing(null);
    });

  // O item aberto na sheet é sempre a versão mais nova do store (ex.: depois de subir a foto).
  const editingItem = editing ? (items.find((i) => i.id === editing.id) ?? editing) : null;

  const uploadImage = (item: CatalogItem, file: File) =>
    run('Enviar foto do item', async () => {
      const blob = await resizeImage(file);
      const updated = await catalogApi.uploadImage(item.id, blob);
      await useCatalogStore.getState().upsertItems([updated]);
    });

  const removeImage = (item: CatalogItem) =>
    run('Remover foto do item', async () => {
      const updated = await catalogApi.removeImage(item.id);
      await useCatalogStore.getState().upsertItems([updated]);
    });

  const removeOne = (item: CatalogItem) =>
    run('Excluir item do catálogo', async () => {
      await catalogApi.remove(item.id);
      await useCatalogStore.getState().removeItem(item.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setEditing(null);
    });

  const quickExpected = async (item: CatalogItem, expectedQuantity: number) => {
    // Otimista, como a categoria: a linha já mostra o valor; se falhar, volta.
    await useCatalogStore.getState().upsertItems([{ ...item, expectedQuantity }]);
    setError(null);
    try {
      const saved = await catalogApi.update(item.id, { expectedQuantity });
      await useCatalogStore.getState().upsertItems([saved]);
    } catch (err) {
      await useCatalogStore.getState().upsertItems([item]);
      setError(reportError(err, `Salvar quantidade de “${item.name}”`, { banner: false }));
    }
  };

  const quickCategory = async (item: CatalogItem, categoryId: string) => {
    if (item.categoryId === categoryId) return;
    // Otimista: a linha muda já; se o servidor recusar, volta ao que era.
    await useCatalogStore.getState().upsertItems([{ ...item, categoryId }]);
    setError(null);
    try {
      const saved = await catalogApi.update(item.id, { categoryId });
      await useCatalogStore.getState().upsertItems([saved]);
    } catch (err) {
      await useCatalogStore.getState().upsertItems([item]);
      setError(reportError(err, `Trocar categoria de “${item.name}”`, { banner: false }));
    }
  };

  const applyToSelected = (dto: CatalogUpdateDto) =>
    run('Aplicar em lote no catálogo', async () => {
      const ids = [...selected];
      // Sem endpoint em lote no backend: uma requisição por item. Se alguma
      // falhar, as que passaram já foram aplicadas — guarda as bem-sucedidas.
      const results = await Promise.allSettled(ids.map((id) => catalogApi.update(id, dto)));
      const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      await useCatalogStore.getState().upsertItems(ok);
      const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      setSelected(new Set(failed.length ? ids.filter((_, i) => results[i].status === 'rejected') : []));
      if (failed.length) throw failed[0].reason;
    });

  const bulkCreate = (entries: BulkCatalogEntry[]) =>
    run('Criar itens do catálogo em massa', async () => {
      const created = await catalogApi.bulkCreate(familyId, entries);
      await useCatalogStore.getState().upsertItems(created);
      setPasting(false);
    });

  return (
    <SettingsScreen title="Catálogo">
      <div className="mx-auto flex w-full max-w-[2000px] items-start gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no catálogo"
              aria-label="Buscar no catálogo"
              className="min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-3 text-base outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <Button variant="secondary" onClick={() => setPasting(true)}>
            <ClipboardPaste size={16} /> Colar lista
          </Button>
        </div>

        <Link
          to="/ajustes/catalogo/termos"
          className="mb-3 flex min-h-[48px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-[15px] text-[var(--color-text)]"
        >
          <Sparkles size={16} className="text-[var(--color-text-muted)]" />
          <span className="flex-1">Termos novos</span>
          {termCount !== null && termCount > 0 && (
            <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs">{termCount}</span>
          )}
        </Link>

        {selected.size > 0 && (
          <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2">
            <span className="px-1 text-sm">{selected.size} selecionado(s)</span>
            <Button variant="secondary" disabled={busy} onClick={() => setPicking('bulk')}>
              <Tag size={16} /> Categoria…
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setPickingFrequency(true)}>
              <Repeat size={16} /> Frequência…
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Limpar
            </Button>
          </div>
        )}

        {selected.size === 0 && items.length > 0 && (
          <p className="mb-2 text-xs text-[var(--color-text-faint)]">
            <span className="lg:hidden">Segure um item para selecionar vários.</span>
            <span className="hidden lg:inline">
              Passe o mouse para marcar vários (Shift para intervalo, Ctrl/Cmd+A para todos) — “/” busca, setas navegam.
            </span>
          </p>
        )}

        {error && (
          <div className="mb-3">
            <ErrorCard error={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {status !== 'ready' && (
          <div>
            <ListRowSkeleton />
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <EmptyState message="Catálogo vazio. Cole uma lista de nomes para começar." />
        )}

        {status === 'ready' && items.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-[var(--color-text-muted)]">Nada encontrado para “{query}”.</p>
        )}

        <ul className="lg:grid lg:grid-cols-2 lg:gap-x-6 xl:grid-cols-3">
          {filtered.map((item) => (
            <CatalogRow
              key={item.id}
              item={item}
              category={categoryOf(item.categoryId)}
              selected={selected.has(item.id)}
              selecting={selected.size > 0}
              focused={isDesktop && focusedId === item.id}
              onToggle={(e) => toggle(item.id, e)}
              onEdit={() => {
                setFocusedId(item.id);
                setEditing(item);
              }}
              onPickCategory={() => setPicking(item)}
              onSetExpected={(q) => void quickExpected(item, q)}
            />
          ))}
        </ul>
      </div>

      <CatalogEditPanel
        item={isDesktop ? editingItem : null}
        categories={categories}
        saving={busy}
        error={editing ? error : null}
        onClose={() => setEditing(null)}
        onSave={(id, dto) => void saveOne(id, dto)}
        onDelete={(item) => void removeOne(item)}
        onUploadImage={(item, file) => void uploadImage(item, file)}
        onRemoveImage={(item) => void removeImage(item)}
      />
      </div>

      <BottomSheet open={pickingFrequency} onClose={() => setPickingFrequency(false)}>
        <div className="px-4 pb-4 pt-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Frequência para {selected.size} item(ns)
          </p>
          <FrequencyToggle
            value={null}
            onChange={(f) => {
              setPickingFrequency(false);
              void applyToSelected({ frequency: f });
            }}
          />
        </div>
      </BottomSheet>
      <CategoryPickerSheet
        open={picking !== null}
        title={picking === 'bulk' ? `Categoria para ${selected.size} item(ns)` : picking ? `Categoria — ${picking.name}` : ''}
        categories={categories}
        value={picking && picking !== 'bulk' ? picking.categoryId : null}
        onClose={() => setPicking(null)}
        onPick={(id) => {
          if (picking === 'bulk') void applyToSelected({ categoryId: id });
          else if (picking) void quickCategory(picking, id);
        }}
      />
      <CatalogEditSheet
        item={!isDesktop ? editingItem : null}
        categories={categories}
        saving={busy}
        error={editing ? error : null}
        onClose={() => setEditing(null)}
        onSave={(id, dto) => void saveOne(id, dto)}
        onDelete={(item) => void removeOne(item)}
        onUploadImage={(item, file) => void uploadImage(item, file)}
        onRemoveImage={(item) => void removeImage(item)}
      />
      <CatalogPasteSheet
        open={pasting}
        existing={items}
        categories={categories}
        saving={busy}
        onClose={() => setPasting(false)}
        onSubmit={(entries) => void bulkCreate(entries)}
      />
    </SettingsScreen>
  );
}
