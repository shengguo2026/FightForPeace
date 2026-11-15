/**
 * M25 protected units and evidence holds (Stage 3 §6, §7.2, audit rows 6.1, 6.3, 6.4):
 * a hero holds Interact next to a captive to free it; it cheers, then follows its short
 * authored route to shelter, waiting at a hand-off point while an enemy is inside its zone,
 * and is Safe at the last waypoint, where its hostile-action count locks. Protected people
 * are not fighters, so nothing can damage them. A hero holds Interact on an evidence case
 * to collect it, again to seal it (sealed cases lock), or to recover it once disturbed.
 */
import { fx } from '../math/fixed';
import { ActionBit } from '../input/bits';
import { type Fighter, type FrameInput, MoveState, type World } from '../world/types';
import { hostileInZone } from './channels';
import {
  CaseState,
  HoldKind,
  ObjEvent,
  UnitPhase,
  idleHold,
  objectiveDefs,
  objectiveLog,
} from './state';

/** A hero this close (each axis) to a unit or case can hold Interact on it. */
export const OBJECTIVE_REACH_X = fx(90);
export const OBJECTIVE_REACH_Z = fx(50);

interface HoldTarget {
  kind: number;
  target: number;
  need: number;
  x: number;
}

/** Every hold the hero could start now, nearest first. */
function holdTargets(world: World, f: Fighter): HoldTarget[] {
  const o = world.objectives;
  const defs = objectiveDefs(world);
  if (!o || !defs) return [];
  const out: (HoldTarget & { d: number })[] = [];
  const add = (kind: number, target: number, need: number, x: number, z: number) => {
    const dx = Math.abs(x - f.x);
    const dz = Math.abs(z - f.z);
    if (dx <= OBJECTIVE_REACH_X && dz <= OBJECTIVE_REACH_Z)
      out.push({ kind, target, need, x, d: dx + dz });
  };
  o.units.forEach((u, i) => {
    if (u.phase === UnitPhase.Captive) add(HoldKind.Free, i, defs.units[i]!.free, u.x, u.z);
  });
  o.cases.forEach((c, i) => {
    const d = defs.cases[i]!;
    const [x, z] = [fx(d.x), fx(d.z)];
    if (c.state === CaseState.Present) add(HoldKind.Collect, i, d.collect, x, z);
    else if (c.state === CaseState.Collected || c.state === CaseState.Recovered)
      add(HoldKind.Seal, i, d.seal, x, z);
    else if (c.state === CaseState.Disturbed) add(HoldKind.Recover, i, d.recover, x, z);
  });
  out.sort((a, b) => a.d - b.d);
  return out;
}

/** The hold a hero next to a unit or case would start (HUD prompt), or HoldKind.None. */
export function objectiveHint(world: World, f: Fighter): number {
  if (f.ko || f.team !== 'hero') return HoldKind.None;
  return holdTargets(world, f)[0]?.kind ?? HoldKind.None;
}

/** Neutral Interact next to a captive or a case starts holding. False: nothing in reach. */
export function objectiveInteract(world: World, f: Fighter): boolean {
  const o = world.objectives;
  if (!o || f.team !== 'hero' || f.ko) return false;
  const t = holdTargets(world, f)[0];
  if (!t) return false;
  o.hold[f.slot] = { kind: t.kind, target: t.target, progress: 0, need: t.need };
  f.state = MoveState.Channel;
  f.stateFrame = 0;
  f.vx = 0;
  f.vz = 0;
  f.action = -1;
  f.attackKind = 0;
  if (t.x !== f.x) f.facing = t.x > f.x ? 1 : -1;
  return true;
}

/** Is this hero holding Interact on an objective? */
export function objectiveChanneling(world: World, f: Fighter): boolean {
  return (world.objectives?.hold[f.slot]?.kind ?? HoldKind.None) !== HoldKind.None;
}

/**
 * One frame of holding: Interact must stay held and the target must stay valid and in
 * reach; a hit ends it by changing the hero's state.
 */
export function stepObjectiveHold(world: World, f: Fighter, input: FrameInput): void {
  const o = world.objectives!;
  const h = o.hold[f.slot]!;
  f.stateFrame += 1;
  const still =
    (input.held & ActionBit.Interact) !== 0 &&
    holdTargets(world, f).some((t) => t.kind === h.kind && t.target === h.target);
  if (!still) {
    o.hold[f.slot] = idleHold();
    f.state = MoveState.Idle;
    f.stateFrame = 0;
    return;
  }
  h.progress += 1;
  if (h.progress < h.need) return;
  finishHold(world, h.kind, h.target, f);
  o.hold[f.slot] = idleHold();
  f.state = MoveState.Idle;
  f.stateFrame = 0;
}

function finishHold(world: World, kind: number, target: number, f: Fighter): void {
  const o = world.objectives!;
  if (kind === HoldKind.Free) {
    const u = o.units[target]!;
    u.phase = UnitPhase.Freed;
    u.since = world.frame;
    objectiveLog(world, ObjEvent.Freed, target, f.id);
    return;
  }
  const c = o.cases[target]!;
  if (kind === HoldKind.Collect) {
    c.state = CaseState.Collected;
    objectiveLog(world, ObjEvent.Collected, target, f.id);
  } else if (kind === HoldKind.Seal) {
    c.state = CaseState.Sealed;
    objectiveLog(world, ObjEvent.Sealed, target, f.id);
  } else if (kind === HoldKind.Recover) {
    c.state = CaseState.Recovered;
    objectiveLog(world, ObjEvent.Recovered, target, f.id);
  }
}

/** Moves `v` towards `to` by at most `step` (fixed point). */
function approach(v: number, to: number, step: number): number {
  return v < to ? Math.min(to, v + step) : Math.max(to, v - step);
}

/** Once per frame: freed units cheer, then walk their route; the last waypoint is safety. */
export function stepUnits(world: World): void {
  const o = world.objectives;
  const defs = objectiveDefs(world);
  if (!o || !defs) return;
  o.units.forEach((u, i) => {
    const d = defs.units[i]!;
    switch (u.phase) {
      case UnitPhase.Freed:
        if (world.frame - u.since < d.cheer) return;
        u.phase = UnitPhase.Moving;
        u.since = world.frame;
        objectiveLog(world, ObjEvent.Moving, i);
        return;
      case UnitPhase.Waiting:
        if (hostileInZone(world, i)) return;
        next(world, i);
        return;
      case UnitPhase.Moving: {
        const p = d.route[u.leg]!;
        const step = fx(d.speed);
        u.x = approach(u.x, fx(p.x), step);
        u.z = approach(u.z, fx(p.z), step);
        if (u.x !== fx(p.x) || u.z !== fx(p.z)) return;
        if (p.wait && hostileInZone(world, i)) {
          u.phase = UnitPhase.Waiting;
          u.since = world.frame;
          objectiveLog(world, ObjEvent.Waiting, i);
          return;
        }
        next(world, i);
        return;
      }
      default:
        return;
    }
  });
}

/** On to the next waypoint, or safe (and locked) after the last one. */
function next(world: World, i: number): void {
  const o = world.objectives!;
  const d = objectiveDefs(world)!.units[i]!;
  const u = o.units[i]!;
  u.leg += 1;
  u.since = world.frame;
  if (u.leg < d.route.length) {
    u.phase = UnitPhase.Moving;
    return;
  }
  u.leg = d.route.length - 1;
  u.phase = UnitPhase.Safe;
  u.locked = true;
  objectiveLog(world, ObjEvent.Safe, i, u.count);
}
