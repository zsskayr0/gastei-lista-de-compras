import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../lib/auth/authStore';
import { useMembersStore } from '../../state/membersStore';
import { usersApi } from '../../lib/api/endpoints';
import { resizeImage } from '../../utils/image';
import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { SettingsScreen } from './SettingsScreen';
import { Button } from '../../components/ui/Button';
import { InitialAvatar } from '../../components/ui/InitialAvatar';

export function AccountSettings() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const hasAvatar = useMembersStore((s) => Boolean(s.byId[session?.user.id ?? '']?.avatarUpdatedAt));
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DescribedError | null>(null);

  useEffect(() => {
    if (session) void useMembersStore.getState().init(session.familyId);
  }, [session]);

  if (!session) return null;

  const refresh = () => useMembersStore.getState().init(session.familyId);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // 256 px de lado maior: sobra para um avatar e a foto fica com poucos KB.
      await usersApi.uploadAvatar(await resizeImage(file, 256));
      await refresh();
    } catch (err) {
      setError(reportError(err, 'Trocar foto de perfil', { banner: false }));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      await usersApi.removeAvatar();
      await refresh();
    } catch (err) {
      setError(reportError(err, 'Remover foto de perfil', { banner: false }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsScreen title="Conta">
      <div className="flex flex-col items-center gap-3 py-4">
        <InitialAvatar name={session.user.name} userId={session.user.id} size={96} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> {busy ? 'Enviando…' : hasAvatar ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {hasAvatar && (
            <Button variant="secondary" disabled={busy} onClick={() => void onRemove()}>
              <Trash2 size={16} /> Remover
            </Button>
          )}
        </div>
        {error && <ErrorCard error={error} />}
      </div>
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
