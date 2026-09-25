import { getApiBaseUrl } from './client';
import type { CatalogItem } from '../../types/domain';

/** URL da foto do item, ou null se não tem. `?v=` muda a cada troca (a resposta é cacheada para sempre). */
export function catalogImageUrl(item: Pick<CatalogItem, 'id' | 'imageUpdatedAt'>): string | null {
  if (!item.imageUpdatedAt) return null;
  const v = Date.parse(item.imageUpdatedAt);
  return `${getApiBaseUrl()}/media/catalog/${item.id}?v=${Number.isFinite(v) ? v : 0}`;
}
