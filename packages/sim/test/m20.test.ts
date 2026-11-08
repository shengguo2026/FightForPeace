import { describe, expect, test } from 'vitest';
import { ActionBit } from '../src/input/bits';
import { fx } from '../src/math/fixed';
import { Cheat } from '../src/cheats/cheats';
import { weaponIndex } from '../src/combat/armory';
import { claim, spawnItem } from '../src/combat/held';
import { dealDamage } from '../src/combat/damage';
import { Result } from '../src/enemies/encounter';
import { CORRIDORS, Intercept, PursuitPhase } from '../src/mounted/pursuit';
import { AssetState, ROOMS } from '../src/preservation/greenhouse';
import {
  PURSUIT_HOLD,
  STAGES,
  beatOf,
  branchMet,
  epilogueCards,
  exitOpen,
  lockCount,
  stagePreservation,
  stageResults,
} from '../src/stage/run';
import {
  BranchOutcome,
  type FrameInput,
  MoveState,
  RunEvent,
  RunPhase,
  type World,
  WorkerState,
} from '../src/world/types';
import { createWorld, hashWorld, heroOf, step, type WorldOptions } from '../src/world/world';
import { snapshotWorld, restoreWorld } from '../src/net/snapshot';
import { idle, inp } from './helpers';
import { stageBotInput } from './stageBot';

const STAGE2 = STAGES.find((s) => s.id === 'stage2')!;
const beatNo = (id: string) => STAGE2.beats.findIndex((b) => b.id === id);
const SAFE = Cheat.SAFEHEART | Cheat.SOFTERBLOWS | Cheat.STEADYRIDE;
const hold = inp({ held: ActionBit.Interact });
const press = inp({ pressed: ActionBit.Interact, held: ActionBit.Interact });

function journey(options: Partial<WorldOptions> = {}): World {
  return createWorld(3, { stage: 'stage2', difficulty: 'medium', heroes: ['wind'], ...options });
}

function at(id: string, options: Partial<WorldOptions> = {}): World {
  return journey({ beat: beatNo(id), ...options });
}

function hero(w: World, slot = 0) {
  const h = heroOf(w, slot);
  if (!h) throw new Error(`no hero ${slot}`);
  return h;
}

function run(w: World, n: number, input: (w: World) => FrameInput[] = () => [idle]): void {
  for (let i = 0; i < n; i += 1) step(w, input(w));
}

/** Every enemy goes down for good until the beat's encounter is cleared. */
function clear(w: World): void {
  for (let i = 0; i < 12 && w.run!.phase !== RunPhase.Walk; i += 1) {
    for (const e of w.bodies)
      if (e.team === 'enemy' && !e.ko) {
        e.health = 0;
        e.ko = true;
        e.state = MoveState.Down;
        e.stateFrame = 0;
        e.stun = 1;
      }
    run(w, 40, (x) => x.bodies.filter((b) => b.team === 'hero').map(() => idle));
  }
}

/** The heroes walk out of the beat on a lane (upper 700: a branch, lower 900: the spine). */
function leave(w: World, z = 900): void {
  const beat = beatOf(w)!;
  const from = w.run!.beat;
  for (const h of w.bodies.filter((b) => b.team === 'hero')) {
    h.x = fx(beat.width - STAGE2.rules.exitMargin + 20);
    h.z = fx(z);
  }
  run(w, 60, (x) => x.bodies.filter((b) => b.team === 'hero').map(() => idle));
  expect(w.run!.beat, `left ${beat.id}`).not.toBe(from);
}

/** Holds Interact next to a point until the interaction completes. */
function holdAt(w: World, x: number, z: number, frames: number): void {
  const h = hero(w);
  h.x = fx(x);
  h.z = fx(z + 30);
  h.state = MoveState.Idle;
  step(w, [press]);
  run(w, frames + 2, () => [hold]);
}

/** The run's corridor beat rides to its finish (the bot steers; the finish is forced). */
function ride(w: World): void {
  const from = w.run!.beat;
  for (let i = 0; i < 60 * 120 && w.run!.beat === from; i += 1) step(w, [inp({ moveX: 1 })]);
  expect(w.run!.beat).not.toBe(from);
}

describe('Stage 2 data (spec §5, story line §7)', () => {
  test('fourteen beats in four segments, from the pursuit to the dispatch yard', () => {
    expect(STAGE2.name).toBe('Prosperity Under Siege');
    expect(STAGE2.beats.map((b) => b.id)).toEqual([
      'perimeter',
      'loading-yard',
      'aquaculture',
      'aeration-annex',
      'vestibule',
      'crop-channels',
      'seed-bay',
      'medicinal-wing',
      'prep-room',
      'filtration',
      'production-hall',
      'recovery-bay',
      'intercept',
      'dispatch-yard',
    ]);
    expect(STAGE2.beats.map((b) => b.segment)).toEqual([1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4]);
    expect(STAGE2.beats.filter((b) => b.corridor).map((b) => b.corridor)).toEqual([
      'perimeter-pursuit',
      'marek-intercept',
    ]);
    for (const b of STAGE2.beats.filter((x) => x.room))
      expect(
        ROOMS.some((r) => r.id === b.room && r.width === b.width),
        b.id,
      ).toBe(true);
  });

  test('Checkpoints 1–4: the security gate, the vestibule, after filtration, the dispatch bikes', () => {
    expect(STAGE2.beats.filter((b) => b.checkpoint).map((b) => b.id)).toEqual([
      'loading-yard',
      'vestibule',
      'production-hall',
      'intercept',
    ]);
  });

  test('three optional branches, each leaving and rejoining the spine in its region', () => {
    const branches = STAGE2.beats.filter((b) => b.branch);
    expect(branches.map((b) => [b.id, b.branch!.artifact])).toEqual([
      ['aeration-annex', 'early-aerator-impeller'],
      ['seed-bay', 'first-harvest-seed-tin'],
      ['prep-room', 'medicinal-cooperative-field-card'],
    ]);
    const next = (id: string) => STAGE2.beats[beatNo(id)]!.next.map((n) => STAGE2.beats[n]!.id);
    expect(next('aquaculture')).toEqual(['aeration-annex', 'vestibule']);
    expect(next('aeration-annex')).toEqual(['vestibule']);
    expect(next('crop-channels')).toEqual(['seed-bay', 'medicinal-wing']);
    expect(next('seed-bay')).toEqual(['medicinal-wing']);
    expect(next('medicinal-wing')).toEqual(['prep-room', 'filtration']);
    expect(next('prep-room')).toEqual(['filtration']);
    // No branch beat takes a checkpoint and no story information lives only in a branch.
    for (const b of branches) {
      expect(b.checkpoint).toBe(false);
      expect(b.evidence).toBeNull();
    }
  });

  test('the dispatch yard ends the stage on the marked weapon crate; Stage 1 is unchanged', () => {
    const last = STAGE2.beats.at(-1)!;
    expect(last.room).toBe('boss-marek');
    expect(last.evidence?.text).toMatch(/seal/);
    const s1 = STAGES[0]!;
    expect(s1.id).toBe('stage1');
    expect(s1.epilogue).toEqual([]);
    expect(s1.beats.every((b) => !b.room && !b.corridor && !b.branch)).toBe(true);
    expect([s1.score.branch, s1.score.resolve, s1.score.forced, s1.score.preservation]).toEqual([
      0, 0, 0, 0,
    ]);
  });
});

describe('corridor and room beats', () => {
  test('the stage opens mounted on the Perimeter Pursuit; its finish fades into the Loading Yard', () => {
    const w = journey();
    expect(w.pursuit).not.toBeNull();
    expect(CORRIDORS[w.pursuit!.corridor]!.id).toBe('perimeter-pursuit');
    expect(w.encounter).toBeNull();
    expect(w.run!.beat).toBe(0);
    let completeAt = -1;
    for (let i = 0; i < 60 * 120 && w.run!.beat === 0; i += 1) {
      step(w, [inp({ moveX: 1 })]);
      if (completeAt < 0 && w.pursuit?.phase === PursuitPhase.Complete) completeAt = w.frame;
    }
    // The finish shows a moment before the fade.
    expect(w.frame - completeAt).toBeGreaterThanOrEqual(PURSUIT_HOLD);
    expect(beatOf(w)!.id).toBe('loading-yard');
    expect(w.pursuit).toBeNull();
    expect(w.greenhouse).not.toBeNull();
    expect(ROOMS[w.greenhouse!.room]!.id).toBe('beat-loading-yard');
    // The Response Record is kept; Checkpoint 1 is at the security gate after dismounting.
    expect(w.run!.response).toHaveLength(1);
    expect(w.run!.response[0]!.scores).toHaveLength(5);
    expect(w.run!.checkpoint?.beat).toBe(beatNo('loading-yard'));
    expect(w.run!.event.kind).toBe(RunEvent.Checkpoint);
    // The heroes stand on the floor again.
    expect(w.bounds.minZ).toBe(fx(620));
    expect(w.bounds.maxZ).toBe(fx(1000));
    expect(hero(w).state).not.toBe(MoveState.Defeated);
  });

  test('a room beat is one encounter: its waves start at once, clearing opens the exit', () => {
    const w = at('loading-yard');
    expect(w.run!.phase).toBe(RunPhase.Locked);
    expect(lockCount(beatOf(w)!)).toBe(1);
    run(w, 40);
    expect(w.bodies.some((b) => b.team === 'enemy' && !b.ko)).toBe(true);
    expect(exitOpen(w)).toBe(false);
    clear(w);
    expect(w.encounter!.result).toBe(Result.Cleared);
    expect(w.run!.phase).toBe(RunPhase.Walk);
    expect(exitOpen(w)).toBe(true);
    expect(w.run!.event.kind).toBe(RunEvent.ExitOpen);
    leave(w);
    expect(beatOf(w)!.id).toBe('aquaculture');
  });

  test('a quiet room has no encounter: the way on is open at once', () => {
    const w = at('vestibule');
    expect(w.encounter).toBeNull();
    expect(w.greenhouse).not.toBeNull();
    expect(lockCount(beatOf(w)!)).toBe(0);
    expect(exitOpen(w)).toBe(true);
    leave(w);
    expect(beatOf(w)!.id).toBe('crop-channels');
  });

  test('the room keeps its greenhouse systems: Ledger, containers, rack, jet and redirect', () => {
    const w = at('crop-channels');
    const gh = w.greenhouse!;
    expect(gh.assets.map((a) => a.name)).toEqual(['bed-west', 'bed-east', 'pump', 'seedlings']);
    expect(gh.rack).not.toBeNull();
    expect(gh.jet).not.toBeNull();
    expect(gh.redirect).not.toBeNull();
    expect(gh.containers.length).toBeGreaterThan(0);
  });
});

describe('optional branches', () => {
  test('the exit lane chooses: the upper lane takes the branch, the lower lane the spine', () => {
    const up = at('aquaculture');
    clear(up);
    leave(up, 700);
    expect(beatOf(up)!.id).toBe('aeration-annex');
    const down = at('aquaculture');
    clear(down);
    leave(down, 900);
    expect(beatOf(down)!.id).toBe('vestibule');
    // A branch never visited stays skipped.
    expect(down.run!.branches[beatNo('aeration-annex')]).toBe(BranchOutcome.Skipped);
  });

  test('Aeration Annex: worker freed and the backup aeration kept is completed', () => {
    const w = at('aeration-annex');
    clear(w);
    // The exit waits for the worker (M9 rule).
    expect(exitOpen(w)).toBe(false);
    const k = w.run!.workers[0]!;
    holdAt(w, Math.trunc(k.x / 256), Math.trunc(k.z / 256), STAGE2.rules.workerFrames);
    expect(k.state).not.toBe(WorkerState.Bound);
    expect(branchMet(w, beatOf(w)!)).toBe(true);
    leave(w);
    expect(beatOf(w)!.id).toBe('vestibule');
    expect(w.run!.branches[beatNo('aeration-annex')]).toBe(BranchOutcome.Completed);
  });

  test('Aeration Annex: the aeration line in safe fallback fails it, without blocking the stage', () => {
    const w = at('aeration-annex');
    clear(w);
    const line = w.greenhouse!.assets.find((a) => a.name === 'backup-aeration')!;
    line.condition = 0;
    line.state = AssetState.Fallback;
    const k = w.run!.workers[0]!;
    holdAt(w, Math.trunc(k.x / 256), Math.trunc(k.z / 256), STAGE2.rules.workerFrames);
    leave(w);
    expect(w.run!.branches[beatNo('aeration-annex')]).toBe(BranchOutcome.Failed);
    expect(w.run!.event.kind).toBe(RunEvent.Checkpoint);
    expect(beatOf(w)!.id).toBe('vestibule');
  });

  test('Seed Reserve Bay: a seed reserve breached to Critical fails it; both kept completes it', () => {
    const ok = at('seed-bay');
    clear(ok);
    leave(ok);
    expect(ok.run!.branches[beatNo('seed-bay')]).toBe(BranchOutcome.Completed);
    expect(ok.run!.event.kind).toBe(RunEvent.BranchEnd);
    expect(ok.run!.event.detail).toBe(BranchOutcome.Completed);
    const bad = at('seed-bay');
    clear(bad);
    const seed = bad.greenhouse!.assets.find((a) => a.name === 'seed-east')!;
    seed.condition = 20;
    seed.state = AssetState.Critical;
    leave(bad);
    expect(bad.run!.branches[beatNo('seed-bay')]).toBe(BranchOutcome.Failed);
  });

  test('the seed reserves are controls: the bay’s Systems Saboteur goes for them', () => {
    const w = at('seed-bay');
    const kinds = w.greenhouse!.assets.map((a) => a.kind);
    expect(new Set(kinds).size).toBe(1);
    run(w, 60 * 12);
    // breachAsset is the room asset's index + 1; the bay holds only the two reserves.
    const breach = w.bodies.find((b) => b.team === 'enemy' && b.breach > 0);
    expect(breach?.breachAsset).toBeGreaterThan(0);
    expect(w.greenhouse!.assets.some((a) => a.state >= AssetState.Damaged)).toBe(true);
  });

  test('Medicinal Preparation Room: the researcher and the provenance ledger complete it', () => {
    const none = at('prep-room');
    clear(none);
    const k = none.run!.workers[0]!;
    holdAt(none, Math.trunc(k.x / 256), Math.trunc(k.z / 256), STAGE2.rules.workerFrames);
    leave(none);
    // The ledger was not found: the branch is failed, never blocking.
    expect(none.run!.branches[beatNo('prep-room')]).toBe(BranchOutcome.Failed);
    const all = at('prep-room');
    clear(all);
    const r = all.run!.workers[0]!;
    holdAt(all, Math.trunc(r.x / 256), Math.trunc(r.z / 256), STAGE2.rules.workerFrames);
    const clue = beatOf(all)!.clue!;
    holdAt(all, clue.x, clue.z, STAGE2.rules.clueFrames);
    expect(all.run!.clue).toBe(2);
    leave(all);
    expect(all.run!.branches[beatNo('prep-room')]).toBe(BranchOutcome.Completed);
  });
});

describe('stage-wide Preservation and Response', () => {
  test('each room left adds its Ledger assets; a skipped branch adds nothing', () => {
    const w = at('aquaculture');
    clear(w);
    const fish = w.greenhouse!.assets.find((a) => a.name === 'fish')!;
    fish.condition = 50;
    fish.state = AssetState.Damaged;
    leave(w);
    const recorded = w.run!.ledger.map((a) => a.name);
    expect(recorded).toEqual(['fish', 'shrimp', 'aeration', 'pump']);
    expect(w.run!.ledger.find((a) => a.name === 'fish')!.condition).toBe(50);
    const pres = stagePreservation(w.run!)!;
    expect(pres.percent).toBeLessThan(100);
    expect(pres.categories.map((c) => c.id)).toEqual(['aquatic', 'systems']);
  });

  test('the four approved grades: Flourishing, Secure, Strained, Recovered', () => {
    const w = at('aquaculture');
    clear(w);
    leave(w);
    expect(stagePreservation(w.run!)!.grade).toBe('flourishing');
    for (const [cond, grade] of [
      [0.75, 'secure'],
      [0.5, 'strained'],
      [0, 'recovered'],
    ] as const) {
      const run2 = JSON.parse(JSON.stringify(w.run!)) as typeof w.run & object;
      for (const a of run2.ledger) {
        a.condition = Math.trunc(a.condition * cond);
        if (a.condition === 0) a.state = AssetState.Lost;
      }
      expect(stagePreservation(run2)!.grade, grade).toBe(grade);
    }
  });

  test('Response is the mean of every corridor’s record lines', () => {
    const w = journey();
    ride(w);
    const r = stageResults(w)!;
    const scores = w.run!.response[0]!.scores;
    expect(r.response!.percent).toBe(Math.trunc(scores.reduce((n, x) => n + x, 0) / scores.length));
  });
});

describe('checkpoints and weapons between beats', () => {
  test('a weapon in hand comes along into the next room with its exact rounds', () => {
    const w = at('loading-yard');
    clear(w);
    const h = hero(w);
    const gun = spawnItem(w, weaponIndex('six-round-sidearm'), h.x, h.z);
    gun.ammo = 3;
    gun.integrity = 40;
    claim(w, h, gun);
    leave(w);
    const held = w.items.find((i) => i.id === hero(w).item)!;
    expect(held).toBeDefined();
    expect(held.def).toBe(weaponIndex('six-round-sidearm'));
    expect(held.ammo).toBe(3);
    expect(held.integrity).toBe(40);
    expect(w.run!.carry).toEqual([null, null]);
  });

  test('the dispatch bikes stow it; it comes back on foot in the yard', () => {
    const w = at('recovery-bay');
    const h = hero(w);
    const lance = spawnItem(w, weaponIndex('service-lance'), h.x, h.z);
    lance.integrity = 7;
    claim(w, h, lance);
    leave(w);
    expect(beatOf(w)!.id).toBe('intercept');
    expect(hero(w).item).toBe(0);
    expect(w.run!.carry[0]).toEqual({ def: weaponIndex('service-lance'), integrity: 7, ammo: 0 });
    // Checkpoint 4 keeps it too.
    expect(w.run!.checkpoint!.carry[0]?.integrity).toBe(7);
    ride(w);
    expect(beatOf(w)!.id).toBe('dispatch-yard');
    const back = w.items.find((i) => i.id === hero(w).item)!;
    expect(back.def).toBe(weaponIndex('service-lance'));
    expect(back.integrity).toBe(7);
  });

  test('a continue restores the checkpoint’s Ledger, branches, response and carry', () => {
    const w = at('vestibule', { difficulty: 'medium' });
    const before = JSON.parse(JSON.stringify(w.run!.checkpoint!)) as NonNullable<
      NonNullable<typeof w.run>['checkpoint']
    >;
    leave(w);
    clear(w);
    leave(w, 700);
    expect(beatOf(w)!.id).toBe('seed-bay');
    clear(w);
    leave(w);
    expect(w.run!.branches[beatNo('seed-bay')]).toBe(BranchOutcome.Completed);
    expect(w.run!.ledger.length).toBeGreaterThan(before.ledger.length);
    // Defeat in the medicinal wing: the continue returns to the vestibule's records.
    for (const h of w.bodies.filter((b) => b.team === 'hero')) {
      h.health = 0;
      h.ko = true;
      h.state = MoveState.Defeated;
    }
    run(w, STAGE2.rules.defeatHold + 5);
    expect(w.run!.continuesUsed).toBe(1);
    expect(beatOf(w)!.id).toBe('vestibule');
    expect(w.run!.ledger).toEqual(before.ledger);
    expect(w.run!.branches).toEqual(before.branches);
    expect(w.run!.response).toEqual(before.response);
    expect(w.run!.carry).toEqual(before.carry);
  });
});

describe('Marek in the flow, the epilogue and the results', () => {
  test('the intercept’s outcome opens the yard; the capture record and the crate end the stage', () => {
    const w = at('intercept', { heroes: ['fire'] });
    // Marek is broken on his bike: the yard opens with him knocked down.
    for (let i = 0; i < 60 * 120 && w.run!.beat === beatNo('intercept'); i += 1) {
      const p = w.pursuit;
      const m = p?.enemies.find((e) => e.boss);
      if (p && m && p.marek === Intercept.Riding) p.marek = Intercept.Broken;
      step(w, [inp({ moveX: 1 })]);
    }
    expect(beatOf(w)!.id).toBe('dispatch-yard');
    expect(w.run!.intercept).toBe(Intercept.Broken);
    expect(w.encounter!.opening).toBe(Intercept.Broken);
    run(w, 40);
    const marek = w.bodies.find((b) => b.id === w.encounter!.boss?.id)!;
    expect(w.encounter!.boss!.intercept).toBe(Intercept.Broken);
    // The forced capture: Health 0 in the last phase while Resolve remains.
    w.encounter!.boss!.phase = 1;
    dealDamage(w, marek, marek.health);
    for (let i = 0; i < 60 * 30 && w.run!.evidence === 0; i += 1) {
      for (const e of w.bodies)
        if (e.team === 'enemy' && e.id !== marek.id && !e.ko) dealDamage(w, e, e.health);
      step(w, [idle]);
    }
    expect(w.run!.capture?.route).toBe(2);
    expect(w.run!.capture?.intercept).toBe(Intercept.Broken);
    expect(w.run!.evidence).toBe(1);
    expect(w.run!.event.kind).toBe(RunEvent.EvidenceReady);
    const crate = beatOf(w)!.evidence!;
    holdAt(w, crate.x, crate.z, STAGE2.rules.evidenceFrames);
    expect(w.run!.phase).toBe(RunPhase.Complete);
    const r = stageResults(w)!;
    expect(r.capture?.route).toBe(2);
    expect(r.epilogue[0]).toBe('capture.forced');
    // Practice from the intercept: the yard's assets are in the Preservation record.
    expect(r.preservation!.assets.map((a) => a.name)).toEqual(['cargo', 'dispatch', 'bed-west']);
  });

  test('the epilogue: every mandatory card in every run, inserts by the run', () => {
    const w = at('aquaculture');
    const run2 = w.run!;
    run2.capture = { route: 1, gunLost: 1, gunAmmo: 9, scorch: 0, scorchStops: 0, intercept: 1 };
    run2.ledger = [
      { beat: 2, name: 'fish', kind: w.greenhouse!.assets[0]!.kind, condition: 100, state: 0 },
    ];
    run2.branches[beatNo('seed-bay')] = BranchOutcome.Completed;
    run2.branches[beatNo('prep-room')] = BranchOutcome.Failed;
    expect(epilogueCards(run2, STAGE2)).toEqual([
      'capture.resolve',
      'secured',
      'ledger.aquatic.sound',
      'formula',
      'seal',
      'justice',
      'branch.seed',
      'recovery.flourishing',
      'depot',
    ]);
    run2.capture = null;
    run2.ledger = [];
    run2.branches = run2.branches.map(() => BranchOutcome.Skipped);
    expect(epilogueCards(run2, STAGE2)).toEqual(['secured', 'formula', 'seal', 'justice', 'depot']);
  });

  test('results: Preservation and Response grades, branch outcomes and the capture', () => {
    const w = at('seed-bay');
    clear(w);
    leave(w);
    const r = stageResults(w)!;
    expect(r.grades.map((g) => g.id)).toEqual(['preservation', 'response', 'continues', 'time']);
    expect(r.grades.reduce((n, g) => n + g.weight, 0)).toBe(100);
    expect(r.branches.map((b) => [b.id, b.outcome])).toEqual([
      ['aeration', BranchOutcome.Skipped],
      ['seed', BranchOutcome.Completed],
      ['medicinal', BranchOutcome.Skipped],
    ]);
    // A completed branch adds its score (and costs nothing when skipped).
    const skipped = JSON.parse(JSON.stringify(w.run!)) as typeof w.run & object;
    skipped.branches = skipped.branches.map(() => BranchOutcome.Skipped);
    expect(r.score).toBeGreaterThan(stageResults({ ...w, run: skipped } as World)!.score);
  });
});

describe('the whole stage', () => {
  function play(seed: number, difficulty: string, heroes: string[]): World {
    const w = createWorld(seed, {
      stage: 'stage2',
      difficulty,
      heroes,
      cheats: { hero: [SAFE, SAFE], session: 0 },
    });
    for (let i = 0; i < 60 * 60 * 30 && w.run!.phase !== RunPhase.Complete; i += 1)
      step(
        w,
        heroes.map((_, s) => stageBotInput(w, s)),
      );
    return w;
  }

  test('a bot rides, fights and captures Marek from the pursuit to the crate, deterministically', () => {
    const a = play(3, 'easy', ['fire']);
    expect(a.run!.phase).toBe(RunPhase.Complete);
    const r = stageResults(a)!;
    expect(r.capture).not.toBeNull();
    expect(r.response).not.toBeNull();
    expect(r.preservation!.assets.length).toBeGreaterThan(10);
    expect(r.epilogue).toContain('depot');
    expect(r.cheatAssisted).toBe(true);
    expect(hashWorld(play(3, 'easy', ['fire']))).toBe(hashWorld(a));
  }, 120_000);

  test('two heroes complete it in co-op on Medium', () => {
    const w = play(5, 'medium', ['wind', 'fire']);
    expect(w.run!.phase).toBe(RunPhase.Complete);
    expect(w.bodies.filter((b) => b.team === 'hero')).toHaveLength(2);
  }, 120_000);

  test('a snapshot taken in a room restores to the same hash', () => {
    const w = at('crop-channels', { heroes: ['fire', 'river'] });
    run(w, 200, (x) => [stageBotInput(x, 0), stageBotInput(x, 1)]);
    const c = restoreWorld(snapshotWorld(w));
    run(w, 300, (x) => [stageBotInput(x, 0), stageBotInput(x, 1)]);
    run(c, 300, (x) => [stageBotInput(x, 0), stageBotInput(x, 1)]);
    expect(hashWorld(c)).toBe(hashWorld(w));
  });
});
