/**
 * Fixed-step accumulator for the presentation loop. It turns variable render-frame
 * durations into a whole number of 60 Hz simulation steps. Its remainder lives on the
 * presentation side and is never part of the simulation state.
 */
export interface Accumulator {
  /**
   * Adds elapsed wall time and returns how many simulation steps to run now, plus
   * `alpha` (0…1), how far the render time sits between the last two steps.
   */
  advance(elapsedMs: number): { steps: number; alpha: number };
}

export function createAccumulator(opts: { hz: number; maxSteps: number }): Accumulator {
  const stepMs = 1000 / opts.hz;
  let remainder = 0;
  return {
    advance(elapsedMs) {
      if (Number.isFinite(elapsedMs) && elapsedMs > 0) remainder += elapsedMs;
      let steps = Math.floor(remainder / stepMs);
      if (steps > opts.maxSteps) {
        // Too far behind (tab was hidden, debugger pause): run the cap and drop the
        // debt instead of fast-forwarding.
        steps = opts.maxSteps;
        remainder = 0;
      } else {
        remainder -= steps * stepMs;
      }
      return { steps, alpha: remainder / stepMs };
    },
  };
}
