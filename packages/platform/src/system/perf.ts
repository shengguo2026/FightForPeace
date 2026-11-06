/**
 * M14 performance probe (spec §18.3, review 02 "frame-time budgets on a reference
 * low-end laptop"): render frame times, the simulation's cost per step, how often the
 * fixed-step loop hit its catch-up cap, and whether the simulation keeps real time.
 * Presentation-side only; it never touches the simulation state.
 */
export const FRAME_BUCKETS = [8, 17, 25, 34, 50, 100] as const;

export interface PerfSnapshot {
  /** Render frames measured. */
  frames: number;
  /** Mean and 95th-percentile render frame time (ms) over the window. */
  meanMs: number;
  p95Ms: number;
  /** Frames at or under each bucket limit (the last bucket counts the rest). */
  histogram: number[];
  /** Mean simulation cost per 60 Hz step (ms). */
  stepMs: number;
  /** Simulation steps per wall-clock second while running (60 = real time). */
  simHz: number;
  /** Render frames whose step debt was dropped (the catch-up cap). */
  capped: number;
}

export class PerfProbe {
  private readonly window: number[] = [];
  private frames = 0;
  private stepTotal = 0;
  private steps = 0;
  private wall = 0;
  private wallSteps = 0;
  private capped = 0;

  constructor(private readonly size = 600) {}

  /** One render frame: its length, the steps it ran and their total cost. */
  frame(ms: number, steps: number, stepCostMs: number, cappedNow: boolean): void {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this.frames += 1;
    this.window.push(ms);
    if (this.window.length > this.size) this.window.shift();
    this.steps += steps;
    this.stepTotal += stepCostMs;
    // Stalls (hidden tab, debugger) are not measurements of real time.
    if (ms < 250) {
      this.wall += ms;
      this.wallSteps += steps;
    }
    if (cappedNow) this.capped += 1;
  }

  reset(): void {
    this.window.length = 0;
    this.frames = 0;
    this.stepTotal = 0;
    this.steps = 0;
    this.wall = 0;
    this.wallSteps = 0;
    this.capped = 0;
  }

  snapshot(): PerfSnapshot {
    const w = [...this.window].sort((a, b) => a - b);
    const histogram = FRAME_BUCKETS.map(() => 0);
    for (const ms of this.window) {
      const i = FRAME_BUCKETS.findIndex((b) => ms <= b);
      histogram[i < 0 ? FRAME_BUCKETS.length - 1 : i]! += 1;
    }
    const mean = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
    const r = (x: number) => Math.round(x * 100) / 100;
    return {
      frames: this.frames,
      meanMs: r(mean),
      p95Ms: r(w.length ? w[Math.min(w.length - 1, Math.floor(w.length * 0.95))]! : 0),
      histogram,
      stepMs: r(this.steps ? this.stepTotal / this.steps : 0),
      simHz: r(this.wall > 0 ? (this.wallSteps * 1000) / this.wall : 0),
      capped: this.capped,
    };
  }
}
