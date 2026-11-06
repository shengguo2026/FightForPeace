/**
 * Fixed Simulation with Independent Adaptive Presentation (F&D §4): the simulation always
 * steps at 60 Hz; only the presentation adapts. Auto Quality watches render frame times
 * and lowers decorative work in an authored order, never gameplay-critical cues.
 *
 * Levels, in the authored reduction order:
 * - high: everything.
 * - medium: the decorative foreground layer off.
 * - low: also the far and middle backdrops hold still (no parallax scrolling).
 * - minimal (M14): also the internal resolution drops to two thirds (fewer pixels to
 *   fill on a slow laptop or a software renderer).
 * Silhouettes, telegraphs, warnings, HUD, subtitles, hit confirmation and essential sounds
 * are never reduced.
 */
export type QualityLevel = 'high' | 'medium' | 'low' | 'minimal';
export type QualitySetting = 'auto' | QualityLevel;

export const QUALITY_LEVELS: readonly QualityLevel[] = ['high', 'medium', 'low', 'minimal'];
const ORDER = QUALITY_LEVELS;

/** Internal render resolution per level (1 = the full 1920 × 1080 view). */
export const RENDER_SCALE: Readonly<Record<QualityLevel, number>> = {
  high: 1,
  medium: 1,
  low: 1,
  minimal: 2 / 3,
};

/** Candidate thresholds (render side only; tuning values). */
export const QUALITY = {
  /** Smoothed frame time above this is "slow" (under about 45 FPS). */
  slowMs: 22,
  /** Smoothed frame time below this is "fast" (about 55 FPS or better). */
  fastMs: 18,
  /** Slow time needed before stepping down, fast time before stepping up (hysteresis). */
  downAfterMs: 2000,
  upAfterMs: 8000,
  /** A frame longer than this is a stall (hidden tab, debugger), not a measurement. */
  stallMs: 250,
  /** Smoothing weight of a new sample (exponential moving average). */
  weight: 0.1,
} as const;

export class QualityGovernor {
  setting: QualitySetting = 'auto';
  level: QualityLevel = 'high';
  /** Smoothed render frame time (ms). */
  average = 1000 / 60;
  private slowFor = 0;
  private fastFor = 0;
  /** Number of automatic level changes (Lab readout). */
  changes = 0;

  /** Manual levels fix the level; Auto starts again from High. */
  set(setting: QualitySetting): void {
    this.setting = setting;
    this.level = setting === 'auto' ? 'high' : setting;
    this.slowFor = 0;
    this.fastFor = 0;
  }

  /** One render frame of `ms` milliseconds. Returns the level to draw with. */
  sample(ms: number): QualityLevel {
    if (this.setting !== 'auto') return this.level;
    if (!Number.isFinite(ms) || ms <= 0 || ms > QUALITY.stallMs) return this.level;
    this.average += (ms - this.average) * QUALITY.weight;
    if (this.average > QUALITY.slowMs) {
      this.slowFor += ms;
      this.fastFor = 0;
    } else if (this.average < QUALITY.fastMs) {
      this.fastFor += ms;
      this.slowFor = 0;
    }
    const i = ORDER.indexOf(this.level);
    if (this.slowFor >= QUALITY.downAfterMs && i < ORDER.length - 1) {
      this.level = ORDER[i + 1]!;
      this.slowFor = 0;
      this.changes += 1;
    } else if (this.fastFor >= QUALITY.upAfterMs && i > 0) {
      this.level = ORDER[i - 1]!;
      this.fastFor = 0;
      this.changes += 1;
    }
    return this.level;
  }
}
