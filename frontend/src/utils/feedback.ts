import { useAppStore } from '../state/appStore';

/*
 * Tátil e som [decidido] (§9): vibração curta ao riscar, som curto
 * ("tique") no mesmo gesto, som de conclusão ao encerrar uma compra.
 * Sempre respeitando o modo silencioso do sistema (o navegador já não
 * toca áudio sem interação prévia / com o aparelho mudo em muitos casos;
 * não há API web para detectar "modo silencioso" explicitamente, então
 * confiamos no volume do sistema + no interruptor de Ajustes).
 */

let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function tone(freq: number, durationMs: number, delayMs = 0, gainValue = 0.06) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.02);
}

export function playCheckTick() {
  if (!useAppStore.getState().soundEnabled) return;
  tone(880, 70);
}

export function playPurchaseComplete() {
  if (!useAppStore.getState().soundEnabled) return;
  tone(660, 90, 0);
  tone(880, 140, 90);
  tone(1100, 180, 200);
}

export function vibrateShort() {
  if (!useAppStore.getState().hapticsEnabled) return;
  if ('vibrate' in navigator) navigator.vibrate(15);
}

/** Chamar junto de toda ação de riscar — otimista primeiro, feedback depois. */
export function checkFeedback() {
  vibrateShort();
  playCheckTick();
}
