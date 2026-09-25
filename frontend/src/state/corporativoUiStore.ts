import { create } from 'zustand';
import { metaRepo } from '../lib/storage/repos';

/*
 * Estado de UI efêmero do Corporativo, por lista (= por "semana" viva,
 * já que cada encerramento gera uma lista nova — §6 do FRONTEND.md):
 * - itens silenciados ("Tenho estoque") só valem para a lista atual;
 * - banner de recorrentes fora da lista, dispensável, não reaparece na
 *   mesma compra.
 * Persistido em metaRepo pra sobreviver a fechar o app, mas nunca
 * sincroniza — é preferência local de quem está montando a lista.
 */

// Mesma regra do listsStore: nunca devolver um array/objeto novo direto no
// seletor (`?? []` literal cria uma referência diferente a cada render e
// derruba o app com "Maximum update depth exceeded").
export const EMPTY_SILENCED: string[] = [];

interface CorporativoUiState {
  silencedByList: Record<string, string[]>; // listId -> catalogItemId[]
  bannerDismissedByList: Record<string, boolean>;
  rareExpandedByList: Record<string, boolean>;

  loadForList: (listId: string) => Promise<void>;
  silence: (listId: string, catalogItemId: string) => void;
  isSilenced: (listId: string, catalogItemId: string) => boolean;
  dismissBanner: (listId: string) => void;
  toggleRareExpanded: (listId: string) => void;
}

export const useCorporativoUiStore = create<CorporativoUiState>((set, get) => ({
  silencedByList: {},
  bannerDismissedByList: {},
  rareExpandedByList: {},

  loadForList: async (listId) => {
    const [silenced, dismissed] = await Promise.all([
      metaRepo.get<string[]>(`corp:silenced:${listId}`),
      metaRepo.get<boolean>(`corp:bannerDismissed:${listId}`),
    ]);
    set((s) => ({
      silencedByList: { ...s.silencedByList, [listId]: silenced ?? [] },
      bannerDismissedByList: { ...s.bannerDismissedByList, [listId]: dismissed ?? false },
    }));
  },

  silence: (listId, catalogItemId) => {
    set((s) => {
      const next = [...new Set([...(s.silencedByList[listId] ?? []), catalogItemId])];
      void metaRepo.set(`corp:silenced:${listId}`, next);
      return { silencedByList: { ...s.silencedByList, [listId]: next } };
    });
  },

  isSilenced: (listId, catalogItemId) => (get().silencedByList[listId] ?? []).includes(catalogItemId),

  dismissBanner: (listId) => {
    void metaRepo.set(`corp:bannerDismissed:${listId}`, true);
    set((s) => ({ bannerDismissedByList: { ...s.bannerDismissedByList, [listId]: true } }));
  },

  toggleRareExpanded: (listId) => {
    set((s) => ({ rareExpandedByList: { ...s.rareExpandedByList, [listId]: !s.rareExpandedByList[listId] } }));
  },
}));
