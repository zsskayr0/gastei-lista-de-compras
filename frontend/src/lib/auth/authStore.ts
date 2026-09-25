import { create } from 'zustand';
import { sessionRepo } from '../storage/repos';
import { authApi } from '../api/endpoints';
import { reportError } from '../../state/errorStore';
import type { DescribedError } from '../errors/describe';
import type { AuthSession } from '../../types/domain';
import { initSyncEngine } from '../sync/syncEngine';

interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: AuthSession | null;
  error: DescribedError | null;
  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  bootstrapFamily: (dto: {
    familyName: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  acceptInvite: (
    token: string,
    dto: { name: string; email: string; password: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  error: null,

  restore: async () => {
    let session: AuthSession | undefined;
    try {
      session = await sessionRepo.get();
    } catch (err) {
      reportError(err, 'Ler sessão salva no aparelho (IndexedDB)');
    }
    if (session) {
      set({ status: 'signed-in', session });
      void initSyncEngine();
    } else {
      set({ status: 'signed-out' });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const session = await authApi.login({ email, password });
      await sessionRepo.set(session);
      set({ status: 'signed-in', session });
      void initSyncEngine();
    } catch (err) {
      set({ error: reportError(err, 'Entrar', { banner: false }) });
      throw err;
    }
  },

  bootstrapFamily: async (dto) => {
    set({ error: null });
    try {
      const session = await authApi.bootstrapFamily(dto);
      await sessionRepo.set(session);
      set({ status: 'signed-in', session });
      void initSyncEngine();
    } catch (err) {
      set({ error: reportError(err, 'Criar família', { banner: false }) });
      throw err;
    }
  },

  acceptInvite: async (token, dto) => {
    set({ error: null });
    try {
      const session = await authApi.acceptInvite(token, dto);
      await sessionRepo.set(session);
      set({ status: 'signed-in', session });
      void initSyncEngine();
    } catch (err) {
      set({ error: reportError(err, 'Aceitar convite', { banner: false }) });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Sai localmente de qualquer forma, mas avisa que o servidor não
      // revogou a sessão deste aparelho.
      reportError(err, 'Sair (revogar sessão no servidor)');
    }
    await sessionRepo.clear();
    set({ status: 'signed-out', session: null });
  },

  clearError: () => set({ error: null }),
}));
