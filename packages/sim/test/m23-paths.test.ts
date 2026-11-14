import { describe, expect, test } from 'vitest';
import { stageResults } from '../src/stage/run';
import { RunPhase, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { stageBotInput } from './stageBot';

/**
 * M23 complete paths (spec §18: "All four heroes complete Medium solo. All six unique hero
 * pairs complete Medium in hot-seat …; Easy, Hard, Extreme and Ultimate receive complete
 * solo and representative co-op coverage. Clean … paths").
 *
 * The whole of Stage 2, from the Perimeter Pursuit to the marked crate, with no cheats and
 * no help: the bot keeps its Health between beats, uses continues and, when they run out,
 * starts the stage again (D8), as a player would. The bot is not a strong player, so each
 * line-up gets up to four bot habits and passes when one of them finishes within three hours
 * of game time. Extreme and Ultimate (and Hard solo) are beyond the bot in one sitting:
 * their coverage is the progression sweep (every beat to the results) and the balance
 * harness (every beat cleared by some variant), plus Guo's manual runs.
 */
const CAP = 60 * 60 * 180;
const STYLES = [
  {},
  { guardEvery: 3, attackEvery: 9 },
  { guardEvery: 2, attackEvery: 7 },
  { guardEvery: 1, attackEvery: 11 },
];

interface Path {
  done: boolean;
  style: number;
  minutes: number;
  total: number;
  continues: number;
  restarts: number;
  world: World;
}

function path(difficulty: string, heroes: string[]): Path {
  let last: Path | null = null;
  for (const [n, style] of STYLES.entries()) {
    const w = createWorld(7, { stage: 'stage2', difficulty, heroes });
    let i = 0;
    let restarts = 0;
    for (; i < CAP && w.run!.phase !== RunPhase.Complete; i += 1) {
      const before = w.run;
      step(
        w,
        heroes.map((_, s) => stageBotInput(w, s, style)),
      );
      if (w.run !== before) restarts += 1;
    }
    last = {
      done: w.run!.phase === RunPhase.Complete,
      style: n,
      minutes: Math.round(w.run!.stats.frames / 3600),
      total: Math.round(i / 3600),
      continues: w.run!.continuesUsed,
      restarts,
      world: w,
    };
    if (last.done) return last;
  }
  return last!;
}

const SOLO = ['mountain', 'river', 'wind', 'fire'].map((h) => [h]);
const PAIRS = [
  ['mountain', 'river'],
  ['mountain', 'wind'],
  ['mountain', 'fire'],
  ['river', 'wind'],
  ['river', 'fire'],
  ['wind', 'fire'],
];
/** Representative pairs: the founders, the twins and one mixed pair. */
const REPRESENTATIVE = [PAIRS[0]!, PAIRS[5]!, PAIRS[4]!];

const CASES: [string, string[]][] = [
  ...SOLO.map((h) => ['medium', h] as [string, string[]]),
  ...PAIRS.map((h) => ['medium', h] as [string, string[]]),
  ...SOLO.map((h) => ['easy', h] as [string, string[]]),
  ...REPRESENTATIVE.map((h) => ['easy', h] as [string, string[]]),
  ...REPRESENTATIVE.map((h) => ['hard', h] as [string, string[]]),
];

describe('Stage 2 from the pursuit to the crate, without cheats', () => {
  for (const [d, heroes] of CASES)
    test(`${d}, ${heroes.join(' + ')}`, () => {
      const p = path(d, heroes);
      expect(p.done, `${d} ${heroes.join('+')}: no bot habit finished`).toBe(true);
      const r = stageResults(p.world)!;
      // A clean run: no cheat was ever on, Marek was captured, the crate was secured.
      expect(r.cheatAssisted).toBe(false);
      expect(r.capture).not.toBeNull();
      expect(r.stats.evidence).toBe(1);
      expect(r.grades.map((g) => g.id)).toEqual(['preservation', 'response', 'continues', 'time']);
      expect(p.world.bodies.filter((b) => b.team === 'hero')).toHaveLength(heroes.length);
      // For the acceptance record (docs/review/09-stage2-acceptance.md §2).
      expect({
        habit: p.style,
        lastRunMinutes: p.minutes,
        totalMinutes: p.total,
        continues: p.continues,
        restarts: p.restarts,
      }).toMatchSnapshot();
    }, 300_000);
});
