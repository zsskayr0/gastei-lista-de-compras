import { reportError } from './errorStore';
import { create } from 'zustand';
import { familiesApi } from '../lib/api/endpoints';
import { metaRepo } from '../lib/storage/repos';
import type { Role } from '../types/domain';

export interface Member {
  userId: string;
  name: string;
  role: Role;
  avatarUpdatedAt?: string | null;
}

interface MembersState {
  byId: Record<string, Member>;
  init: (familyId: string) => Promise<void>;
  nameFor: (userId: string) => string;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  byId: {},

  init: async (familyId) => {
    const cached = await metaRepo.get<Member[]>('members');
    if (cached) set({ byId: Object.fromEntries(cached.map((m) => [m.userId, m])) });

    try {
      const members = await familiesApi.members(familyId);
      set({ byId: Object.fromEntries(members.map((m) => [m.userId, m])) });
      void metaRepo.set('members', members);
    } catch (err) {
      reportError(err, 'Carregar membros da família');
    }
  },

  nameFor: (userId) => get().byId[userId]?.name ?? 'Alguém da família',
}));
