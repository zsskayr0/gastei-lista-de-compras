import { Injectable } from '@nestjs/common';

interface PresenceEntry {
  userId: string;
  listId: string;
  updatedAt: number;
}

const STALE_AFTER_MS = 30_000;

/**
 * Presença em memória — instância única self-hosted (BACKEND.md §6), sem
 * necessidade de compartilhar estado entre processos.
 */
@Injectable()
export class PresenceService {
  private byFamily = new Map<string, Map<string, PresenceEntry>>();

  heartbeat(familyId: string, userId: string, listId: string) {
    const family = this.byFamily.get(familyId) ?? new Map<string, PresenceEntry>();
    family.set(userId, { userId, listId, updatedAt: Date.now() });
    this.byFamily.set(familyId, family);
  }

  listActive(familyId: string) {
    const family = this.byFamily.get(familyId);
    if (!family) return [];

    const now = Date.now();
    return Array.from(family.values()).filter((e) => now - e.updatedAt < STALE_AFTER_MS);
  }
}
