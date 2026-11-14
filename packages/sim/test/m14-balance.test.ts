import { describe, expect, test } from 'vitest';
import { STAGES } from '../src/stage/run';
import { RunPhase } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { stageBotInput } from './stageBot';

/**
 * M14 balance harness for Medium (roadmap M14, spec §19). Every Stage 1 beat is played
 * from its own checkpoint with full Health by twelve variants of the stage bot (three
 * guard habits × four attack rhythms), solo with each founder and in co-op, on every
 * difficulty (Easy to Ultimate). A beat counts as cleared when the bot reaches the next beat without going down.
 *
 * The bot is a deterministic stand-in, not a human, so the harness checks the shape of
 * the difficulty (ordering and spikes), not exact values. The snapshot is the balance
 * table in docs/review/08-slice-acceptance.md: a data change that moves it shows up here
 * and needs a conscious snapshot update.
 */
const STAGE1 = STAGES[0]!;
const BEATS = STAGE1.beats.map((b) => b.id);
const BOSS = BEATS.length - 1;
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
      const w = createWorld(7, { stage: 'stage1', difficulty, heroes, beat });
      const run = w.run!;
      for (
        let i = 0;
        i < 60 * 60 * 12 &&
        run.phase !== RunPhase.Complete &&
        run.phase !== RunPhase.Defeat &&
        run.beat === beat &&
        run.stats.downs === 0;
        i += 1
      )
        step(
          w,
          heroes.map((_, slot) => stageBotInput(w, slot, style)),
        );
      if (run.phase === RunPhase.Complete || run.beat !== beat) cleared[beat]! += 1;
      const hs = w.bodies.filter((b) => b.team === 'hero');
      health[beat]! += hs.reduce((n, b) => n + b.health, 0) / hs.length;
    });
  return { cleared, health: health.map((h) => Math.round(h / STYLES.length)) };
}

const DIFFS = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];
const LINEUPS = { mountain: ['mountain'], river: ['river'], coop: ['mountain', 'river'] };
const table: Record<string, Row> = {};
for (const [name, heroes] of Object.entries(LINEUPS))
  for (const d of DIFFS) table[`${name} ${d}`] = measure(d, heroes);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('Medium balance shape (twelve bot variants per beat)', () => {
  test('Medium is harder than Easy for every line-up', () => {
    for (const name of Object.keys(LINEUPS))
      expect(sum(table[`${name} medium`]!.cleared)).toBeLessThan(
        sum(table[`${name} easy`]!.cleared),
      );
  });

  test('co-op on Medium is never harder than solo', () => {
    const coop = sum(table['coop medium']!.cleared);
    expect(coop).toBeGreaterThanOrEqual(sum(table['mountain medium']!.cleared));
    expect(coop).toBeGreaterThanOrEqual(sum(table['river medium']!.cleared));
  });

  // M23: a quarter (was a third). The M23 AI fix stops enemies idling in the unsafe strip
  // at a room's end wall, so the courtyard lost its passive edge enemies and Mountain's
  // jab-only bot clears it in 3 of 12 (was 4); it stays no harder than the boss (below).
  test('no ordinary Medium beat is a spike: each is cleared by a quarter of the variants', () => {
    for (const name of ['mountain', 'river'])
      table[`${name} medium`]!.cleared.forEach((n, beat) => {
        if (beat !== BOSS) expect(n, `${name} ${BEATS[beat]}`).toBeGreaterThanOrEqual(3);
      });
  });

  test('the gate courtyard exam is no harder than the Sluice Commander on Medium', () => {
    const courtyard = BEATS.indexOf('courtyard');
    for (const name of ['mountain', 'river']) {
      const row = table[`${name} medium`]!;
      expect(row.cleared[courtyard]).toBeGreaterThanOrEqual(row.cleared[BOSS]! - 1);
    }
  });

  // M14 follow-up: Hard and above were no harder than Medium for the bot (their extra
  // budget went unused and more guarding made enemies passive). Each step up the ladder
  // must now cost both cleared beats and Health left, for every line-up.
  test('each difficulty above Medium is harder than the one below it', () => {
    for (const name of Object.keys(LINEUPS))
      for (let i = 2; i < DIFFS.length; i += 1) {
        const lower = table[`${name} ${DIFFS[i - 1]}`]!;
        const upper = table[`${name} ${DIFFS[i]}`]!;
        const what = `${name}: ${DIFFS[i]} vs ${DIFFS[i - 1]}`;
        expect(sum(upper.cleared), what).toBeLessThan(sum(lower.cleared));
        expect(sum(upper.health), what).toBeLessThan(sum(lower.health));
      }
  });

  test('solo: the gate courtyard and the Sluice Commander are no easier above Medium', () => {
    const courtyard = BEATS.indexOf('courtyard');
    for (const name of ['mountain', 'river']) {
      const medium = table[`${name} medium`]!;
      for (const d of DIFFS.slice(2)) {
        const row = table[`${name} ${d}`]!;
        expect(row.cleared[courtyard], `${name} ${d} courtyard`).toBeLessThanOrEqual(
          medium.cleared[courtyard]!,
        );
        expect(row.cleared[BOSS], `${name} ${d} sluice`).toBeLessThanOrEqual(medium.cleared[BOSS]!);
      }
    }
  });

  // M14 follow-up 2: two heroes beat the Commander on Extreme as often as on Medium. On
  // Extreme and above co-op brings extra supports, and enemies caught between both heroes
  // stop guarding (it only exposed their back).
  test('co-op: the Sluice Commander gets harder from Medium to Extreme', () => {
    const boss = (d: string) => table[`coop ${d}`]!.cleared[BOSS]!;
    expect(boss('hard')).toBeLessThanOrEqual(boss('medium'));
    expect(boss('extreme')).toBeLessThan(boss('medium'));
    expect(boss('ultimate')).toBeLessThanOrEqual(boss('extreme'));
  });

  test('the balance table', () => {
    const lines = [`| Line-up | ${BEATS.join(' | ')} |`];
    for (const [k, r] of Object.entries(table))
      lines.push(`| ${k} | ${r.cleared.map((c, i) => `${c}/12 · ${r.health[i]}`).join(' | ')} |`);
    expect(lines.join('\n')).toMatchSnapshot();
  });
});
