import { getApiBaseUrl } from './client';
import type { CatalogItem } from '../../types/domain';

/** URL da foto do item, ou null se não tem. `?v=` muda a cada troca (a resposta é cacheada para sempre). */
export function catalogImageUrl(item: Pick<CatalogItem, 'id' | 'imageUpdatedAt'>): string | null {
  if (!item.imageUpdatedAt) return null;
  const v = Date.parse(item.imageUpdatedAt);
  return `${getApiBaseUrl()}/media/catalog/${item.id}?v=${Number.isFinite(v) ? v : 0}`;
}

/** URL da foto de perfil, ou null se a pessoa não tem. `?v=` muda a cada troca. */
export function avatarImageUrl(userId: string, avatarUpdatedAt: string | null | undefined): string | null {
  if (!avatarUpdatedAt) return null;
  const v = Date.parse(avatarUpdatedAt);
  return `${getApiBaseUrl()}/media/avatar/${userId}?v=${Number.isFinite(v) ? v : 0}`;
}
