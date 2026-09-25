import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { useListsStore, EMPTY_ITEMS } from '../../state/listsStore';

interface BuildFromInboxSheetProps {
  open: boolean;
  onClose: () => void;
}

/** "Montar lista com tudo que tem no Inbox" — os itens marcados saem do
 * Inbox e viram uma lista de Casa nova; se a lista for excluída (ou um
 * item removido dela) sem ser riscado, volta pro Inbox sozinho (§4 do
 * FRONTEND.md, ver listsStore.softDeleteItem/deleteList). */
export function BuildFromInboxSheet({ open, onClose }: BuildFromInboxSheetProps) {
  const inbox = useListsStore((s) => s.inboxList());
  const inboxItems = useListsStore((s) => (inbox ? s.itemsFor(inbox.id) : EMPTY_ITEMS));
  const buildListFromInbox = useListsStore((s) => s.buildListFromInbox);
  const navigate = useNavigate();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    const trimmed = title.trim();
    const chosen = inboxItems.filter((i) => selected.has(i.id));
    if (!trimmed || chosen.length === 0) return;
    setSubmitting(true);
    const created = await buildListFromInbox(trimmed, chosen);
    setSubmitting(false);
    setSelected(new Set());
    setTitle('');
    onClose();
    if (created) navigate(`/casa/${created.id}`);
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pb-4 pt-3">
        <p className="mb-3 text-sm font-medium text-[var(--color-text)]">Montar lista a partir do Inbox</p>

        {inboxItems.length === 0 ? (
          <p className="py-4 text-sm text-[var(--color-text-muted)]">O Inbox está vazio.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-faint)]">
                {selected.size} de {inboxItems.length} selecionado{selected.size === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelected(selected.size === inboxItems.length ? new Set() : new Set(inboxItems.map((i) => i.id)))
                }
                className="text-xs font-medium text-[var(--color-accent)]"
              >
                {selected.size === inboxItems.length ? 'Limpar seleção' : 'Selecionar tudo'}
              </button>
            </div>
            <ul className="mb-3 max-h-56 overflow-y-auto">
              {inboxItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 text-left hover:bg-[var(--color-surface-alt)]"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors duration-[var(--motion-fast)] ${
                        selected.has(item.id)
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                          : 'border-[var(--color-border-strong)]'
                      }`}
                    >
                      {selected.has(item.id) && (
                        <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-[var(--color-accent-fg)] stroke-[2.5]">
                          <path d="M3 8l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[15px] text-[var(--color-text)]">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome da lista"
          className="mb-3 min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <Button
          onClick={() => void submit()}
          disabled={!title.trim() || selected.size === 0 || submitting}
          className="w-full"
        >
          {submitting ? 'Criando…' : `Criar com ${selected.size} item${selected.size === 1 ? '' : 's'}`}
        </Button>
      </div>
    </BottomSheet>
  );
}
