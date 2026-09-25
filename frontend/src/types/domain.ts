// Espelha o schema do backend (BACKEND.md §2.1). IDs são UUID string.

export type Role = 'owner' | 'admin' | 'member';
export type Folder = 'inbox' | 'casa' | 'corporativo';
export type ListStatus = 'active' | 'archived' | 'deleted';
export type ListPhase = 'montar' | 'comprar';
export type ItemState = 'pending' | 'checked' | 'removed';
export type Frequency = 'recorrente' | 'rara';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Family {
  id: string;
  name: string;
  ownerUserId: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: Role;
  user?: User;
}

export interface Category {
  id: string;
  familyId: string;
  name: string;
  color: string;
  icon: string;
}

export interface CatalogItem {
  id: string;
  familyId: string;
  name: string;
  illustrationId: string | null;
  categoryId: string | null;
  frequency: Frequency;
  expectedQuantity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  familyId: string;
  folder: Folder;
  title: string;
  status: ListStatus;
  phase: ListPhase | null;
  purchasePhaseStartedAt: string | null;
  templateId: string | null;
  createdAt: string;
  closedAt: string | null;
  deletedAt: string | null;
}

export interface ListItem {
  id: string;
  listId: string;
  catalogItemId: string | null;
  name: string;
  categoryId: string | null;
  quantityExpected: number | null;
  quantityPlanned: number;
  quantityBought: number | null;
  state: ItemState;
  isCarryover: boolean;
  addedByUserId: string;
  addedAt: string;
  checkedByUserId: string | null;
  checkedAt: string | null;
  lastModifiedByUserId: string;
  lastModifiedAt: string;
  lastModifiedField: string | null;
  deletedAt: string | null;
  /** Observação curta do item (ex.: "marca X"); vazio/ausente = sem nota. */
  note?: string | null;
  /** Só local, nunca sincronizado (não existe campo equivalente no
   * backend) — liga um item movido do Inbox ao item original que ficou
   * lá soft-deletado, pra poder devolver se a lista for excluída ou o
   * item removido sem ser riscado (§4 do FRONTEND.md). */
  sourceInboxItemId?: string | null;
}

export interface DictionaryTerm {
  id: string;
  familyId: string;
  term: string;
  guessedCategoryId: string | null;
  usageCount: number;
  wasCorrected: boolean;
  promotedToCatalogItemId: string | null;
}

export interface ArchivedSnapshotItem {
  name: string;
  categoryId: string | null;
  quantityPlanned: number;
  quantityBought: number | null;
  checked: boolean;
  isCarryover?: boolean;
}

/** Linha do histórico (só Dono) — `snapshot` é congelado no encerramento. */
export interface ArchivedListEntry {
  id: string;
  listId: string;
  folder: Folder;
  closedAt: string;
  snapshot: ArchivedSnapshotItem[];
  list: { title: string };
}

export interface SyncStatusDevice {
  deviceSessionId: string;
  deviceName: string | null;
  lastSyncedAt: string | null;
}

export interface SyncStatusMember {
  userId: string;
  name: string;
  role: Role;
  devices: SyncStatusDevice[];
}

export type SyncEntityType = 'list' | 'list_item';

// Corpo exatamente como o backend espera (sync/dto/sync.dto.ts).
export interface SyncEventPayload {
  id: string; // uuid gerado no cliente, chave de idempotência
  entityType: SyncEntityType;
  entityId: string;
  field: string; // 'name'|'categoryId'|'quantityPlanned'|'quantityBought'|'state'|'deletedAt'|'__create__' (list_item); 'title' (list)
  value: unknown;
  actorDeviceId: string;
  clientTimestamp: string;
}

// Fila local de sincronização — nunca esperar a rede para aplicar.
export interface SyncEvent extends SyncEventPayload {
  listId: string; // local only, roteia para POST /lists/:id/sync
  status: 'pending' | 'sending' | 'sent' | 'failed';
  attempts: number;
}

// Forma que volta em GET /lists/:id/sync — linha crua da tabela sync_events.
export interface RemoteSyncEvent {
  id: string;
  familyId: string;
  listId: string;
  entityType: SyncEntityType;
  entityId: string;
  field: string;
  value: unknown;
  actorUserId: string;
  actorDeviceId: string;
  clientTimestamp: string;
  serverTimestamp: string;
  applied: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  deviceSessionId: string;
  user: User;
  familyId: string;
  role: Role;
}
