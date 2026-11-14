import { describe, expect, test } from 'vitest';
import { STAGES } from '../src/stage/run';
import { RunPhase } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { stageBotInput } from './stageBot';

/**
 * M23 balance harness for Stage 2 (spec §18: "Easy is beginner-completable …; Medium is
 * canonical; higher difficulties remain legal and readable"), the M14 harness extended.
 * Every Stage 2 beat is played from its own checkpoint with full Health by twelve variants
 * of the stage bot (three guard habits × four attack rhythms), solo with each of the four
 * heroes and with the founders and the twins as pairs, on every difficulty. A beat counts
 * as cleared when the bot reaches the next beat (or the results) without going down.
 *
 * The bot is a deterministic stand-in, so the harness checks the shape of the difficulty
 * (ordering and spikes), not exact values. The snapshot is the balance table in
 * docs/review/09-stage2-acceptance.md.
 */
const STAGE2 = STAGES.find((s) => s.id === 'stage2')!;
const BEATS = STAGE2.beats.map((b) => b.id);
const BOSS = BEATS.indexOf('dispatch-yard');
const STYLES = [1, 2, 3].flatMap((guardEvery) =>
  [7, 9, 11, 13].map((attackEvery) => ({ guardEvery, attackEvery })),
);

interface Row {
  cleared: number[];
  health: number[];
}

function measure(difficulty: string, heroes: string[]): Row {
  const cleared = BEATS.map(() => 0);
  const health = BEATS.map(() => 0);
  for (const style of STYLES)
    BEATS.forEach((_, beat) => {
      const w = createWorld(7, { stage: 'stage2', difficulty, heroes, beat });
      const run = w.run!;
      for (
        let i = 0;
        i < 60 * 60 * 12 &&
        run.phase !== RunPhase.Complete &&
        run.phase !== RunPhase.Defeat &&
        w.run!.beat === beat &&
        run.stats.downs === 0;
        i += 1
      )
        step(
          w,
          heroes.map((_, slot) => stageBotInput(w, slot, style)),
        );
      if (w.run!.phase === RunPhase.Complete || w.run!.beat !== beat) cleared[beat]! += 1;
      const hs = w.bodies.filter((b) => b.team === 'hero');
      health[beat]! += hs.reduce((n, b) => n + b.health, 0) / hs.length;
    });
  return { cleared, health: health.map((h) => Math.round(h / STYLES.length)) };
}

const DIFFS = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];
const SOLO = ['mountain', 'river', 'wind', 'fire'];
const LINEUPS: Record<string, string[]> = {
  mountain: ['mountain'],
  river: ['river'],
  wind: ['wind'],
  fire: ['fire'],
  founders: ['mountain', 'river'],
  twins: ['wind', 'fire'],
};
const table: Record<string, Row> = {};
for (const [name, heroes] of Object.entries(LINEUPS))
  for (const d of DIFFS) table[`${name} ${d}`] = measure(d, heroes);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('Stage 2 balance shape (twelve bot variants per beat)', () => {
  test('Medium is harder than Easy for every line-up', () => {
    for (const name of Object.keys(LINEUPS)) {
      const what = `${name}: medium vs easy`;
      expect(sum(table[`${name} medium`]!.health), what).toBeLessThan(
        sum(table[`${name} easy`]!.health),
      );
      // Pairs clear almost every beat on both, so only solo line-ups compare clears.
      if (SOLO.includes(name))
        expect(sum(table[`${name} medium`]!.cleared), what).toBeLessThanOrEqual(
          sum(table[`${name} easy`]!.cleared),
        );
    }
  });

  test('every difficulty above Medium costs Health, and clears fewer beats than Medium', () => {
    for (const name of Object.keys(LINEUPS)) {
      const medium = table[`${name} medium`]!;
      for (let i = 2; i < DIFFS.length; i += 1) {
        const lower = table[`${name} ${DIFFS[i - 1]}`]!;
        const upper = table[`${name} ${DIFFS[i]}`]!;
        const what = `${name}: ${DIFFS[i]} vs ${DIFFS[i - 1]}`;
        expect(sum(upper.health), what).toBeLessThan(sum(lower.health));
        expect(sum(upper.cleared), `${name}: ${DIFFS[i]} vs medium`).toBeLessThan(
          sum(medium.cleared),
        );
      }
    }
  });

  test('co-op on Medium is never harder than solo', () => {
    for (const [pair, heroes] of [
      ['founders', ['mountain', 'river']],
      ['twins', ['wind', 'fire']],
    ] as const) {
      const coop = sum(table[`${pair} medium`]!.cleared);
      for (const h of heroes)
        expect(coop, `${pair} vs ${h}`).toBeGreaterThanOrEqual(sum(table[`${h} medium`]!.cleared));
    }
  });

  test('no ordinary Medium beat is a spike: each is cleared by a quarter of the variants', () => {
    for (const name of SOLO)
      table[`${name} medium`]!.cleared.forEach((n, beat) => {
        if (beat !== BOSS) expect(n, `${name} ${BEATS[beat]}`).toBeGreaterThanOrEqual(3);
      });
  });

  test('Marek is the hardest Medium fight for every solo hero, but never a wall', () => {
    for (const name of SOLO) {
      const row = table[`${name} medium`]!;
      const others = row.cleared.filter((_, beat) => beat !== BOSS);
      expect(row.cleared[BOSS], name).toBeLessThanOrEqual(Math.min(...others));
      expect(row.cleared[BOSS], name).toBeGreaterThanOrEqual(1);
    }
  });

  test('the balance table', () => {
    const lines = [`| Line-up | ${BEATS.join(' | ')} |`];
    for (const [k, r] of Object.entries(table))
      lines.push(`| ${k} | ${r.cleared.map((c, i) => `${c}/12 · ${r.health[i]}`).join(' | ')} |`);
    expect(lines.join('\n')).toMatchSnapshot();
  });
});
