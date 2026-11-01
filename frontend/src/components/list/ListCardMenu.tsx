import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Archive, Pencil, Smile, Trash2 } from 'lucide-react';
import type { List } from '../../types/domain';
import { useListsStore } from '../../state/listsStore';
import { useSnackbarStore } from '../../state/snackbarStore';
import { TextInputSheet } from '../ui/TextInputSheet';
import { ListIconSheet } from '../ui/ListIconSheet';

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;
const MENU_W = 220;
const MENU_H = 4 * 48 + 48;

interface ListCardMenuProps {
  list: List;
  to: string;
  className?: string;
  children: ReactNode;
}

/** Card de lista que abre um menu de ações ao segurar (ou botão direito). */
export function ListCardMenu({ list, to, className, children }: ListCardMenuProps) {
  const renameList = useListsStore((s) => s.renameList);
  const setListIcon = useListsStore((s) => s.setListIcon);
  const setListArchived = useListsStore((s) => s.setListArchived);
  const deleteList = useListsStore((s) => s.deleteList);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  const openAt = (x: number, y: number) => {
    const left = Math.max(8, Math.min(x - MENU_W / 2, window.innerWidth - MENU_W - 8));
    const top = Math.max(8, Math.min(y + 8, window.innerHeight - MENU_H - 8));
    setMenu({ x: left, y: top });
  };

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const actions = [
    { label: 'Renomear', icon: <Pencil size={18} />, run: () => setRenaming(true) },
    { label: 'Trocar ícone', icon: <Smile size={18} />, run: () => setPickingIcon(true) },
    {
      label: 'Arquivar',
      icon: <Archive size={18} />,
      run: () => {
        void setListArchived(list.id, true);
        showSnackbar({ message: 'Lista arquivada.', tone: 'neutral', durationMs: 3000 });
      },
    },
    {
      label: 'Excluir lista',
      icon: <Trash2 size={18} />,
      danger: true,
      run: () => {
        void deleteList(list.id);
        showSnackbar({ message: 'Lista excluída.', tone: 'neutral', durationMs: 4000 });
      },
    },
  ];

  return (
    <>
      <Link
        to={to}
        className={className}
        draggable={false}
        style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
        onPointerDown={(e) => {
          held.current = false;
          origin.current = { x: e.clientX, y: e.clientY };
          cancel();
          timer.current = window.setTimeout(() => {
            held.current = true;
            const o = origin.current;
            if (o) openAt(o.x, o.y);
            navigator.vibrate?.(15);
          }, HOLD_MS);
        }}
        onPointerMove={(e) => {
          const o = origin.current;
          if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_TOLERANCE) cancel();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => {
          e.preventDefault();
          cancel();
          held.current = true;
          openAt(e.clientX, e.clientY);
        }}
        onClick={(e) => {
          if (held.current) {
            e.preventDefault();
            held.current = false;
          }
        }}
      >
        {children}
      </Link>

      {menu &&
        createPortal(
          <div className="fixed inset-0 z-50" onPointerDown={() => setMenu(null)} onContextMenu={(e) => e.preventDefault()}>
            <div
              role="menu"
              onPointerDown={(e) => e.stopPropagation()}
              style={{ left: menu.x, top: menu.y, width: MENU_W }}
              className="absolute overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)] animate-[fade-in_var(--motion-base)_ease-out]"
            >
              <p className="truncate px-3 py-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                {list.title}
              </p>
              {actions.map((a) => (
                <button
                  key={a.label}
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    a.run();
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-3 px-3 text-left text-sm ${
                    a.danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'
                  }`}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      <TextInputSheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Renomear lista"
        initialValue={list.title}
        confirmLabel="Salvar"
        onSubmit={(name) => void renameList(list.id, name)}
      />
      <ListIconSheet
        open={pickingIcon}
        onClose={() => setPickingIcon(false)}
        value={list.icon ?? null}
        onPick={(key) => void setListIcon(list.id, key)}
        onRemove={() => void setListIcon(list.id, null)}
      />
    </>
  );
}
