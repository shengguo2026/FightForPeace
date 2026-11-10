import { describe, expect, test } from 'vitest';
import {
  CHEATS,
  Cheat,
  PRESETS,
  canonicalCode,
  cheatMask,
  codesOf,
  lookupCode,
  presetName,
  setCheats,
  supersededCodes,
} from '../src/cheats/cheats';
import { dealDamage } from '../src/combat/damage';
import { payIntegrity, spawnItem, claim } from '../src/combat/held';
import { weaponIndex } from '../src/combat/armory';
import { DEFENSE, normalGuard } from '../src/combat/defense';
import { METER } from '../src/combat/meter';
import { HEROES } from '../src/combat/roster';
import { DIFFICULTIES, difficultyOf } from '../src/enemies/data';
import { fx } from '../src/math/fixed';
import { STAGES, rankFor, runScore, stageResults } from '../src/stage/run';
import { MoveState, RunPhase, type Fighter, type World } from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';
import { idle } from './helpers';
import { stageBotInput } from './stageBot';

const STAGE1 = STAGES[0]!;

function stage(options: Parameters<typeof createWorld>[1] = {}): World {
  return createWorld(3, { stage: 'stage1', difficulty: 'medium', ...options });
}

function hero(w: World, slot = 0): Fighter {
  const h = heroOf(w, slot);
  if (!h) throw new Error(`no hero ${slot}`);
  return h;
}

function knockOut(f: Fighter): void {
  f.health = 0;
  f.ko = true;
  f.state = MoveState.Down;
  f.stateFrame = 0;
  f.stun = 1;
}

describe('Elder’s Secrets catalogue (Appendix E)', () => {
  test('twelve codes and four presets with stable identifiers and bits', () => {
    expect(CHEATS.map((c) => c.code)).toEqual([
      'SOFTERBLOWS',
      'SAFEHEART',
      'STEADYFEET',
      'IRONGUARD',
      'BRIGHTSPIRIT',
      'STRONGHANDS',
      'TRUSTYTOOLS',
      'STEADYRIDE',
      'QUIETCROWD',
      'FULLPANTRY',
      'HOMECOMING',
      'SAFEPASSAGE',
    ]);
    expect(new Set(CHEATS.map((c) => c.bit)).size).toBe(12);
    expect(CHEATS.filter((c) => c.scope === 'session').map((c) => c.code)).toEqual([
      'QUIETCROWD',
      'FULLPANTRY',
      'HOMECOMING',
      'SAFEPASSAGE',
    ]);
    expect(PRESETS.map((p) => p.code)).toEqual([
      'FIRSTSTEPS',
      'CALMBATTLE',
      'PEACEFULPATH',
      'UNSTOPPABLE',
    ]);
    for (const p of PRESETS)
      for (const c of p.codes) expect(CHEATS.some((x) => x.code === c)).toBe(true);
  });

  test('typed codes: case, surrounding spaces, spaces, hyphens and underscores; no guessing', () => {
    expect(canonicalCode('  softer blows ')).toBe('SOFTERBLOWS');
    expect(lookupCode('Iron-Guard')).toEqual({ kind: 'cheat', cheat: CHEATS[3] });
    expect(lookupCode('first_steps')?.kind).toBe('preset');
    expect(lookupCode('SOFTERBLOW')).toBeNull();
    expect(lookupCode('IRONGAURD')).toBeNull();
    expect(lookupCode('   ')).toBeNull();
  });

  test('a preset expands into ordinary codes; changing one makes it a custom configuration', () => {
    const calm = PRESETS[1]!.codes;
    expect(presetName(calm)).toBe('CALMBATTLE');
    expect(presetName([...calm].reverse())).toBe('CALMBATTLE');
    expect(presetName(calm.filter((c) => c !== 'FULLPANTRY'))).toBe('custom');
    expect(presetName([])).toBeNull();
  });

  test('SAFEHEART supersedes SOFTERBLOWS; both stay visible', () => {
    expect(supersededCodes(['SOFTERBLOWS', 'SAFEHEART'])).toEqual(['SOFTERBLOWS']);
    expect(supersededCodes(['SOFTERBLOWS'])).toEqual([]);
  });

  test('masks split hero and session scopes', () => {
    const codes = ['SOFTERBLOWS', 'HOMECOMING', 'IRONGUARD'];
    expect(codesOf(cheatMask(codes, 'hero'))).toEqual(['SOFTERBLOWS', 'IRONGUARD']);
    expect(codesOf(cheatMask(codes, 'session'))).toEqual(['HOMECOMING']);
  });
});

describe('Cheat-Assisted marking', () => {
  test('the first accepted cheat marks the run for good, with its frame and beat', () => {
    const w = stage({ beat: 2 });
    expect(w.cheats.marked).toBe(false);
    for (let i = 0; i < 10; i += 1) step(w, [idle]);
    setCheats(w, [Cheat.SOFTERBLOWS, 0], 0);
    expect(w.cheats.marked).toBe(true);
    expect(w.cheats.firstFrame).toBe(10);
    expect(w.cheats.firstBeat).toBe(2);
    setCheats(w, [0, 0], 0);
    expect(w.cheats.marked).toBe(true);
    expect(codesOf(w.cheats.used)).toEqual(['SOFTERBLOWS']);
  });

  test('cheats are part of the world state (hash), and options apply them before the run', () => {
    const a = stage();
    const b = stage({ cheats: { hero: [0, 0], session: Cheat.HOMECOMING } });
    expect(hashWorld(a)).not.toBe(hashWorld(b));
    expect(b.cheats.marked).toBe(true);
    expect(b.cheats.firstBeat).toBe(0);
  });
});

describe('cheat effects at the engine seams', () => {
  test('SOFTERBLOWS halves incoming Health damage; SAFEHEART keeps Health; enemies unaffected', () => {
    const w = stage();
    const h = hero(w);
    setCheats(w, [Cheat.SOFTERBLOWS, 0], 0);
    expect(dealDamage(w, h, 100)).toBe(50);
    setCheats(w, [Cheat.SOFTERBLOWS | Cheat.SAFEHEART, 0], 0);
    expect(dealDamage(w, h, 100)).toBe(0);
    expect(h.health).toBe(h.maxHealth - 50);
    const lab = createWorld(1, { dummies: 1, cheats: { hero: [Cheat.SAFEHEART, 0], session: 0 } });
    const d = lab.bodies.find((b) => b.team === 'enemy')!;
    expect(dealDamage(lab, d, 100)).toBe(100);
  });

  test('STRONGHANDS doubles a hero’s outgoing damage in a combo', () => {
    const hit = (cheats: number) => {
      const w = createWorld(1, {
        dummies: 1,
        refill: false,
        cheats: { hero: [cheats, 0], session: 0 },
      });
      const h = hero(w);
      const d = w.bodies.find((b) => b.team === 'enemy')!;
      h.x = d.x - fx(80);
      h.z = d.z;
      h.facing = 1;
      step(w, [{ ...idle, pressed: 1 }]);
      for (let i = 0; i < 30; i += 1) step(w, [idle]);
      return d.maxHealth - d.health;
    };
    const base = hit(0);
    expect(base).toBeGreaterThan(0);
    expect(hit(Cheat.STRONGHANDS)).toBe(base * 2);
  });

  test('IRONGUARD: guarding costs no Defense', () => {
    const w = createWorld(1, { dummies: 1, cheats: { hero: [Cheat.IRONGUARD, 0], session: 0 } });
    const h = hero(w);
    const d = w.bodies.find((b) => b.team === 'enemy')!;
    const a = HEROES[0]!.actions.find((x) => x.guardCost > 0)!;
    h.state = MoveState.Guard;
    normalGuard(w, d, a, h);
    expect(h.defense).toBe(DEFENSE.max);
  });

  test('BRIGHTSPIRIT keeps the Attack Bar full', () => {
    const w = createWorld(1, { cheats: { hero: [Cheat.BRIGHTSPIRIT, 0], session: 0 } });
    hero(w).meter = 0;
    step(w, [idle]);
    expect(hero(w).meter).toBe(METER.max);
  });

  test('TRUSTYTOOLS: the hero’s weapon loses no integrity', () => {
    const w = createWorld(1, { cheats: { hero: [Cheat.TRUSTYTOOLS, 0], session: 0 } });
    const h = hero(w);
    const item = spawnItem(w, weaponIndex('workstaff'), h.x, h.z);
    claim(w, h, item);
    const before = item.integrity;
    payIntegrity(w, h, 5);
    expect(item.integrity).toBe(before);
  });

  test('QUIETCROWD uses Easy’s pressure limits but keeps the selected warnings', () => {
    const w = stage({ difficulty: 'hard', cheats: { hero: [0, 0], session: Cheat.QUIETCROWD } });
    const easy = DIFFICULTIES[0]!;
    const hard = DIFFICULTIES[2]!;
    const d = difficultyOf(w);
    expect(d.budget).toEqual(easy.budget);
    expect(d.attackers).toEqual(easy.attackers);
    expect(d.cap).toBe(easy.cap);
    expect(d.warning).toBe(hard.warning);
    expect(d.perception).toBe(hard.perception);
  });

  test('FULLPANTRY adds one recovery item to each authored food group', () => {
    const beat = STAGE1.beats.findIndex((b) => b.pickups.length > 0);
    const plain = stage({ beat });
    const full = stage({ beat, cheats: { hero: [0, 0], session: Cheat.FULLPANTRY } });
    expect(full.run!.pickups.length).toBe(plain.run!.pickups.length + 1);
  });

  test('HOMECOMING restores the checkpoint without spending a continue', () => {
    const w = stage({ beat: 2, cheats: { hero: [0, 0], session: Cheat.HOMECOMING } });
    hero(w).x = fx(900);
    for (let i = 0; i < 30; i += 1) step(w, [idle]);
    knockOut(hero(w));
    for (let i = 0; i < 3; i += 1) step(w, [idle]);
    expect(w.run!.phase).toBe(RunPhase.Defeat);
    for (let i = 0; i <= STAGE1.rules.defeatHold; i += 1) step(w, [idle]);
    expect(w.run!.continues).toBe(3);
    expect(w.run!.continuesUsed).toBe(0);
    expect(w.run!.beat).toBe(2);
    expect(w.run!.phase).toBe(RunPhase.Walk);
  });
});

describe('the 100-point stage grade and the run score', () => {
  test('Stage 1 grade data: weights add up to 100, ranks fall, the rescue cap', () => {
    const g = STAGE1.grade;
    expect(g.categories.map((c) => c.id)).toEqual(['rescue', 'evidence', 'continues', 'time']);
    expect(g.categories.reduce((n, c) => n + c.weight, 0)).toBe(100);
    expect(g.ranks).toEqual([90, 75, 55]);
    expect(g.caps).toEqual([{ category: 'rescue', below: 100, rank: 'A' }]);
  });

  test('rank thresholds', () => {
    expect(rankFor(100, [90, 75, 55])).toBe('S');
    expect(rankFor(90, [90, 75, 55])).toBe('S');
    expect(rankFor(89, [90, 75, 55])).toBe('A');
    expect(rankFor(55, [90, 75, 55])).toBe('B');
    expect(rankFor(54, [90, 75, 55])).toBe('C');
  });

  function play(seed: number, difficulty: string, cheats?: { hero: number[]; session: number }) {
    const w = createWorld(seed, { stage: 'stage1', difficulty, cheats });
    for (let i = 0; i < 60 * 60 * 25 && w.run!.phase !== RunPhase.Complete; i += 1)
      step(w, [stageBotInput(w, 0)]);
    return w;
  }

  test('a bot clear: points, rank, score and the best combo', () => {
    const w = play(11, 'easy');
    expect(w.run!.phase).toBe(RunPhase.Complete);
    const r = stageResults(w)!;
    expect(r.points).toBe(r.grades.reduce((n, g) => n + g.points, 0));
    expect(r.points).toBeGreaterThan(0);
    expect(r.points).toBeLessThanOrEqual(100);
    expect(['S', 'A', 'B', 'C']).toContain(r.overall);
    expect(r.score).toBe(runScore(w.run!, STAGE1));
    expect(r.score).toBeGreaterThan(0);
    expect(r.stats.bestHits).toBeGreaterThan(0);
    expect(r.standard).toBe(true);
    expect(r.cheatAssisted).toBe(false);
    expect(r.cheatCodes).toEqual([]);
  });

  test('a worker left behind caps the rank at A', () => {
    const w = stage({ beat: 7 });
    const r0 = stageResults(w)!;
    // Pretend every category is perfect except one missing worker.
    w.run!.workersTotal = 2;
    w.run!.stats.workersFreed = 1;
    w.run!.stats.clues = 1;
    w.run!.stats.evidence = 1;
    w.run!.cluesTotal = 2;
    w.run!.stats.frames = 60;
    const r = stageResults(w)!;
    expect(r0.capped).toBeNull();
    expect(r.points).toBeLessThan(90);
    expect(r.overall === 'A' || r.overall === 'B' || r.overall === 'C').toBe(true);
    w.run!.workersTotal = 3;
    w.run!.stats.workersFreed = 2;
    // 35 × 66 % = 23 points: 23 + 25 + 20 + 20 = 88 → A even without the cap.
    expect(stageResults(w)!.overall).toBe('A');
  });

  test('the cap lowers an S total to A', () => {
    const w = stage({ beat: 7 });
    w.run!.workersTotal = 20;
    w.run!.stats.workersFreed = 19;
    w.run!.cluesTotal = 1;
    w.run!.stats.evidence = 1;
    w.run!.stats.frames = 60;
    const r = stageResults(w)!;
    expect(r.points).toBeGreaterThanOrEqual(90);
    expect(r.overall).toBe('A');
    expect(r.capped).toBe('rescue');
  });

  test('score: difficulty multiplier and continue penalty', () => {
    const w = stage({ beat: 7 });
    w.run!.stats.defeated = 10;
    w.run!.stats.frames = STAGE1.timePar[2]! * 60;
    expect(runScore(w.run!, STAGE1)).toBe(10 * STAGE1.score.defeated);
    w.run!.difficulty = 2;
    expect(runScore(w.run!, STAGE1)).toBe(Math.trunc((10 * STAGE1.score.defeated * 125) / 100));
    w.run!.continuesUsed = 5;
    expect(runScore(w.run!, STAGE1)).toBe(0);
  });

  test('an Open loadout run is not Standard', () => {
    const w = createWorld(3, {
      stage: 'stage1',
      loadouts: [[{ kind: 'special', dir: 3, action: 'skybreak-column' }]],
    });
    expect(stageResults(w)!.standard).toBe(false);
  });

  test('a Cheat-Assisted bot clear keeps its codes and first beat', () => {
    const w = play(11, 'easy', { hero: [Cheat.SOFTERBLOWS, 0], session: Cheat.HOMECOMING });
    expect(w.run!.phase).toBe(RunPhase.Complete);
    const r = stageResults(w)!;
    expect(r.cheatAssisted).toBe(true);
    expect(r.cheatCodes).toEqual(['SOFTERBLOWS', 'HOMECOMING']);
    expect(r.cheatFirstBeat).toBe(0);
  });
});
