import { useEffect, useState } from 'react';
import { initials } from '../../utils/text';
import { avatarImageUrl } from '../../lib/api/media';
import { useMembersStore } from '../../state/membersStore';

// Cor determinística por pessoa (derivada do id) — cor fixa sem precisar de
// um campo dedicado no backend (§7: "cor fixa por pessoa"). Paleta neutra,
// nunca vermelho (reservado ao erro de sync).
const PALETTE = ['#6E58C9', '#4C8CBF', '#2FA6A0', '#C97B3D', '#8B6F47', '#C2578F'];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

interface InitialAvatarProps {
  name: string;
  userId: string;
  size?: number;
}

/** Foto de perfil da pessoa; sem foto (ou se falhar ao carregar) cai nas iniciais coloridas. */
export function InitialAvatar({ name, userId, size = 28 }: InitialAvatarProps) {
  const avatarUpdatedAt = useMembersStore((s) => s.byId[userId]?.avatarUpdatedAt);
  const url = avatarImageUrl(userId, avatarUpdatedAt);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        title={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: colorForId(userId) }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
