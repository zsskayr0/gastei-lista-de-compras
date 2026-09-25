import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/authStore';
import { Button } from '../../components/ui/Button';
import { ErrorCard } from '../../components/ui/ErrorViews';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { AuthLayout } from './AuthLayout';

const inputClass =
  'min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

export function BootstrapFamilyPage() {
  const bootstrapFamily = useAuthStore((s) => s.bootstrapFamily);
  const error = useAuthStore((s) => s.error);
  const [familyName, setFamilyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setSubmitting(true);
    try {
      await bootstrapFamily({ familyName, name: ownerName, email, password });
    } catch {
      // erro em authStore.error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Criar família" subtitle="Você é o Dono — cria a família e convida depois.">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          required
          placeholder="Nome da família"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className={inputClass}
        />
        <input
          required
          placeholder="Seu nome"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
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
          {submitting ? 'Criando…' : 'Criar família'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        Já tem conta?{' '}
        <Link to="/login" className="text-[var(--color-accent)]">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
