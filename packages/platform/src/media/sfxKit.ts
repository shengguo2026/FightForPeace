/**
 * Sound effects made in code: the shared synthesis kit (decided 2026-11-16: every sound
 * effect of the game is coded; pictures, music cues and title loops are delivered files).
 *
 * Every sound is a small recipe drawn with these primitives: layered tones, filtered
 * noise, struck wood, stone and metal (modal resonators), friction creaks, a formant voice,
 * echo, and loudness leveling. Rules (roadmap placeholder-first policy):
 *  - Logical ids are stable (`sfx.<family>.<variant>`); a delivered file with the same id
 *    in the asset manifest still replaces the coded sound without code changes.
 *  - Rendering is deterministic: the same id gives the same samples on every machine.
 *  - The category is the mixer category (mixer.ts): warnings and tells are `critical`,
 *    defensive and objective confirmations `confirm`.
 *  - Pure (no DOM, no Web Audio): the game, the tests and the WAV export tool
 *    (`tools/audio/render_sfx.mjs`) use the same code. Only `import type` from outside
 *    this folder's sound files, and relative imports keep their `.ts` extension so Node
 *    can run the export tool directly.
 */
import type { SfxCategory } from './mixer';

/** Sample rate of the coded sounds. */
export const SFX_RATE = 44100;
/** @deprecated name kept for the Stage 3 PR; use SFX_RATE. */
export const SFX3_RATE = SFX_RATE;

/** Lab and export groups: the shared fight sounds, then each stage's own. */
export type SfxGroup =
  | 'combat'
  | 'stage1'
  | 'stage2'
  | 'pursuit'
  | 'greenhouse'
  | 'horse'
  | 'weapons'
  | 'enemies'
  | 'garran'
  | 'environment'
  | 'rescue'
  | 'food';

export interface SfxDef {
  /** Logical asset id (`sfx.horse.gallop`). */
  id: string;
  group: SfxGroup;
  category: SfxCategory;
  /** Length in ms. */
  ms: number;
  /** Where the game plays it. */
  use: string;
}

// ---------------------------------------------------------------------------------------
// Synthesis toolkit
// ---------------------------------------------------------------------------------------

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** MIDI note to Hz. */
export const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export const TAU = Math.PI * 2;

export type Wave = 'sine' | 'tri' | 'saw' | 'square';

export function wave(w: Wave, ph: number): number {
  const p = ph - Math.floor(ph);
  switch (w) {
    case 'sine':
      return Math.sin(TAU * p);
    case 'tri':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'saw':
      return 2 * p - 1;
    case 'square':
      return p < 0.5 ? 1 : -1;
  }
}

/** Zero-delay-feedback state-variable filter (stable at every cutoff). */
export function svf() {
  let ic1 = 0;
  let ic2 = 0;
  return (x: number, fc: number, q: number, mode: 'band' | 'low' | 'high'): number => {
    const g = Math.tan((Math.PI * Math.min(fc, SFX_RATE * 0.45)) / SFX_RATE);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    if (mode === 'low') return v2;
    if (mode === 'high') return x - k * v1 - v2;
    return k * v1;
  };
}

export interface Env {
  /** Start time (s). */
  at?: number;
  /** Length (s). */
  dur: number;
  gain?: number;
  /** Attack (s). */
  attack?: number;
  /** Exponential decay rate (1/s); 0 holds. */
  decay?: number;
  /** Release fade at the end (s). */
  release?: number;
  /** Bell shape (rise and fall over the whole length) instead of attack/decay. */
  bell?: number;
}

export function envAt(e: Env, t: number): number {
  if (e.bell !== undefined) {
    const k = t / e.dur;
    return Math.pow(Math.sin(Math.PI * Math.pow(k, e.bell)), 2);
  }
  const a = e.attack ?? 0.002;
  const r = e.release ?? 0.01;
  return (
    Math.min(1, t / Math.max(a, 1e-4)) *
    Math.exp(-(e.decay ?? 0) * t) *
    Math.min(1, (e.dur - t) / Math.max(r, 1e-4))
  );
}

/** A sound under construction: mono samples plus the drawing primitives. */
export class Synth {
  readonly out: Float32Array;
  private x: number;

  constructor(seconds: number, seed: number) {
    this.out = new Float32Array(Math.max(1, Math.round(seconds * SFX_RATE)));
    this.x = seed || 1;
  }

  /** Deterministic white noise in -1..1. */
  rnd(): number {
    let x = this.x;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.x = x;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  }

  /** 0..1 */
  r01(): number {
    return (this.rnd() + 1) / 2;
  }

  private span(at: number, dur: number): [number, number] {
    const i0 = Math.max(0, Math.round(at * SFX_RATE));
    const i1 = Math.min(this.out.length, Math.round((at + dur) * SFX_RATE));
    return [i0, i1];
  }

  /** A tone with a pitch sweep (exponential by default), optional vibrato. */
  tone(
    o: Env & {
      f0: number;
      f1?: number;
      wave?: Wave;
      lin?: boolean;
      vib?: number;
      vibRate?: number;
    },
  ): this {
    const at = o.at ?? 0;
    const [i0, i1] = this.span(at, o.dur);
    const f1 = o.f1 ?? o.f0;
    const g = o.gain ?? 0.5;
    let ph = this.r01();
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX_RATE - at;
      const k = t / o.dur;
      let f = o.lin ? o.f0 + (f1 - o.f0) * k : o.f0 * Math.pow(f1 / o.f0, k);
      if (o.vib) f *= 1 + o.vib * Math.sin(TAU * (o.vibRate ?? 6) * t);
      ph += f / SFX_RATE;
      this.out[i]! += g * envAt(o, t) * wave(o.wave ?? 'sine', ph);
    }
    return this;
  }

  /** Filtered noise with a moving centre (band by default). */
  noise(o: Env & { c0: number; c1?: number; q?: number; mode?: 'band' | 'low' | 'high' }): this {
    const at = o.at ?? 0;
    const [i0, i1] = this.span(at, o.dur);
    const f = svf();
    const c1 = o.c1 ?? o.c0;
    const g = o.gain ?? 0.5;
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX_RATE - at;
      const c = o.c0 * Math.pow(c1 / o.c0, t / o.dur);
      this.out[i]! += g * envAt(o, t) * f(this.rnd(), c, o.q ?? 0.8, o.mode ?? 'band');
    }
    return this;
  }

  /** A struck body: decaying partials (ratio, amplitude, decay 1/s) plus a strike click. */
  modal(o: {
    at?: number;
    f: number;
    modes: readonly (readonly [ratio: number, amp: number, decay: number])[];
    gain?: number;
    dur?: number;
    click?: number;
  }): this {
    const at = o.at ?? 0;
    const dur = o.dur ?? 1.5;
    const [i0, i1] = this.span(at, dur);
    const g = o.gain ?? 0.4;
    const phases = o.modes.map(() => this.r01());
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX_RATE - at;
      let v = 0;
      for (let m = 0; m < o.modes.length; m += 1) {
        const [r, a, d] = o.modes[m]!;
        v += a * Math.exp(-d * t) * Math.sin(TAU * (o.f * r * t + phases[m]!));
      }
      this.out[i]! += g * Math.min(1, t / 0.0005) * Math.min(1, (dur - t) / 0.01) * v;
    }
    if (o.click) this.noise({ at, dur: 0.012, c0: 3500, q: 0.6, gain: o.click, decay: 300 });
    return this;
  }

  /** A low body impact: falling sine plus a short click. */
  thud(o: {
    at?: number;
    f0: number;
    f1?: number;
    dur?: number;
    gain?: number;
    click?: number;
  }): this {
    const dur = o.dur ?? 0.25;
    this.tone({
      at: o.at ?? 0,
      dur,
      f0: o.f0,
      f1: o.f1 ?? o.f0 * 0.45,
      gain: o.gain ?? 0.7,
      attack: 0.001,
      decay: 9 / dur,
    });
    this.noise({
      at: o.at ?? 0,
      dur: 0.03,
      c0: 900,
      q: 0.5,
      gain: o.click ?? (o.gain ?? 0.7) * 0.5,
      decay: 160,
      mode: 'low',
    });
    return this;
  }

  /** Air movement: band noise rising and falling over its length. */
  whoosh(o: {
    at?: number;
    dur: number;
    c0: number;
    c1: number;
    gain?: number;
    q?: number;
    skew?: number;
  }): this {
    return this.noise({
      at: o.at ?? 0,
      dur: o.dur,
      c0: o.c0,
      c1: o.c1,
      q: o.q ?? 1.2,
      gain: o.gain ?? 0.6,
      bell: o.skew ?? 0.7,
    });
  }

  /** Random grains through a band filter: gravel, splinters, paper, pebbles. */
  crackle(o: Env & { rate: number; c: number; q?: number; mode?: 'band' | 'high' }): this {
    const at = o.at ?? 0;
    const [i0, i1] = this.span(at, o.dur);
    const f = svf();
    const p = o.rate / SFX_RATE;
    const g = o.gain ?? 0.5;
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX_RATE - at;
      const imp = this.r01() < p ? this.rnd() * 4 : 0;
      this.out[i]! += g * envAt(o, t) * f(imp, o.c, o.q ?? 2, o.mode ?? 'band');
    }
    return this;
  }

  /** Friction: a jittered pulse train (rate r0→r1 per second) through two resonances. */
  creak(o: Env & { r0: number; r1?: number; f: number; q?: number; jitter?: number }): this {
    const at = o.at ?? 0;
    const [i0, i1] = this.span(at, o.dur);
    const fa = svf();
    const fb = svf();
    const r1 = o.r1 ?? o.r0;
    const g = o.gain ?? 0.5;
    let ph = 0;
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX_RATE - at;
      const r = o.r0 + (r1 - o.r0) * (t / o.dur);
      ph += (r * (1 + (o.jitter ?? 0.3) * this.rnd())) / SFX_RATE;
      let imp = 0;
      if (ph >= 1) {
        ph -= 1;
        imp = 3 + this.rnd();
      }
      const q = o.q ?? 12;
      const v = fa(imp, o.f, q, 'band') + 0.6 * fb(imp, o.f * 2.31, q, 'band');
      this.out[i]! += g * envAt(o, t) * v;
    }
    return this;
  }

  /** A voiced sound (horse, bandit grunt, whistle-free shouts): saw through formants. */
  voice(
    o: Env & {
      pitch: (k: number) => number;
      formants: readonly (readonly [f: number, q: number, amp: number])[];
      breath?: number;
      vib?: number;
      vibRate?: number;
      rough?: number;
    },
  ): this {
    const at = o.at ?? 0;
    const [i0, i1] = this.span(at, o.dur);
    const fs = o.formants.map(() => svf());
    const g = o.gain ?? 0.5;
    let ph = 0;
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX_RATE - at;
      let f = o.pitch(t / o.dur);
      f *= 1 + (o.vib ?? 0) * Math.sin(TAU * (o.vibRate ?? 7) * t);
      f *= 1 + (o.rough ?? 0) * this.rnd();
      ph += f / SFX_RATE;
      const src = wave('saw', ph) + (o.breath ?? 0.15) * this.rnd();
      let v = 0;
      for (let m = 0; m < fs.length; m += 1) {
        const [ff, q, a] = o.formants[m]!;
        v += a * fs[m]!(src, ff, q, 'band');
      }
      this.out[i]! += g * envAt(o, t) * v;
    }
    return this;
  }

  /** A soft chime note (confirmations): bell-like partials. */
  chime(at: number, note: number, gain = 0.25, decay = 4): this {
    return this.modal({
      at,
      f: hz(note),
      modes: [
        [1, 1, decay],
        [2, 0.35, decay * 1.6],
        [3.01, 0.12, decay * 2.5],
        [4.2, 0.05, decay * 3],
      ],
      gain,
      dur: Math.min(2.5, 6 / decay),
    });
  }

  /** Feedback echo with darkening repeats (mountain or quarry walls). */
  echo(delay: number, feedback: number, mix: number, damp = 0.35): this {
    const d = Math.max(1, Math.round(delay * SFX_RATE));
    const buf = new Float32Array(d);
    let lp = 0;
    for (let i = 0; i < this.out.length; i += 1) {
      const j = i % d;
      const y = buf[j]!;
      lp += (y - lp) * (1 - damp);
      buf[j] = this.out[i]! + lp * feedback;
      this.out[i] = this.out[i]! + lp * mix;
    }
    return this;
  }

  /** Gentle saturation (gunshot, heavy impacts). */
  drive(amount: number): this {
    const n = Math.tanh(amount);
    for (let i = 0; i < this.out.length; i += 1) this.out[i] = Math.tanh(this.out[i]! * amount) / n;
    return this;
  }

  /**
   * DC removal, loudness leveling and click-free edges. Every sound is scaled so its
   * loudest 50 ms sits at `level` dBFS RMS (impacts and beeps then feel equally loud, which
   * plain peak normalization does not give); transients above that are soft-limited so
   * no sample reaches full scale.
   */
  finish(level: number): Float32Array {
    const o = this.out;
    let prevX = 0;
    let prevY = 0;
    const r = 1 - (TAU * 20) / SFX_RATE;
    for (let i = 0; i < o.length; i += 1) {
      const x = o[i]!;
      const y = x - prevX + r * prevY;
      prevX = x;
      prevY = y;
      o[i] = y;
    }
    const win = Math.min(o.length, Math.round(SFX_RATE * 0.05));
    let sum = 0;
    let loud = 0;
    let peak = 0;
    for (let i = 0; i < o.length; i += 1) {
      sum += o[i]! * o[i]!;
      if (i >= win) sum -= o[i - win]! * o[i - win]!;
      if (i >= win - 1) loud = Math.max(loud, Math.sqrt(Math.max(0, sum) / win));
      peak = Math.max(peak, Math.abs(o[i]!));
    }
    // At most 4.5 dB of limiting on the loudest transient.
    const k = loud > 0 ? Math.min(Math.pow(10, level / 20) / loud, 1.6 / peak) : 0;
    const knee = 0.6;
    const fadeIn = Math.min(o.length, Math.round(SFX_RATE * 0.001));
    const fadeOut = Math.min(o.length, Math.round(SFX_RATE * 0.015));
    for (let i = 0; i < o.length; i += 1) {
      let v = o[i]! * k;
      const a = Math.abs(v);
      if (a > knee)
        v = Math.sign(v) * (knee + (0.98 - knee) * Math.tanh((a - knee) / (0.98 - knee)));
      if (i < fadeIn) v *= i / fadeIn;
      if (i >= o.length - fadeOut) v *= (o.length - 1 - i) / fadeOut;
      o[i] = v;
    }
    return o;
  }
}

// ---------------------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------------------

/** One hoof fall: body thud, hoof click, and grit (dirt trail) or a clack (quarry stone). */
export function hoof(s: Synth, at: number, gain: number, stone = false): void {
  s.thud({ at, f0: 150, f1: 62, dur: 0.11, gain: 0.8 * gain, click: 0.25 * gain });
  s.noise({ at, dur: 0.03, c0: 2200, q: 0.9, gain: 0.35 * gain, decay: 140 });
  if (stone) {
    s.modal({
      at,
      f: 1650 + 200 * s.rnd(),
      modes: [
        [1, 1, 70],
        [1.63, 0.5, 90],
      ],
      gain: 0.22 * gain,
      dur: 0.12,
    });
  } else {
    s.crackle({ at, dur: 0.07, rate: 900, c: 3000, gain: 0.25 * gain, decay: 40 });
  }
}

/** Hoof falls at the given times (s), each with its gain. */
export function hooves(
  s: Synth,
  times: readonly number[],
  gain: (i: number) => number,
  stone = false,
): void {
  times.forEach((t, i) => hoof(s, t, gain(i), stone));
}

/** A gallop: three-beat groups (two hind, leading fore) with a gap. */
export function gallopTimes(start: number, strides: number, stride = 0.42): number[] {
  const out: number[] = [];
  for (let k = 0; k < strides; k += 1) {
    const b = start + k * stride;
    out.push(b, b + 0.075, b + 0.17);
  }
  return out;
}

/** Horse whinny: a formant voice that jumps up, warbles and falls. */
export function whinny(s: Synth, at: number, dur: number, gain: number): void {
  s.voice({
    at,
    dur,
    gain,
    attack: 0.04,
    release: 0.25,
    pitch: (k) => (k < 0.15 ? 420 + 2600 * k : 810 - 380 * (k - 0.15)),
    vib: 0.06,
    vibRate: 11,
    rough: 0.02,
    breath: 0.35,
    formants: [
      [800, 6, 1],
      [1700, 8, 0.7],
      [2900, 10, 0.35],
    ],
  });
}

/** Horse snort: two puffs of nasal noise. */
export function snort(s: Synth, at: number, gain: number): void {
  s.noise({ at, dur: 0.16, c0: 900, c1: 500, q: 1.4, gain, attack: 0.01, decay: 12 });
  s.noise({
    at: at + 0.18,
    dur: 0.22,
    c0: 700,
    c1: 380,
    q: 1.2,
    gain: 0.8 * gain,
    attack: 0.015,
    decay: 9,
  });
}

/** Leather and saddle: a short low creak. */
export function leather(s: Synth, at: number, dur: number, gain: number): void {
  s.creak({
    at,
    dur,
    r0: 55,
    r1: 30,
    f: 420,
    q: 6,
    gain,
    attack: 0.02,
    release: 0.05,
    jitter: 0.5,
  });
}

/** Cloth and gear movement. */
export function cloth(s: Synth, at: number, dur: number, gain: number): void {
  s.noise({ at, dur, c0: 2600, c1: 1800, q: 0.7, gain, bell: 0.6 });
  s.crackle({ at, dur, rate: 400, c: 4500, gain: gain * 0.4, bell: 0.6 });
}

/** A man's effort grunt (bandits, Garran). */
export function grunt(s: Synth, at: number, dur: number, gain: number, base = 105): void {
  s.voice({
    at,
    dur,
    gain,
    attack: 0.02,
    release: 0.08,
    pitch: (k) => base * (1 + 0.25 * Math.sin(Math.PI * k)),
    rough: 0.04,
    breath: 0.5,
    formants: [
      [600, 4, 1],
      [1050, 5, 0.6],
      [2400, 6, 0.2],
    ],
  });
}

/** A short shout ("Hah!") for mounted raiders. */
export function shout(s: Synth, at: number, gain: number): void {
  s.voice({
    at,
    dur: 0.32,
    gain,
    attack: 0.015,
    release: 0.12,
    pitch: (k) => 210 - 70 * k,
    rough: 0.03,
    breath: 0.6,
    formants: [
      [750, 5, 1],
      [1250, 6, 0.6],
      [2600, 8, 0.25],
    ],
  });
}

/** Struck wood (staff shaft, timber, crates). */
export function wood(s: Synth, at: number, f: number, gain: number, dur = 0.35): void {
  s.modal({
    at,
    f,
    modes: [
      [1, 1, 45],
      [2.71, 0.35, 75],
      [5.2, 0.12, 120],
    ],
    gain,
    dur,
    click: gain * 0.3,
  });
  s.noise({ at, dur: 0.05, c0: f * 2, q: 1.5, gain: gain * 0.6, decay: 70 });
}

/** Struck iron (axe head, hammer, hook, winch). */
export function iron(s: Synth, at: number, f: number, gain: number, dur = 0.8, decay = 9): void {
  s.modal({
    at,
    f,
    modes: [
      [1, 1, decay],
      [2.32, 0.55, decay * 1.3],
      [3.87, 0.3, decay * 1.7],
      [5.41, 0.15, decay * 2.2],
    ],
    gain,
    dur,
    click: gain * 0.6,
  });
}

/** Stone grit and pebbles. */
export function grit(s: Synth, at: number, dur: number, gain: number, rate = 600): void {
  s.crackle({ at, dur, rate, c: 2400, q: 1.5, gain, attack: 0.005, decay: 3 / dur });
}

/** A wood split: crack, then splinters. */
export function splinter(s: Synth, at: number, gain: number, dur = 0.4): void {
  s.noise({ at, dur: 0.05, c0: 2500, q: 0.5, gain, decay: 70 });
  s.thud({ at, f0: 220, f1: 90, dur: 0.12, gain: gain * 0.6 });
  s.crackle({ at: at + 0.01, dur, rate: 1400, c: 1800, q: 1.2, gain: gain * 0.7, decay: 6 / dur });
}

/** Rope sliding fast (a lasso or a winch line running). */
export function ropeZip(
  s: Synth,
  at: number,
  dur: number,
  gain: number,
  c0 = 1200,
  c1 = 3200,
): void {
  s.noise({ at, dur, c0, c1, q: 2, gain, bell: 0.5 });
  s.creak({ at, dur, r0: 140, r1: 260, f: 1800, q: 4, gain: gain * 0.4, bell: 0.5 });
}

/** Two short warning tones; readable over combat. */
export function beepPair(
  s: Synth,
  at: number,
  a: number,
  b: number,
  gain: number,
  len = 0.1,
): void {
  s.tone({ at, dur: len, f0: hz(a), wave: 'tri', gain, attack: 0.004, release: 0.03 });
  s.tone({
    at: at + len * 1.25,
    dur: len * 1.4,
    f0: hz(b),
    wave: 'tri',
    gain,
    attack: 0.004,
    release: 0.05,
  });
}

/** A whistle (bandit signals). */
export function whistle(
  s: Synth,
  at: number,
  dur: number,
  f0: number,
  f1: number,
  gain: number,
): void {
  s.tone({ at, dur, f0, f1, gain, attack: 0.02, release: 0.05, vib: 0.012, vibRate: 9 });
  s.noise({ at, dur, c0: f0, c1: f1, q: 8, gain: gain * 0.25, attack: 0.02, release: 0.05 });
}

/** A body falling to the ground (throws, trips). */
export function bodyFall(s: Synth, at: number, gain: number): void {
  s.thud({ at, f0: 120, f1: 48, dur: 0.3, gain });
  grit(s, at + 0.01, 0.35, gain * 0.35, 500);
  cloth(s, at - 0.04, 0.12, gain * 0.25);
}

// D minor pentatonic (the village motif's mode).
export const D4 = 62;
export const F4 = 65;
export const G4 = 67;
export const A4 = 69;
export const D5 = 74;
export const F5 = 77;
export const A5 = 81;

export interface Recipe extends SfxDef {
  /** Loudness of the loudest 50 ms in dBFS RMS (default by category). */
  level?: number;
  make: (s: Synth) => void;
}

export const R = (
  id: string,
  group: SfxGroup,
  category: SfxCategory,
  ms: number,
  use: string,
  make: (s: Synth) => void,
  level?: number,
): Recipe => ({ id, group, category, ms, use, make, ...(level === undefined ? {} : { level }) });

/** Renders a recipe (mono, `SFX_RATE`). Deterministic for its id. */
export function renderRecipe(r: Recipe): Float32Array {
  const s = new Synth(r.ms / 1000, hash(r.id));
  r.make(s);
  return s.finish(
    r.level ??
      (r.category === 'ui' ? -17 : r.category === 'crowd' || r.category === 'debris' ? -16 : -14),
  );
}
