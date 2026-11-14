import { describe, expect, test } from 'vitest';
import { DIFFICULTIES } from '../src/enemies/data';
import { STAGES, beatOf } from '../src/stage/run';
import { BranchOutcome, RunPhase, WorkerState, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { nonCombatant } from '../src/combat/damage';
import { stageBotInput } from './stageBot';

/**
 * M23 progression-blocker sweep for Stage 2 (spec §18: "zero … softlocks"), the M14 sweep
 * extended: Stage 2 from every one of its beats at every difficulty, with each of the four
 * heroes solo and each of the six pairs, on the spine and on the upper lane that takes every
 * optional branch. The heroes are kept alive, so the sweep tests the route (pursuits, rooms,
 * branches, checkpoints, Marek's capture, the crate, the results), not the bot's fighting.
 * A stall detector fails a run when nothing advances for 60 seconds outside a fight.
 */
const STAGE2 = STAGES.find((s) => s.id === 'stage2')!;
const CAP = 60 * 60 * 12;
const STALL = 60 * 60;

function signature(w: World): string {
  const r = w.run!;
  const freed = r.workers.filter((k) => k.state !== WorkerState.Bound).length;
  const enemies = w.bodies.filter((b) => b.team === 'enemy' && !b.ko).length;
  return [r.beat, r.phase, r.locksDone, freed, r.clue, r.evidence, enemies].join('/');
}

interface Outcome {
  done: boolean;
  stall: string | null;
  world: World;
}

function sweep(difficulty: string, heroes: string[], beat: number, lane?: number): Outcome {
  const w = createWorld(7, { stage: 'stage2', difficulty, heroes, beat });
  let sig = signature(w);
  let lastChange = 0;
  let farthest = 0;
  for (let i = 0; i < CAP; i += 1) {
    if (w.run!.phase === RunPhase.Complete) return { done: true, stall: null, world: w };
    for (const b of w.bodies) if (b.team === 'hero' && !b.ko) b.health = b.maxHealth;
    step(
      w,
      heroes.map((_, slot) => stageBotInput(w, slot, { lane })),
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
      return { done: false, stall: `${beatOf(w)?.id}: ${now}`, world: w };
  }
  return { done: false, stall: `cap at ${beatOf(w)?.id}: ${signature(w)}`, world: w };
}

const SOLO = ['mountain', 'river', 'wind', 'fire'].map((h) => [h]);
const PAIRS: string[][] = [
  ['mountain', 'river'],
  ['mountain', 'wind'],
  ['mountain', 'fire'],
  ['river', 'wind'],
  ['river', 'fire'],
  ['wind', 'fire'],
];

describe('Stage 2 can be finished from every beat', () => {
  for (const d of DIFFICULTIES)
    for (const heroes of [...SOLO, ...PAIRS])
      test(`${d.id}, ${heroes.join(' + ')}`, () => {
        const failures: string[] = [];
        STAGE2.beats.forEach((b, beat) => {
          const o = sweep(d.id, heroes, beat);
          if (!o.done) failures.push(`from ${b.id}: ${o.stall}`);
        });
        expect(failures).toEqual([]);
      }, 240_000);
});

describe('every optional branch can be entered and left at every difficulty', () => {
  const branches = STAGE2.beats.flatMap((b, i) => (b.branch ? [i] : []));
  for (const d of DIFFICULTIES)
    for (const heroes of [['wind'], ['mountain', 'fire']])
      test(`${d.id}, ${heroes.join(' + ')}, upper lane`, () => {
        const visited = new Set<number>();
        const failures: string[] = [];
        // From the start and from each branch's parent beat: the upper lane takes the branch.
        const starts = [0, ...branches.map((b) => b - 1)];
        for (const beat of [...new Set(starts)]) {
          const o = sweep(d.id, heroes, beat, 700);
          if (!o.done) failures.push(`from ${STAGE2.beats[beat]!.id}: ${o.stall}`);
          o.world.run!.branches.forEach((outcome, i) => {
            if (outcome !== BranchOutcome.Skipped) visited.add(i);
          });
        }
        expect(failures).toEqual([]);
        expect([...visited].sort((a, b) => a - b)).toEqual(branches);
      }, 240_000);
});
