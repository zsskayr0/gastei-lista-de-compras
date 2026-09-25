import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Stepper } from '../../components/ui/Stepper';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { useListsStore } from '../../state/listsStore';
import { normalizeText } from '../../utils/text';

interface AddItemSheetProps {
  open: boolean;
  onClose: () => void;
  listId: string | null;
  listLabel: string;
}

/** Entrada (§5): confirmar não fecha o sheet — volta ao campo vazio,
 * focado, pronto pro próximo item. Fecha por arrasto ou toque fora. */
export function AddItemSheet({ open, onClose, listId, listLabel }: AddItemSheetProps) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();
  const addItem = useListsStore((s) => s.addItem);

  // Sugestões: itens já existentes em qualquer lista da família, rankeados
  // por frequência de nome — fonte simples enquanto o catálogo completo
  // (~200 itens) não está no escopo desta passada.
  const allItems = useListsStore((s) => s.itemsByList);
  const suggestions = useMemo(() => {
    if (name.trim().length < 1) return [];
    const query = normalizeText(name);
    const seen = new Map<string, number>();
    for (const items of Object.values(allItems)) {
      for (const item of items) {
        const norm = normalizeText(item.name);
        if (norm.includes(query) && norm !== query) {
          seen.set(item.name, (seen.get(item.name) ?? 0) + 1);
        }
      }
    }
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([n]) => n);
  }, [name, allItems]);

  useEffect(() => {
    if (open) {
      setName('');
      setQty(1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const confirm = (chosenName?: string) => {
    const finalName = (chosenName ?? name).trim();
    if (!finalName || !listId) return;
    void addItem(listId, finalName, { quantityPlanned: qty });
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
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => confirm(s)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] active:scale-95"
              >
                {s}
              </button>
            ))}
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
