/* Sound effects made with the Web Audio API: no audio files needed.
   Browsers (iPhone especially) only allow sound after a tap, so unlock() runs on the first button press. */
import { lsGet, lsSet } from './store';

type SoundName = 'correct' | 'wrong' | 'streak' | 'lifeline' | 'tick' | 'launch' | 'finish' | 'alert';

let ctx: AudioContext | null = null;
let muted: boolean | null = null;
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  if (muted === null) muted = lsGet<boolean>('kbr-muted') === true;
  return muted;
}
export function setMuted(m: boolean) { muted = m; lsSet('kbr-muted', m); listeners.forEach((l) => l()); }
export function onMuteChange(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, endFreq?: number) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

export function play(name: SoundName) {
  if (isMuted()) return;
  unlockAudio();
  if (!ctx) return;
  switch (name) {
    case 'correct': tone(660, 0, 0.14, 'triangle'); tone(880, 0.12, 0.22, 'triangle'); break;
    case 'wrong': tone(160, 0, 0.32, 'sawtooth', 0.14); tone(110, 0.16, 0.4, 'sawtooth', 0.12); break;
    case 'streak': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.16, 'triangle', 0.15)); break;
    case 'lifeline': tone(400, 0, 0.35, 'sine', 0.14, 1200); tone(1200, 0.3, 0.2, 'triangle', 0.1); break;
    case 'tick': tone(1400, 0, 0.04, 'square', 0.05); break;
    case 'launch': [392, 523, 659].forEach((f, i) => tone(f, i * 0.1, 0.2, 'triangle', 0.15)); break;
    case 'finish': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.24, 'triangle', 0.15)); break;
    case 'alert': tone(880, 0, 0.12, 'square', 0.08); tone(880, 0.2, 0.12, 'square', 0.08); break;
  }
}

export async function celebrate() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const confetti = (await import('canvas-confetti')).default;
    void confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#C8962E', '#E6B85E', '#1D6B60', '#62C6B7', '#ECEEF7'] });
    setTimeout(() => { void confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 } }); void confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 } }); }, 350);
  } catch { /* confetti is optional */ }
}
