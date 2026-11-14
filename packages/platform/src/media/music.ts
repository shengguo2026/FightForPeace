/**
 * M13 music state machine (F&D Module 18, Authored Adaptive Score). A cue is one piece of
 * a stage's score with any number of declared states (arrival, combat, danger, boss
 * phases, victory …). The runtime only picks declared states: a state change waits for
 * the next bar boundary, or plays an authored transition stinger first; a cue change
 * crossfades at the next bar. Time is passed in (ms), so the director is testable and
 * the audio layer only executes its commands. Presentation only (never the simulation).
 */

export interface MusicStateDef {
  /** Logical asset id of the loop (`mus.stage1.bridge.combat`). */
  asset: string;
  /** Loop length in bars. */
  bars: number;
  /** Plays once instead of looping (a victory or ending state). */
  once?: boolean;
  /**
   * M22: this state's own tempo when it differs from the cue's (a boss family built from
   * several delivered cues): bar lines while it plays follow it.
   */
  bpm?: number;
}

export interface MusicStinger {
  /** From this state (any state when missing) … */
  from?: string;
  /** … into this state. */
  to: string;
  asset: string;
  /** Stinger length in bars; the new state starts when it ends. */
  bars: number;
}

export interface MusicCueDef {
  id: string;
  /** Localization key of the cue's title (Museum Music Hall). */
  title: string;
  bpm: number;
  beatsPerBar: number;
  /** The first declared state is the cue's default. */
  states: Readonly<Record<string, MusicStateDef>>;
  stingers?: readonly MusicStinger[];
}

export type MusicCommand =
  | {
      kind: 'start';
      asset: string;
      at: number;
      loop: boolean;
      fadeMs: number;
      cue: string;
      state: string;
    }
  | { kind: 'stop'; asset: string; at: number; fadeMs: number }
  | { kind: 'stinger'; asset: string; at: number };

export interface MusicNow {
  cue: string;
  state: string;
  asset: string;
  /** When this state started (bar grid origin). */
  since: number;
}

const CROSSFADE_BARS = 1;
const STOP_FADE_MS = 1200;

export function barMs(cue: MusicCueDef, state?: string): number {
  const bpm = (state ? cue.states[state]?.bpm : undefined) ?? cue.bpm;
  return (60_000 / bpm) * cue.beatsPerBar;
}

export class MusicDirector {
  private readonly cues = new Map<string, MusicCueDef>();
  private now_: MusicNow | null = null;
  private want: { cue: string; state: string } | null = null;
  /** A change that is scheduled: commands already issued, takes effect at `at`. */
  private pending: { at: number; next: MusicNow | null } | null = null;
  /** Everything requested in order (for tests and the Lab). */
  readonly log: string[] = [];

  constructor(cues: readonly MusicCueDef[]) {
    for (const c of cues) this.cues.set(c.id, c);
  }

  cue(id: string): MusicCueDef | undefined {
    return this.cues.get(id);
  }

  get playing(): MusicNow | null {
    return this.now_;
  }

  /** What should play (null: silence). The state defaults to the cue's first state. */
  request(cue: string | null, state?: string): void {
    if (cue === null) {
      this.want = null;
      return;
    }
    const def = this.cues.get(cue);
    if (!def) throw new Error(`unknown music cue "${cue}"`);
    const s = state ?? Object.keys(def.states)[0]!;
    if (!def.states[s]) throw new Error(`music cue "${cue}" has no state "${s}"`);
    this.want = { cue, state: s };
  }

  /** The next bar boundary at or after `now` on the playing state's grid. */
  private nextBar(now: number): number {
    const p = this.now_;
    if (!p) return now;
    const bar = barMs(this.cues.get(p.cue)!, p.state);
    const n = Math.ceil((now - p.since) / bar - 1e-9);
    return p.since + Math.max(1, n) * bar;
  }

  /** Commands to execute now; call every frame. */
  update(now: number): MusicCommand[] {
    const out: MusicCommand[] = [];
    if (this.pending && now >= this.pending.at) {
      this.now_ = this.pending.next;
      this.pending = null;
    }
    if (this.pending) return out; // one change at a time; the next waits for it
    const p = this.now_;
    const w = this.want;
    if (!w) {
      if (p) {
        out.push({ kind: 'stop', asset: p.asset, at: now, fadeMs: STOP_FADE_MS });
        this.log.push(`stop ${p.cue}/${p.state}`);
        this.now_ = null;
      }
      return out;
    }
    if (p && p.cue === w.cue && p.state === w.state) return out;
    const def = this.cues.get(w.cue)!;
    const st = def.states[w.state]!;
    if (!p) {
      out.push(this.start(def, w.state, now, 0));
      this.now_ = { cue: w.cue, state: w.state, asset: st.asset, since: now };
      return out;
    }
    const at = this.nextBar(now);
    if (p.cue === w.cue) {
      const sting =
        def.stingers?.find((s) => s.to === w.state && s.from === p.state) ??
        def.stingers?.find((s) => s.to === w.state && s.from === undefined);
      if (sting) {
        const after = at + sting.bars * barMs(def);
        out.push({ kind: 'stop', asset: p.asset, at, fadeMs: 80 });
        out.push({ kind: 'stinger', asset: sting.asset, at });
        out.push(this.start(def, w.state, after, 0));
        this.log.push(`stinger ${sting.asset}`);
        this.pending = {
          at: after,
          next: { cue: w.cue, state: w.state, asset: st.asset, since: after },
        };
        return out;
      }
      // Same cue, new state: switch on the bar with a short crossfade (same tempo grid).
      out.push({ kind: 'stop', asset: p.asset, at, fadeMs: 250 });
      out.push(this.start(def, w.state, at, 250));
      this.pending = { at, next: { cue: w.cue, state: w.state, asset: st.asset, since: at } };
      return out;
    }
    // A new cue: crossfade over one bar of the old cue, starting at its next bar line.
    const fade = CROSSFADE_BARS * barMs(this.cues.get(p.cue)!, p.state);
    out.push({ kind: 'stop', asset: p.asset, at, fadeMs: fade });
    out.push(this.start(def, w.state, at, fade));
    this.pending = { at, next: { cue: w.cue, state: w.state, asset: st.asset, since: at } };
    return out;
  }

  private start(def: MusicCueDef, state: string, at: number, fadeMs: number): MusicCommand {
    const st = def.states[state]!;
    this.log.push(`start ${def.id}/${state}`);
    return { kind: 'start', asset: st.asset, at, loop: !st.once, fadeMs, cue: def.id, state };
  }
}
