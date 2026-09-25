import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/authStore';

/** Telas do painel do Dono. O backend já barra (assertRole), mas quem digita
 * a URL não deve ver uma tela quebrada — volta para Ajustes. */
export function OwnerOnly({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.session?.role);
  if (role !== 'owner') return <Navigate to="/ajustes" replace />;
  return <>{children}</>;
}
