import { fx } from '../math/fixed';
import { type Fighter, MoveState, Threat, Verdict, type World } from '../world/types';
import type { ActionDef } from '../combat/types';
import { routeCodeOf } from '../combat/roster';
import { difficultyOf, livingHeroes, profileOf } from './data';
import { isBoss } from './boss';

/**
 * Shared Threat Budget with Tactical Roles (F&D §8, spec §12.2, Appendix D.4–D.5). Every
 * offensive action reserves its authored threat cost on commitment and releases it when
 * the action recovers, is interrupted or cancelled. Positioning, circling and weapon
 * pursuit cost nothing. Both the global budget and the per-hero pressure cap must pass,
 * plus the concurrency limits. Decisions use simulation state only.
 */

/** Combat-safe margin inside the visibility zone. */
export const SAFE_MARGIN = fx(80);
/** Width of the combat visibility zone (the simulation's view, not the browser's). */
export const VIEW_WIDTH = fx(1920);

/** The kind bits a commitment of action `a` carries. */
export function threatFlags(a: ActionDef, boss: boolean): number {
  const k = a.reaction.kind;
  let flags = 0;
  if (a.category === 'grab' || k === 'launch' || k === 'knockdown' || k === 'trip')
    flags |= Threat.HardCC;
  if (a.projectile || a.category === 'weaponThrow') flags |= Threat.Projectile;
  if (a.tags.includes('unblockable')) flags |= Threat.Unblockable;
  if (boss) flags |= Threat.Boss;
  return flags;
}

/** Is this fighter holding a commitment right now (its action, hold or group telegraph)? */
export function committed(f: Fighter): boolean {
  return f.threat > 0;
}

export interface Usage {
  total: number;
  /** Total reserved by enemies other than the boss. */
  supports: number;
  attackers: number;
  hardCC: number;
  unblockable: number;
  projectiles: number;
  group: boolean;
  /** Pressure per hero id. */
  pressure: Map<number, number>;
}

/** Sums the current reservations (enemies in ascending id order). */
export function usage(world: World): Usage {
  const u: Usage = {
    total: 0,
    supports: 0,
    attackers: 0,
    hardCC: 0,
    unblockable: 0,
    projectiles: 0,
    group: false,
    pressure: new Map(),
  };
  for (const e of world.bodies) {
    if (e.team !== 'enemy' || e.threat <= 0) continue;
    u.total += e.threat;
    if (!(e.threatFlags & Threat.Boss)) u.supports += e.threat;
    u.attackers += 1;
    if (e.threatFlags & Threat.HardCC) u.hardCC += 1;
    if (e.threatFlags & Threat.Unblockable) u.unblockable += 1;
    if (e.threatFlags & Threat.Projectile) u.projectiles += 1;
    if (e.threatFlags & Threat.Group) u.group = true;
    u.pressure.set(e.threatTarget, (u.pressure.get(e.threatTarget) ?? 0) + e.threat);
  }
  // A projectile in flight still occupies the projectile limit (harmless scenery does not).
  for (const p of world.projectiles) {
    const o = world.bodies.find((b) => b.id === p.owner);
    if (o?.team === 'enemy' && o.threat === 0) u.projectiles += 1;
  }
  return u;
}

/** Co-op column of the difficulty tables when two heroes are in the fight. */
export function coopIndex(world: World): 0 | 1 {
  return livingHeroes(world).length >= 2 ? 1 : 0;
}

export function budgetOf(world: World): number {
  return difficultyOf(world).budget[coopIndex(world)];
}

/** Is this enemy inside the combat-safe portion of the visibility zone? */
export function visible(world: World, f: Fighter): boolean {
  const enc = world.encounter;
  if (!enc) return true;
  return f.x >= enc.viewMin + SAFE_MARGIN && f.x <= enc.viewMax - SAFE_MARGIN;
}

/** Is this enemy anywhere inside the visibility zone (its body is on screen)? */
export function onScreen(world: World, f: Fighter): boolean {
  const enc = world.encounter;
  if (!enc) return true;
  return f.x >= enc.viewMin && f.x <= enc.viewMax;
}

/**
 * May enemy `e` commit `cost` threat with action `a` on hero `target`? Returns a Verdict
 * (Ok = yes). `extra` is the partner share of a group attack reserved together.
 */
export function judge(
  world: World,
  e: Fighter,
  a: ActionDef,
  cost: number,
  target: number,
  extra = 0,
): number {
  const d = difficultyOf(world);
  const co = coopIndex(world);
  const u = usage(world);
  const flags = threatFlags(a, isBoss(world, e));
  const total = cost + extra;
  if (!visible(world, e) && !a.tags.includes('offscreenCapable')) return Verdict.Hidden;
  if (u.group && extra === 0 && cost >= 26) return Verdict.Group;
  if (u.total + total > d.budget[co]) return Verdict.Budget;
  const boss = world.encounter?.boss;
  if (boss && !isBoss(world, e)) {
    const prof = profileOf(world.bodies.find((b) => b.id === boss.id) ?? e)?.boss;
    const share = prof?.share ?? 0;
    if (u.supports + total > d.budget[co] - share) return Verdict.BossShare;
  }
  if ((u.pressure.get(target) ?? 0) + total > d.cap) return Verdict.Cap;
  if (u.attackers + (extra > 0 ? 2 : 1) > d.attackers[co]) return Verdict.Attackers;
  if (flags & Threat.Projectile && u.projectiles + 1 > d.projectiles[co])
    return Verdict.Projectiles;
  if (flags & Threat.HardCC && u.hardCC + 1 > d.hardCC) return Verdict.HardCC;
  if (flags & Threat.Unblockable && u.unblockable > 0) return Verdict.Unblockable;
  return Verdict.Ok;
}

/** Records a director decision for the Lab. */
export function logDecision(world: World, e: Fighter, index: number, verdict: number): void {
  const enc = world.encounter;
  if (!enc) return;
  enc.log = { frame: world.frame, enemy: e.id, code: routeCodeOf(e, index), verdict };
}

/** Reserve: the enemy commits `cost` on `target`. */
export function reserve(
  world: World,
  e: Fighter,
  a: ActionDef,
  cost: number,
  target: number,
): void {
  e.threat = cost;
  e.threatTarget = target;
  e.threatFlags = threatFlags(a, isBoss(world, e));
  const enc = world.encounter;
  if (enc) enc.peakCommitted = Math.max(enc.peakCommitted, usage(world).attackers);
}

/** Release: recovery ended, the action was interrupted or cancelled. */
export function release(e: Fighter): void {
  e.threat = 0;
  e.threatTarget = 0;
  e.threatFlags = 0;
  e.aiAttack = -1;
}

/** States that keep an enemy's reservation alive. */
export function holdsReservation(e: Fighter): boolean {
  if (e.groupWith !== 0) return true;
  return e.state === MoveState.Attack || e.state === MoveState.Grabbing;
}
