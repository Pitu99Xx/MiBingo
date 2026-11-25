import { settings } from "./settings";
import { rnd } from "./random";

let actx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!actx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = new C();
  }
  if (actx.state === "suspended") actx.resume().catch(() => {});
  return actx;
}

export function beep(f = 660, d = .08, type: OscillatorType = "sine", vol = .07, delay = 0) {
  if (!settings.sound) return;
  try {
    const a = ctx(), t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d);
  } catch { /* sin audio */ }
}
export const fanfare = () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => beep(f, .18, "triangle", .08, i * .12));
export const sadTrombone = () => [392, 370, 349, 311].forEach((f, i) => beep(f, i === 3 ? .7 : .3, "sawtooth", .045, i * .32));
export const coinSound = (n: number) => { for (let i = 0; i < n; i++) beep(1400 + rnd(500), .05, "square", .025, i * .06); };
export const rattle = () => { for (let i = 0; i < 7; i++) beep(220 + rnd(160), .03, "square", .02, i * .08); };

export function vibe(p: number | number[]) {
  if (settings.vibe && navigator.vibrate) try { navigator.vibrate(p); } catch { /* no soportado */ }
}

// Voz del crupier: pitidos agudos tipo personaje de videojuego, sin pronunciar palabras.
let voiceNodes: OscillatorNode[] = [];
export function hush() { voiceNodes.forEach(o => { try { o.stop(); } catch { /* ya parado */ } }); voiceNodes = []; }
/** Reproduce el parloteo y devuelve cuánto dura (ms), para animar la boca del crupier. */
export function say(text: string): number {
  hush();
  const syl = Math.max(3, Math.min(14, Math.round((text.match(/[aeiouáéíóú]/gi) || []).length * .75)));
  const step = .078, ms = syl * step * 1000 + 120;
  if (!settings.voice) return ms;
  try {
    const a = ctx(), t0 = a.currentTime + .02, base = 820 + rnd(120), excl = /[!¡]/.test(text);
    for (let i = 0; i < syl; i++) {
      const last = i === syl - 1;
      const f = base * (.82 + Math.random() * .5) * (last && excl ? 1.35 : 1);
      const st = t0 + i * step + Math.random() * .012, len = step * (last ? .95 : .62);
      const o = a.createOscillator(), g = a.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f * 1.18, st);
      o.frequency.exponentialRampToValueAtTime(f * (last && excl ? 1.25 : .88), st + len);
      g.gain.setValueAtTime(.0001, st);
      g.gain.exponentialRampToValueAtTime(.11, st + .012);
      g.gain.exponentialRampToValueAtTime(.0001, st + len);
      o.connect(g).connect(a.destination); o.start(st); o.stop(st + len + .02);
      voiceNodes.push(o);
    }
  } catch { /* sin audio */ }
  return ms;
}
