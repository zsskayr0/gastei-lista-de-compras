import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/authStore';
import { Button } from '../../components/ui/Button';
import { ErrorCard } from '../../components/ui/ErrorViews';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { AuthLayout } from './AuthLayout';
import { getApiBaseUrl, isNativeShell, setApiBaseUrl } from '../../lib/api/client';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const native = isNativeShell();
  const [server, setServer] = useState(() => (native ? getApiBaseUrl().replace(/\/api$/, '') : ''));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (native) setApiBaseUrl(server);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // erro já fica em authStore.error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Entrar" subtitle="Sua lista está esperando.">
      <form onSubmit={onSubmit} className="space-y-3">
        {native && (
          <input
            type="url"
            required
            placeholder="Endereço do servidor (http://…:3283)"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            className="min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
        )}
        <input
          type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" autoComplete="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <PasswordInput value={password} onChange={setPassword} />
        {error && <ErrorCard error={error} />}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        Primeiro acesso da família?{' '}
        <Link to="/bootstrap" className="text-[var(--color-accent)]">
          Criar família
        </Link>
      </p>
    </AuthLayout>
  );
}
