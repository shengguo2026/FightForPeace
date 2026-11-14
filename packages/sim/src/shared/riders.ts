/**
 * M24 mounted fighters in on-foot arenas (E6): a rider waits at an arena edge, marks a lane
 * (the warning), then makes a pass across the arena along it. Hits and tagged impacts cost
 * Stability instead of Health; at zero the rider dismounts safely into a protected recovery
 * and fights on foot with its kit. The mount leaves the scene and is never harmed.
 */
import { fx } from '../math/fixed';
import { BODY_HALF_W } from '../movement/profile';
import { type Fighter, MoveState, type World } from '../world/types';
import type { ActionDef, MountProfileDef } from '../combat/types';
import { enter } from '../combat/reactions';
import { hazardStrike } from '../combat/environment';
import { profileOf } from '../enemies/data';
import { PassPhase, SharedEvent, extOf, sharedLog } from './state';

/** Down frames of the safe dismount (then the ordinary get-up). */
export const DISMOUNT_DOWN = 50;
/** How far inside the arena edge a rider waits. */
const EDGE = fx(40);

/** Puts a freshly spawned enemy on its mount, waiting at the nearer edge. */
export function mountRider(world: World, f: Fighter, m: MountProfileDef): void {
  const e = extOf(world, f);
  const left = f.x - world.bounds.minX <= world.bounds.maxX - f.x;
  e.rider = {
    stability: m.stability,
    max: m.stability,
    phase: PassPhase.Rest,
    frame: 0,
    lane: f.z,
    dir: left ? 1 : -1,
    hitIds: [],
  };
  f.x = left ? world.bounds.minX + EDGE : world.bounds.maxX - EDGE;
  f.facing = left ? 1 : -1;
}

/** Still mounted. */
export function mounted(f: Fighter): boolean {
  const r = f.ext?.rider;
  return !!r && r.phase !== PassPhase.Dismounted;
}

/** Ever had a mount and has left it (boss phase condition 'dismount'). */
export function dismounted(f: Fighter): boolean {
  return f.ext?.rider?.phase === PassPhase.Dismounted;
}

/** The hero the rider lines its lane up with: nearest standing hero by id order. */
function laneTarget(world: World, f: Fighter): Fighter | undefined {
  let best: Fighter | undefined;
  let bestD = 0;
  for (const h of world.bodies) {
    if (h.team !== 'hero' || h.ko) continue;
    const d = Math.abs(h.x - f.x) + Math.abs(h.z - f.z);
    if (!best || d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

/**
 * One frame of a mounted enemy (instead of its on-foot AI). Returns true while it rides.
 * Rest at an edge, Warn (the lane is marked), Pass (it crosses the arena), turn, repeat.
 */
export function stepRider(world: World, f: Fighter): boolean {
  const r = f.ext?.rider;
  const m = profileOf(f)?.mount;
  if (!r || !m || r.phase === PassPhase.Dismounted) return false;
  // Reactions from a dismount strike play out normally; a mounted rider is never stunned.
  f.vx = 0;
  f.vz = 0;
  if (f.state !== MoveState.Idle && f.state !== MoveState.Walk) enter(f, MoveState.Idle, 0);
  r.frame += 1;
  if (r.phase === PassPhase.Rest) {
    if (r.frame >= m.rest) {
      const t = laneTarget(world, f);
      r.lane = Math.max(world.bounds.minZ, Math.min(world.bounds.maxZ, t ? t.z : f.z));
      f.z = r.lane;
      r.phase = PassPhase.Warn;
      r.frame = 0;
      r.hitIds = [];
      sharedLog(world, SharedEvent.PassWarn, f.id, r.lane);
    }
    return true;
  }
  if (r.phase === PassPhase.Warn) {
    if (r.frame >= m.warn) {
      r.phase = PassPhase.Pass;
      r.frame = 0;
    }
    return true;
  }
  // Pass: across the arena at the mount's speed, then rest at the far edge, turned.
  f.facing = r.dir > 0 ? 1 : -1;
  f.state = MoveState.Walk;
  const end = r.dir > 0 ? world.bounds.maxX - EDGE : world.bounds.minX + EDGE;
  f.x += r.dir * m.speed;
  if ((r.dir > 0 && f.x >= end) || (r.dir < 0 && f.x <= end)) {
    f.x = end;
    r.dir = -r.dir;
    r.phase = PassPhase.Rest;
    r.frame = 0;
    f.state = MoveState.Idle;
  }
  return true;
}

/** A pass strikes each hero in the marked lane once (hazard rules: guard blocks). */
export function riderHits(world: World): void {
  for (const f of world.bodies) {
    const r = f.ext?.rider;
    if (!r || r.phase !== PassPhase.Pass) continue;
    const m = profileOf(f)?.mount;
    if (!m) continue;
    for (const h of world.bodies) {
      if (h.team !== 'hero' || h.ko || r.hitIds.includes(h.id)) continue;
      if (Math.abs(h.x - f.x) >= BODY_HALF_W * 2 || Math.abs(h.z - r.lane) > m.lane) continue;
      if (h.y > fx(60)) continue;
      if (hazardStrike(world, h, f.x, f.z, m.damage, f.id)) {
        r.hitIds.push(h.id);
        sharedLog(world, SharedEvent.PassHit, f.id, h.id);
      }
    }
  }
}

/** A strike on a mounted rider: Stability pays its share of the damage; zero dismounts. */
export function riderStruck(world: World, att: Fighter, a: ActionDef, t: Fighter): boolean {
  const r = t.ext?.rider;
  const m = profileOf(t)?.mount;
  if (!r || !m) return false;
  const cost = Math.max(1, Math.trunc((Math.max(1, a.damage) * m.share) / 100));
  r.stability = Math.max(0, r.stability - cost);
  if (r.stability > 0) return true;
  dismount(world, t, att.x);
  return true;
}

/** An environmental impact on a rider (a mover, a blast): Stability pays all of it. */
export function riderImpact(world: World, t: Fighter, damage: number, fromX: number): void {
  const r = t.ext?.rider;
  if (!r || r.phase === PassPhase.Dismounted) return;
  r.stability = Math.max(0, r.stability - Math.max(1, damage));
  if (r.stability === 0) dismount(world, t, fromX);
}

/** The safe dismount: knocked down with protected recovery; it fights on foot afterwards. */
export function dismount(world: World, t: Fighter, fromX: number): void {
  const r = t.ext?.rider;
  if (!r || r.phase === PassPhase.Dismounted) return;
  r.phase = PassPhase.Dismounted;
  r.frame = 0;
  t.action = -1;
  t.attackKind = 0;
  t.vx = 0;
  t.vz = 0;
  t.facing = fromX >= t.x ? 1 : -1;
  enter(t, MoveState.Down, DISMOUNT_DOWN);
  t.protectedRecovery = true;
  sharedLog(world, SharedEvent.Dismount, t.id);
}
