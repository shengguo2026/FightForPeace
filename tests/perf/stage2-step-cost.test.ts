import { createWorld, step } from '@ffp/sim';
import { describe, expect, test } from 'vitest';
import { stageBotInput } from '../../packages/sim/test/stageBot';

/**
 * M23 stress (Stage 2 spec §18): the simulation's cost per 60 Hz step in the heaviest
 * Stage 2 situations, played by the stage bot. The browser side (drawing, Auto Quality on
 * a throttled CPU) is apps/game/e2e/m23.spec.ts.
 */
/** Mean simulation milliseconds per step over `frames` steps of the stage bot. */
function stepCost(options: Parameters<typeof createWorld>[1], heroes: number, frames: number) {
  const w = createWorld(13, options);
  for (let i = 0; i < 60; i += 1)
    step(
      w,
      Array.from({ length: heroes }, (_, s) => stageBotInput(w, s)),
    );
  const t = performance.now();
  for (let i = 0; i < frames; i += 1)
    step(
      w,
      Array.from({ length: heroes }, (_, s) => stageBotInput(w, s)),
    );
  return { ms: (performance.now() - t) / frames, world: w };
}

describe('step cost in the heaviest Stage 2 situations (budget 4 ms of 16.7)', () => {
  const BUDGET = 4;
  test('crowded rooms on Ultimate in co-op', () => {
    for (const beat of [1, 2, 9, 10]) {
      const { ms } = stepCost(
        { stage: 'stage2', difficulty: 'ultimate', heroes: ['mountain', 'fire'], beat },
        2,
        1200,
      );
      expect(ms, `beat ${beat}`).toBeLessThan(BUDGET);
    }
  });

  test('the mounted pursuit in co-op, and Marek’s intercept', () => {
    for (const beat of [0, 12]) {
      const { ms } = stepCost(
        { stage: 'stage2', difficulty: 'extreme', heroes: ['river', 'wind'], beat },
        2,
        1500,
      );
      expect(ms, `beat ${beat}`).toBeLessThan(BUDGET);
    }
  });

  test('every Marek phase (the yard played to the capture)', () => {
    const { ms } = stepCost(
      { stage: 'stage2', difficulty: 'hard', heroes: ['wind', 'fire'], beat: 13 },
      2,
      3000,
    );
    expect(ms).toBeLessThan(BUDGET);
  });
});
