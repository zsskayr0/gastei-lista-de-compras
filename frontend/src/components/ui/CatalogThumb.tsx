import { useEffect, useState } from 'react';
import { catalogImageUrl } from '../../lib/api/media';
import { ItemGlyph } from './ItemGlyph';
import type { CatalogItem } from '../../types/domain';

interface Props {
  item: Pick<CatalogItem, 'id' | 'name' | 'imageUpdatedAt'>;
  size?: number;
  colorHex?: string;
  className?: string;
}

/** Foto do item de catálogo; sem foto (ou se ela falhar ao carregar, ex.:
 * offline sem cache) cai na letra inicial colorida. */
export function CatalogThumb({ item, size = 40, colorHex, className = '' }: Props) {
  const url = catalogImageUrl(item);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) return <ItemGlyph name={item.name} colorHex={colorHex} size={size} />;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={'shrink-0 rounded-[var(--radius-md)] bg-white object-contain' + className}
    />
  );
}
