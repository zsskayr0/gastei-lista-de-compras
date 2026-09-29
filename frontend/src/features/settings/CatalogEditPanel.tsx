import { X } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';
import { CatalogEditForm, type CatalogEditFormProps } from './CatalogEditSheet';

/** Painel fixo à direita da grade — a versão de tela larga da sheet de edição
 * (§13 do FRONTEND.md): fica sempre visível ao lado da lista, em vez de cobri-la. */
export function CatalogEditPanel({ item, onClose, ...rest }: { item: CatalogEditFormProps['item'] | null } & Omit<
  CatalogEditFormProps,
  'item' | 'heading'
>) {
  return (
    <aside className="sticky top-0 hidden max-h-[100dvh] w-[360px] shrink-0 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] pb-4 lg:block">
      {item ? (
        <>
          <div className="flex items-center justify-end px-2 pt-2">
            <IconButton label="Fechar" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </div>
          <CatalogEditForm item={item} onClose={onClose} heading={item.name} {...rest} />
        </>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-[var(--color-text-faint)]">
          Selecione um item na lista para editar.
        </p>
      )}
    </aside>
  );
}
