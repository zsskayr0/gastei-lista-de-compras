import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { CATEGORY_COLORS, CategoryBadge, CategoryIcon, ICON_KEYS } from '../../components/ui/CategoryPicker';
import type { Category } from '../../types/domain';
import type { CategoryInput } from '../../lib/api/endpoints';

const FIELD =
  'min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

interface Props {
  /** `null` fechado; `'new'` cria; uma categoria edita. */
  target: Category | 'new' | null;
  saving: boolean;
  onClose: () => void;
  onSave: (dto: CategoryInput) => void;
  onDelete: (category: Category) => void;
  /** Erro da última tentativa — aparece aqui porque a sheet cobre a tela. */
  error?: DescribedError | null;
}

/** Cria/edita categoria: nome, cor (paleta fixa) e ícone, com pré-visualização
 * ao vivo. Excluir pede confirmação num segundo toque. */
export function CategoryEditSheet({ target, saving, onClose, onSave, onDelete, error }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(ICON_KEYS[0]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (target === null) return;
    setConfirmDelete(false);
    if (target === 'new') {
      setName('');
      setColor(CATEGORY_COLORS[7]);
      setIcon('tag');
    } else {
      setName(target.name);
      setColor(target.color);
      setIcon(target.icon);
    }
  }, [target]);

  if (target === null) return null;
  const existing = target === 'new' ? null : target;
  const trimmed = name.trim();

  return (
    <BottomSheet open onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave({ name: trimmed, color, icon });
        }}
        className="space-y-3 px-4 pt-3"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
          {existing ? 'Editar categoria' : 'Nova categoria'}
        </p>

        <div className="flex items-center gap-3">
          <CategoryBadge category={{ id: 'preview', familyId: '', name: trimmed, color, icon }} size={44} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da categoria"
            aria-label="Nome da categoria"
            maxLength={40}
            className={FIELD}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm text-[var(--color-text-muted)]">Cor</span>
          <div className="grid grid-cols-7 gap-2" role="radiogroup" aria-label="Cor">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                style={{ background: c, boxShadow: c === color ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${c}` : undefined }}
                className="h-9 w-full rounded-full transition-[transform,box-shadow] duration-[var(--motion-base)] ease-[var(--motion-ease)] active:scale-90"
              />
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm text-[var(--color-text-muted)]">Ícone</span>
          <div className="grid max-h-[228px] grid-cols-6 gap-2 overflow-y-auto overscroll-contain rounded-[var(--radius-md)] pr-1" role="radiogroup" aria-label="Ícone">
            {ICON_KEYS.map((k) => {
              const on = k === icon;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Ícone ${k}`}
                  onClick={() => setIcon(k)}
                  style={on ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, borderColor: color } : undefined}
                  className={
                    'flex h-11 items-center justify-center rounded-[var(--radius-md)] border transition-[transform,background-color] duration-[var(--motion-base)] ease-[var(--motion-ease)] active:scale-90 ' +
                    (on ? 'text-[var(--color-text)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]')
                  }
                >
                  <CategoryIcon icon={k} size={20} />
                </button>
              );
            })}
          </div>
        </div>

        {error && <ErrorCard error={error} />}

        <div className="sticky bottom-0 -mx-4 bg-[var(--color-surface)] px-4 pb-1 pt-2">
          <Button type="submit" className="w-full" disabled={saving || !trimmed}>
            {saving ? 'Salvando…' : existing ? 'Salvar' : 'Criar categoria'}
          </Button>
        </div>

        {existing &&
          (confirmDelete ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" className="flex-1" disabled={saving} onClick={() => onDelete(existing)}>
                Excluir mesmo
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="w-full text-[var(--color-danger)]" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Excluir categoria
            </Button>
          ))}
      </form>
    </BottomSheet>
  );
}
