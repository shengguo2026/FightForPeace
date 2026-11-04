import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionBit } from '../src/input/bits';
import { HEROES } from '../src/combat/roster';
import type { StageDef } from '../src/combat/types';
import { fx } from '../src/math/fixed';
import { ARENAS, DIFFICULTIES, enemyKitIndex, profileOf } from '../src/enemies/data';
import { Result, arenaNames } from '../src/enemies/encounter';
import { REACTION } from '../src/combat/reactions';
import {
  STAGES,
  beatOf,
  exitOpen,
  interactionFor,
  isDowned,
  nextBeat,
  stageHero,
  stageResults,
  stepRun,
} from '../src/stage/run';
import {
  ChannelKind,
  type Fighter,
  type FrameInput,
  MoveState,
  RunEvent,
  RunPhase,
  type World,
  WorkerState,
} from '../src/world/types';
import {
  createWorld,
  hashWorld,
  heroOf,
  setHero,
  step,
  type WorldOptions,
} from '../src/world/world';
import { idle, inp } from './helpers';
import { stageBotInput } from './stageBot';

const STAGE1 = STAGES[0]!;
const hold = inp({ held: ActionBit.Interact });
const press = inp({ pressed: ActionBit.Interact, held: ActionBit.Interact });

function stage(options: Partial<WorldOptions> = {}): World {
  return createWorld(3, { stage: 'stage1', difficulty: 'medium', ...options });
}

function hero(w: World, slot = 0): Fighter {
  const h = heroOf(w, slot);
  if (!h) throw new Error(`no hero ${slot}`);
  return h;
}

/** Steps with the given inputs per slot `n` times. */
function run(w: World, n: number, inputs: FrameInput[] = [idle]): void {
  for (let i = 0; i < n; i += 1) step(w, inputs);
}

/** Every enemy still fighting goes down for good (testing the flow, not the combat). */
function clear(w: World): void {
  for (let i = 0; i < 8 && w.run!.phase === RunPhase.Locked; i += 1) {
    for (const e of w.bodies)
      if (e.team === 'enemy' && !e.ko) {
        e.health = 0;
        e.ko = true;
        e.state = MoveState.Down;
        e.stateFrame = 0;
        e.stun = 1;
      }
    run(
      w,
      40,
      w.bodies.filter((b) => b.team === 'hero').map(() => idle),
    );
  }
}

function knockOut(f: Fighter): void {
  f.health = 0;
  f.ko = true;
  f.state = MoveState.Down;
  f.stateFrame = 0;
  f.stun = 1;
}

function placeAt(f: Fighter, x: number, z: number): void {
  f.x = fx(x);
  f.z = fx(z);
}

describe('Stage 1 data (Module 19, Appendix D.3)', () => {
  test('eight beats in story order, checkpoints at beats 3, 5 and the boss', () => {
    expect(STAGE1.beats.map((b) => b.id)).toEqual([
      'fields',
      'bridge',
      'rescue',
      'mill',
      'investigation',
      'canal',
      'courtyard',
      'sluice',
    ]);
    expect(STAGE1.beats.flatMap((b, i) => (b.checkpoint ? [i + 1] : []))).toEqual([3, 5, 8]);
    expect(STAGE1.continues).toEqual([5, 3, 2, 1, 0]);
    expect(STAGE1.rules.reviveFrames).toBe(120);
  });

  test('every camera lock is a stage arena; the Lab arena list leaves them out', () => {
    for (const b of STAGE1.beats) {
      expect(ARENAS[b.base]!.stage).toBe(true);
      expect(ARENAS[b.base]!.waves).toHaveLength(0);
      for (const l of b.locks) {
        const a = ARENAS[l.arena]!;
        expect(a.stage).toBe(true);
        expect(a.area).toBe(b.area);
        expect(l.view + 1920).toBeLessThanOrEqual(b.width);
      }
    }
    expect(arenaNames().some((a) => a.id.startsWith('stage1.'))).toBe(false);
    expect(arenaNames().some((a) => a.id === 'boss-commander')).toBe(true);
  });

  test('the investigation beat has no forced combat; the boss beat holds the evidence', () => {
    const inv = STAGE1.beats[4]!;
    expect(inv.locks).toHaveLength(0);
    expect(inv.clue).not.toBeNull();
    expect(STAGE1.beats[7]!.evidence).not.toBeNull();
    expect(STAGE1.beats[2]!.workers).toHaveLength(2);
    expect(STAGE1.beats[3]!.layout).toBe('mill');
  });
});

describe('camera locks and the exit', () => {
  test('reaching a lock holds the view and the heroes; clearing it opens the way', () => {
    const w = stage();
    const beat = beatOf(w)!;
    const lock = beat.locks[0]!;
    expect(w.encounter!.result).toBe(Result.Waiting);
    placeAt(hero(w), lock.at + 10, 820);
    run(w, 1);
    expect(w.run!.phase).toBe(RunPhase.Locked);
    expect(w.bounds.minX).toBe(fx(lock.view));
    expect(w.bounds.maxX).toBe(fx(lock.view + 1920));
    expect(w.encounter!.viewMin).toBe(fx(lock.view));
    run(w, 40);
    const enemies = w.bodies.filter((b) => b.team === 'enemy');
    // Medium solo: three recruits (the co-op one stays out).
    expect(enemies.map((e) => e.hero)).toEqual([0, 0, 0].map(() => enemyKitIndex('recruit')));
    clear(w);
    expect(w.run!.phase).toBe(RunPhase.Walk);
    expect(w.run!.locksDone).toBe(1);
    expect(w.bounds.minX).toBe(fx(lock.view));
    expect(w.bounds.maxX).toBe(fx(beat.width));
  });

  test('encounters follow the difficulty and the player count', () => {
    const count = (difficulty: string, coop: boolean) => {
      const w = stage({ difficulty });
      if (coop) step(w, [idle, idle]);
      for (const h of w.bodies) placeAt(h, 900, 820 + h.slot * 60);
      run(w, 40, coop ? [idle, idle] : [idle]);
      return w.bodies.filter((b) => b.team === 'enemy').length;
    };
    expect(count('easy', false)).toBe(2);
    expect(count('medium', false)).toBe(3);
    expect(count('medium', true)).toBe(4);
  });

  test('the courtyard substitutes one recruit with the Black-Iron Enforcer from Hard', () => {
    const kits = (difficulty: string) => {
      const w = stage({ difficulty, beat: 6 });
      placeAt(hero(w), 900, 820);
      run(w, 40);
      return w.bodies.filter((b) => b.team === 'enemy').map((e) => e.hero);
    };
    expect(kits('medium')).not.toContain(enemyKitIndex('enforcer'));
    expect(kits('hard')).toContain(enemyKitIndex('enforcer'));
  });

  test('the exit leads to the next beat through a fade; heroes keep Health and meter', () => {
    const w = stage();
    for (const l of beatOf(w)!.locks) {
      placeAt(hero(w), l.at + 10, 820);
      run(w, 1);
      clear(w);
    }
    expect(exitOpen(w)).toBe(true);
    hero(w).health = 640;
    hero(w).meter = 300;
    placeAt(hero(w), beatOf(w)!.width - 100, 820);
    run(w, 1);
    expect(w.run!.phase).toBe(RunPhase.Transition);
    run(w, STAGE1.rules.transition);
    expect(w.run!.beat).toBe(1);
    expect(w.run!.phase).toBe(RunPhase.Walk);
    expect(hero(w).health).toBe(640);
    expect(hero(w).meter).toBe(300);
    expect(hero(w).x).toBe(fx(beatOf(w)!.heroX));
    expect(w.bodies.filter((b) => b.team === 'enemy')).toHaveLength(0);
  });
});

describe('worker rescue, food and the cache', () => {
  function rescueBeat(): World {
    const w = stage({ beat: 2 });
    placeAt(hero(w), beatOf(w)!.locks[0]!.at + 10, 820);
    run(w, 1);
    clear(w);
    return w;
  }

  test('the exit stays shut until every worker is free', () => {
    const w = rescueBeat();
    expect(w.run!.workers.every((k) => k.state === WorkerState.Bound)).toBe(true);
    expect(exitOpen(w)).toBe(false);
    placeAt(hero(w), beatOf(w)!.width - 100, 820);
    run(w, 5);
    expect(w.run!.phase).toBe(RunPhase.Walk);
  });

  test('holding Interact for the worker frames frees a worker; letting go cancels', () => {
    const w = rescueBeat();
    const k = w.run!.workers[0]!;
    hero(w).x = k.x - fx(60);
    hero(w).z = k.z;
    expect(interactionFor(w, hero(w))).toBe(ChannelKind.Worker);
    step(w, [press]);
    expect(hero(w).state).toBe(MoveState.Channel);
    run(w, 10, [hold]);
    run(w, 1);
    expect(hero(w).state).toBe(MoveState.Idle);
    expect(k.state).toBe(WorkerState.Bound);
    step(w, [press]);
    run(w, STAGE1.rules.workerFrames, [hold]);
    expect(k.state).toBe(WorkerState.Freed);
    expect(w.run!.stats.workersFreed).toBe(1);
    // The freed worker cheers, then runs home and is safe.
    run(w, 400);
    expect(k.state).toBe(WorkerState.Safe);
  });

  test('a hit interrupts the hold', () => {
    const w = rescueBeat();
    const k = w.run!.workers[0]!;
    hero(w).x = k.x - fx(60);
    hero(w).z = k.z;
    step(w, [press]);
    run(w, 5, [hold]);
    hero(w).state = MoveState.Hitstun;
    hero(w).stun = 10;
    run(w, 1, [hold]);
    expect(w.run!.channel[0]!.progress).toBeLessThan(STAGE1.rules.workerFrames);
    run(w, STAGE1.rules.workerFrames, [hold]);
    expect(k.state).toBe(WorkerState.Bound);
  });

  test('both workers free open the recovery cache; food heals only a hurt hero', () => {
    const w = rescueBeat();
    for (const k of w.run!.workers) {
      hero(w).x = k.x - fx(60);
      hero(w).z = k.z;
      step(w, [press]);
      run(w, STAGE1.rules.workerFrames + 2, [hold]);
    }
    expect(w.run!.cacheOpen).toBe(true);
    expect(exitOpen(w)).toBe(true);
    const food = w.run!.pickups.filter((p) => !p.taken);
    expect(food.length).toBeGreaterThanOrEqual(2);
    const p = food[0]!;
    hero(w).health = hero(w).maxHealth;
    hero(w).x = p.x;
    hero(w).z = p.z;
    run(w, 2);
    expect(p.taken).toBe(false);
    hero(w).health = 500;
    run(w, 1);
    expect(p.taken).toBe(true);
    expect(hero(w).health).toBe(500 + p.heal);
  });
});

describe('defeat, continues and checkpoints (D8)', () => {
  test('a solo defeat spends a continue and restores the latest checkpoint', () => {
    const w = stage({ beat: 2 });
    expect(w.run!.checkpoint!.beat).toBe(2);
    placeAt(hero(w), 900, 820);
    run(w, 30);
    hero(w).meter = 0;
    knockOut(hero(w));
    run(w, 3);
    expect(isDowned(hero(w))).toBe(true);
    expect(w.run!.phase).toBe(RunPhase.Defeat);
    run(w, STAGE1.rules.defeatHold + 1);
    expect(w.run!.continues).toBe(2);
    expect(w.run!.continuesUsed).toBe(1);
    expect(w.run!.beat).toBe(2);
    expect(w.run!.phase).toBe(RunPhase.Walk);
    expect(hero(w).health).toBe(hero(w).maxHealth);
    expect(hero(w).ko).toBe(false);
    expect(w.run!.event.kind).toBe(RunEvent.ContinueUsed);
  });

  test('before the first checkpoint a continue restarts from the stage start', () => {
    const w = stage({ beat: 1 });
    // A practice run's start counts as its checkpoint.
    expect(w.run!.checkpoint!.beat).toBe(1);
    const full = stage();
    expect(full.run!.checkpoint!.beat).toBe(0);
  });

  test('with no continue left the stage starts again with fresh continues', () => {
    const w = stage({ difficulty: 'ultimate', beat: 4 });
    expect(w.run!.continues).toBe(0);
    w.run!.stats.food = 4;
    knockOut(hero(w));
    run(w, STAGE1.rules.defeatHold + 5);
    expect(w.run!.beat).toBe(0);
    expect(w.run!.continues).toBe(STAGE1.continues[4]);
    expect(w.run!.stats.food).toBe(0);
    expect(w.run!.event.kind).toBe(RunEvent.StageRestart);
  });

  test('each difficulty starts with its continues', () => {
    DIFFICULTIES.forEach((d, i) => {
      expect(stage({ difficulty: d.id }).run!.continues).toBe(STAGE1.continues[i]);
    });
  });
});

describe('co-op downs and revives (D8)', () => {
  function pair(beat = 0): World {
    const w = stage({ beat });
    step(w, [idle, idle]);
    placeAt(hero(w, 0), beatOf(w)!.locks[0]?.at ?? 600, 820);
    placeAt(hero(w, 1), (beatOf(w)!.locks[0]?.at ?? 600) + 100, 820);
    run(w, 1, [idle, idle]);
    return w;
  }

  test('one hero down is not a defeat; the partner revives with a two-second hold', () => {
    const w = pair();
    knockOut(hero(w, 1));
    run(w, 3, [idle, idle]);
    expect(isDowned(hero(w, 1))).toBe(true);
    expect(w.run!.phase).toBe(RunPhase.Locked);
    expect(w.run!.event.kind).toBe(RunEvent.Downed);
    const down = hero(w, 1);
    hero(w, 0).x = down.x - fx(80);
    hero(w, 0).z = down.z;
    hero(w, 0).state = MoveState.Idle;
    expect(interactionFor(w, hero(w, 0))).toBe(ChannelKind.Revive);
    step(w, [press, idle]);
    run(w, STAGE1.rules.reviveFrames - 10, [hold, idle]);
    expect(down.ko).toBe(true);
    run(w, 12, [hold, idle]);
    expect(down.ko).toBe(false);
    expect(down.health).toBe(Math.trunc((down.maxHealth * STAGE1.rules.revivePercent) / 100));
    expect(down.state).toBe(MoveState.GetUp);
    expect(down.stun).toBe(REACTION.getUpFrames);
    expect(w.run!.stats.revives).toBe(1);
  });

  test('a downed hero nobody revives returns when the fight ends', () => {
    const w = pair();
    knockOut(hero(w, 1));
    run(w, 3, [idle, idle]);
    clear(w);
    const back = hero(w, 1);
    expect(back.ko).toBe(false);
    expect(back.health).toBe(Math.trunc((back.maxHealth * STAGE1.rules.rejoinPercent) / 100));
    expect(w.run!.continuesUsed).toBe(0);
  });

  test('a team continue is spent only when both heroes are down', () => {
    const w = pair();
    knockOut(hero(w, 0));
    run(w, 3, [idle, idle]);
    expect(w.run!.phase).toBe(RunPhase.Locked);
    knockOut(hero(w, 1));
    run(w, 3, [idle, idle]);
    expect(w.run!.phase).toBe(RunPhase.Defeat);
    run(w, STAGE1.rules.defeatHold + 1, [idle, idle]);
    expect(w.run!.continuesUsed).toBe(1);
    expect(w.bodies.filter((b) => b.team === 'hero' && !b.ko)).toHaveLength(2);
  });

  test('enemies do not target a downed hero', () => {
    const w = pair();
    knockOut(hero(w, 1));
    run(w, 120, [idle, idle]);
    for (const e of w.bodies)
      if (e.team === 'enemy' && profileOf(e) && e.threat > 0)
        expect(e.threatTarget).not.toBe(hero(w, 1).id);
  });
});

describe('investigation, the sponsor evidence and the results', () => {
  test('the clue is optional; inspecting it counts for the results', () => {
    const w = stage({ beat: 4 });
    const beat = beatOf(w)!;
    expect(exitOpen(w)).toBe(true);
    placeAt(hero(w), beat.clue!.x - 60, beat.clue!.z);
    step(w, [press]);
    run(w, STAGE1.rules.clueFrames + 1, [hold]);
    expect(w.run!.clue).toBe(2);
    expect(w.run!.stats.clues).toBe(1);
    expect(w.run!.event.kind).toBe(RunEvent.Clue);
  });

  test('the Commander surrendering restores the river; securing the evidence ends the stage', () => {
    const w = stage({ beat: 7, difficulty: 'easy' });
    run(w, 40);
    expect(w.run!.phase).toBe(RunPhase.Locked);
    clear(w);
    expect(w.run!.evidence).toBe(1);
    expect(w.run!.event.kind).toBe(RunEvent.RiverRestored);
    expect(exitOpen(w)).toBe(false);
    const ev = beatOf(w)!.evidence!;
    placeAt(hero(w), ev.x - 60, ev.z);
    hero(w).state = MoveState.Idle;
    step(w, [press]);
    run(w, STAGE1.rules.evidenceFrames + 1, [hold]);
    expect(w.run!.phase).toBe(RunPhase.Complete);
    const frames = w.run!.stats.frames;
    run(w, 30);
    expect(w.run!.stats.frames).toBe(frames);
    const r = stageResults(w)!;
    expect(r.grades.map((g) => g.id)).toEqual(['rescue', 'evidence', 'continues', 'time']);
    expect(r.startBeat).toBe(7);
  });
});

describe('the whole stage with the stage bot', () => {
  function play(seed: number, difficulty: string, players = 1): World {
    const w = createWorld(seed, { stage: 'stage1', difficulty });
    for (let i = 0; i < 60 * 60 * 15 && w.run!.phase !== RunPhase.Complete; i += 1)
      step(
        w,
        Array.from({ length: players }, (_, slot) => stageBotInput(w, slot)),
      );
    return w;
  }

  test('a solo bot clears Stage 1 on Easy, deterministically', () => {
    const a = play(11, 'easy');
    expect(a.run!.phase).toBe(RunPhase.Complete);
    const r = stageResults(a)!;
    expect(r.stats.workersFreed).toBe(2);
    expect(r.stats.clues + r.stats.evidence).toBe(2);
    expect(r.grades).toHaveLength(4);
    const b = play(11, 'easy');
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  test('two bots clear Stage 1 on Medium in co-op', () => {
    const w = play(12, 'medium', 2);
    expect(w.run!.phase).toBe(RunPhase.Complete);
    expect(w.bodies.filter((b) => b.team === 'hero')).toHaveLength(2);
  });

  test('stepRun without a run does nothing', () => {
    const w = createWorld(1, { dummies: 1 });
    stepRun(w);
    expect(w.run).toBeNull();
  });
});

// --- guardrail: locked roster, guests and branches are stage data ------------------------

describe('a stage can lock the roster, add guests and branch', () => {
  const extra = {
    ...STAGE1,
    id: 'test-branches',
    roster: ['river'],
    guests: [] as string[],
    beats: STAGE1.beats.map((b, i) => (i === 0 ? { ...b, next: [1, 2] } : b)),
  };
  beforeAll(() => {
    (STAGES as StageDef[]).push(extra);
  });
  afterAll(() => {
    (STAGES as StageDef[]).pop();
  });

  it('a locked roster replaces a hero the stage does not allow, and keeps it locked', () => {
    const w = createWorld(3, { stage: 'test-branches', heroes: ['mountain', 'river'] });
    expect(HEROES[w.playerHero[0]!]!.id).toBe('river');
    setHero(w, 0, 'mountain');
    expect(HEROES[w.playerHero[0]!]!.id).toBe('river');
    expect(stageHero(STAGES.length - 1, 0, 'mountain')).toBe('river');
    // Stage 1 locks nothing.
    expect(stageHero(0, 0, 'mountain')).toBe('mountain');
  });

  it('a guest joins the allowed heroes', () => {
    extra.guests = ['mountain'];
    expect(stageHero(STAGES.length - 1, 0, 'mountain')).toBe('mountain');
    extra.guests = [];
  });

  it('two next beats branch by the lane the heroes leave on', () => {
    const w = createWorld(3, { stage: 'test-branches' });
    const h = hero(w);
    h.z = w.bounds.minZ + fx(10);
    expect(nextBeat(w)).toBe(1);
    h.z = w.bounds.maxZ - fx(10);
    expect(nextBeat(w)).toBe(2);
    const s1 = stage();
    expect(nextBeat(s1)).toBe(1);
  });
});
