import { useMemo, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { FrequencyToggle } from '../../components/ui/FrequencyToggle';
import { CategoryGrid } from '../../components/ui/CategoryPicker';
import { normalizeText, parseNameList } from '../../utils/text';
import type { CatalogItem, Category, Frequency } from '../../types/domain';
import type { BulkCatalogEntry } from '../../lib/api/endpoints';

const FIELD =
  'min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

interface Props {
  open: boolean;
  existing: CatalogItem[];
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (entries: BulkCatalogEntry[]) => void;
}

/** Cola uma lista de nomes (um por linha) e cria vários itens de uma vez.
 * O parsing é todo local; só o que ainda não existe vai ao endpoint bulk. */
export function CatalogPasteSheet({ open, existing, categories, saving, onClose, onSubmit }: Props) {
  const [raw, setRaw] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('rara');

  const { fresh, duplicates } = useMemo(() => {
    const known = new Set(existing.map((i) => normalizeText(i.name)));
    const names = parseNameList(raw);
    return {
      fresh: names.filter((n) => !known.has(normalizeText(n))),
      duplicates: names.filter((n) => known.has(normalizeText(n))).length,
    };
  }, [raw, existing]);

  const submit = () => {
    if (fresh.length === 0) return;
    onSubmit(fresh.map((name) => ({ name, frequency, ...(categoryId ? { categoryId } : {}) })));
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setRaw('');
        onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3 px-4 pb-4 pt-3"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">Colar lista</p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={7}
          placeholder={'Um nome por linha\narroz\nfeijão\nmanteiga'}
          className={FIELD + ' py-2'}
        />
        <div>
          <span className="mb-1 block text-sm text-[var(--color-text-muted)]">
            Categoria para todos {categoryId ? '(toque de novo para limpar)' : '(opcional)'}
          </span>
          <CategoryGrid
            categories={categories}
            value={categoryId}
            onPick={(id) => setCategoryId((cur) => (cur === id ? '' : id))}
            compact
          />
        </div>
        <div>
          <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Frequência para todos</span>
          <FrequencyToggle value={frequency} onChange={setFrequency} />
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {fresh.length} novo(s)
          {duplicates > 0 && ` · ${duplicates} já existe(m) e será(ão) ignorado(s)`}
        </p>
        <Button type="submit" className="w-full" disabled={saving || fresh.length === 0}>
          {saving ? 'Criando…' : fresh.length === 1 ? 'Criar 1 item' : `Criar ${fresh.length} itens`}
        </Button>
      </form>
    </BottomSheet>
  );
}
