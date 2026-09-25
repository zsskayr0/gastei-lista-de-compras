import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, User, Smartphone, Users, Package, Tags, History, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../lib/auth/authStore';

interface Row {
  to: string;
  label: string;
  icon: ReactNode;
  ownerOnly?: boolean;
}

const ROWS: Row[] = [
  { to: '/ajustes/conta', label: 'Conta', icon: <User size={18} /> },
  { to: '/ajustes/aparelho', label: 'Aparelho', icon: <Smartphone size={18} /> },
  { to: '/ajustes/familia', label: 'Família e convites', icon: <Users size={18} /> },
  { to: '/ajustes/erros', label: 'Registro de erros', icon: <AlertOctagon size={18} /> },
  { to: '/ajustes/catalogo', label: 'Catálogo', icon: <Package size={18} />, ownerOnly: true },
  { to: '/ajustes/categorias', label: 'Categorias', icon: <Tags size={18} />, ownerOnly: true },
  { to: '/ajustes/historico', label: 'Histórico', icon: <History size={18} />, ownerOnly: true },
  { to: '/ajustes/sincronizacao', label: 'Sincronização', icon: <RefreshCw size={18} />, ownerOnly: true },
];

/** Navegação em árvore estilo configurações do sistema, filtrada por papel
 * (§4 do FRONTEND.md). Catálogo, Histórico e Sincronização são o painel do
 * Dono (M3) e ficam escondidos dos demais papéis. */
export function SettingsHome() {
  const role = useAuthStore((s) => s.session?.role);
  const visible = ROWS.filter((r) => !r.ownerOnly || role === 'owner');

  return (
    <div className="pb-4">
      <h1 className="font-display px-4 pb-2 pt-4 text-2xl font-semibold">Ajustes</h1>
      <ul>
        {visible.map((row) => (
          <li key={row.to}>
            <Link
              to={row.to}
              className="flex min-h-[52px] items-center gap-3 border-b border-[var(--color-border)] px-4 text-[var(--color-text)]"
            >
              <span className="text-[var(--color-text-muted)]">{row.icon}</span>
              <span className="flex-1">{row.label}</span>
              <ChevronRight size={18} className="text-[var(--color-text-faint)]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
