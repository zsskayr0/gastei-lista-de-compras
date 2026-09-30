import { reportError } from '../../state/errorStore';
import { ErrorCard } from '../../components/ui/ErrorViews';
import type { DescribedError } from '../../lib/errors/describe';
import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../../lib/auth/authStore';
import { useMembersStore } from '../../state/membersStore';
import { invitesApi } from '../../lib/api/endpoints';
import { serverOrigin } from '../../lib/api/client';
import { SettingsScreen } from './SettingsScreen';
import { Button } from '../../components/ui/Button';
import { InitialAvatar } from '../../components/ui/InitialAvatar';

export function FamilySettings() {
  const session = useAuthStore((s) => s.session);
  const byId = useMembersStore((s) => s.byId);
  const members = useMemo(() => Object.values(byId), [byId]);
  const [invite, setInvite] = useState<{ token: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DescribedError | null>(null);

  useEffect(() => {
    if (session) void useMembersStore.getState().init(session.familyId);
  }, [session]);

  if (!session) return null;

  const generateInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await invitesApi.create(session.familyId);
      setInvite(created);
    } catch (err) {
      setError(reportError(err, 'Gerar convite', { banner: false }));
    } finally {
      setLoading(false);
    }
  };

  const deepLink = invite ? `${serverOrigin()}/convite/${invite.token}` : null;

  return (
    <SettingsScreen title="Família e convites">
      <div className="py-2">
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">Membros</p>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3">
              <InitialAvatar name={m.name} userId={m.userId} />
              <span className="text-[15px] text-[var(--color-text)]">{m.name}</span>
              <span className="text-xs text-[var(--color-text-faint)]">
                {m.role === 'owner' ? 'Dono' : 'Admin'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        {!invite && (
          <Button onClick={() => void generateInvite()} disabled={loading}>
            {loading ? 'Gerando…' : 'Gerar convite (QR)'}
          </Button>
        )}
        {error && <div className="mt-2"><ErrorCard error={error} /></div>}
        {invite && deepLink && (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <QRCodeSVG value={deepLink} size={180} />
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Válido por 24h. Peça para escanear com a câmera.
            </p>
            <Button variant="secondary" onClick={() => setInvite(null)}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </SettingsScreen>
  );
}
