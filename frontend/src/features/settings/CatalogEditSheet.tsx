import { useEffect, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { CatalogThumb } from '../../components/ui/CatalogThumb';
import { FrequencyToggle } from '../../components/ui/FrequencyToggle';
import { CategoryGrid } from '../../components/ui/CategoryPicker';
import type { CatalogItem, Category, Frequency } from '../../types/domain';
import type { CatalogUpdateDto } from '../../lib/api/endpoints';

const FIELD =
  'min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

export interface CatalogEditFormProps {
  item: CatalogItem;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onSave: (id: string, dto: CatalogUpdateDto) => void;
  onDelete: (item: CatalogItem) => void;
  onUploadImage: (item: CatalogItem, file: File) => void;
  onRemoveImage: (item: CatalogItem) => void;
  /** Erro da última tentativa. */
  error?: DescribedError | null;
  /** Título da seção (o sheet mobile usa um rótulo genérico; o painel de
   * desktop mostra o nome do item, já que ele fica sempre visível). */
  heading?: string;
}

/** Campos de edição de um item do catálogo (nome, foto, categoria, frequência,
 * esperado) — usado tanto na sheet mobile quanto no painel lateral de desktop. */
export function CatalogEditForm({
  item,
  categories,
  saving,
  onClose,
  onSave,
  onDelete,
  onUploadImage,
  onRemoveImage,
  error,
  heading = 'Editar item',
}: CatalogEditFormProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('rara');
  const [expected, setExpected] = useState('');

  useEffect(() => {
    setConfirmDelete(false);
    setName(item.name);
    setCategoryId(item.categoryId ?? '');
    setFrequency(item.frequency);
    setExpected(item.expectedQuantity != null ? String(item.expectedQuantity) : '');
    // Só reinicia o formulário ao trocar de item — subir uma foto atualiza `item` mas não pode apagar o que foi digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const submit = () => {
    const dto: CatalogUpdateDto = {};
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed !== item.name) dto.name = trimmed;
    // O backend não aceita "sem categoria"; só envia quando há uma escolhida e mudou.
    if (categoryId && categoryId !== item.categoryId) dto.categoryId = categoryId;
    if (frequency !== item.frequency) dto.frequency = frequency;
    const qty = expected.trim() === '' ? null : Number(expected.replace(',', '.'));
    if (qty != null && Number.isFinite(qty) && qty !== item.expectedQuantity) dto.expectedQuantity = qty;
    if (Object.keys(dto).length === 0) return onClose();
    onSave(item.id, dto);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-3 px-4 pt-3"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">{heading}</p>
      <div className="flex items-center gap-3">
        <CatalogThumb item={item} size={72} colorHex={categories.find((c) => c.id === item.categoryId)?.color} />
        <div className="flex flex-wrap gap-2">
          <label
            className={
              'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 text-[15px] font-medium text-[var(--color-text)] transition-transform active:scale-[0.97] ' +
              (saving ? 'pointer-events-none opacity-50' : '')
            }
          >
            <Camera size={16} /> {item.imageUpdatedAt ? 'Trocar foto' : 'Adicionar foto'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ''; // permite escolher o mesmo arquivo de novo
                if (file) onUploadImage(item, file);
              }}
            />
          </label>
          {item.imageUpdatedAt && (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onRemoveImage(item)}>
              Remover foto
            </Button>
          )}
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
      </label>
      <div>
        <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Categoria</span>
        <CategoryGrid categories={categories} value={categoryId} onPick={setCategoryId} compact />
      </div>
      <div>
        <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Frequência</span>
        <FrequencyToggle value={frequency} onChange={setFrequency} />
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--color-text-muted)]">Quantidade esperada</span>
        <input
          inputMode="decimal"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="—"
          className={FIELD}
        />
      </label>
      {error && <ErrorCard error={error} />}
      <div className="sticky bottom-0 -mx-4 bg-[var(--color-surface)] px-4 pb-1 pt-2">
        <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
      {confirmDelete ? (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" className="flex-1" disabled={saving} onClick={() => onDelete(item)}>
            Excluir mesmo
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" className="w-full text-[var(--color-danger)]" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} /> Excluir do catálogo
        </Button>
      )}
    </form>
  );
}

interface Props extends Omit<CatalogEditFormProps, 'item' | 'heading'> {
  item: CatalogItem | null;
}

/** Edição de um item do catálogo em bottom sheet — usado no celular e em
 * telas estreitas (`lg-`); em desktop largo o painel lateral assume. */
export function CatalogEditSheet({ item, onClose, ...rest }: Props) {
  if (!item) return null;
  return (
    <BottomSheet open onClose={onClose}>
      <CatalogEditForm item={item} onClose={onClose} {...rest} />
    </BottomSheet>
  );
}
