/**
 * Stage 3 sound effects made in code (Stage 3 spec §9–§13 and §16.3, roadmap M27/M28).
 *
 * Every Stage 3 gameplay sound is synthesized from a small recipe: layered tones, filtered
 * noise, struck wood, stone and metal (modal resonators), friction creaks, a formant voice
 * for the horse and the bandits, and a short mountain echo. The palette follows the
 * *Mist and Resolve* brief: wood and stone percussion, hoof rhythm, rope and timber, and
 * minor-pentatonic chimes for confirmations so they sit beside the village motif.
 *
 * Rules, as for the Stage 1/2 placeholders (roadmap placeholder-first policy):
 *  - The logical ids below are stable (`sfx.<family>.<variant>`). A delivered file with the
 *    same id in the asset manifest replaces the synthesized sound without code changes.
 *  - Rendering is deterministic: the same id gives the same samples on every machine.
 *  - The category is the mixer category (mixer.ts). Warnings and tells that the spec
 *    gives priority (combat warnings, hostage warnings, boss tells, objective alerts)
 *    are `critical`; defensive and objective confirmations are `confirm`.
 *  - This file is pure (no DOM, no Web Audio) so the game, the tests and the WAV export
 *    tool (`tools/audio/render_stage3_sfx.mjs`) all use the same code. Keep it free of
 *    runtime imports.
 *
 * Gameplay triggers arrive with the Stage 3 systems (M27); until then the Lab panel
 * "Stage 3 sounds" plays every entry.
 */
import type { SfxCategory } from './mixer';

/** Sample rate of the Stage 3 sounds. */
export const SFX3_RATE = 44100;

export type Sfx3Group =
  'horse' | 'weapons' | 'enemies' | 'garran' | 'environment' | 'rescue' | 'food';

export const SFX3_GROUPS: readonly Sfx3Group[] = [
  'horse',
  'weapons',
  'enemies',
  'garran',
  'environment',
  'rescue',
  'food',
];

export interface Sfx3Def {
  /** Logical asset id (`sfx.horse.gallop`). */
  id: string;
  group: Sfx3Group;
  category: SfxCategory;
  /** Length in ms. */
  ms: number;
  /** Where the game plays it (for the M27 wiring and the Lab list). */
  use: string;
}

// ---------------------------------------------------------------------------------------
// Synthesis toolkit
// ---------------------------------------------------------------------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** MIDI note to Hz. */
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const TAU = Math.PI * 2;

type Wave = 'sine' | 'tri' | 'saw' | 'square';

function wave(w: Wave, ph: number): number {
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
function svf() {
  let ic1 = 0;
  let ic2 = 0;
  return (x: number, fc: number, q: number, mode: 'band' | 'low' | 'high'): number => {
    const g = Math.tan((Math.PI * Math.min(fc, SFX3_RATE * 0.45)) / SFX3_RATE);
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

interface Env {
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

function envAt(e: Env, t: number): number {
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
class Synth {
  readonly out: Float32Array;
  private x: number;

  constructor(seconds: number, seed: number) {
    this.out = new Float32Array(Math.max(1, Math.round(seconds * SFX3_RATE)));
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
    const i0 = Math.max(0, Math.round(at * SFX3_RATE));
    const i1 = Math.min(this.out.length, Math.round((at + dur) * SFX3_RATE));
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
      const t = i / SFX3_RATE - at;
      const k = t / o.dur;
      let f = o.lin ? o.f0 + (f1 - o.f0) * k : o.f0 * Math.pow(f1 / o.f0, k);
      if (o.vib) f *= 1 + o.vib * Math.sin(TAU * (o.vibRate ?? 6) * t);
      ph += f / SFX3_RATE;
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
      const t = i / SFX3_RATE - at;
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
      const t = i / SFX3_RATE - at;
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
    const p = o.rate / SFX3_RATE;
    const g = o.gain ?? 0.5;
    for (let i = i0; i < i1; i += 1) {
      const t = i / SFX3_RATE - at;
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
      const t = i / SFX3_RATE - at;
      const r = o.r0 + (r1 - o.r0) * (t / o.dur);
      ph += (r * (1 + (o.jitter ?? 0.3) * this.rnd())) / SFX3_RATE;
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
      const t = i / SFX3_RATE - at;
      let f = o.pitch(t / o.dur);
      f *= 1 + (o.vib ?? 0) * Math.sin(TAU * (o.vibRate ?? 7) * t);
      f *= 1 + (o.rough ?? 0) * this.rnd();
      ph += f / SFX3_RATE;
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
    const d = Math.max(1, Math.round(delay * SFX3_RATE));
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
    const r = 1 - (TAU * 20) / SFX3_RATE;
    for (let i = 0; i < o.length; i += 1) {
      const x = o[i]!;
      const y = x - prevX + r * prevY;
      prevX = x;
      prevY = y;
      o[i] = y;
    }
    const win = Math.min(o.length, Math.round(SFX3_RATE * 0.05));
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
    const fadeIn = Math.min(o.length, Math.round(SFX3_RATE * 0.001));
    const fadeOut = Math.min(o.length, Math.round(SFX3_RATE * 0.015));
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
function hoof(s: Synth, at: number, gain: number, stone = false): void {
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
function hooves(
  s: Synth,
  times: readonly number[],
  gain: (i: number) => number,
  stone = false,
): void {
  times.forEach((t, i) => hoof(s, t, gain(i), stone));
}

/** A gallop: three-beat groups (two hind, leading fore) with a gap. */
function gallopTimes(start: number, strides: number, stride = 0.42): number[] {
  const out: number[] = [];
  for (let k = 0; k < strides; k += 1) {
    const b = start + k * stride;
    out.push(b, b + 0.075, b + 0.17);
  }
  return out;
}

/** Horse whinny: a formant voice that jumps up, warbles and falls. */
function whinny(s: Synth, at: number, dur: number, gain: number): void {
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
function snort(s: Synth, at: number, gain: number): void {
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
function leather(s: Synth, at: number, dur: number, gain: number): void {
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
function cloth(s: Synth, at: number, dur: number, gain: number): void {
  s.noise({ at, dur, c0: 2600, c1: 1800, q: 0.7, gain, bell: 0.6 });
  s.crackle({ at, dur, rate: 400, c: 4500, gain: gain * 0.4, bell: 0.6 });
}

/** A man's effort grunt (bandits, Garran). */
function grunt(s: Synth, at: number, dur: number, gain: number, base = 105): void {
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
function shout(s: Synth, at: number, gain: number): void {
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
function wood(s: Synth, at: number, f: number, gain: number, dur = 0.35): void {
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
function iron(s: Synth, at: number, f: number, gain: number, dur = 0.8, decay = 9): void {
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
function grit(s: Synth, at: number, dur: number, gain: number, rate = 600): void {
  s.crackle({ at, dur, rate, c: 2400, q: 1.5, gain, attack: 0.005, decay: 3 / dur });
}

/** A wood split: crack, then splinters. */
function splinter(s: Synth, at: number, gain: number, dur = 0.4): void {
  s.noise({ at, dur: 0.05, c0: 2500, q: 0.5, gain, decay: 70 });
  s.thud({ at, f0: 220, f1: 90, dur: 0.12, gain: gain * 0.6 });
  s.crackle({ at: at + 0.01, dur, rate: 1400, c: 1800, q: 1.2, gain: gain * 0.7, decay: 6 / dur });
}

/** Rope sliding fast (a lasso or a winch line running). */
function ropeZip(s: Synth, at: number, dur: number, gain: number, c0 = 1200, c1 = 3200): void {
  s.noise({ at, dur, c0, c1, q: 2, gain, bell: 0.5 });
  s.creak({ at, dur, r0: 140, r1: 260, f: 1800, q: 4, gain: gain * 0.4, bell: 0.5 });
}

/** Two short warning tones; readable over combat. */
function beepPair(s: Synth, at: number, a: number, b: number, gain: number, len = 0.1): void {
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
function whistle(s: Synth, at: number, dur: number, f0: number, f1: number, gain: number): void {
  s.tone({ at, dur, f0, f1, gain, attack: 0.02, release: 0.05, vib: 0.012, vibRate: 9 });
  s.noise({ at, dur, c0: f0, c1: f1, q: 8, gain: gain * 0.25, attack: 0.02, release: 0.05 });
}

/** A body falling to the ground (throws, trips). */
function bodyFall(s: Synth, at: number, gain: number): void {
  s.thud({ at, f0: 120, f1: 48, dur: 0.3, gain });
  grit(s, at + 0.01, 0.35, gain * 0.35, 500);
  cloth(s, at - 0.04, 0.12, gain * 0.25);
}

// D minor pentatonic (the village motif's mode).
const D4 = 62;
const F4 = 65;
const G4 = 67;
const A4 = 69;
const D5 = 74;
const F5 = 77;
const A5 = 81;

// ---------------------------------------------------------------------------------------
// The Stage 3 sound list
// ---------------------------------------------------------------------------------------

interface Recipe extends Sfx3Def {
  /** Loudness of the loudest 50 ms in dBFS RMS (default -14; UI and food sit lower). */
  level?: number;
  make: (s: Synth) => void;
}

const R = (
  id: string,
  group: Sfx3Group,
  category: SfxCategory,
  ms: number,
  use: string,
  make: (s: Synth) => void,
  level?: number,
): Recipe => ({ id, group, category, ms, use, make, ...(level === undefined ? {} : { level }) });

const RECIPES: readonly Recipe[] = [
  // ---- Mountain horse (spec §9) -------------------------------------------------------
  R('sfx.horse.mount', 'horse', 'contact', 700, 'A hero mounts a horse', (s) => {
    cloth(s, 0, 0.18, 0.3);
    leather(s, 0.12, 0.35, 0.5);
    s.thud({ at: 0.2, f0: 110, dur: 0.18, gain: 0.5 });
    hooves(s, [0.34, 0.48], () => 0.45);
  }),
  R('sfx.horse.dismount', 'horse', 'debris', 450, 'A hero dismounts', (s) => {
    leather(s, 0, 0.18, 0.35);
    cloth(s, 0.02, 0.15, 0.25);
    s.thud({ at: 0.2, f0: 130, f1: 70, dur: 0.12, gain: 0.6 });
    grit(s, 0.2, 0.2, 0.35, 900);
    s.modal({
      at: 0.22,
      f: 3100,
      modes: [
        [1, 1, 40],
        [1.5, 0.6, 50],
      ],
      gain: 0.08,
      dur: 0.2,
    });
  }),
  R('sfx.horse.trot', 'horse', 'crowd', 900, 'Mounted movement at trot speed', (s) => {
    hooves(s, [0, 0.21, 0.42, 0.63], (i) => (i % 2 ? 0.7 : 0.9));
    leather(s, 0.05, 0.8, 0.12);
  }),
  R('sfx.horse.gallop', 'horse', 'crowd', 1000, 'Mounted movement at gallop on the trail', (s) => {
    hooves(s, gallopTimes(0, 2), (i) => [0.8, 0.65, 1][i % 3]!);
    leather(s, 0.05, 0.9, 0.1);
  }),
  R(
    'sfx.horse.gallop-stone',
    'horse',
    'crowd',
    1000,
    'Gallop on quarry stone (Echo Quarry pursuit)',
    (s) => {
      hooves(s, gallopTimes(0, 2), (i) => [0.8, 0.65, 1][i % 3]!, true);
      s.echo(0.11, 0.25, 0.25);
    },
  ),
  R('sfx.horse.whinny', 'horse', 'confirm', 1300, 'Horse call (arrival, Lab)', (s) => {
    whinny(s, 0, 1.2, 0.6);
    s.echo(0.23, 0.2, 0.15);
  }),
  R('sfx.horse.snort', 'horse', 'debris', 450, 'Idle horse, after a stop', (s) => snort(s, 0, 0.7)),
  R(
    'sfx.horse.strike',
    'horse',
    'contact',
    380,
    'Mounted attack (bike kit actions with horse timing)',
    (s) => {
      s.whoosh({ dur: 0.18, c0: 500, c1: 1500, gain: 0.5 });
      hoof(s, 0.12, 1);
      s.thud({ at: 0.13, f0: 180, f1: 70, dur: 0.2, gain: 0.7 });
    },
  ),
  R(
    'sfx.horse.stumble',
    'horse',
    'contact',
    800,
    'Horse loses Stability from a hit or collision',
    (s) => {
      hooves(s, [0, 0.06, 0.11, 0.2], (i) => 0.9 - i * 0.12);
      s.noise({ dur: 0.3, c0: 2400, c1: 900, q: 0.8, gain: 0.35, decay: 6 });
      snort(s, 0.32, 0.6);
    },
  ),
  R('sfx.horse.stability-low', 'horse', 'critical', 700, 'Stability is low: warning', (s) => {
    beepPair(s, 0, A4, F4, 0.35, 0.11);
    snort(s, 0.3, 0.5);
  }),
  R(
    'sfx.horse.disengage',
    'horse',
    'critical',
    1800,
    'Stability at zero: the horse leaves safely',
    (s) => {
      whinny(s, 0, 0.9, 0.55);
      hooves(s, gallopTimes(0.7, 3, 0.36), (i) => 0.8 * Math.pow(0.84, i));
      s.echo(0.21, 0.25, 0.2);
    },
  ),
  R(
    'sfx.horse.return',
    'horse',
    'confirm',
    1500,
    'Replacement horse arrives (after An Bo) or the horse returns',
    (s) => {
      hooves(s, [0, 0.21, 0.42, 0.63, 0.84], (i) => 0.25 + i * 0.15);
      snort(s, 0.95, 0.45);
      s.chime(1.0, D5, 0.18).chime(1.12, A5, 0.14);
    },
  ),

  // ---- Weapons (spec §10.1) ----------------------------------------------------------
  R('sfx.pickup.weapon', 'weapons', 'ui', 260, 'A weapon is picked up (J)', (s) => {
    cloth(s, 0, 0.1, 0.3);
    wood(s, 0.06, 520, 0.35, 0.2);
  }),
  R(
    'sfx.gear.drop',
    'weapons',
    'debris',
    600,
    'A weapon is dropped, thrown aside or lands',
    (s) => {
      [0, 0.17, 0.29, 0.37].forEach((t, i) =>
        wood(s, t, 480 + 60 * i, 0.5 * Math.pow(0.6, i), 0.25),
      );
      grit(s, 0, 0.45, 0.15);
    },
  ),
  R('sfx.staff.swing', 'weapons', 'contact', 260, 'Hiking Staff swing', (s) => {
    s.whoosh({ dur: 0.22, c0: 700, c1: 1700, gain: 0.7, q: 1.5 });
  }),
  R('sfx.staff.hit', 'weapons', 'contact', 260, 'Hiking Staff hit', (s) => {
    wood(s, 0, 430, 0.7, 0.25);
    s.thud({ f0: 160, dur: 0.12, gain: 0.5 });
  }),
  R('sfx.staff.break', 'weapons', 'debris', 600, 'Hiking Staff breaks (durability)', (s) => {
    splinter(s, 0, 0.9, 0.3);
    wood(s, 0.28, 610, 0.3, 0.2);
    wood(s, 0.4, 560, 0.2, 0.18);
  }),
  R('sfx.axe.swing', 'weapons', 'contact', 340, 'Wood Axe swing (committed)', (s) => {
    s.whoosh({ dur: 0.3, c0: 380, c1: 1100, gain: 0.75, q: 1.3, skew: 0.9 });
    s.tone({ dur: 0.3, f0: 95, f1: 130, gain: 0.1, bell: 0.9 });
  }),
  R('sfx.axe.hit', 'weapons', 'contact', 380, 'Wood Axe hit (blunt side)', (s) => {
    s.thud({ f0: 170, f1: 60, dur: 0.22, gain: 0.8 });
    iron(s, 0, 1240, 0.18, 0.35, 14);
    s.drive(1.4);
  }),
  R('sfx.axe.chop', 'weapons', 'debris', 450, 'Wood Axe bites timber or a barrier', (s) => {
    wood(s, 0, 260, 0.7, 0.35);
    s.thud({ f0: 140, dur: 0.15, gain: 0.5 });
    s.crackle({ at: 0.01, dur: 0.25, rate: 1200, c: 1500, gain: 0.4, decay: 14 });
  }),
  R('sfx.axe.break', 'weapons', 'debris', 650, 'Wood Axe handle breaks', (s) => {
    splinter(s, 0, 0.9, 0.3);
    iron(s, 0.3, 980, 0.25, 0.3, 16);
    iron(s, 0.44, 1010, 0.12, 0.2, 18);
  }),
  R('sfx.hammer.swing', 'weapons', 'contact', 450, 'Quarry Hammer swing (slow)', (s) => {
    s.whoosh({ dur: 0.4, c0: 260, c1: 700, gain: 0.8, q: 1.1, skew: 1.1 });
    s.tone({ dur: 0.4, f0: 70, f1: 100, gain: 0.15, bell: 1.1 });
  }),
  R('sfx.hammer.hit', 'weapons', 'contact', 550, 'Quarry Hammer impact', (s) => {
    s.thud({ f0: 120, f1: 40, dur: 0.38, gain: 1 });
    iron(s, 0, 640, 0.2, 0.45, 8);
    grit(s, 0.01, 0.3, 0.2);
    s.drive(1.6);
  }),
  R(
    'sfx.hammer.ground',
    'weapons',
    'debris',
    1000,
    'Quarry Hammer hits stone (environment)',
    (s) => {
      s.thud({ f0: 100, f1: 36, dur: 0.45, gain: 1 });
      s.modal({
        at: 0,
        f: 820,
        modes: [
          [1, 1, 30],
          [1.9, 0.6, 40],
          [3.1, 0.4, 55],
        ],
        gain: 0.3,
        dur: 0.3,
        click: 0.4,
      });
      grit(s, 0.02, 0.6, 0.35, 900);
      s.echo(0.19, 0.3, 0.3);
      s.drive(1.4);
    },
  ),
  R(
    'sfx.revolver.aim',
    'weapons',
    'critical',
    450,
    'Revolver raised: the shot warning (captioned)',
    (s) => {
      s.modal({
        at: 0,
        f: 2600,
        modes: [
          [1, 1, 90],
          [1.7, 0.5, 120],
        ],
        gain: 0.3,
        dur: 0.06,
        click: 0.2,
      });
      s.creak({ at: 0.04, dur: 0.08, r0: 260, f: 3200, q: 8, gain: 0.25 });
      s.modal({
        at: 0.13,
        f: 2200,
        modes: [
          [1, 1, 70],
          [1.6, 0.6, 90],
        ],
        gain: 0.5,
        dur: 0.08,
        click: 0.4,
      });
      beepPair(s, 0.2, D5 + 12, A5, 0.12, 0.07);
    },
  ),
  R(
    'sfx.revolver.shot',
    'weapons',
    'weapon',
    1300,
    'Revolver shot (five rounds, no reload)',
    (s) => {
      s.noise({ dur: 0.01, c0: 3000, q: 0.4, gain: 0.6, decay: 250, mode: 'high' });
      s.noise({ dur: 0.2, c0: 1200, c1: 400, q: 0.6, gain: 0.9, decay: 24 });
      s.noise({ dur: 0.3, c0: 700, q: 0.7, gain: 1, decay: 18, mode: 'low' });
      s.thud({ f0: 150, f1: 50, dur: 0.3, gain: 1 });
      s.drive(2.2);
      s.echo(0.26, 0.4, 0.3, 0.6);
    },
    -11,
  ),
  R(
    'sfx.revolver.empty',
    'weapons',
    'weapon',
    220,
    'Revolver with no rounds left (still throwable)',
    (s) => {
      s.modal({
        f: 2400,
        modes: [
          [1, 1, 110],
          [1.8, 0.5, 140],
        ],
        gain: 0.5,
        dur: 0.06,
        click: 0.3,
      });
      s.creak({ at: 0.03, dur: 0.06, r0: 300, f: 3500, q: 8, gain: 0.15 });
    },
  ),
  R('sfx.revolver.ricochet', 'weapons', 'debris', 550, 'A round strikes rock', (s) => {
    grit(s, 0, 0.15, 0.4, 1500);
    s.tone({
      at: 0.01,
      dur: 0.45,
      f0: 2600,
      f1: 900,
      gain: 0.25,
      attack: 0.002,
      decay: 5,
      vib: 0.02,
      vibRate: 30,
    });
    s.echo(0.17, 0.25, 0.2);
  }),

  // ---- Enemies (spec §11) ------------------------------------------------------------
  R('sfx.ambusher.dash', 'enemies', 'crowd', 350, 'Trail Ambusher sprints or flanks', (s) => {
    s.noise({ dur: 0.28, c0: 1800, c1: 900, q: 0.6, gain: 0.5, attack: 0.01, decay: 8 });
    grit(s, 0.02, 0.3, 0.35, 1100);
  }),
  R(
    'sfx.ambusher.flank',
    'enemies',
    'critical',
    450,
    'Trail Ambusher flank tell (whistle)',
    (s) => {
      whistle(s, 0, 0.12, 1900, 2300, 0.4);
      whistle(s, 0.17, 0.2, 2300, 1950, 0.4);
    },
  ),
  R('sfx.bruiser.windup', 'enemies', 'critical', 650, 'Quarry Bruiser heavy wind-up tell', (s) => {
    grunt(s, 0, 0.55, 0.6, 92);
    leather(s, 0.05, 0.4, 0.3);
    s.tone({ dur: 0.6, f0: 55, f1: 75, gain: 0.25, bell: 1.3 });
  }),
  R('sfx.bruiser.slam', 'enemies', 'contact', 800, 'Quarry Bruiser slam', (s) => {
    s.thud({ f0: 110, f1: 38, dur: 0.45, gain: 1 });
    grit(s, 0.01, 0.55, 0.4, 800);
    s.echo(0.2, 0.25, 0.22);
    s.drive(1.5);
  }),
  R(
    'sfx.rope.twirl',
    'enemies',
    'critical',
    900,
    'Rope Trapper set-up tell (lasso twirls)',
    (s) => {
      for (let k = 0; k < 3; k += 1)
        s.whoosh({ at: k * 0.27, dur: 0.24, c0: 800, c1: 1900, gain: 0.35 + 0.12 * k, q: 2 });
    },
  ),
  R('sfx.rope.throw', 'enemies', 'contact', 380, 'Rope Trapper throw', (s) => {
    ropeZip(s, 0, 0.26, 0.5);
    s.noise({ at: 0.25, dur: 0.03, c0: 3000, q: 0.5, gain: 0.9, decay: 120 });
  }),
  R(
    'sfx.rope.bind',
    'enemies',
    'critical',
    550,
    'Restraint lands (escape or partner rescue)',
    (s) => {
      s.creak({ dur: 0.3, r0: 80, r1: 160, f: 900, q: 8, gain: 0.5, attack: 0.01 });
      cloth(s, 0, 0.2, 0.35);
      beepPair(s, 0.22, F4 + 12, D5, 0.18, 0.08);
    },
  ),
  R('sfx.rope.escape', 'enemies', 'confirm', 450, 'Restraint broken free', (s) => {
    s.creak({ dur: 0.18, r0: 120, r1: 220, f: 1100, q: 8, gain: 0.4 });
    s.noise({ at: 0.17, dur: 0.06, c0: 2400, q: 0.6, gain: 0.6, decay: 60 });
    s.chime(0.2, A4, 0.2, 6).chime(0.28, D5, 0.18, 6);
  }),
  R(
    'sfx.rope.taut',
    'enemies',
    'critical',
    750,
    'Hostile action: a rope line pulled taut near captives',
    (s) => {
      s.creak({ dur: 0.7, r0: 30, r1: 120, f: 700, q: 10, gain: 0.6, attack: 0.05, release: 0.1 });
      s.tone({ dur: 0.7, f0: 180, f1: 240, gain: 0.08, wave: 'tri', bell: 0.8 });
    },
  ),
  R('sfx.raider.charge', 'enemies', 'critical', 1100, 'Mounted Raider charge tell', (s) => {
    shout(s, 0, 0.5);
    hooves(s, gallopTimes(0.25, 2, 0.36), (i) => 0.5 + i * 0.08);
  }),
  R(
    'sfx.raider.disengage',
    'enemies',
    'crowd',
    1500,
    'Raider horse breaks off at zero Stability (never dies)',
    (s) => {
      whinny(s, 0, 0.7, 0.4);
      hooves(s, gallopTimes(0.55, 2, 0.4), (i) => 0.6 * Math.pow(0.8, i));
    },
  ),
  R(
    'sfx.stalker.feint',
    'enemies',
    'crowd',
    320,
    'Ridge Stalker feint (timing only, tell kept)',
    (s) => {
      s.whoosh({ dur: 0.15, c0: 1500, c1: 2600, gain: 0.3, q: 1.8 });
      s.crackle({ at: 0.1, dur: 0.15, rate: 120, c: 3200, gain: 0.4, decay: 15 });
    },
  ),
  R('sfx.stalker.strike', 'enemies', 'contact', 320, 'Ridge Stalker real strike', (s) => {
    s.whoosh({ dur: 0.12, c0: 900, c1: 2400, gain: 0.6, q: 1.6, skew: 0.5 });
    s.thud({ at: 0.11, f0: 200, f1: 80, dur: 0.15, gain: 0.7 });
  }),
  R(
    'sfx.captain.order',
    'enemies',
    'critical',
    600,
    'Pack Captain flank order (two-note whistle)',
    (s) => {
      whistle(s, 0, 0.18, hz(D5 + 12), hz(D5 + 12), 0.45);
      whistle(s, 0.24, 0.28, hz(A5), hz(A5 + 5), 0.45);
    },
  ),
  R(
    'sfx.captain.broken',
    'enemies',
    'confirm',
    500,
    'Command benefit broken (separation, interrupt, defeat)',
    (s) => {
      whistle(s, 0, 0.3, hz(A5), hz(D5), 0.3);
      s.chime(0.25, D5, 0.2, 7);
    },
  ),

  // ---- Garran Voss and the Quarry Hookstaff (spec §12) --------------------------------
  R('sfx.hookstaff.sweep', 'garran', 'contact', 600, 'Hookstaff long sweep', (s) => {
    s.whoosh({ dur: 0.5, c0: 280, c1: 1300, gain: 0.85, q: 1.1, skew: 0.8 });
    iron(s, 0.42, 1500, 0.08, 0.15, 20);
  }),
  R('sfx.hookstaff.thrust', 'garran', 'contact', 300, 'Hookstaff guarded thrust', (s) => {
    s.whoosh({ dur: 0.14, c0: 900, c1: 2000, gain: 0.6, skew: 0.4 });
    wood(s, 0.13, 380, 0.5, 0.18);
  }),
  R('sfx.hookstaff.hook', 'garran', 'critical', 650, 'Hooked pull (partner can interrupt)', (s) => {
    iron(s, 0, 1750, 0.35, 0.4, 12);
    cloth(s, 0.03, 0.15, 0.4);
    s.noise({ at: 0.12, dur: 0.35, c0: 600, c1: 1500, q: 1.2, gain: 0.45, bell: 0.5 });
    grunt(s, 0.12, 0.35, 0.4, 98);
  }),
  R('sfx.hookstaff.clash', 'garran', 'contact', 450, 'Hookstaff clash or guard', (s) => {
    wood(s, 0, 360, 0.6, 0.3);
    iron(s, 0, 1380, 0.25, 0.4, 10);
  }),
  R(
    'sfx.hookstaff.disarm',
    'garran',
    'confirm',
    1100,
    'Garran is disarmed: the Hookstaff clatters away',
    (s) => {
      iron(s, 0, 1600, 0.35, 0.4, 12);
      [0.3, 0.52, 0.66, 0.75].forEach((t, i) => {
        wood(s, t, 340 + 30 * i, 0.55 * Math.pow(0.6, i), 0.25);
        iron(s, t + 0.01, 1450 + 80 * i, 0.15 * Math.pow(0.6, i), 0.2, 16);
      });
      s.chime(0.32, D5, 0.18, 4).chime(0.44, A5, 0.14, 4);
    },
  ),
  R(
    'sfx.hookstaff.break',
    'garran',
    'critical',
    900,
    'The Hookstaff breaks (Museum: The Broken Hookstaff)',
    (s) => {
      splinter(s, 0, 1, 0.45);
      s.thud({ f0: 180, f1: 60, dur: 0.25, gain: 0.7 });
      iron(s, 0.38, 1300, 0.3, 0.45, 9);
      s.echo(0.2, 0.25, 0.2);
    },
  ),
  R('sfx.garran.clinch', 'garran', 'critical', 500, 'Collar tie / clinch grab (breakable)', (s) => {
    cloth(s, 0, 0.2, 0.6);
    s.thud({ at: 0.05, f0: 140, f1: 80, dur: 0.12, gain: 0.5 });
    grunt(s, 0.08, 0.32, 0.5, 100);
  }),
  R('sfx.garran.cast', 'garran', 'contact', 850, 'Shoulder throw (Clinch and Cast)', (s) => {
    grunt(s, 0, 0.3, 0.45, 96);
    s.whoosh({ at: 0.1, dur: 0.35, c0: 300, c1: 900, gain: 0.6 });
    bodyFall(s, 0.42, 1);
  }),
  R('sfx.garran.trip', 'garran', 'contact', 550, 'Low trip or sweep to the ground', (s) => {
    s.whoosh({ dur: 0.16, c0: 600, c1: 1400, gain: 0.5, skew: 0.5 });
    bodyFall(s, 0.16, 0.85);
  }),
  R('sfx.garran.roar', 'garran', 'critical', 950, 'Garran phase change or big tell', (s) => {
    s.voice({
      dur: 0.85,
      gain: 0.6,
      attack: 0.05,
      release: 0.2,
      pitch: (k) => 88 + 40 * Math.sin(Math.PI * Math.min(1, k * 1.3)),
      rough: 0.06,
      breath: 0.7,
      formants: [
        [520, 3, 1],
        [950, 4, 0.7],
        [2400, 5, 0.25],
      ],
    });
    s.tone({ dur: 0.9, f0: 46, f1: 41, gain: 0.3, bell: 0.6 });
    s.echo(0.24, 0.3, 0.25);
  }),
  R(
    'sfx.garran.resolve-break',
    'garran',
    'confirm',
    1200,
    'Garran Resolve break (capture window)',
    (s) => {
      s.thud({ f0: 90, f1: 40, dur: 0.5, gain: 0.8 });
      s.noise({ at: 0.08, dur: 0.6, c0: 900, c1: 350, q: 0.9, gain: 0.35, attack: 0.03, decay: 4 });
      s.chime(0.15, D4 + 12, 0.25, 3)
        .chime(0.3, A4, 0.22, 3)
        .chime(0.45, F4 + 12, 0.2, 3);
    },
  ),
  R('sfx.garran.restrain', 'garran', 'confirm', 850, 'Garran restrained (live capture)', (s) => {
    ropeZip(s, 0, 0.3, 0.45, 900, 2200);
    s.creak({ at: 0.3, dur: 0.25, r0: 90, r1: 180, f: 850, q: 9, gain: 0.5 });
    s.chime(0.55, D5, 0.18, 5);
  }),
  R('sfx.garran.radio', 'garran', 'ui', 750, "Garran's compact radio (intercept, orders)", (s) => {
    s.noise({ dur: 0.12, c0: 2200, q: 0.7, gain: 0.5, attack: 0.002, release: 0.01 });
    s.noise({ at: 0.12, dur: 0.45, c0: 1700, q: 0.9, gain: 0.18, release: 0.05 });
    s.tone({ at: 0.6, dur: 0.1, f0: 1400, wave: 'square', gain: 0.08, release: 0.02 });
  }),

  // ---- Environment (spec §13) --------------------------------------------------------
  R(
    'sfx.scaffold.creak',
    'environment',
    'debris',
    1100,
    'Quarry scaffold damaged: creaks under load',
    (s) => {
      s.creak({ dur: 1.05, r0: 28, r1: 14, f: 520, q: 9, gain: 0.6, attack: 0.08, release: 0.2 });
      s.creak({
        at: 0.35,
        dur: 0.5,
        r0: 40,
        r1: 22,
        f: 760,
        q: 9,
        gain: 0.3,
        attack: 0.05,
        release: 0.15,
      });
    },
  ),
  R(
    'sfx.scaffold.crack',
    'environment',
    'critical',
    550,
    'Scaffold reaches the critical state (warning)',
    (s) => {
      splinter(s, 0, 0.8, 0.25);
      s.creak({ at: 0.15, dur: 0.35, r0: 40, r1: 20, f: 600, q: 9, gain: 0.45 });
      s.echo(0.17, 0.2, 0.2);
    },
  ),
  R(
    'sfx.scaffold.collapse',
    'environment',
    'critical',
    1900,
    'Scaffold breaks and comes down',
    (s) => {
      splinter(s, 0, 1, 0.4);
      [0.25, 0.42, 0.55, 0.8, 1.05].forEach((t, i) => {
        wood(s, t, 220 + 50 * ((i * 7) % 3), 0.7 * Math.pow(0.78, i), 0.35);
        s.thud({ at: t, f0: 120, f1: 50, dur: 0.2, gain: 0.5 * Math.pow(0.8, i) });
      });
      grit(s, 0.3, 1.3, 0.35, 900);
      s.echo(0.23, 0.35, 0.3);
    },
  ),
  R(
    'sfx.scaffold.hit',
    'environment',
    'contact',
    420,
    'A fighter is driven into a scaffold',
    (s) => {
      wood(s, 0, 240, 0.8, 0.35);
      s.thud({ f0: 140, dur: 0.2, gain: 0.6 });
      s.creak({ at: 0.1, dur: 0.25, r0: 35, f: 560, q: 9, gain: 0.25 });
    },
  ),
  R('sfx.winch.warn', 'environment', 'critical', 950, 'Winch Pressure: activation warning', (s) => {
    for (let k = 0; k < 8; k += 1) {
      // Ratchet clicks speeding up (each gap 18 % shorter), then two bell strikes.
      const t = (0.09 * (1 - Math.pow(0.82, k))) / 0.18;
      s.modal({
        at: t,
        f: 2100,
        modes: [
          [1, 1, 90],
          [1.5, 0.5, 120],
        ],
        gain: 0.3,
        dur: 0.05,
        click: 0.2,
      });
    }
    s.modal({
      at: 0.5,
      f: hz(A5),
      modes: [
        [1, 1, 5],
        [2.76, 0.4, 8],
        [5.4, 0.2, 12],
      ],
      gain: 0.35,
      dur: 0.45,
    });
    s.modal({
      at: 0.68,
      f: hz(A5),
      modes: [
        [1, 1, 5],
        [2.76, 0.4, 8],
        [5.4, 0.2, 12],
      ],
      gain: 0.35,
      dur: 0.27,
    });
  }),
  R('sfx.winch.crank', 'environment', 'debris', 800, 'Winch ratchet turning', (s) => {
    for (let k = 0; k < 9; k += 1) {
      s.modal({
        at: k * 0.085,
        f: 1900 + 100 * (k % 2),
        modes: [
          [1, 1, 80],
          [1.6, 0.6, 100],
        ],
        gain: 0.3,
        dur: 0.06,
        click: 0.25,
      });
    }
    s.creak({ dur: 0.78, r0: 60, f: 300, q: 5, gain: 0.25, attack: 0.05, release: 0.1 });
  }),
  R(
    'sfx.winch.release',
    'environment',
    'critical',
    1000,
    'Winch line released: cargo moves',
    (s) => {
      s.modal({
        f: 1100,
        modes: [
          [1, 1, 30],
          [2.2, 0.5, 40],
        ],
        gain: 0.5,
        dur: 0.15,
        click: 0.5,
      });
      ropeZip(s, 0.05, 0.6, 0.55, 800, 2600);
      iron(s, 0.68, 420, 0.5, 0.3, 12);
      s.thud({ at: 0.68, f0: 110, dur: 0.25, gain: 0.7 });
    },
  ),
  R(
    'sfx.winch.redirect',
    'environment',
    'confirm',
    900,
    'A winch activation redirected (grade: winch redirects)',
    (s) => {
      iron(s, 0, 900, 0.4, 0.3, 14);
      s.thud({ f0: 130, dur: 0.18, gain: 0.5 });
      s.chime(0.12, D5, 0.22, 4).chime(0.22, F5, 0.2, 4).chime(0.32, A5, 0.2, 4);
    },
  ),
  R('sfx.cargo.swing', 'environment', 'debris', 1000, 'Hanging cargo swings on its line', (s) => {
    s.whoosh({ dur: 0.9, c0: 200, c1: 450, gain: 0.5, q: 0.9, skew: 1 });
    s.creak({ dur: 0.9, r0: 22, r1: 12, f: 480, q: 9, gain: 0.35, bell: 0.7 });
  }),
  R('sfx.cargo.drop', 'environment', 'contact', 1200, 'Cargo crate lands', (s) => {
    s.thud({ f0: 90, f1: 34, dur: 0.5, gain: 1 });
    wood(s, 0, 180, 0.6, 0.4);
    s.crackle({ at: 0.02, dur: 0.3, rate: 900, c: 1400, gain: 0.35, decay: 12 });
    grit(s, 0.03, 0.7, 0.3, 700);
    s.echo(0.22, 0.3, 0.25);
    s.drive(1.3);
  }),
  R('sfx.cart.roll', 'environment', 'debris', 1300, 'Quarry cart rolling on rails', (s) => {
    s.noise({ dur: 1.25, c0: 160, q: 0.7, gain: 0.6, attack: 0.15, release: 0.25, mode: 'low' });
    for (let k = 0; k < 6; k += 1) {
      const t = 0.12 + k * 0.19;
      s.modal({
        at: t,
        f: 900,
        modes: [
          [1, 1, 60],
          [2.3, 0.4, 80],
        ],
        gain: 0.2,
        dur: 0.06,
      });
      s.modal({
        at: t + 0.05,
        f: 950,
        modes: [
          [1, 1, 60],
          [2.3, 0.4, 80],
        ],
        gain: 0.15,
        dur: 0.06,
      });
    }
    s.tone({ dur: 1.25, f0: 2800, f1: 3100, gain: 0.02, bell: 0.5, vib: 0.01, vibRate: 13 });
  }),
  R(
    'sfx.cart.impact',
    'environment',
    'contact',
    750,
    'Cart hits a stop, a wall or a fighter',
    (s) => {
      iron(s, 0, 520, 0.6, 0.5, 8);
      s.thud({ f0: 110, f1: 40, dur: 0.35, gain: 0.9 });
      grit(s, 0.02, 0.4, 0.3);
      s.drive(1.4);
    },
  ),
  R('sfx.stone.loose', 'environment', 'debris', 900, 'Loose stone falls or scatters', (s) => {
    for (let k = 0; k < 10; k += 1) {
      const t = 0.03 * k + 0.6 * Math.pow(k / 10, 1.6);
      s.modal({
        at: t,
        f: 1100 + 900 * s.r01(),
        modes: [
          [1, 1, 70],
          [1.7, 0.5, 90],
        ],
        gain: 0.18 * (1 - k / 13),
        dur: 0.08,
        click: 0.1,
      });
    }
    grit(s, 0, 0.8, 0.3, 700);
  }),
  R('sfx.timber.break', 'environment', 'debris', 700, 'Timber barrier or cover breaks', (s) => {
    splinter(s, 0, 1, 0.45);
    wood(s, 0.2, 300, 0.4, 0.3);
    wood(s, 0.34, 260, 0.25, 0.25);
  }),
  R(
    'sfx.wall.impact',
    'environment',
    'contact',
    650,
    'A fighter hits a retaining wall or rail',
    (s) => {
      s.thud({ f0: 130, f1: 45, dur: 0.35, gain: 1 });
      grit(s, 0.02, 0.45, 0.35, 900);
      s.echo(0.15, 0.2, 0.18);
    },
  ),

  // ---- Rescue, research and Stage 3 objectives (spec §6, §7, §14) ---------------------
  R(
    'sfx.hostage.warn',
    'rescue',
    'critical',
    750,
    'Hostage warning: a hostile action starts near a group',
    (s) => {
      for (let k = 0; k < 3; k += 1) beepPair(s, k * 0.22, A5, F5, 0.3, 0.06);
    },
  ),
  R(
    'sfx.hostage.interrupt',
    'rescue',
    'confirm',
    500,
    'Hostile action interrupted (counts never)',
    (s) => {
      s.thud({ f0: 160, dur: 0.12, gain: 0.4 });
      s.chime(0.04, A4, 0.25, 6).chime(0.12, D5, 0.25, 6);
    },
  ),
  R('sfx.hostage.freed', 'rescue', 'confirm', 1300, 'A rescue group is freed', (s) => {
    ropeZip(s, 0, 0.18, 0.3, 1500, 900);
    s.thud({ at: 0.18, f0: 120, dur: 0.12, gain: 0.3 });
    [D4 + 12, F4 + 12, G4 + 12, A4 + 12].forEach((n, i) => s.chime(0.22 + i * 0.11, n, 0.24, 3));
  }),
  R(
    'sfx.hostage.strained',
    'rescue',
    'critical',
    700,
    'A hostile action completed (condition falls)',
    (s) => {
      s.tone({ dur: 0.22, f0: hz(D5), wave: 'tri', gain: 0.3, release: 0.05 });
      s.tone({
        at: 0.24,
        dur: 0.38,
        f0: hz(A4),
        f1: hz(A4 - 1),
        wave: 'tri',
        gain: 0.3,
        release: 0.15,
      });
    },
  ),
  R('sfx.research.documented', 'rescue', 'confirm', 750, 'Research sample documented', (s) => {
    s.noise({ dur: 0.06, c0: 5000, q: 1, gain: 0.25, decay: 60 });
    s.modal({ at: 0.05, f: 2800, modes: [[1, 1, 100]], gain: 0.2, dur: 0.04, click: 0.2 });
    s.chime(0.12, D5, 0.22, 4).chime(0.24, A5, 0.18, 4);
  }),
  R('sfx.research.disturbed', 'rescue', 'critical', 700, 'Research record disturbed', (s) => {
    s.crackle({ dur: 0.3, rate: 900, c: 5200, q: 1.2, gain: 0.35, decay: 8 });
    s.thud({ at: 0.05, f0: 140, dur: 0.2, gain: 0.4 });
    s.tone({ at: 0.18, dur: 0.45, f0: hz(F4), f1: hz(D4), wave: 'tri', gain: 0.25, release: 0.15 });
  }),
  R('sfx.research.recovered', 'rescue', 'confirm', 750, 'Disturbed record recovered', (s) => {
    s.crackle({ dur: 0.2, rate: 700, c: 5200, q: 1.2, gain: 0.25, decay: 10 });
    s.chime(0.1, A4, 0.2, 4).chime(0.22, D5, 0.2, 4);
  }),
  R(
    'sfx.bell.rescue',
    'rescue',
    'confirm',
    2600,
    'Qinglan Rescue Bell (rescue complete, Museum artifact)',
    (s) => {
      const bell = [
        [0.5, 0.6, 1.2],
        [1, 1, 1.6],
        [1.183, 0.5, 2.2],
        [1.506, 0.45, 2.6],
        [2, 0.35, 3.2],
        [2.74, 0.2, 4],
        [3.0, 0.15, 4.5],
      ] as const;
      s.modal({ f: hz(D5), modes: bell, gain: 0.35, dur: 2.6, click: 0.15 });
      s.echo(0.31, 0.3, 0.2, 0.5);
    },
  ),
  R('sfx.signal.static', 'rescue', 'ui', 1000, 'Signal Hut radio static (branch)', (s) => {
    s.noise({ dur: 0.95, c0: 1800, q: 0.5, gain: 0.35, attack: 0.05, release: 0.1 });
    s.crackle({ dur: 0.95, rate: 60, c: 2500, q: 0.8, gain: 0.6, mode: 'high' });
    s.tone({ dur: 0.95, f0: 900, f1: 1300, gain: 0.04, wave: 'sine', vib: 0.2, vibRate: 3 });
  }),
  R(
    'sfx.signal.restored',
    'rescue',
    'confirm',
    1100,
    'Signal restored (Signal Hut branch complete)',
    (s) => {
      s.noise({ dur: 0.35, c0: 1800, q: 0.5, gain: 0.3, decay: 7 });
      s.tone({ at: 0.3, dur: 0.1, f0: 1320, wave: 'sine', gain: 0.25, release: 0.02 });
      s.tone({ at: 0.45, dur: 0.1, f0: 1320, wave: 'sine', gain: 0.25, release: 0.02 });
      s.chime(0.62, D5, 0.2, 4).chime(0.72, A5, 0.2, 4);
    },
  ),
  R(
    'sfx.invoice.found',
    'rescue',
    'confirm',
    1600,
    'The damaged invoice is found (Sponsor Dossier)',
    (s) => {
      s.crackle({ dur: 0.45, rate: 1200, c: 4800, q: 1, gain: 0.3, bell: 0.6 });
      s.noise({ dur: 0.45, c0: 3500, q: 0.5, gain: 0.1, bell: 0.6 });
      // The distant low sponsor pulse of the score.
      s.tone({ at: 0.35, dur: 1.2, f0: 55, gain: 0.45, attack: 0.15, release: 0.5 });
      s.tone({ at: 0.35, dur: 1.2, f0: 82.4, gain: 0.15, attack: 0.2, release: 0.5 });
      s.chime(0.45, F4, 0.12, 2.5).chime(0.6, D4 + 12, 0.1, 2.5);
    },
  ),
  R(
    'sfx.objective.alert',
    'rescue',
    'critical',
    600,
    'Objective alert (new or failing objective)',
    (s) => {
      beepPair(s, 0, D5, A5, 0.32, 0.08);
      s.tone({ at: 0.3, dur: 0.18, f0: hz(A5), wave: 'tri', gain: 0.25, release: 0.08 });
    },
  ),
  R(
    'sfx.objective.done',
    'rescue',
    'confirm',
    850,
    'Objective complete or checkpoint reached',
    (s) => {
      [D5, F5, A5].forEach((n, i) => s.chime(i * 0.1, n, 0.22, 3.5));
      s.chime(0.32, D5 + 12, 0.16, 2.5);
    },
  ),

  // ---- Food (spec §10.2) ---------------------------------------------------------------
  R('sfx.pickup.food', 'food', 'ui', 240, 'A food item is picked up (J)', (s) => {
    s.crackle({ dur: 0.12, rate: 700, c: 4200, q: 1.2, gain: 0.3, decay: 18 });
    s.chime(0.06, A5, 0.12, 10);
  }),
  R('sfx.food.rice', 'food', 'ui', 750, 'Trail rice parcel eaten (Health)', (s) => {
    s.crackle({ dur: 0.3, rate: 1100, c: 3800, q: 1, gain: 0.3, bell: 0.6 });
    for (let k = 0; k < 3; k += 1)
      s.noise({ at: 0.3 + k * 0.11, dur: 0.07, c0: 700, q: 1, gain: 0.25, decay: 30 });
    s.chime(0.4, D5, 0.16, 4).chime(0.5, F5, 0.14, 4);
  }),
  R('sfx.food.broth', 'food', 'ui', 850, 'Warm vegetable broth (Defense Bar)', (s) => {
    s.noise({ dur: 0.35, c0: 1400, c1: 900, q: 1.5, gain: 0.25, bell: 0.5 });
    for (let k = 0; k < 6; k += 1) {
      const f = 380 + 260 * s.r01();
      s.tone({
        at: 0.05 + k * 0.06,
        dur: 0.035,
        f0: f,
        f1: f * 2.2,
        gain: 0.2,
        attack: 0.002,
        decay: 60,
      });
    }
    s.chime(0.45, A4, 0.15, 3.5).chime(0.55, D5, 0.13, 3.5);
  }),
  R('sfx.food.seedcake', 'food', 'ui', 700, 'Spiced seed cake (Attack Bar)', (s) => {
    for (let k = 0; k < 2; k += 1)
      s.crackle({ at: k * 0.16, dur: 0.1, rate: 3000, c: 2200, q: 1.2, gain: 0.45, decay: 25 });
    s.chime(0.36, A5, 0.14, 5).chime(0.43, D5 + 12, 0.12, 5);
  }),
  R('sfx.food.campmeal', 'food', 'ui', 1150, 'Mountain camp meal (rare, all three bars)', (s) => {
    s.modal({
      f: 2350,
      modes: [
        [1, 1, 9],
        [2.03, 0.4, 13],
        [3.4, 0.2, 18],
      ],
      gain: 0.2,
      dur: 0.6,
      click: 0.1,
    });
    [D5, F5, A5].forEach((n) => s.chime(0.25, n, 0.12, 2.6));
    s.chime(0.45, D5 + 12, 0.12, 2.6);
  }),
];

/** The Stage 3 sound list (ids, groups, mixer categories, lengths, uses). */
export const STAGE3_SFX: readonly Sfx3Def[] = RECIPES.map(({ id, group, category, ms, use }) => ({
  id,
  group,
  category,
  ms,
  use,
}));

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

/** The Stage 3 definition of a sound id, if it is one. */
export function stage3Sfx(id: string): Sfx3Def | undefined {
  return BY_ID.get(id);
}

/**
 * Renders a Stage 3 sound (mono, `SFX3_RATE`), or null when the id is not a Stage 3
 * sound. Deterministic for an id.
 */
export function renderStage3Sfx(id: string): Float32Array | null {
  const r = BY_ID.get(id);
  if (!r) return null;
  const s = new Synth(r.ms / 1000, hash(id));
  r.make(s);
  return s.finish(
    r.level ??
      (r.category === 'ui' ? -17 : r.category === 'crowd' || r.category === 'debris' ? -16 : -14),
  );
}
