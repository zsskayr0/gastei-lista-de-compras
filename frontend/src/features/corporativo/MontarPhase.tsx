import { useMemo, useState } from 'react';
import { Check, ChevronDown, StickyNote, Trash2 } from 'lucide-react';
import { useCatalogStore } from '../../state/catalogStore';
import { useListsStore } from '../../state/listsStore';
import { useCorporativoUiStore } from '../../state/corporativoUiStore';
import { CatalogThumb } from '../../components/ui/CatalogThumb';
import { ItemGlyph } from '../../components/ui/ItemGlyph';
import { Stepper } from '../../components/ui/Stepper';
import { IconButton } from '../../components/ui/IconButton';
import { TextInputSheet } from '../../components/ui/TextInputSheet';
import { showUndoSnackbar } from '../../state/snackbarStore';
import { cascadeStyle } from '../../utils/cascade';
import type { CatalogItem, ListItem } from '../../types/domain';

function NoteButton({ hasNote, onClick }: { hasNote: boolean; onClick: () => void }) {
  return (
    <IconButton label={hasNote ? 'Editar observação' : 'Adicionar observação'} onClick={onClick}>
      <StickyNote
        size={18}
        className={hasNote ? 'text-[var(--color-accent-pressed)]' : 'text-[var(--color-text-faint)]'}
      />
    </IconButton>
  );
}

interface CatalogRowProps {
  listId: string;
  catalogItem: CatalogItem;
  existing: ListItem | undefined;
  index: number;
}

function CatalogRow({ listId, catalogItem, existing, index }: CatalogRowProps) {
  const setCatalogQuantity = useListsStore((s) => s.setCatalogQuantity);
  const setNote = useListsStore((s) => s.setNote);
  const [noting, setNoting] = useState(false);
  const categoryById = useCatalogStore((s) => s.categoryById);
  const silence = useCorporativoUiStore((s) => s.silence);
  const isSilenced = useCorporativoUiStore((s) => s.isSilenced(listId, catalogItem.id));
  const category = categoryById(catalogItem.categoryId);

  const planned = existing?.quantityPlanned ?? 0;
  const expected = catalogItem.expectedQuantity ?? 0;
  const diff = expected > 0 ? planned - expected : 0;

  const zeroedAlert =
    catalogItem.frequency === 'recorrente' && expected > 0 && planned === 0 && !isSilenced;

  return (
    <li style={cascadeStyle(index)} className="border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-3.5">
        <CatalogThumb item={catalogItem} size={64} colorHex={category?.color} className="!rounded-[var(--radius-lg)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium leading-snug text-[var(--color-text)]">{catalogItem.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <span className="min-w-0 truncate">
              {expected > 0 && `esperado ${expected}`}
              {existing?.isCarryover && (expected > 0 ? ' · ' : '') + 'sobrou da semana passada'}
            </span>
            {zeroedAlert && (
              <button
                type="button"
                onClick={() => silence(listId, catalogItem.id)}
                aria-label="Tenho estoque"
                title="Tenho estoque"
                className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent)] text-[var(--color-accent-pressed)] transition-transform active:scale-90 before:absolute before:-inset-3 before:content-['']"
              >
                <Check size={12} strokeWidth={3} />
              </button>
            )}
          </p>
          {existing?.note && (
            <button
              type="button"
              onClick={() => setNoting(true)}
              aria-label="Editar observação"
              className="block max-w-full truncate text-left text-xs italic text-[var(--color-text-muted)] underline-offset-2 hover:underline"
            >
              “{existing.note}”
            </button>
          )}
        </div>
        {existing && <NoteButton hasNote={!!existing.note} onClick={() => setNoting(true)} />}
        {diff !== 0 && (
          // Toque = acerta a quantidade para o esperado (soma se faltar, tira se passou).
          <button
            type="button"
            onClick={() => void setCatalogQuantity(listId, catalogItem, -diff)}
            aria-label={`Ajustar para o esperado (${expected})`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <span className="tabular-nums rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] transition-transform active:scale-95">
              {diff > 0 ? `+${diff}` : diff}
            </span>
          </button>
        )}
        <Stepper
          value={planned}
          onIncrement={() => void setCatalogQuantity(listId, catalogItem, 1)}
          onDecrement={() => void setCatalogQuantity(listId, catalogItem, -1)}
          onSet={(n) => void setCatalogQuantity(listId, catalogItem, n - planned)}
          min={0}
        />
      </div>
      {existing && (
        <TextInputSheet
          open={noting}
          onClose={() => setNoting(false)}
          title={`Observação — ${catalogItem.name}`}
          placeholder="Ex.: marca, tamanho, onde comprar"
          initialValue={existing.note ?? ''}
          confirmLabel="Salvar observação"
          allowEmpty
          onSubmit={(text) => void setNote(existing, text)}
        />
      )}
    </li>
  );
}

function CustomItemRow({ item, index }: { item: ListItem; index: number }) {
  const incrementItemQuantity = useListsStore((s) => s.incrementItemQuantity);
  const softDeleteItem = useListsStore((s) => s.softDeleteItem);
  const undoSoftDeleteItem = useListsStore((s) => s.undoSoftDeleteItem);
  const renameItem = useListsStore((s) => s.renameItem);
  const setNote = useListsStore((s) => s.setNote);
  const categoryById = useCatalogStore((s) => s.categoryById);
  const category = categoryById(item.categoryId);
  const [editing, setEditing] = useState(false);
  const [noting, setNoting] = useState(false);

  return (
    <li style={cascadeStyle(index)} className="flex items-center gap-3.5 border-b border-[var(--color-border)] px-4 py-3">
      <ItemGlyph name={item.name} colorHex={category?.color} size={64} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block max-w-full truncate text-left text-base font-medium leading-snug text-[var(--color-text)]"
          aria-label="Renomear item"
        >
          {item.name}
        </button>
        {item.note && (
          <button
            type="button"
            onClick={() => setNoting(true)}
            aria-label="Editar observação"
            className="block max-w-full truncate text-left text-xs italic text-[var(--color-text-muted)] underline-offset-2 hover:underline"
          >
            “{item.note}”
          </button>
        )}
      </div>
      <NoteButton hasNote={!!item.note} onClick={() => setNoting(true)} />
      <Stepper
        value={item.quantityPlanned}
        onIncrement={() => void incrementItemQuantity(item, 1)}
        onDecrement={() => void incrementItemQuantity(item, -1)}
        onSet={(n) => void incrementItemQuantity(item, n - item.quantityPlanned)}
        min={1}
      />
      <IconButton
        label="Remover"
        onClick={() => {
          void softDeleteItem(item);
          showUndoSnackbar('Item removido.', () => void undoSoftDeleteItem(item), { key: 'item-removed', plural: (n) => `${n} itens removidos.` });
        }}
      >
        <Trash2 size={18} />
      </IconButton>

      <TextInputSheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Renomear item"
        initialValue={item.name}
        confirmLabel="Salvar"
        onSubmit={(name) => void renameItem(item, name)}
      />
      <TextInputSheet
        open={noting}
        onClose={() => setNoting(false)}
        title={`Observação — ${item.name}`}
        placeholder="Ex.: marca, tamanho, onde comprar"
        initialValue={item.note ?? ''}
        confirmLabel="Salvar observação"
        allowEmpty
        onSubmit={(text) => void setNote(item, text)}
      />
    </li>
  );
}

interface MontarPhaseProps {
  listId: string;
}

/** Fase Montar (§6): catálogo inteiro, agrupado por frequência primeiro —
 * recorrentes sempre visíveis no topo, raros numa seção recolhida. */
export function MontarPhase({ listId }: MontarPhaseProps) {
  const catalogItems = useCatalogStore((s) => s.items);
  const items = useListsStore((s) => s.itemsFor(listId));
  const rareExpanded = useCorporativoUiStore((s) => s.rareExpandedByList[listId] ?? false);
  const toggleRareExpanded = useCorporativoUiStore((s) => s.toggleRareExpanded);

  const itemByCatalogId = useMemo(() => {
    const map = new Map<string, ListItem>();
    for (const item of items) {
      if (item.catalogItemId) map.set(item.catalogItemId, item);
    }
    return map;
  }, [items]);

  const { recurring, rare } = useMemo(() => {
    const recurring = catalogItems.filter((c) => c.frequency === 'recorrente');
    const rare = catalogItems.filter((c) => c.frequency === 'rara');
    return { recurring, rare };
  }, [catalogItems]);

  // Itens avulsos (§5, fora do catálogo) — adicionados pelo "+" do topo,
  // não têm catalogItemId e por isso não entram no agrupamento acima.
  const customItems = useMemo(() => items.filter((i) => !i.catalogItemId), [items]);

  if (catalogItems.length === 0 && customItems.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
        Catálogo ainda vazio — o Dono cadastra em Ajustes. Use o “+” no topo para um item avulso.
      </p>
    );
  }

  return (
    <div className="pb-4">
      <ul>
        {recurring.map((c, i) => (
          <CatalogRow key={c.id} listId={listId} catalogItem={c} existing={itemByCatalogId.get(c.id)} index={i} />
        ))}
      </ul>

      {rare.length > 0 && (
        <>
          <button
            onClick={() => toggleRareExpanded(listId)}
            className="flex min-h-[44px] w-full items-center justify-between px-4 text-sm font-medium text-[var(--color-text-muted)]"
          >
            Raros ({rare.length})
            <ChevronDown
              size={16}
              className={`transition-transform duration-[var(--motion-fast)] ${rareExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {rareExpanded && (
            <ul>
              {rare.map((c, i) => (
                <CatalogRow key={c.id} listId={listId} catalogItem={c} existing={itemByCatalogId.get(c.id)} index={i} />
              ))}
            </ul>
          )}
        </>
      )}

      {customItems.length > 0 && (
        <>
          <p className="px-4 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Avulsos
          </p>
          <ul>
            {customItems.map((item, i) => (
              <CustomItemRow key={item.id} item={item} index={i} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
