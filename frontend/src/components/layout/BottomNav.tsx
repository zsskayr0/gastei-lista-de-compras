import { NavLink, useLocation } from 'react-router-dom';
import { Inbox, Home, Briefcase, Settings } from 'lucide-react';
import clsx from 'clsx';
import { PlusButton } from './PlusButton';
import { useKeyboardOpen } from '../../hooks/useKeyboardInset';

interface BottomNavProps {
  onAddTap: () => void;
  onAddLongPress: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors duration-[var(--motion-fast)]',
    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
  );

export function BottomNav({ onAddTap, onAddLongPress }: BottomNavProps) {
  const keyboardOpen = useKeyboardOpen();
  const location = useLocation();
  const plusEnabled = location.pathname.startsWith('/inbox') || location.pathname.startsWith('/casa');

  // Some quando o teclado abre (§4) — não só quando o foco muda de tela.
  if (keyboardOpen) return null;

  return (
    <nav className="safe-bottom flex items-end border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <NavLink to="/inbox" className={linkClass}>
        <Inbox size={22} />
        Inbox
      </NavLink>
      <NavLink to="/casa" className={linkClass}>
        <Home size={22} />
        Casa
      </NavLink>
      <div className="flex flex-1 justify-center">
        <PlusButton disabled={!plusEnabled} onTap={onAddTap} onLongPress={onAddLongPress} />
      </div>
      <NavLink to="/corporativo" className={linkClass}>
        <Briefcase size={22} />
        Corporativo
      </NavLink>
      <NavLink to="/ajustes" className={linkClass}>
        <Settings size={22} />
        Ajustes
      </NavLink>
    </nav>
  );
}
