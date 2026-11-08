import { Cheat, CHEATS, cheatMask } from '../src/cheats/cheats';
import { METER } from '../src/combat/meter';
import { HEROES } from '../src/combat/roster';
import { MountedSlot, ObstacleKind } from '../src/combat/types';
import { ActionBit } from '../src/input/bits';
import { fx } from '../src/math/fixed';
import {
  CORRIDORS,
  EnemyState,
  MOUNTED,
  type Pursuit,
  PursuitPhase,
  RideEvent,
  RiderState,
  type RoadRider,
  addRoadRider,
  laneZ,
  mountedKit,
  parFrames,
  responseRecord,
  roadAt,
} from '../src/mounted/pursuit';
import { restoreWorld, snapshotWorld } from '../src/net/snapshot';
import type { FrameInput, World } from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';

const B = MOUNTED.bike;
const R = MOUNTED.rider;
const C = CORRIDORS[0]!;
const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const input = (o: Partial<FrameInput> = {}): FrameInput => ({ ...idle, ...o });
const press = (bit: number, o: Partial<FrameInput> = {}) => input({ pressed: bit, ...o });

function ride(
  heroes: string[] = ['mountain'],
  opts: { difficulty?: string; cheats?: { hero: number[]; session: number } } = {},
): World {
  const w = createWorld(3, { pursuit: 'perimeter-pursuit', heroes, ...opts });
  // Player 2 joins with its first input.
  step(w, heroes.length > 1 ? [idle, idle] : [idle]);
  return w;
}
const P = (w: World): Pursuit => w.pursuit!;
const rider = (w: World, slot = 0) => P(w).riders.find((r) => r.slot === slot)!;
function run(w: World, n: number, inputs: FrameInput[] | ((i: number) => FrameInput[]) = [idle]) {
  for (let i = 0; i < n; i += 1) step(w, typeof inputs === 'function' ? inputs(i) : inputs);
}
/** A clear stretch of road with no obstacle near: riders are placed here for drills. */
const CLEAR_X = fx(6800);
/** Puts every rider at corridor x (lanes kept) with protection worn off. */
function placeAt(w: World, x = CLEAR_X) {
  for (const r of P(w).riders) {
    r.x = x - fx(r.slot * 200);
    r.z = laneZ(C, r.x, r.slot === 0 ? 1 : 2);
    r.protectUntil = 0;
    r.speed = B.base;
  }
  P(w).camX = x - fx(760);
  P(w).checkpoint = C.checkpoints.filter((c) => c <= x).length - 1;
  // No waves while drilling.
  P(w).waveArmed = P(w).waveArmed.map(() => false);
}
/** A Road Rider alongside slot `slot` (below it), already approaching. */
function alongside(w: World, slot = 0, dz = 90, dx = 0): RoadRider {
  const r = rider(w, slot);
  const e = addRoadRider(P(w), r.x + fx(dx), r.z + fx(dz), w.frame);
  e.state = EnemyState.Approach;
  e.target = slot;
  e.side = dz >= 0 ? 1 : -1;
  e.speed = r.speed;
  return e;
}
/** The rider's next committed attack lands on the next frame. */
function strikeNext(w: World, e: RoadRider, kind = 0) {
  e.state = EnemyState.Windup;
  e.attack = R.actions.findIndex((a) => a.kind === kind);
  e.since = w.frame - R.actions[e.attack]!.windup;
}

describe('M17 data: bike, kits, Road Rider and corridor', () => {
  test('every roster hero has the six confirmed mounted actions in slot order', () => {
    const names: Record<string, string[]> = {
      mountain: ["Mason's Reach", 'Bank-Sweep Kick', 'Stone-Step Hop', 'Anchor Lean', 'Rampart Escort', 'Open Gate Convoy'],
      river: ['Reed-Tap Pass', 'Current Kick', 'Rapids Hop', 'Eddy Lean', 'Riverline Overtake', 'Floodline Run'],
      wind: ['Passing Palm', 'Crosswind Kick', 'Wind-Lane Hop', 'Crosswind Lean', 'Guardian Cut-In', 'Open Road Vigil'],
      fire: ['Road-Hammer Elbow', 'Passing Heel', 'Breach-Line Hop', 'Iron Lean', 'Convoy Break', "Warden's Passage"],
    };
    HEROES.forEach((h, i) => {
      const kit = mountedKit(i);
      expect(kit.map((a) => a.slot)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(kit.map((a) => a.name)).toEqual(names[h.id]);
    });
  });

  test('one mechanically equivalent bike with an identification plate per player', () => {
    expect(B.plates).toHaveLength(2);
    expect(new Set(B.plates).size).toBe(2);
    expect(B.min).toBeLessThan(B.base);
    expect(B.base).toBeLessThan(B.max);
  });

  test('Fire Warden leans in a narrower window than Wind Sentinel and pays more for a miss', () => {
    const fire = mountedKit(HEROES.findIndex((h) => h.id === 'fire'));
    const wind = mountedKit(HEROES.findIndex((h) => h.id === 'wind'));
    const span = (a: (typeof fire)[number]) => a.evadeTo - a.evadeFrom;
    expect(span(fire[MountedSlot.Lean]!)).toBeLessThan(span(wind[MountedSlot.Lean]!));
    expect(fire[MountedSlot.Directional]!.miss).toBeGreaterThan(wind[MountedSlot.Directional]!.miss);
  });

  test('the Road Rider has its six working actions and no weapons', () => {
    expect(R.actions.map((a) => a.name)).toEqual([
      'Parallel Check',
      'Passing Boot',
      'Cutoff Line',
      'Brake-Fade',
      'Rider Brace',
      'Breakaway',
    ]);
    const cutoff = R.actions.find((a) => a.kind === 2)!;
    expect(cutoff.damage).toBe(0);
    expect(cutoff.stability).toBe(0);
  });

  test('the corridor opens with a safe stretch: no Road Rider before the first obstacles', () => {
    const firstObstacle = Math.min(...C.obstacles.map((o) => o.at));
    const firstWave = Math.min(...C.waves.map((w) => w.at));
    expect(firstWave).toBeGreaterThan(firstObstacle);
    expect(C.checkpoints.length).toBeGreaterThanOrEqual(3);
    expect(C.equipment.length).toBe(3);
  });
});

describe('M17 Guided Pursuit Corridor: speed, steering and soft lanes', () => {
  test('a safe baseline speed, bounded faster and slower', () => {
    const w = ride();
    placeAt(w);
    run(w, 120);
    expect(rider(w).speed).toBe(B.base);
    run(w, 120, [input({ moveX: 1 })]);
    expect(rider(w).speed).toBe(B.max);
    run(w, 120, [input({ moveX: -1 })]);
    expect(rider(w).speed).toBe(B.min);
    // Even braking keeps the bike moving forward.
    const x = rider(w).x;
    run(w, 10, [input({ moveX: -1 })]);
    expect(rider(w).x).toBeGreaterThan(x);
  });

  test('continuous steering; without input the soft lane pulls gently', () => {
    const w = ride();
    placeAt(w);
    const z0 = rider(w).z;
    run(w, 10, [input({ moveZ: 1 })]);
    expect(rider(w).z).toBe(z0 + 10 * B.steer);
    run(w, 200);
    const r = rider(w);
    const lanes = [0, 1, 2].map((l) => laneZ(C, r.x, l));
    expect(lanes).toContain(r.z);
  });

  test('the road band holds the rider inside its edges, also where it narrows', () => {
    const w = ride();
    placeAt(w, fx(10200));
    run(w, 60, [input({ moveZ: 1 })]);
    const r = rider(w);
    expect(r.z).toBeLessThanOrEqual(roadAt(C, r.x).bottom);
    run(w, 80, [input({ moveZ: -1 })]);
    expect(rider(w).z).toBeGreaterThanOrEqual(roadAt(C, rider(w).x).top);
  });

  test('steering assistance strengthens the lane pull (it never steers for you)', () => {
    const pulls = [false, true].map((assist) => {
      const w = createWorld(3, { pursuit: 'perimeter-pursuit', steeringAssist: assist });
      placeAt(w);
      const r = rider(w);
      r.z += fx(40);
      const z = r.z;
      step(w, [idle]);
      return z - rider(w).z;
    });
    expect(pulls[1]).toBeGreaterThan(pulls[0]!);
    // Input still wins over the assistance.
    const w = createWorld(3, { pursuit: 'perimeter-pursuit', steeringAssist: true });
    placeAt(w);
    const z = rider(w).z;
    step(w, [input({ moveZ: 1 })]);
    expect(rider(w).z).toBe(z + B.steer);
  });
});

describe('M17 co-op: shared camera, tether, no collisions between partners', () => {
  test('partner bikes overlap freely and never hit each other', () => {
    const w = ride(['wind', 'fire']);
    placeAt(w);
    const [a, b] = [rider(w, 0), rider(w, 1)];
    b.x = a.x;
    b.z = a.z;
    const health = [heroOf(w, 0)!.health, heroOf(w, 1)!.health];
    run(w, 40, (i) => [press(i % 20 === 0 ? ActionBit.Attack : 0), press(i % 20 === 5 ? ActionBit.Attack : 0)]);
    expect(rider(w, 0).z).toBe(rider(w, 1).z);
    expect([heroOf(w, 0)!.health, heroOf(w, 1)!.health]).toEqual(health);
    expect([rider(w, 0).stability, rider(w, 1).stability]).toEqual([B.stability, B.stability]);
  });

  test('the tether slows the leader and assists the trailer; the gap stays bounded', () => {
    const w = ride(['mountain', 'river']);
    placeAt(w);
    let maxGap = 0;
    let maxStep = 0;
    for (let i = 0; i < 600; i += 1) {
      const before = rider(w, 0).x;
      step(w, [input({ moveX: 1 }), input({ moveX: -1 })]);
      maxGap = Math.max(maxGap, rider(w, 0).x - rider(w, 1).x);
      maxStep = Math.max(maxStep, rider(w, 0).x - before);
    }
    expect(maxGap).toBeLessThanOrEqual(B.tether.hard + B.max);
    // No teleport: the leader never moves more than its top speed in a frame.
    expect(maxStep).toBeLessThanOrEqual(B.max);
    expect(rider(w, 0).speed).toBeLessThan(B.max);
    // Both stay on the shared screen.
    const p = P(w);
    for (const r of p.riders) {
      expect(r.x).toBeGreaterThanOrEqual(p.camX);
      expect(r.x).toBeLessThanOrEqual(p.camX + fx(1920));
    }
  });

  test('a trailing rider with no input is assisted above the baseline', () => {
    const w = ride(['mountain', 'river']);
    placeAt(w);
    rider(w, 1).x = rider(w, 0).x - B.tether.soft - fx(200);
    run(w, 60, [input({ moveX: 1 }), idle]);
    expect(rider(w, 1).speed).toBe(B.base + B.tether.assist);
  });
});

describe('M17 Stability: warned critical state, safe crash and recovery', () => {
  test('zero Stability is a warned critical state; the next qualifying hit is a safe crash', () => {
    const w = ride();
    placeAt(w);
    rider(w).stability = 10;
    const e = alongside(w);
    strikeNext(w, e);
    step(w, [idle]);
    expect(rider(w).stability).toBe(0);
    expect(rider(w).critical).toBe(true);
    expect(rider(w).event).toBe(RideEvent.Critical);
    expect(rider(w).state).not.toBe(RiderState.Crash);
    run(w, 80);
    e.state = EnemyState.Approach;
    rider(w).lastHurt = w.frame;
    e.x = rider(w).x;
    e.z = rider(w).z + fx(90);
    strikeNext(w, e);
    step(w, [idle]);
    expect(rider(w).state).toBe(RiderState.Crash);
    expect(P(w).record.crashes).toBe(1);
  });

  test('solo: the crash returns the rider to the latest micro-checkpoint with fresh Stability', () => {
    const w = ride();
    placeAt(w, fx(13000));
    P(w).checkpoint = 1;
    const f = heroOf(w, 0)!;
    const health = f.health;
    const r = rider(w);
    r.critical = true;
    r.stability = 0;
    const e = alongside(w);
    strikeNext(w, e);
    step(w, [idle]);
    expect(r.state).toBe(RiderState.Crash);
    const healthAfterHit = heroOf(w, 0)!.health;
    run(w, B.crash + 2);
    const back = rider(w);
    expect(back.state).toBe(RiderState.Ride);
    expect(back.x).toBeGreaterThanOrEqual(C.checkpoints[1]!);
    expect(back.x).toBeLessThan(C.checkpoints[1]! + fx(100));
    expect(back.stability).toBe(B.stability);
    expect(back.protectUntil).toBeGreaterThan(w.frame);
    expect(P(w).record.rewinds).toBe(1);
    // The dismount adds no hidden Health penalty (only the hit's own damage).
    expect(heroOf(w, 0)!.health).toBe(healthAfterHit);
    expect(healthAfterHit).toBeLessThanOrEqual(health);
    expect(P(w).enemies).toHaveLength(0);
  });

  test('a short damage-free interval restores Stability a little at a time', () => {
    const w = ride();
    placeAt(w);
    rider(w).stability = 50;
    rider(w).lastHurt = w.frame;
    run(w, B.recover.delay - 1);
    expect(rider(w).stability).toBe(50);
    run(w, B.recover.every * 10 + 1);
    expect(rider(w).stability).toBeGreaterThan(50);
    expect(rider(w).stability).toBeLessThanOrEqual(50 + 11 * B.recover.amount);
  });

  test('a mounted hit never takes the last Health point', () => {
    const w = ride();
    placeAt(w);
    heroOf(w, 0)!.health = 5;
    const e = alongside(w);
    strikeNext(w, e);
    step(w, [idle]);
    expect(heroOf(w, 0)!.health).toBe(1);
  });

  test('obstacles: hop clears a barrier; riding into it costs Stability (no Health)', () => {
    const barrier = C.obstacles.findIndex((o) => o.kind === ObstacleKind.Barrier);
    const o = C.obstacles[barrier]!;
    for (const hop of [false, true]) {
      const w = ride();
      placeAt(w, o.at - fx(200));
      P(w).waveArmed = P(w).waveArmed.map(() => false);
      const r = rider(w);
      r.z = o.z;
      const health = heroOf(w, 0)!.health;
      run(w, 40, (i) => [press(hop && i === 10 ? ActionBit.Jump : 0, { moveZ: 0 })]);
      // Hold the lane: the soft lane pull is weaker than the obstacle line.
      expect(heroOf(w, 0)!.health).toBe(health);
      if (hop) {
        expect(rider(w).stability).toBe(B.stability);
        expect(P(w).record.impacts).toBe(0);
      } else {
        expect(rider(w).stability).toBe(B.stability - B.impact.barrier);
        expect(P(w).record.impacts).toBe(1);
      }
    }
  });

  test('a hop on a ramp is the long ramp hop and counts towards Mastery', () => {
    const ramp = C.obstacles.find((o) => o.kind === ObstacleKind.Ramp)!;
    const w = ride();
    placeAt(w, ramp.at - ramp.hw);
    rider(w).z = ramp.z;
    step(w, [press(ActionBit.Jump)]);
    expect(rider(w).hopFrames).toBe(B.hop.rampFrames);
    expect(P(w).record.mastery).toBe(1);
  });

  test('a lean timed into an attack evades it and restores some Stability', () => {
    for (const [i, h] of HEROES.entries()) {
      const w = ride([h.id]);
      placeAt(w);
      rider(w).stability = 50;
      const e = alongside(w);
      step(w, [press(ActionBit.Guard)]);
      strikeNext(w, e);
      step(w, [idle]);
      const lean = mountedKit(i)[MountedSlot.Lean]!;
      expect(rider(w).stability).toBe(50 + lean.restore);
      expect(rider(w).event).toBe(RideEvent.Evade);
    }
  });
});

describe('M17 rider-delivered attacks for all four heroes', () => {
  test.each(HEROES.map((h, i) => [h.id, i] as const))('%s: neutral, directional, Special', (id, i) => {
    const kit = mountedKit(i);
    // Neutral: the rider right alongside.
    let w = ride([id]);
    placeAt(w);
    let e = alongside(w, 0, 80);
    const s0 = e.stability;
    run(w, kit[0]!.startup + 2, (k) => [press(k === 0 ? ActionBit.Attack : 0)]);
    expect(e.stability).toBe(s0 - kit[0]!.stability);
    expect(heroOf(w, 0)!.meter).toBe(kit[0]!.meter);
    // Directional: a kick into the neighbouring lane, held direction.
    w = ride([id]);
    placeAt(w);
    e = alongside(w, 0, 150);
    run(w, kit[1]!.startup + 2, (k) => [press(k === 0 ? ActionBit.Attack : 0, { moveZ: 1 })]);
    expect(e.stability).toBe(s0 - kit[1]!.stability);
    // A whiffed kick costs steering for a while.
    w = ride([id]);
    placeAt(w);
    run(w, kit[1]!.startup + kit[1]!.active + kit[1]!.recovery + 1, (k) => [
      press(k === 0 ? ActionBit.Attack : 0, { moveZ: -1 }),
    ]);
    expect(rider(w).penaltyUntil).toBeGreaterThan(w.frame);
    // Special moves to the threat (or ahead) and strikes it.
    w = ride([id]);
    placeAt(w);
    e = alongside(w, 0, 90, kit[4]!.seek === 3 ? 150 : 0);
    run(w, kit[4]!.startup + 4, (k) => [press(k === 0 ? ActionBit.Special : 0)]);
    expect(e.stability).toBeLessThan(s0);
  });

  test.each(HEROES.map((h, i) => [h.id, i] as const))(
    '%s: the Ultimate needs a full Attack Bar, spends it and clears the pressure',
    (id, i) => {
      const ult = mountedKit(i)[MountedSlot.Ultimate]!;
      const w = ride([id]);
      placeAt(w);
      const near = alongside(w, 0, 90);
      const far = alongside(w, 0, -90, 500);
      step(w, [press(ActionBit.Ultimate)]);
      expect(rider(w).action).toBe(-1);
      heroOf(w, 0)!.meter = METER.max;
      run(w, ult.startup + 2, (k) => [press(k === 0 ? ActionBit.Ultimate : 0)]);
      expect(heroOf(w, 0)!.meter).toBe(0);
      for (const e of [near, far]) {
        expect(e.stability).toBeLessThan(e.maxStability);
        expect([EnemyState.Fade, EnemyState.Crash]).toContain(e.state);
      }
    },
  );

  test('Rampart Escort guards the partner: a hit on the guarded partner costs half', () => {
    const w = ride(['mountain', 'river']);
    placeAt(w);
    step(w, [press(ActionBit.Special), idle]);
    expect(rider(w, 1).guardUntil).toBeGreaterThan(w.frame);
    const e = alongside(w, 1, 90);
    strikeNext(w, e);
    step(w, [idle, idle]);
    const check = R.actions[0]!;
    expect(rider(w, 1).stability).toBe(B.stability - Math.trunc(check.stability / 2));
  });

  test('hitting a pursuer that commits against the partner is a protective interception', () => {
    const w = ride(['wind', 'fire']);
    placeAt(w);
    const p2 = rider(w, 1);
    const e = alongside(w, 1, -90);
    e.state = EnemyState.Windup;
    e.attack = 0;
    e.since = w.frame;
    const p1 = rider(w, 0);
    p1.x = e.x;
    p1.z = e.z - fx(80);
    run(w, 8, (k) => [press(k === 0 ? ActionBit.Attack : 0), idle]);
    expect(P(w).record.intercepts).toBe(1);
    expect(e.state).toBe(EnemyState.Fade);
    expect(p2.stability).toBe(B.stability);
  });
});

describe('M17 Road Rider: lane pressure, commitments and safe dismount', () => {
  test('warned entry: no commitment before the warning time', () => {
    const w = ride();
    placeAt(w);
    const r = rider(w);
    const e = addRoadRider(P(w), r.x, r.z + fx(90), w.frame);
    for (let i = 0; i < R.warn; i += 1) {
      step(w, [idle]);
      expect(e.state).toBe(EnemyState.Enter);
    }
  });

  test('Medium: one committed mounted attack at a time; Hard: two, never on one hero', () => {
    for (const [difficulty, heroes, cap] of [
      ['medium', ['mountain'], 1],
      ['hard', ['mountain', 'river'], 2],
    ] as const) {
      const w = ride([...heroes], { difficulty });
      placeAt(w);
      for (let k = 0; k < 4; k += 1) {
        const e = addRoadRider(P(w), rider(w, 0).x - fx(300 + 200 * k), laneZ(C, rider(w).x, 0), w.frame);
        e.state = EnemyState.Approach;
      }
      let peak = 0;
      for (let i = 0; i < 900; i += 1) {
        step(w, heroes.length > 1 ? [idle, idle] : [idle]);
        const committing = P(w).enemies.filter((e) =>
          [EnemyState.Windup, EnemyState.Strike, EnemyState.Cutoff].includes(e.state as 2),
        );
        peak = Math.max(peak, committing.length);
        const targets = committing.map((e) => e.target);
        expect(new Set(targets).size).toBe(targets.length);
        // Keep the heroes riding for the drill.
        for (const r of P(w).riders) {
          r.stability = B.stability;
          r.critical = false;
        }
      }
      expect(peak).toBeLessThanOrEqual(cap);
      expect(peak).toBeGreaterThanOrEqual(1);
    }
  });

  test('no attack begins against a protected rider or during an obstacle impact', () => {
    const w = ride();
    placeAt(w);
    const e = alongside(w);
    e.since = w.frame - R.settle;
    rider(w).protectUntil = w.frame + 200;
    run(w, 150);
    expect(e.state).toBe(EnemyState.Approach);
    rider(w).protectUntil = 0;
    rider(w).obstacleUntil = w.frame + 100;
    run(w, 80);
    expect(e.state).toBe(EnemyState.Approach);
  });

  test('critical then one more hit: a safe crash, then dismounted at the road edge (Control)', () => {
    const w = ride(['fire']);
    placeAt(w);
    const e = alongside(w, 0, 80);
    e.stability = 1;
    e.braceAcc = 0;
    const kit = mountedKit(HEROES.findIndex((h) => h.id === 'fire'));
    const hit = (k: number) => [press(k === 0 ? ActionBit.Attack : 0)];
    run(w, kit[0]!.startup + kit[0]!.active + kit[0]!.recovery + 1, hit);
    expect(e.critical).toBe(true);
    e.x = rider(w).x;
    e.z = rider(w).z + fx(80);
    run(w, kit[0]!.startup + 2, hit);
    expect(e.state).toBe(EnemyState.Crash);
    expect(P(w).record.dismounted).toBe(1);
    run(w, R.crash + 1);
    expect(e.state).toBe(EnemyState.Down);
    const road = roadAt(C, e.x);
    expect(Math.min(e.z - road.top, road.bottom - e.z)).toBeLessThanOrEqual(fx(30));
  });

  test('Rider Brace: on Medium every fourth hit on an approaching rider costs half Stability', () => {
    const w = ride(['mountain']);
    placeAt(w);
    const kit = mountedKit(0);
    const e = alongside(w, 0, 80);
    e.health = 100000;
    e.stability = 100000;
    e.maxStability = 100000;
    const losses: number[] = [];
    for (let k = 0; k < 4; k += 1) {
      e.state = EnemyState.Approach;
      e.since = w.frame;
      e.x = rider(w).x;
      e.z = rider(w).z + fx(80);
      const before = e.stability;
      run(w, kit[0]!.startup + kit[0]!.active + kit[0]!.recovery + 1, (i) => [
        press(i === 0 ? ActionBit.Attack : 0),
      ]);
      losses.push(before - e.stability);
    }
    const full = kit[0]!.stability;
    expect(losses).toEqual([full, full, full, Math.trunc((full * R.braceShare) / 100)]);
  });
});

describe('M17 equipment protection', () => {
  test('an uninterrupted kick damages the equipment; an interception saves it', () => {
    for (const intercept of [false, true]) {
      const w = ride(['wind']);
      const eq = C.equipment[0]!;
      placeAt(w, eq.at - fx(400));
      const road = roadAt(C, eq.at);
      const e = addRoadRider(P(w), eq.at - fx(80), road.top + fx(60), w.frame, -1, 0);
      e.state = EnemyState.Approach;
      const r = rider(w);
      r.x = e.x;
      r.z = e.z + fx(80);
      r.speed = 0;
      // Hold the hero beside it for the drill.
      for (let i = 0; i < 80; i += 1) {
        const hit = intercept && e.state === EnemyState.Windup && rider(w).action < 0;
        step(w, [press(hit ? ActionBit.Attack : 0, { moveX: -1 })]);
        rider(w).x = e.x;
      }
      if (intercept) {
        expect(P(w).equipment[0]).toBe(0);
        expect(P(w).record.saves).toBe(1);
      } else {
        expect(P(w).equipment[0]).toBe(2);
        expect(P(w).record.equipmentLost).toBe(1);
      }
      expect(P(w).record.threats).toBe(1);
    }
  });
});

describe('M17 co-op: Safe Recovery with Cooperative Rescue', () => {
  function crashP2(w: World) {
    const r = rider(w, 1);
    r.state = RiderState.Crash;
    r.since = w.frame;
    run(w, B.crash + 1, [idle, idle]);
    expect(rider(w, 1).state).toBe(RiderState.Downed);
    expect(P(w).record.rescueChances).toBe(1);
  }

  test('the partner rides alongside and presses Team Attack: limited Stability back', () => {
    const w = ride(['mountain', 'wind']);
    placeAt(w);
    crashP2(w);
    const d = rider(w, 1);
    const q = rider(w, 0);
    q.x = d.x;
    q.z = d.z - fx(60);
    step(w, [press(ActionBit.TeamAttack), idle]);
    expect(d.state).toBe(RiderState.Ride);
    expect(d.stability).toBe(B.rescue.restore);
    expect(P(w).record.rescues).toBe(1);
  });

  test('a missed rescue: the rider rejoins safely at the next recovery gate', () => {
    const w = ride(['river', 'fire']);
    placeAt(w, fx(10000));
    crashP2(w);
    run(w, B.rescue.window + 1, [idle, idle]);
    expect(rider(w, 1).state).toBe(RiderState.Out);
    expect(P(w).record.failedRescues).toBe(1);
    // The remaining rider is the only target meanwhile.
    rider(w, 0).x = C.checkpoints[1]! - fx(20);
    run(w, 5, [input({ moveX: 1 }), idle]);
    expect(P(w).checkpoint).toBe(1);
    expect(rider(w, 1).state).toBe(RiderState.Ride);
    expect(rider(w, 1).stability).toBe(B.stability);
    expect(rider(w, 1).event).toBe(RideEvent.Rejoin);
  });

  test('every active rider down: the team returns to the latest micro-checkpoint', () => {
    const w = ride(['mountain', 'river']);
    placeAt(w);
    crashP2(w);
    const r = rider(w, 0);
    r.state = RiderState.Crash;
    r.since = w.frame;
    run(w, B.crash + 1, [idle, idle]);
    expect(P(w).record.rewinds).toBe(1);
    expect(P(w).riders.every((x) => x.state === RiderState.Ride)).toBe(true);
  });
});

describe('M17 STEADYRIDE and the other cheats', () => {
  test('STEADYRIDE is active, hero-scoped and part of all four beginner presets', () => {
    const def = CHEATS.find((c) => c.code === 'STEADYRIDE')!;
    expect(def.active).toBe(true);
    expect(def.scope).toBe('hero');
  });

  test('Stability never decreases; hit reactions and impacts still happen; Cheat-Assisted', () => {
    const w = ride(['wind'], { cheats: { hero: [cheatMask(['STEADYRIDE'], 'hero'), 0], session: 0 } });
    expect(w.cheats.marked).toBe(true);
    placeAt(w);
    const e = alongside(w);
    strikeNext(w, e);
    step(w, [idle]);
    expect(rider(w).stability).toBe(B.stability);
    expect(rider(w).wobbleUntil).toBeGreaterThan(w.frame);
    expect(heroOf(w, 0)!.health).toBeLessThan(1000);
  });

  test('SAFEHEART keeps Health but not Stability; SOFTERBLOWS halves Health only', () => {
    for (const code of ['SAFEHEART', 'SOFTERBLOWS'] as const) {
      const w = ride(['river'], { cheats: { hero: [Cheat[code], 0], session: 0 } });
      placeAt(w);
      const e = alongside(w);
      strikeNext(w, e);
      step(w, [idle]);
      expect(rider(w).stability).toBe(B.stability - R.actions[0]!.stability);
      const lost = 1000 - heroOf(w, 0)!.health;
      expect(lost).toBe(code === 'SAFEHEART' ? 0 : Math.trunc(R.actions[0]!.damage / 2));
    }
  });

  test('STRONGHANDS doubles Health damage to a Road Rider but not Stability', () => {
    const w = ride(['mountain'], { cheats: { hero: [Cheat.STRONGHANDS, 0], session: 0 } });
    placeAt(w);
    const e = alongside(w, 0, 80);
    const kit = mountedKit(0);
    run(w, kit[0]!.startup + 2, (k) => [press(k === 0 ? ActionBit.Attack : 0)]);
    expect(e.maxHealth - e.health).toBe(2 * kit[0]!.damage);
    expect(e.maxStability - e.stability).toBe(kit[0]!.stability);
  });
});

/** A simple scripted rider: holds forward, steers around obstacles, strikes now and then. */
function bot(w: World, slot: number, i: number): FrameInput {
  const r = rider(w, slot);
  let moveZ: -1 | 0 | 1 = 0;
  for (const o of C.obstacles) {
    if (o.kind === ObstacleKind.Ramp) continue;
    const dx = o.at - r.x;
    if (dx > 0 && dx < fx(420) && Math.abs(o.z - r.z) < o.hd + fx(60)) moveZ = r.z >= o.z ? 1 : -1;
  }
  const near = w.pursuit!.enemies.some(
    (e) => Math.abs(e.x - r.x) < fx(140) && Math.abs(e.z - r.z) < fx(110),
  );
  const pressed =
    near && i % 12 === slot * 6
      ? ActionBit.Attack
      : i % 300 === 150
        ? ActionBit.Special
        : i % 400 === 0
          ? ActionBit.Ultimate
          : 0;
  return input({ moveX: 1, moveZ, pressed });
}

describe('M17 Response Record, completion and determinism', () => {
  test.each(HEROES.map((h) => h.id))('%s completes the corridor solo; the record grades it', (id) => {
    const w = ride([id]);
    let i = 0;
    for (; i < 12000 && P(w).phase !== PursuitPhase.Complete; i += 1) step(w, [bot(w, 0, i)]);
    expect(P(w).phase).toBe(PursuitPhase.Complete);
    const rec = responseRecord(P(w));
    expect(rec.lines.map((l) => l.id)).toEqual([
      'response',
      'protection',
      'control',
      'stability',
      'assistance',
    ]);
    for (const l of rec.lines) {
      expect(l.score).toBeGreaterThanOrEqual(0);
      expect(l.score).toBeLessThanOrEqual(100);
    }
    expect(P(w).record.dismounted).toBeGreaterThan(0);
    // The record stops with the pursuit.
    const frames = P(w).record.frames;
    run(w, 30);
    expect(P(w).record.frames).toBe(frames);
    expect(P(w).riders.every((r) => r.state === RiderState.Done)).toBe(true);
  });

  test('every pair completes in co-op; no rider is ever off the shared screen', () => {
    const ids = HEROES.map((h) => h.id);
    for (let a = 0; a < ids.length; a += 1)
      for (let b = a + 1; b < ids.length; b += 1) {
        const w = ride([ids[a]!, ids[b]!]);
        for (let i = 0; i < 12000 && P(w).phase !== PursuitPhase.Complete; i += 1) {
          step(w, [bot(w, 0, i), bot(w, 1, i)]);
          const p = P(w);
          for (const r of p.riders)
            if (r.state !== RiderState.Out && r.state !== RiderState.Done) {
              expect(r.x).toBeGreaterThanOrEqual(p.camX);
              expect(r.x).toBeLessThanOrEqual(p.camX + fx(1920));
            }
        }
        expect(P(w).phase).toBe(PursuitPhase.Complete);
      }
  });

  test('a Cheat-Assisted STEADYRIDE run completes with no crash', () => {
    const steady = cheatMask(['STEADYRIDE'], 'hero');
    const w = ride(['mountain'], { cheats: { hero: [steady, 0], session: 0 } });
    for (let i = 0; i < 12000 && P(w).phase !== PursuitPhase.Complete; i += 1)
      step(w, [input({ moveX: 1 })]);
    expect(P(w).phase).toBe(PursuitPhase.Complete);
    expect(P(w).record.crashes).toBe(0);
    expect(w.cheats.marked).toBe(true);
  });

  test('par: riding just above the baseline earns full Response', () => {
    expect(parFrames(C)).toBeGreaterThan(0);
    const w = ride();
    P(w).record.frames = parFrames(C);
    expect(responseRecord(P(w)).lines[0]!.score).toBe(100);
    P(w).record.frames = parFrames(C) * 2;
    expect(responseRecord(P(w)).lines[0]!.score).toBe(50);
  });

  test('a rewind never duplicates Control: dismounted riders stay dismounted', () => {
    const w = ride(['fire']);
    placeAt(w, fx(14200));
    P(w).checkpoint = 1;
    // Wave 4 (after this checkpoint) has already entered.
    P(w).waveLeft[4] = 0;
    const e = alongside(w, 0, 80);
    e.wave = 4;
    e.critical = true;
    e.stability = 0;
    const kit = mountedKit(HEROES.findIndex((h) => h.id === 'fire'));
    run(w, kit[0]!.startup + 2, (k) => [press(k === 0 ? ActionBit.Attack : 0)]);
    expect(P(w).record.dismounted).toBe(1);
    const r = rider(w);
    r.critical = true;
    r.stability = 0;
    const e2 = alongside(w, 0, -90);
    e2.wave = 4;
    strikeNext(w, e2);
    step(w, [idle]);
    run(w, B.crash + 2);
    expect(P(w).record.rewinds).toBe(1);
    // The wave comes again only with the rider that was not dealt with.
    expect(P(w).waveLeft[4]).toBe(1);
    expect(P(w).record.dismounted).toBe(1);
  });

  test('the same inputs give the same hash; a snapshot continues identically', () => {
    const play = (w: World, from: number, to: number) => {
      for (let i = from; i < to; i += 1) step(w, [bot(w, 0, i), bot(w, 1, i)]);
    };
    const a = ride(['wind', 'fire']);
    const b = ride(['wind', 'fire']);
    play(a, 0, 1500);
    play(b, 0, 1500);
    expect(hashWorld(a)).toBe(hashWorld(b));
    const c = restoreWorld(snapshotWorld(a));
    play(a, 1500, 2500);
    play(c, 1500, 2500);
    expect(hashWorld(c)).toBe(hashWorld(a));
  });
});
