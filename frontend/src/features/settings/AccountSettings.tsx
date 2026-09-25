import { useAuthStore } from '../../lib/auth/authStore';
import { SettingsScreen } from './SettingsScreen';
import { Button } from '../../components/ui/Button';

export function AccountSettings() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);

  if (!session) return null;

  return (
    <SettingsScreen title="Conta">
      <div className="space-y-1 py-2">
        <p className="text-sm text-[var(--color-text-muted)]">Nome</p>
        <p className="text-[15px] text-[var(--color-text)]">{session.user.name}</p>
      </div>
      <div className="space-y-1 py-2">
        <p className="text-sm text-[var(--color-text-muted)]">E-mail</p>
        <p className="text-[15px] text-[var(--color-text)]">{session.user.email}</p>
      </div>
      <div className="space-y-1 py-2">
        <p className="text-sm text-[var(--color-text-muted)]">Papel</p>
        <p className="text-[15px] text-[var(--color-text)]">
          {session.role === 'owner' ? 'Dono' : 'Admin'}
        </p>
      </div>
      <Button variant="secondary" className="mt-6 w-full" onClick={() => void logout()}>
        Sair
      </Button>
    </SettingsScreen>
  );
}
