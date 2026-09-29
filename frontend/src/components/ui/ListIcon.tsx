import { listIcon } from '../../content/listIcons';
import type { List } from '../../types/domain';

interface ListIconProps {
  list: Pick<List, 'icon' | 'folder'>;
  size?: number;
}

/** Ícone da lista num quadradinho rosado — o mesmo em cards e cabeçalhos. */
export function ListIcon({ list, size = 40 }: ListIconProps) {
  const Icon = listIcon(list.icon, list.folder);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] text-[var(--color-accent)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.55)} />
    </span>
  );
}
