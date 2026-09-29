import { apiRequest, ApiError } from './client';
import type {
  ArchivedListEntry,
  AuthSession,
  CatalogItem,
  Category,
  DictionaryTerm,
  List,
  ListItem,
  RemoteSyncEvent,
  Role,
  SyncEventPayload,
  SyncStatusMember,
} from '../../types/domain';

// Espelha BACKEND.md §4.2 — nomes e verbos idênticos aos do NestJS.

interface RawAuthResponse {
  accessToken: string;
  refreshToken: string;
  deviceSessionId: string;
  user: { id: string; name: string; email: string };
  familyId: string | null;
  role: Role | null;
}

function toSession(raw: RawAuthResponse): AuthSession {
  if (!raw.familyId || !raw.role) {
    // v1 sempre tem família + papel após login — se não vier, a conta está
    // órfã (bug de backend ou conta pré-migração); melhor falhar alto do
    // que deixar a UI num estado que ela não sabe navegar.
    throw new ApiError(422, { message: 'Conta sem família associada.' });
  }
  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    deviceSessionId: raw.deviceSessionId,
    user: raw.user,
    familyId: raw.familyId,
    role: raw.role,
  };
}

export const authApi = {
  bootstrapFamily: (dto: { familyName: string; name: string; email: string; password: string }) =>
    apiRequest<RawAuthResponse>('/families', { method: 'POST', body: dto, auth: false }).then(toSession),

  login: (dto: { email: string; password: string }) =>
    apiRequest<RawAuthResponse>('/auth/login', { method: 'POST', body: dto, auth: false }).then(toSession),

  acceptInvite: (token: string, dto: { name: string; email: string; password: string }) =>
    apiRequest<RawAuthResponse>(`/invites/${token}/accept`, { method: 'POST', body: dto, auth: false }).then(
      toSession,
    ),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),

  requestPasswordReset: (email: string) =>
    apiRequest<void>('/auth/password-reset/request', { method: 'POST', body: { email }, auth: false }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    apiRequest<void>('/auth/password-reset/confirm', {
      method: 'POST',
      body: { token, newPassword },
      auth: false,
    }),
};

export const listsApi = {
  // Já vem com `items` embutidos (ListsService.listForFamily inclui items não-deletados).
  listForFamily: (familyId: string) => apiRequest<Array<List & { items: ListItem[] }>>(`/families/${familyId}/lists`),
  create: (dto: { familyId: string; folder: string; title: string; icon?: string; templateId?: string }) =>
    apiRequest<List>('/lists', { method: 'POST', body: dto }),
  get: (id: string) => apiRequest<List & { items: ListItem[] }>(`/lists/${id}`),
  update: (id: string, dto: Partial<Pick<List, 'title' | 'phase' | 'status'>> & { icon?: string }) =>
    apiRequest<List>(`/lists/${id}`, { method: 'PATCH', body: dto }),
  softDelete: (id: string) => apiRequest<void>(`/lists/${id}`, { method: 'DELETE' }),
};

export const syncApi = {
  pull: (listId: string, since?: string) =>
    apiRequest<{ events: RemoteSyncEvent[]; cursor: string; serverTime: string }>(`/lists/${listId}/sync`, {
      query: { since },
    }),
  push: (listId: string, events: SyncEventPayload[]) =>
    apiRequest<{ results: Array<{ id: string; applied: boolean; duplicate: boolean }>; serverTime: string }>(
      `/lists/${listId}/sync`,
      { method: 'POST', body: { events } },
    ),
};

export interface CatalogUpdateDto {
  name?: string;
  categoryId?: string;
  frequency?: 'recorrente' | 'rara';
  expectedQuantity?: number;
  illustrationId?: string;
}

export interface BulkCatalogEntry {
  name: string;
  categoryId?: string;
  frequency?: 'recorrente' | 'rara';
  expectedQuantity?: number;
}

export const catalogApi = {
  listForFamily: (familyId: string) => apiRequest<CatalogItem[]>(`/families/${familyId}/catalog`),
  update: (id: string, dto: CatalogUpdateDto) =>
    apiRequest<CatalogItem>(`/catalog/${id}`, { method: 'PATCH', body: dto }),
  remove: (id: string) => apiRequest<{ ok: true }>(`/catalog/${id}`, { method: 'DELETE' }),
  /** Envia a foto já reduzida (corpo cru). Devolve o item com `imageUpdatedAt` novo. */
  uploadImage: (id: string, image: Blob) =>
    apiRequest<CatalogItem>(`/catalog/${id}/image`, { method: 'POST', body: image }),
  removeImage: (id: string) => apiRequest<CatalogItem>(`/catalog/${id}/image`, { method: 'DELETE' }),
  bulkCreate: (familyId: string, items: BulkCatalogEntry[]) =>
    apiRequest<CatalogItem[]>('/catalog/bulk', { method: 'POST', body: { familyId, items } }),
};

export const dictionaryApi = {
  listForFamily: (familyId: string) =>
    apiRequest<DictionaryTerm[]>(`/families/${familyId}/dictionary-terms`),
  promote: (id: string) => apiRequest<CatalogItem>(`/dictionary-terms/${id}/promote`, { method: 'POST' }),
};

export const invitesApi = {
  create: (familyId: string) => apiRequest<{ id: string; token: string; expiresAt: string }>('/invites', {
    method: 'POST',
    body: { familyId },
  }),
  list: (familyId: string) => apiRequest<Array<{ id: string; token: string; status: string; expiresAt: string }>>(
    '/invites',
    { query: { familyId } },
  ),
  cancel: (id: string) => apiRequest<void>(`/invites/${id}`, { method: 'DELETE' }),
};

export const usersApi = {
  /** Envia a foto de perfil já reduzida (corpo cru). */
  uploadAvatar: (image: Blob) =>
    apiRequest<{ avatarUpdatedAt: string }>('/users/me/avatar', { method: 'POST', body: image }),
  removeAvatar: () => apiRequest<{ avatarUpdatedAt: null }>('/users/me/avatar', { method: 'DELETE' }),
};

export const familiesApi = {
  members: (familyId: string) =>
    apiRequest<Array<{ userId: string; name: string; role: Role; avatarUpdatedAt?: string | null }>>(`/families/${familyId}/members`),
  syncStatus: (familyId: string) =>
    apiRequest<{ serverTime: string; members: SyncStatusMember[] }>(`/families/${familyId}/sync-status`),
  presence: (familyId: string) =>
    apiRequest<{ active: Array<{ userId: string; listId: string; initials: string }> }>(
      `/families/${familyId}/presence`,
    ),
  heartbeat: (familyId: string, listId: string) =>
    apiRequest<{ ok: true }>(`/families/${familyId}/presence`, { method: 'POST', body: { listId } }),
};

export const historyApi = {
  list: (familyId: string, cursor?: string, pageSize?: number) =>
    apiRequest<{ items: ArchivedListEntry[]; nextCursor: string | null }>(`/families/${familyId}/history`, {
      query: { cursor, pageSize },
    }),
};

export interface CategoryInput {
  name: string;
  color: string;
  icon: string;
}

export const categoriesApi = {
  listForFamily: (familyId: string) => apiRequest<Category[]>(`/families/${familyId}/categories`),
  create: (familyId: string, dto: CategoryInput) =>
    apiRequest<Category>(`/families/${familyId}/categories`, { method: 'POST', body: dto }),
  update: (id: string, dto: Partial<CategoryInput>) =>
    apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: dto }),
  /** Categoria em uso exige `reassignTo` (senão 409). */
  remove: (id: string, reassignTo?: string) =>
    apiRequest<{ ok: true; movedCatalogItems: number; movedListItems: number }>(`/categories/${id}`, {
      method: 'DELETE',
      query: { reassignTo },
    }),
};
