/**
 * M24 fighter engine: finite gear (E5), Resolve-limited rivals and noncombatants (E7),
 * feints and disguised entry (E8), and the heat of heavy weapons (E9, cooling).
 */
import { fx } from '../math/fixed';
import { type Fighter, MoveState, type World } from '../world/types';
import { type ActionDef, GearBenefit } from '../combat/types';
import { enter } from '../combat/reactions';
import { WEAPONS } from '../combat/armory';
import { profileOf } from '../enemies/data';
import { PassPhase, SharedEvent, extOf, sharedLog } from './state';
import { dismounted, mountRider, riderStruck } from './riders';

/** Push of a gear block (fixed point per frame). */
const GEAR_PUSH = fx(4);
/** Blockstun of a gear block when the action names none. */
const GEAR_BLOCKSTUN = 12;

/** Sets up the M24 state of a freshly spawned enemy (only if its profile uses a feature). */
export function initShared(world: World, f: Fighter): void {
  const prof = profileOf(f);
  if (!prof) return;
  const uses =
    prof.gear.length > 0 ||
    prof.mount !== null ||
    prof.rival !== null ||
    prof.noncombatant ||
    prof.entry === 'disguised';
  if (!uses) return;
  const e = extOf(world, f);
  e.gear = prof.gear.map((g) => g.guard);
  if (prof.entry === 'disguised') e.disguised = true;
  if (prof.mount) mountRider(world, f, prof.mount);
}

/** Never a target: noncombatants, disguised figures, and riders between passes stay targets. */
export function untargetable(f: Fighter): boolean {
  const e = f.ext;
  if (!e) return false;
  if (e.disguised || e.support) return true;
  return profileOf(f)?.noncombatant ?? false;
}

/** The fighter's gear still grants this benefit (an unbroken piece with it). */
export function gearBenefit(f: Fighter, benefit: number): boolean {
  const e = f.ext;
  if (!e || e.gear.length === 0) return false;
  const gear = profileOf(f)?.gear ?? [];
  return gear.some((g, i) => g.benefit === benefit && (e.gear[i] ?? 0) > 0);
}

/** Every gear piece of the fighter is broken (true when it has none). */
export function gearBroken(f: Fighter): boolean {
  const e = f.ext;
  return !e || e.gear.every((g) => g <= 0);
}

const UPRIGHT = new Set<number>([
  MoveState.Idle,
  MoveState.Walk,
  MoveState.Guard,
  MoveState.Attack,
  MoveState.Blockstun,
  MoveState.Recoil,
]);

/** Does this gear piece meet the incoming action? */
function meets(benefit: number, att: Fighter, a: ActionDef, t: Fighter): boolean {
  if (a.category === 'grab' || a.category === 'throw' || a.category === 'team') return false;
  if (!UPRIGHT.has(t.state)) return false;
  switch (benefit) {
    case GearBenefit.Front:
      return (att.x - t.x) * t.facing > 0;
    case GearBenefit.AntiAir:
      return att.y > 0 || a.category === 'aerial';
    case GearBenefit.LowResist:
      return a.category === 'low' || a.category === 'dash';
    default:
      return false;
  }
}

/**
 * Gear in the way of a strike takes it instead: the piece pays the hit's damage from its
 * finite Guard and the bearer blocks; the hit that empties it breaks the piece, which
 * staggers the bearer once and removes only that benefit. Returns true when gear took it.
 */
export function gearBlocks(world: World, att: Fighter, a: ActionDef, t: Fighter): boolean {
  const e = t.ext;
  if (!e || e.gear.length === 0) return false;
  const gear = profileOf(t)?.gear ?? [];
  for (let i = 0; i < gear.length; i += 1) {
    const g = gear[i]!;
    if ((e.gear[i] ?? 0) <= 0 || !meets(g.benefit, att, a, t)) continue;
    e.gear[i] = Math.max(0, e.gear[i]! - Math.max(1, a.damage));
    const dir = t.x >= att.x ? 1 : -1;
    if (e.gear[i] === 0) {
      t.action = -1;
      t.attackKind = 0;
      enter(t, MoveState.Hitstun, g.stagger);
      t.vx = dir * GEAR_PUSH;
      sharedLog(world, SharedEvent.GearBreak, t.id, i);
    } else {
      if (t.state !== MoveState.Attack)
        enter(t, MoveState.Blockstun, a.blockstun || GEAR_BLOCKSTUN);
      t.vx = dir * GEAR_PUSH;
      sharedLog(world, SharedEvent.GearBlock, t.id, i);
    }
    return true;
  }
  return false;
}

/**
 * A strike on a fighter with M24 state, before its ordinary defense: a mounted rider pays
 * Stability, gear may take the hit. Returns true when the hit is fully handled here.
 */
export function sharedIntercept(world: World, att: Fighter, a: ActionDef, t: Fighter): boolean {
  const e = t.ext;
  if (!e || att.team === t.team) return false;
  if (e.rider && e.rider.phase !== PassPhase.Dismounted) return riderStruck(world, att, a, t);
  return gearBlocks(world, att, a, t);
}

/**
 * Health loss on a rival never goes below its floor; reaching it arms the withdrawal.
 * Returns the damage that may be dealt.
 */
export function rivalDamage(world: World, t: Fighter, dmg: number): number {
  const rival = profileOf(t)?.rival;
  if (!rival) return dmg;
  const floor = Math.trunc((t.maxHealth * rival.floor) / 100);
  const allowed = Math.max(0, Math.min(dmg, t.health - floor));
  const e = extOf(world, t);
  if (t.health - allowed <= floor && e.floorAt === 0) {
    e.floorAt = world.frame;
    sharedLog(world, SharedEvent.RivalFloor, t.id);
  }
  return allowed;
}

/** Disguise reveals, rival withdrawals and heat cooling, once per frame. */
export function stepFighterExt(world: World): void {
  for (const f of world.bodies) {
    const e = f.ext;
    if (!e) continue;
    if (e.heat > 0 && f.item !== 0) {
      const held = world.items.find((i) => i.id === f.item);
      const heat = held ? WEAPONS[held.def]?.heat : null;
      e.heat = Math.max(0, e.heat - (heat?.cool ?? 1));
    } else if (e.heat > 0 && f.item === 0) e.heat = 0;
    if (e.heat === 0) e.heatLock = 0;
    if (e.disguised) {
      const prof = profileOf(f);
      const near = world.bodies.some(
        (h) =>
          h.team === 'hero' &&
          !h.ko &&
          prof !== null &&
          prof.revealRange > 0 &&
          Math.abs(h.x - f.x) <= prof.revealRange &&
          Math.abs(h.z - f.z) <= prof.revealRange,
      );
      if (near || (prof && world.frame - e.born >= prof.reveal)) {
        e.disguised = false;
        sharedLog(world, SharedEvent.Reveal, f.id);
      }
    }
    const rival = profileOf(f)?.rival;
    if (
      rival &&
      e.floorAt > 0 &&
      world.frame - e.floorAt >= rival.withdraw &&
      f.state !== MoveState.Flee &&
      (f.state === MoveState.Idle || f.state === MoveState.Walk || f.state === MoveState.Guard)
    ) {
      // A voluntary, protected withdrawal: it walks off and the encounter lets it go.
      f.threat = 0;
      enter(f, MoveState.Flee, 0);
      sharedLog(world, SharedEvent.Withdraw, f.id);
    }
  }
}

/**
 * Feints (every second use of an attack that has one): on commit, mark the frame where the
 * attack will stop. Returns whether this use feints.
 */
export function armFeint(world: World, f: Fighter, feintAt: number): boolean {
  if (feintAt <= 0) return false;
  const e = extOf(world, f);
  e.feints += 1;
  if (e.feints % 2 === 0) {
    e.feintAt = 0;
    return false;
  }
  e.feintAt = feintAt;
  return true;
}

/** The running attack reached its feint frame: stop it (the tell has been shown). */
export function feintNow(world: World, f: Fighter, n: number): boolean {
  const e = f.ext;
  if (!e || e.feintAt <= 0 || n < e.feintAt) return false;
  e.feintAt = 0;
  sharedLog(world, SharedEvent.Feint, f.id, f.action);
  return true;
}

/**
 * The boss's current phase must end on broken gear or a dismount that has not happened yet:
 * its Health holds at the phase floor until then (boss phase `require`).
 */
export function phaseHeld(world: World, t: Fighter): boolean {
  const b = world.encounter?.boss;
  if (!b || b.id !== t.id) return false;
  const ph = profileOf(t)?.boss?.phases[b.phase];
  if (!ph || ph.require === 'none') return false;
  if (ph.require === 'gear') return !gearBroken(t);
  return !dismounted(t);
}
