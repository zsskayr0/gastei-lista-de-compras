import { create } from 'zustand';
import { metaRepo } from '../lib/storage/repos';

export type ThemePref = 'light' | 'dark' | 'auto';
export type DensityPref = 'compact' | 'comfortable';

interface AppState {
  theme: ThemePref;
  density: DensityPref;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hintsEnabled: boolean;
  setTheme: (t: ThemePref) => void;
  setDensity: (d: DensityPref) => void;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setHintsEnabled: (v: boolean) => void;
  restore: () => Promise<void>;
}

function applyThemeToDocument(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

// Leitura síncrona inicial via localStorage — evita flash de tema errado
// antes do IndexedDB (assíncrono) responder (§15: carregar é "rapidíssimo").
function readInitialTheme(): ThemePref {
  try {
    const v = localStorage.getItem('gastei:theme');
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    // ignora
  }
  return 'auto';
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: readInitialTheme(),
  density: 'comfortable',
  soundEnabled: true,
  hapticsEnabled: true,
  hintsEnabled: true,

  setTheme: (theme) => {
    set({ theme });
    applyThemeToDocument(theme);
    try {
      localStorage.setItem('gastei:theme', theme);
    } catch {
      // ignora
    }
    void metaRepo.set('theme', theme);
  },

  setDensity: (density) => {
    set({ density });
    void metaRepo.set('density', density);
  },

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    void metaRepo.set('soundEnabled', soundEnabled);
  },

  setHapticsEnabled: (hapticsEnabled) => {
    set({ hapticsEnabled });
    void metaRepo.set('hapticsEnabled', hapticsEnabled);
  },

  setHintsEnabled: (hintsEnabled) => {
    set({ hintsEnabled });
    void metaRepo.set('hintsEnabled', hintsEnabled);
  },

  restore: async () => {
    applyThemeToDocument(get().theme);
    const [density, soundEnabled, hapticsEnabled, hintsEnabled] = await Promise.all([
      metaRepo.get<DensityPref>('density'),
      metaRepo.get<boolean>('soundEnabled'),
      metaRepo.get<boolean>('hapticsEnabled'),
      metaRepo.get<boolean>('hintsEnabled'),
    ]);
    set({
      density: density ?? 'comfortable',
      soundEnabled: soundEnabled ?? true,
      hapticsEnabled: hapticsEnabled ?? true,
      hintsEnabled: hintsEnabled ?? true,
    });
  },
}));

applyThemeToDocument(readInitialTheme());
