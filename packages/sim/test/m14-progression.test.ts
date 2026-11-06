import { describe, expect, test } from 'vitest';
import { DIFFICULTIES } from '../src/enemies/data';
import { STAGES, beatOf, stageResults } from '../src/stage/run';
import { RunPhase, WorkerState, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { nonCombatant } from '../src/combat/damage';
import { stageBotInput } from './stageBot';

/**
 * M14 progression-blocker sweep (spec §19: "no progression-blocking defects"). Stage 1 is
 * played from every checkpoint beat at every difficulty, solo with each founder and in
 * co-op. The heroes are kept alive, so the sweep tests the route (locks, workers, clue,
 * evidence, exit, boss surrender, results), not the bot's fighting. A stall detector fails
 * the run when nothing advances for 60 seconds while no enemy is fighting.
 */
const STAGE1 = STAGES[0]!;
const CAP = 60 * 60 * 12;
const STALL = 60 * 60;

interface Outcome {
  done: boolean;
  frames: number;
  stall: string | null;
}

function signature(w: World): string {
  const r = w.run!;
  const freed = r.workers.filter((k) => k.state !== WorkerState.Bound).length;
  const enemies = w.bodies.filter((b) => b.team === 'enemy' && !b.ko).length;
  return [r.beat, r.phase, r.locksDone, freed, r.clue, r.evidence, enemies].join('/');
}

function sweep(difficulty: string, heroes: string[], beat: number): Outcome {
  const w = createWorld(7, { stage: 'stage1', difficulty, heroes, beat });
  let sig = signature(w);
  let lastChange = 0;
  let farthest = 0;
  for (let i = 0; i < CAP; i += 1) {
    if (w.run!.phase === RunPhase.Complete) return { done: true, frames: i, stall: null };
    for (const b of w.bodies) if (b.team === 'hero' && !b.ko) b.health = b.maxHealth;
    step(
      w,
      heroes.map((_, slot) => stageBotInput(w, slot)),
    );
    const now = signature(w);
    const x = Math.max(...w.bodies.filter((b) => b.team === 'hero').map((b) => b.x));
    if (now !== sig || x > farthest + 256 * 40) {
      sig = now;
      farthest = Math.max(farthest, x);
      lastChange = i;
    }
    const fighting = w.bodies.some((e) => e.team === 'enemy' && !e.ko && !nonCombatant(e));
    if (!fighting && i - lastChange > STALL)
      return { done: false, frames: i, stall: `${beatOf(w)?.id}: ${now}` };
  }
  return { done: false, frames: CAP, stall: `cap at ${beatOf(w)?.id}: ${signature(w)}` };
}

const LINEUPS: string[][] = [['mountain'], ['river'], ['mountain', 'river']];

describe('Stage 1 can be finished from every checkpoint', () => {
  for (const d of DIFFICULTIES)
    for (const heroes of LINEUPS)
      test(`${d.id}, ${heroes.join(' + ')}`, () => {
        const failures: string[] = [];
        STAGE1.beats.forEach((b, beat) => {
          const o = sweep(d.id, heroes, beat);
          if (!o.done) failures.push(`from ${b.id}: ${o.stall}`);
        });
        expect(failures).toEqual([]);
      }, 120_000);
});

test('a run that reaches the results always has a complete result sheet', () => {
  const w = createWorld(7, { stage: 'stage1', difficulty: 'medium', heroes: ['river'] });
  for (let i = 0; i < CAP && w.run!.phase !== RunPhase.Complete; i += 1) {
    for (const b of w.bodies) if (b.team === 'hero') b.health = b.maxHealth;
    step(w, [stageBotInput(w, 0)]);
  }
  const r = stageResults(w)!;
  expect(w.run!.phase).toBe(RunPhase.Complete);
  expect(r.grades.map((g) => g.id)).toEqual(STAGE1.grade.categories.map((c) => c.id));
  expect(r.stats.evidence).toBe(1);
});
