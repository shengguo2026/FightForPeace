import { fx } from '../src/math/fixed';
import { ActionBit } from '../src/input/bits';
import { type Fighter, type FrameInput, MoveState, type World } from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';
import { ARENAS } from '../src/enemies/data';
import { enter } from '../src/combat/reactions';
import { snapshotWorld, restoreWorld } from '../src/net/snapshot';
import { RobotState } from '../src/shared/state';
import {
  CaseState,
  ChannelPhase,
  HoldKind,
  OBJECTIVES,
  ObjEvent,
  UnitPhase,
  objectiveCheckpoint,
  restoreObjectives,
} from '../src/objectives/state';
import { NO_RANK, bandFor, grade100, rankFor, ratio } from '../src/objectives/grade';
import { caseOutcome, objectiveGrade, unitCondition } from '../src/objectives/results';
import { objectiveHint } from '../src/objectives/units';
import { botInput } from './arenaBot';

const ROOM = 'lab-m25-objectives';
const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const HOLD: FrameInput = { ...IDLE, held: ActionBit.Interact };
const PRESS: FrameInput = { ...IDLE, pressed: ActionBit.Interact, held: ActionBit.Interact };

const room = (seed = 3, difficulty = 'medium') =>
  createWorld(seed, { arena: ROOM, difficulty: difficulty as 'medium' });
const def = () => ARENAS.find((a) => a.id === ROOM)!.objectives!;
const hero = (w: World) => heroOf(w, 0)!;
function idle(w: World, frames: number): void {
  for (let i = 0; i < frames; i += 1) step(w, [IDLE]);
}
function until(w: World, done: () => boolean, max = 4000, input: FrameInput = IDLE): void {
  for (let i = 0; i < max && !done(); i += 1) step(w, [input]);
  expect(done()).toBe(true);
}
/** Puts the hero right next to a spot (pixels) and holds Interact until `done`. */
function holdAt(w: World, x: number, z: number, done: () => boolean, max = 400): void {
  const h = hero(w);
  h.x = fx(x - 40);
  h.z = fx(z);
  h.state = MoveState.Idle;
  step(w, [PRESS]);
  until(w, done, max, HOLD);
}
const actor = (w: World, i: number): Fighter | undefined =>
  w.bodies.find((b) => b.id === w.objectives!.channels[i]!.actor);
/** Removes every enemy (the Lab's "clear the room"). */
const clear = (w: World) => (w.bodies = w.bodies.filter((b) => b.team === 'hero'));

describe('M25 data', () => {
  test('the rescue ladder and the research-record outcomes follow Stage 3 §7.2 and §22.2', () => {
    const rescue = OBJECTIVES.ladders.find((l) => l.id === 'rescue')!;
    expect(rescue.states.map((s) => [s.id, s.at, s.share])).toEqual([
      ['secure', 0, 100],
      ['strained', 1, 50],
      ['critical', 2, 0],
    ]);
    expect(OBJECTIVES.outcomes.find((o) => o.id === 'record')).toEqual({
      id: 'record',
      documented: 100,
      recovered: 66,
      disturbed: 33,
      missing: 0,
    });
  });

  test('the test room is the last arena (append only, lesson G1)', () => {
    // M27 appends its Stage 3 rooms after it.
    const after = ARENAS.slice(ARENAS.findIndex((a) => a.id === ROOM) + 1);
    expect(after.every((a) => a.id.startsWith('lab-m27-'))).toBe(true);
    const d = def();
    expect(d.units.map((u) => u.id)).toEqual(['captive']);
    expect(d.cases.map((c) => c.id)).toEqual(['case']);
    expect(d.channels.map((c) => [c.unit, c.target, c.kind])).toEqual([
      [true, 0, 'rope'],
      [true, 0, 'lantern'],
      [false, 0, 'crate'],
    ]);
  });

  test('Stage 1, Stage 2 and M24 worlds carry no objective state', () => {
    for (const arena of ['beat-courtyard', 'boss-commander', 'lab-m24-robot']) {
      const w = createWorld(3, { arena, difficulty: 'medium' });
      for (let i = 0; i < 600; i += 1) step(w, [botInput(w)]);
      expect(w.objectives).toBeUndefined();
    }
  });
});

describe('M25 hostile channels and the condition ladder', () => {
  test('enemies work the channels: Secure, Strained, Critical; the case is disturbed', () => {
    const w = room();
    expect(unitCondition(w, 0)).toBe(0);
    // Secure captive (70) and a case not collected yet (Missing, 0): 70 points, B.
    expect([objectiveGrade(w)!.points, objectiveGrade(w)!.overall]).toEqual([70, 'B']);
    until(w, () => w.objectives!.units[0]!.count === 1);
    expect(unitCondition(w, 0)).toBe(1);
    until(w, () => w.objectives!.units[0]!.count === 2);
    expect(unitCondition(w, 0)).toBe(2);
    until(w, () => w.objectives!.cases[0]!.state === CaseState.Disturbed);
    expect(caseOutcome(w.objectives!.cases[0]!)).toBe('disturbed');
    // Each channel counted once and is done.
    expect(w.objectives!.channels.map((c) => c.phase)).toEqual([
      ChannelPhase.Done,
      ChannelPhase.Done,
      ChannelPhase.Done,
    ]);
    idle(w, 600);
    expect(w.objectives!.units[0]!.count).toBe(2);
    // 70 × 0 + 30 × 33 % = 9 points; the Critical condition caps the rank (C stays C).
    const g = objectiveGrade(w)!;
    expect(g.points).toBe(9);
    expect(g.lines.map((l) => [l.id, l.points])).toEqual([
      ['rescue', 0],
      ['record', 9],
    ]);
    expect(g.overall).toBe('C');
  });

  test('a Strained captive caps nothing; a Critical one caps the grade at A', () => {
    const w = room();
    // Seal the case at once, so the record is Documented (30 points).
    holdAt(w, 1500, 820, () => w.objectives!.cases[0]!.state === CaseState.Collected);
    holdAt(w, 1500, 820, () => w.objectives!.cases[0]!.state === CaseState.Sealed);
    expect(objectiveGrade(w)!.points).toBe(100);
    w.objectives!.units[0]!.count = 1;
    expect(objectiveGrade(w)!.points).toBe(65);
    expect(objectiveGrade(w)!.capped).toBeNull();
    // Synthetic check of the condition cap on a high total: the cap lowers S to A.
    const g = grade100(
      { ranks: [90, 75, 55], caps: [] },
      [{ id: 'rescue', weight: 100, share: 95, value: '' }],
      [{ reason: 'rescue.critical', rank: 'A' }],
    );
    expect([g.overall, g.capped]).toEqual(['A', 'rescue.critical']);
    w.objectives!.units[0]!.count = 2;
    expect(objectiveGrade(w)!.capped).toBeNull(); // 30 points is already C
  });

  test('an interrupted channel does not count and is offered again after its cooldown', () => {
    const w = room();
    until(w, () => w.objectives!.channels[0]!.phase === ChannelPhase.Working);
    idle(w, 30);
    const c = w.objectives!.channels[0]!;
    expect(c.progress).toBeGreaterThan(20);
    // A legal hit puts the actor into a reaction: that is the interruption.
    enter(actor(w, 0)!, MoveState.Hitstun, 20);
    step(w, [IDLE]);
    expect(c.phase).toBe(ChannelPhase.Idle);
    expect(c.stops).toBe(1);
    expect(c.progress).toBe(0);
    expect(w.objectives!.log.kind).toBe(ObjEvent.ChannelStopped);
    expect(w.objectives!.units[0]!.count).toBe(0);
    const ready = c.readyAt;
    expect(ready).toBe(w.frame - 1 + def().channels[0]!.cooldown);
    until(w, () => c.phase !== ChannelPhase.Idle);
    expect(w.frame).toBeGreaterThanOrEqual(ready);
  });

  test('a defeated actor interrupts its channel too', () => {
    const w = room();
    until(w, () => w.objectives!.channels[0]!.phase === ChannelPhase.Working);
    const f = actor(w, 0)!;
    f.ko = true;
    step(w, [IDLE]);
    expect(w.objectives!.channels[0]!.stops).toBe(1);
  });

  test("the support robot's interference pauses the working channel nearest its station", () => {
    const w = room();
    until(w, () => w.objectives!.channels[0]!.phase === ChannelPhase.Working);
    const st = w.shared!.stations[0]!;
    st.state = RobotState.Active;
    st.frame = 0;
    step(w, [IDLE]);
    const c = w.objectives!.channels[0]!;
    const p = c.progress;
    expect(c.paused).toBe(true);
    idle(w, 60);
    if (c.phase === ChannelPhase.Working) expect(c.progress).toBe(p);
    until(w, () => st.state === RobotState.Consumed);
    until(w, () => c.progress > p || c.phase !== ChannelPhase.Working);
  });
});

describe('M25 protected units', () => {
  test('freed, the captive cheers, walks its route and is safe; the count locks', () => {
    const w = room();
    const u = w.objectives!.units[0]!;
    const d = def().units[0]!;
    expect(objectiveHint(w, hero(w))).toBe(HoldKind.None);
    hero(w).x = fx(d.x - 40);
    hero(w).z = fx(d.z);
    expect(objectiveHint(w, hero(w))).toBe(HoldKind.Free);
    holdAt(w, d.x, d.z, () => u.phase !== UnitPhase.Captive);
    expect(u.phase).toBe(UnitPhase.Freed);
    expect(w.objectives!.log.kind).toBe(ObjEvent.Freed);
    clear(w);
    until(w, () => u.phase === UnitPhase.Safe, 600);
    expect(u.locked).toBe(true);
    expect([u.x, u.z]).toEqual([fx(d.route.at(-1)!.x), fx(d.route.at(-1)!.z)]);
    // Channels against a safe unit close; its count never changes again.
    step(w, [IDLE]);
    expect(w.objectives!.channels[0]!.phase).toBe(ChannelPhase.Closed);
    expect(w.objectives!.channels[1]!.phase).toBe(ChannelPhase.Closed);
  });

  test('letting go of Interact or a hit stops the hold; nothing is freed', () => {
    const w = room();
    const d = def().units[0]!;
    holdAt(w, d.x, d.z, () => w.objectives!.hold[0]!.progress >= 20);
    step(w, [IDLE]);
    expect(w.objectives!.hold[0]!.kind).toBe(HoldKind.None);
    expect(w.objectives!.units[0]!.phase).toBe(UnitPhase.Captive);
    expect(hero(w).state).toBe(MoveState.Idle);
  });

  test('the captive waits at the hand-off point while an enemy is inside its zone', () => {
    const w = room();
    const u = w.objectives!.units[0]!;
    const d = def().units[0]!;
    holdAt(w, d.x, d.z, () => u.phase !== UnitPhase.Captive);
    // Keep one enemy standing at the hand-off point.
    until(w, () => w.encounter!.wave >= 0 && w.bodies.some((b) => b.team === 'enemy'));
    const e = w.bodies.find((b) => b.team === 'enemy')!;
    clear(w);
    w.bodies.push(e);
    const gate = d.route[0]!;
    const pin = () => {
      e.x = fx(gate.x + 60);
      e.z = fx(gate.z);
      e.state = MoveState.Idle;
    };
    for (let i = 0; i < 300 && u.phase !== UnitPhase.Waiting; i += 1) {
      pin();
      step(w, [IDLE]);
    }
    expect(u.phase).toBe(UnitPhase.Waiting);
    for (let i = 0; i < 120; i += 1) {
      pin();
      step(w, [IDLE]);
    }
    expect(u.phase).toBe(UnitPhase.Waiting);
    clear(w);
    until(w, () => u.phase === UnitPhase.Safe, 300);
  });

  test('condition never changes with time alone (Stage 3 review S3-1)', () => {
    const w = room();
    clear(w);
    w.encounter!.wave = 99;
    idle(w, 3000);
    expect(w.objectives!.units[0]!.count).toBe(0);
  });
});

describe('M25 evidence lifecycle', () => {
  test('collect and seal: Documented; the crate channel then closes', () => {
    const w = room();
    const k = w.objectives!.cases[0]!;
    holdAt(w, 1500, 820, () => k.state === CaseState.Collected);
    expect(caseOutcome(k)).toBe('documented');
    holdAt(w, 1500, 820, () => k.state === CaseState.Sealed);
    step(w, [IDLE]);
    expect(w.objectives!.channels[2]!.phase).toBe(ChannelPhase.Closed);
    expect(caseOutcome(k)).toBe('documented');
  });

  test('disturbed, recovered and sealed: Recovered (two thirds), never lost', () => {
    const w = room();
    const k = w.objectives!.cases[0]!;
    expect(caseOutcome(k)).toBe('missing');
    holdAt(w, 1500, 820, () => k.state === CaseState.Collected);
    hero(w).x = fx(500);
    until(w, () => k.state === CaseState.Disturbed);
    expect(caseOutcome(k)).toBe('disturbed');
    expect(objectiveGrade(w)!.lines[1]!.value).toBe('33%');
    clear(w);
    holdAt(w, 1500, 820, () => k.state === CaseState.Recovered);
    expect(caseOutcome(k)).toBe('recovered');
    holdAt(w, 1500, 820, () => k.state === CaseState.Sealed);
    expect(caseOutcome(k)).toBe('recovered');
    expect(objectiveGrade(w)!.lines[1]!.value).toBe('66%');
  });
});

describe('M25 checkpoints, snapshots and determinism', () => {
  test('a restore keeps what locked since the checkpoint and returns everything else', () => {
    const w = room();
    const cp = objectiveCheckpoint(w)!;
    const d = def().units[0]!;
    const u = () => w.objectives!.units[0]!;
    holdAt(w, d.x, d.z, () => u().phase !== UnitPhase.Captive);
    until(w, () => u().phase === UnitPhase.Safe, 2000);
    const count = u().count;
    until(w, () => w.objectives!.cases[0]!.state === CaseState.Disturbed);
    restoreObjectives(w, cp);
    expect(u().phase).toBe(UnitPhase.Safe);
    expect(u().count).toBe(count);
    expect(w.objectives!.cases[0]!.state).toBe(CaseState.Present);
    expect(w.objectives!.channels[2]!.phase).toBe(ChannelPhase.Idle);
    expect(w.objectives!.log.kind).toBe(ObjEvent.Restored);
    // A sealed case is kept as well.
    const w2 = room();
    const cp2 = objectiveCheckpoint(w2)!;
    holdAt(w2, 1500, 820, () => w2.objectives!.cases[0]!.state === CaseState.Collected);
    holdAt(w2, 1500, 820, () => w2.objectives!.cases[0]!.state === CaseState.Sealed);
    restoreObjectives(w2, cp2);
    expect(w2.objectives!.cases[0]!.state).toBe(CaseState.Sealed);
  });

  test('an unlocked captive returns to its checkpoint condition', () => {
    const w = room();
    const cp = objectiveCheckpoint(w)!;
    until(w, () => w.objectives!.units[0]!.count === 1);
    restoreObjectives(w, cp);
    expect(w.objectives!.units[0]!.count).toBe(0);
    expect(w.objectives!.channels.every((c) => c.actor === 0)).toBe(true);
  });

  test('snapshots restore mid-channel and continue to the same hash; same inputs, same hash', () => {
    const w = room();
    until(w, () => w.objectives!.channels[2]!.phase === ChannelPhase.Working);
    const copy = restoreWorld(snapshotWorld(w));
    for (let i = 0; i < 900; i += 1) {
      step(w, [botInput(w)]);
      step(copy, [botInput(copy)]);
    }
    expect(hashWorld(copy)).toBe(hashWorld(w));
    const run = () => {
      const x = room(9);
      for (let i = 0; i < 2400; i += 1) step(x, [botInput(x)]);
      return hashWorld(x);
    };
    expect(run()).toBe(run());
  });
});

describe('M25 grade module', () => {
  test('points, ranks and category caps', () => {
    const rules = { ranks: [90, 75, 55], caps: [{ category: 'a', below: 100, rank: 'A' }] };
    const g = grade100(rules, [
      { id: 'a', weight: 35, share: 50, value: '1/2' },
      { id: 'b', weight: 65, share: 100, value: '' },
    ]);
    expect(g.lines.map((l) => [l.points, l.grade])).toEqual([
      [17, 'C'],
      [65, 'S'],
    ]);
    expect([g.points, g.overall, g.capped]).toEqual([82, 'A', null]);
    const full = grade100(rules, [
      { id: 'a', weight: 35, share: 90, value: '' },
      { id: 'b', weight: 65, share: 100, value: '' },
    ]);
    expect([full.points, full.overall, full.capped]).toEqual([96, 'A', 'a']);
  });

  test('no grade for a Cheat-Assisted run where the arena asks', () => {
    const w = room();
    w.cheats.marked = true;
    expect(objectiveGrade(w)!.overall).toBe(NO_RANK);
    expect(objectiveGrade(w)!.points).toBe(70);
  });

  test('letters and bands', () => {
    expect([100, 90, 89, 75, 55, 54].map((p) => rankFor(p, [90, 75, 55]))).toEqual([
      'S',
      'S',
      'A',
      'A',
      'B',
      'C',
    ]);
    const bands = [
      { id: 'x', min: 90 },
      { id: 'y', min: 45 },
      { id: 'z', min: 0 },
    ];
    expect([95, 45, 3].map((p) => bandFor(p, bands).id)).toEqual(['x', 'y', 'z']);
    expect([ratio(1, 2), ratio(0, 0), ratio(5, 3)]).toEqual([50, 100, 100]);
  });
});
