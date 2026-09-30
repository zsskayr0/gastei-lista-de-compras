import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/authStore';
import { Button } from '../../components/ui/Button';
import { ErrorCard } from '../../components/ui/ErrorViews';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { AuthLayout } from './AuthLayout';

const inputClass =
  'min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const acceptInvite = useAuthStore((s) => s.acceptInvite);
  const error = useAuthStore((s) => s.error);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || password !== confirm) return;
    setSubmitting(true);
    try {
      await acceptInvite(token, { name, email, password });
    } catch {
      // erro em authStore.error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Você foi convidada" subtitle="Complete o cadastro pra entrar na família.">
      <form onSubmit={onSubmit} className="space-y-3">
        <input required placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <input
          type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" autoComplete="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <PasswordInput value={password} onChange={setPassword} minLength={8} autoComplete="new-password" />
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="Confirmar senha"
          minLength={8}
          autoComplete="new-password"
        />
        {mismatch && <p className="text-sm text-[var(--color-danger)]">As senhas não coincidem.</p>}
        {error && <ErrorCard error={error} />}
        <Button type="submit" size="lg" className="w-full" disabled={submitting || mismatch}>
          {submitting ? 'Entrando…' : 'Entrar na família'}
        </Button>
      </form>
    </AuthLayout>
  );
}
