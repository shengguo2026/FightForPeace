/**
 * M13 placeholder audio (roadmap placeholder-first policy): until a delivered file with
 * the same logical id is in the manifest, sounds are short synthesized tones and music
 * states are quiet procedural loops in the cue's tempo. Deterministic for an id.
 */

const RATE = 22050;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A tiny deterministic noise source. */
function noise(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Placeholder music loop: a soft chord pad on the bar, plus a pulse whose density rises with the state's intensity. */
export function synthMusic(
  ctx: BaseAudioContext,
  id: string,
  bpm: number,
  beatsPerBar: number,
  bars: number,
): AudioBuffer {
  const beat = 60 / bpm;
  const len = Math.max(1, Math.round(bars * beatsPerBar * beat * RATE));
  const buf = ctx.createBuffer(1, len, RATE);
  const d = buf.getChannelData(0);
  const state = id.split('.').pop() ?? '';
  const intensity = /danger|phase3/.test(state)
    ? 3
    : /combat|phase2/.test(state)
      ? 2
      : /phase1/.test(state)
        ? 2
        : /sting|surrender|victory/.test(state)
          ? 1
          : 0;
  const cueId = id.split('.').slice(0, 3).join('.');
  // A minor-pentatonic root per cue (the five-note village motif lives in the real score).
  const roots = [110, 123.47, 130.81, 146.83, 164.81, 98, 116.54];
  const root = roots[hash(cueId) % roots.length]!;
  const progression = [0, 5, 3, 7]; // semitone shifts per bar
  const motif = [0, 3, 5, 7, 10];
  const semi = (n: number) => Math.pow(2, n / 12);
  const sting = /sting/.test(state);
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    const barT = t / (beat * beatsPerBar);
    const bar = Math.floor(barT);
    const inBar = (barT - bar) * beat * beatsPerBar;
    const shift = progression[bar % progression.length]!;
    const f = root * semi(shift);
    // Pad: root, fifth, minor third above, slow swell per bar.
    const swell = Math.min(1, inBar / 0.6) * Math.min(1, (beat * beatsPerBar - inBar) / 0.4);
    let v =
      0.05 *
      swell *
      (Math.sin(2 * Math.PI * f * t) +
        0.6 * Math.sin(2 * Math.PI * f * 1.5 * t) +
        0.5 * Math.sin(2 * Math.PI * f * semi(15) * t));
    // Motif: one plucked note per beat walking the pentatonic set.
    const b = Math.floor(t / beat);
    const inBeat = t - b * beat;
    const note = root * 2 * semi(motif[(b * 2 + bar) % motif.length]! + (sting ? b * 2 : 0));
    v += 0.06 * Math.exp(-inBeat * 5) * Math.sin(2 * Math.PI * note * t);
    // Pulse: low wooden thump, more often as intensity rises.
    if (intensity > 0) {
      const sub = beat / Math.min(4, intensity * (intensity >= 3 ? 2 : 1));
      const inSub = t % sub;
      v += 0.12 * Math.exp(-inSub * 28) * Math.sin(2 * Math.PI * 70 * inSub);
    }
    d[i] = v;
  }
  // Click-free loop ends.
  const edge = Math.min(len, Math.round(RATE * 0.02));
  for (let i = 0; i < edge; i += 1) {
    d[i]! *= i / edge;
    d[len - 1 - i]! *= i / edge;
  }
  return buf;
}

/** Placeholder sound: a short tone or noise burst shaped by the id's family. */
export function synthSfx(ctx: BaseAudioContext, id: string): AudioBuffer {
  const fam = id.split('.')[1] ?? '';
  const variant = id.split('.')[2] ?? '';
  const spec: Record<string, { ms: number; f0: number; f1: number; noise: number; decay: number }> =
    {
      hit: {
        ms: variant === 'heavy' ? 260 : variant === 'medium' ? 180 : 120,
        f0: variant === 'heavy' ? 110 : 180,
        f1: 60,
        noise: 0.6,
        decay: variant === 'heavy' ? 14 : 22,
      },
      guard: { ms: 110, f0: 1400, f1: 900, noise: 0.25, decay: 30 },
      exact: { ms: 380, f0: 1760, f1: 1760, noise: 0, decay: 9 },
      counter: { ms: 320, f0: 660, f1: 1320, noise: 0.1, decay: 10 },
      breaker: { ms: 420, f0: 300, f1: 1200, noise: 0.5, decay: 7 },
      crush: { ms: 300, f0: 220, f1: 90, noise: 0.5, decay: 10 },
      armor: { ms: 160, f0: 520, f1: 480, noise: 0.3, decay: 18 },
      ultimate: { ms: 900, f0: 180, f1: 880, noise: 0.15, decay: 3 },
      team: { ms: 800, f0: 330, f1: 990, noise: 0.15, decay: 3.5 },
      dash: { ms: 120, f0: 400, f1: 200, noise: 0.9, decay: 25 },
      land: { ms: 110, f0: 90, f1: 60, noise: 0.5, decay: 30 },
      knockdown: { ms: 260, f0: 80, f1: 45, noise: 0.6, decay: 14 },
      grab: { ms: 160, f0: 300, f1: 240, noise: 0.4, decay: 18 },
      throw: { ms: 260, f0: 260, f1: 120, noise: 0.5, decay: 12 },
      rescue: { ms: 360, f0: 520, f1: 780, noise: 0, decay: 8 },
      phase: { ms: 1100, f0: 98, f1: 92, noise: 0.1, decay: 2.5 },
      run: { ms: 420, f0: 660, f1: 990, noise: 0, decay: 7 },
      ui: { ms: 60, f0: 900, f1: 900, noise: 0, decay: 50 },
      // M22 Stage 2 placeholders: weapons, warnings, the mounted pursuit.
      weapon: {
        ms: variant === 'burst' ? 420 : variant === 'lance' ? 140 : 220,
        f0: variant === 'lance' ? 900 : 160,
        f1: variant === 'lance' ? 500 : 70,
        noise: variant === 'lance' ? 0.4 : 0.85,
        decay: variant === 'burst' ? 6 : 18,
      },
      warn: { ms: 320, f0: 880, f1: 660, noise: 0, decay: 6 },
      ride: { ms: 300, f0: 140, f1: 70, noise: 0.7, decay: 9 },
    };
  const s = spec[fam] ?? { ms: 150, f0: 500, f1: 500, noise: 0.2, decay: 20 };
  const len = Math.round((s.ms / 1000) * RATE);
  const buf = ctx.createBuffer(1, len, RATE);
  const d = buf.getChannelData(0);
  const rnd = noise(hash(id));
  let phase = 0;
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    const k = i / len;
    const f = s.f0 + (s.f1 - s.f0) * k;
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.exp(-t * s.decay) * Math.min(1, i / 40);
    d[i] = 0.5 * env * ((1 - s.noise) * Math.sin(phase) + s.noise * rnd());
  }
  return buf;
}

/**
 * M22 placeholder ambience bed (6 s, seamless): filtered noise shaped by the id's kind
 * (aeration bubbles, pump hum, irrigation drip, ventilation, night road with a distant
 * engine, night yard with insects). Quiet on purpose: it sits under music and speech.
 */
export function synthAmbience(ctx: BaseAudioContext, id: string): AudioBuffer {
  const len = RATE * 6;
  const edge = Math.round(RATE * 0.05);
  const buf = ctx.createBuffer(1, len, RATE);
  const d = new Float32Array(len + edge);
  const rnd = noise(hash(id));
  const kind = id.split('.').pop() ?? '';
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < len + edge; i += 1) {
    const t = i / RATE;
    const n = rnd();
    lp += (n - lp) * 0.04;
    lp2 += (lp - lp2) * 0.04;
    let v = 0.25 * lp2;
    // Loop-periodic modulators (whole cycles in 6 s) keep the wrap seamless.
    const cyc = (k: number) => Math.sin((2 * Math.PI * k * t) / 6);
    if (kind === 'aeration') {
      const bub = (t * 7) % 1;
      v += 0.05 * Math.exp(-bub * 40) * Math.sin(2 * Math.PI * (600 + 300 * cyc(3)) * t);
    } else if (kind === 'pumps') {
      v += 0.04 * (1 + 0.3 * cyc(12)) * Math.sin(2 * Math.PI * 50 * t);
      v += 0.02 * Math.sin(2 * Math.PI * 100 * t);
    } else if (kind === 'irrigation') {
      const drip = (t * 2.5) % 1;
      v += 0.04 * Math.exp(-drip * 60) * Math.sin(2 * Math.PI * 1400 * t);
    } else if (kind === 'ventilation') {
      v = 0.35 * lp * (1 + 0.2 * cyc(2));
    } else if (kind === 'night-road') {
      v += 0.03 * (1 + 0.5 * cyc(1)) * Math.sin(2 * Math.PI * 38 * t);
    } else if (kind === 'night-yard') {
      const chirp = (t * 3) % 1;
      v += 0.015 * (chirp < 0.08 ? 1 : 0) * Math.sin(2 * Math.PI * 4200 * t);
    }
    d[i] = v;
  }
  // The 50 ms after the loop end fade into its start, so the wrap continues the noise.
  const out = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    const k = i < edge ? i / edge : 1;
    out[i] = d[i]! * k + (i < edge ? d[len + i]! * (1 - k) : 0);
  }
  return buf;
}
