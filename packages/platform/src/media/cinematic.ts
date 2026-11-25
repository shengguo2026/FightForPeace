/**
 * M13 cinematic player (Module 17/18): a cinematic is a list of short shots, each a
 * Flow clip with its approved still as the fallback, and localized subtitle cues timed
 * against the shot. Shots may be shared motifs (village, sponsor, Wayfarer …) and may be
 * chosen by state (condition inserts, choice outcomes; roadmap campaign guardrail M13).
 *
 * The player keeps its own clock: the video, if any, follows it, so a stalled or missing
 * clip never changes timing, and the still fallback runs exactly the same sequence.
 * Presentation only: nothing here touches the simulation.
 */

/** A value a cinematic can branch on (`workersFreed`, `story.stage3.kael-reunion` …). */
export type StoryValue = string | number | boolean;
export type StoryState = Readonly<Record<string, StoryValue>>;

/** A shot is shown only when every condition holds. */
export interface Condition {
  key: string;
  /** Equal to this value. */
  is?: StoryValue;
  /** Numeric value at least this. */
  atLeast?: number;
  /** Numeric value below this. */
  below?: number;
  /** Equal to the value of another key (e.g. `workersFreed` equals `workersTotal`). */
  sameAs?: string;
  /** Different from the value of another key. */
  notSameAs?: string;
}

export interface SubtitleCue {
  /** Shot time in ms the cue appears and disappears. */
  at: number;
  until: number;
  /** Localization key of the line. */
  text: string;
  /** Localization key of the speaker label (shown when speaker labels are on). */
  speaker?: string;
}

export interface ShotDef {
  /** Stable shot id (Museum Cinema index). */
  id: string;
  /** Logical asset id of the clip (`cine.…`); missing means still only. */
  clip?: string;
  /** Logical asset id of the still fallback (`story.…`); always present. */
  still: string;
  /**
   * M28 still sequence (lesson C3): the shot's end picture. The start still shows with a
   * slow zoom and cross-fades to this one over a second in the middle of the shot.
   */
  end?: string;
  /** Shot length in ms (the clip's length). */
  ms: number;
  cues: readonly SubtitleCue[];
  when?: readonly Condition[];
}

/** A reference to a shared motif shot, with optional own conditions and cues. */
export interface MotifRef {
  motif: string;
  when?: readonly Condition[];
  cues?: readonly SubtitleCue[];
}

export type ShotEntry = ShotDef | MotifRef;

export interface CinematicDef {
  id: string;
  /** Music to play underneath: cue and state of the score (presentation only). */
  music?: { cue: string; state: string };
  shots: readonly ShotEntry[];
}

/** M28: the cross-fade of a still sequence lasts a second. */
export const STILL_FADE_MS = 1000;
/** M28: how far a still sequence zooms in over its shot (1.06 = 6 %). */
export const STILL_ZOOM = 1.06;

/**
 * M28 still sequence at `time` ms into its shot: the zoom of both pictures (1 → STILL_ZOOM
 * over the shot) and the end picture's opacity (0 before the cross-fade, 1 after it; the
 * fade is centred in the shot). A shot without an end picture only zooms.
 */
export function stillMix(shot: ShotDef, time: number): { zoom: number; end: number } {
  const t = Math.max(0, Math.min(shot.ms, time));
  const zoom = 1 + ((STILL_ZOOM - 1) * t) / Math.max(1, shot.ms);
  if (!shot.end) return { zoom, end: 0 };
  const from = shot.ms / 2 - STILL_FADE_MS / 2;
  return { zoom, end: Math.max(0, Math.min(1, (t - from) / STILL_FADE_MS)) };
}

export function holds(c: Condition, s: StoryState): boolean {
  const v = s[c.key];
  if (c.is !== undefined && v !== c.is) return false;
  if (c.atLeast !== undefined && !(typeof v === 'number' && v >= c.atLeast)) return false;
  if (c.below !== undefined && !(typeof v === 'number' && v < c.below)) return false;
  if (c.sameAs !== undefined && v !== s[c.sameAs]) return false;
  if (c.notSameAs !== undefined && v === s[c.notSameAs]) return false;
  return true;
}

const isMotif = (e: ShotEntry): e is MotifRef => 'motif' in e;

/** The shots a cinematic shows for this state, motifs expanded. */
export function resolveCinematic(
  def: CinematicDef,
  motifs: Readonly<Record<string, ShotDef>>,
  state: StoryState = {},
): ShotDef[] {
  const out: ShotDef[] = [];
  for (const e of def.shots) {
    if (!(e.when ?? []).every((c) => holds(c, state))) continue;
    if (isMotif(e)) {
      const m = motifs[e.motif];
      if (!m) throw new Error(`cinematic ${def.id}: unknown motif "${e.motif}"`);
      if (!(m.when ?? []).every((c) => holds(c, state))) continue;
      out.push({ ...m, cues: e.cues ?? m.cues });
    } else out.push(e);
  }
  return out;
}

/** What the screen draws right now. */
export interface CinematicFrame {
  shot: ShotDef;
  index: number;
  count: number;
  /** Time into the shot, ms. */
  time: number;
  paused: boolean;
  done: boolean;
}

/** The subtitle on screen, with the language it was latched in. */
export interface ShownCue<L extends string = string> {
  cue: SubtitleCue;
  locale: L;
}

/** The longest a still picture waits for a line to finish (a stuck system voice). */
export const NARRATION_WAIT_MS = 12_000;

/**
 * M28: how far a still sequence's clock may move this frame. A line still being spoken
 * holds its subtitle and picture at the end of the cue until the voice finishes (at most
 * NARRATION_WAIT_MS), so the next line or picture never cuts it off.
 */
export function narrationStep(
  dt: number,
  time: number,
  cueUntil: number | null,
  talking: boolean,
  waited: number,
): number {
  if (cueUntil === null || !talking || waited >= NARRATION_WAIT_MS) return dt;
  return Math.max(0, Math.min(dt, cueUntil - 1 - time));
}

export class CinematicPlayer<L extends string = string> {
  private index = 0;
  private time = 0;
  private paused = false;
  private finished = false;
  private latched: { shot: number; cue: SubtitleCue; locale: L } | null = null;

  constructor(readonly shots: readonly ShotDef[]) {
    if (shots.length === 0) this.finished = true;
  }

  get done(): boolean {
    return this.finished;
  }

  frame(): CinematicFrame | null {
    const shot = this.shots[this.index];
    if (!shot) return null;
    return {
      shot,
      index: this.index,
      count: this.shots.length,
      time: this.time,
      paused: this.paused,
      done: this.finished,
    };
  }

  /** Advances the clock (no-op while paused or finished). */
  advance(ms: number): void {
    if (this.paused || this.finished || ms <= 0) return;
    this.time += ms;
    for (let shot = this.shots[this.index]; shot && this.time >= shot.ms;) {
      this.time -= shot.ms;
      this.index += 1;
      shot = this.shots[this.index];
      if (!shot) {
        this.index = this.shots.length - 1;
        this.time = this.shots[this.index]!.ms;
        this.finished = true;
        return;
      }
    }
  }

  /** Jumps to the start of the next shot (finishes after the last). */
  next(): void {
    if (this.finished) return;
    if (this.index + 1 >= this.shots.length) {
      this.finished = true;
      return;
    }
    this.index += 1;
    this.time = 0;
  }

  skip(): void {
    this.finished = true;
  }

  setPaused(p: boolean): void {
    this.paused = p && !this.finished;
  }

  togglePause(): void {
    this.setPaused(!this.paused);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /**
   * The cue on screen. Its language is latched when the cue appears, so a language change
   * during a cinematic takes effect at the next cue boundary (never inside one subtitle).
   */
  subtitle(current: L): ShownCue<L> | null {
    const shot = this.shots[this.index];
    if (!shot || this.finished) return null;
    const cue = shot.cues.find((c) => this.time >= c.at && this.time < c.until) ?? null;
    if (!cue) {
      this.latched = null;
      return null;
    }
    if (!this.latched || this.latched.cue !== cue || this.latched.shot !== this.index)
      this.latched = { shot: this.index, cue, locale: current };
    return { cue, locale: this.latched.locale };
  }
}
