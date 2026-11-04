import { fx } from '../math/fixed';
import { directed } from '../movement/controller';
import { ON_FOOT } from '../movement/profile';
import {
  AiMode,
  type Axis,
  DefPlan,
  type Fighter,
  type FrameInput,
  ItemState,
  MoveState,
  Threat,
  Verdict,
  type World,
} from '../world/types';
import type { ActionDef, AiAttackDef, EnemyProfile } from '../combat/types';
import { applyActionMovement, startAction } from '../combat/actions';
import { kitOf, totalFrames } from '../combat/roster';
import { stepEnemyHold } from '../combat/grabs';
import { counterMissed, stepBreaker, tryBreaker } from '../combat/defense';
import { REACTION, NO_FRAME, enter } from '../combat/reactions';
import { HURT_HALF_D, HURT_HALF_W, runningAction, strikes } from '../combat/hits';
import { reach } from '../combat/trainer';
import { WEAPONS } from '../combat/armory';
import { ITEM, heldItem } from '../combat/held';
import { pickupEligible, requestPickup, stepPickup } from '../combat/items';
import { nonCombatant } from '../combat/damage';
import { actionIndex, attacksOf, bossPhase, difficultyOf, livingHeroes, profileOf } from './data';
import {
  holdsReservation,
  judge,
  logDecision,
  release,
  reserve,
  threatFlags,
  visible,
} from './director';
import { updateTarget, validTarget } from './targeting';
import { isBoss, staggered } from './boss';
import { DEFENSE } from '../combat/defense';

const NO_INPUT: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

/** Candidate AI constants (Combat Lab). */
export const AI = {
  /** Close range in which a hero counts as threatening (anticipatory guard), px. */
  nearX: fx(230),
  nearZ: fx(60),
  /** Extra reach (beyond the action's box) in which an incoming strike is judged. */
  watchSlack: fx(40),
  /** Hits a trapped breaker-capable enemy takes before it breaks. */
  breakerAfter: 3,
  /** Weapon search radius for opportunistic enemies. */
  weaponRadius: fx(260),
  /** A melee weapon's standing core actions: threat and cooldown for the AI. */
  armedThreat: 20,
  armedCooldown: 80,
  throwThreat: 18,
  throwCooldown: 150,
  /** A defeated body stays this long before it is cleared. */
  defeatedFrames: 150,
  /** Leap height of `leap` actions. */
  leapHeight: fx(110),
  /** Boss: attacks between visits to its objective device. */
  objectiveEvery: 2,
  /** Ring strafing: depth offset per enemy id and the strafe period. */
  strafeDepth: fx(70),
  strafePeriod: 180,
  /** Slots of per-attack cooldowns kept per fighter. */
  slots: 8,
} as const;

function sign(v: number): Axis {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** Deterministic rate: true on `of`×scale out of every `every`×100 chances. */
function rate(acc: { v: number }, every: number, of: number, scale: number): boolean {
  if (of <= 0 || scale <= 0) return false;
  acc.v += of * scale;
  if (acc.v < every * 100) return false;
  acc.v -= every * 100;
  return true;
}

function walk(f: Fighter, prof: EnemyProfile, sx: Axis, sz: Axis): void {
  [f.vx, f.vz] = directed(sx, sz, prof.walkX, prof.walkZ, ON_FOOT.diagonal);
  f.state = f.vx !== 0 || f.vz !== 0 ? MoveState.Walk : MoveState.Idle;
  f.x += f.vx;
  f.z += f.vz;
}

/** Walks towards (x, z), stopping inside the given tolerances. Returns true when there. */
function walkTo(
  f: Fighter,
  prof: EnemyProfile,
  x: number,
  z: number,
  tolX = fx(12),
  tolZ = fx(8),
): boolean {
  const dx = x - f.x;
  const dz = z - f.z;
  const sx: Axis = Math.abs(dx) > tolX ? sign(dx) : 0;
  const sz: Axis = Math.abs(dz) > tolZ ? sign(dz) : 0;
  walk(f, prof, sx, sz);
  return sx === 0 && sz === 0;
}

function face(f: Fighter, x: number): void {
  if (x !== f.x) f.facing = x > f.x ? 1 : -1;
}

/** Attack slots the AI may use now: its profile (or phase) list, adapted to a held weapon. */
export function attackList(world: World, f: Fighter): readonly AiAttackDef[] {
  const base = attacksOf(world, f);
  const item = heldItem(world, f);
  if (!item || f.wkit < 0) return base;
  const w = WEAPONS[f.wkit]!;
  if (isBoss(world, f)) return base;
  const throwId = w.actions.find((a) => a.category === 'weaponThrow')?.id ?? '';
  const throwAttack: AiAttackDef = {
    action: throwId,
    threat: AI.throwThreat,
    cooldown: AI.throwCooldown,
    minDifficulty: 0,
    range: fx(900),
  };
  if (!w.melee) return [...base, throwAttack];
  const core = w.actions
    .filter((a) => a.category === 'standing' && a.context !== 'chain')
    .map((a): AiAttackDef => ({
      action: a.id,
      threat: AI.armedThreat,
      cooldown: AI.armedCooldown,
      minDifficulty: 0,
      range: 0,
    }));
  return [...core, throwAttack];
}

/** Is the target in a state an attack could connect with? */
function targetBusy(world: World, t: Fighter, a: ActionDef): boolean {
  return (
    t.protectedRecovery ||
    t.state === MoveState.Down ||
    t.state === MoveState.Restrained ||
    t.state === MoveState.Grabbed ||
    t.state === MoveState.Defeated ||
    (a.category === 'grab' && world.frame < t.regrabUntil)
  );
}

function rangeOf(a: ActionDef, at: AiAttackDef): { x: number; z: number } {
  const r = reach(a);
  return at.range > 0 ? { x: at.range, z: a.hitbox.depth + HURT_HALF_D + fx(10) } : r;
}

/**
 * One frame of an arena enemy that is not in a reaction (stepReaction returned false):
 * its committed action, its defense states, morale, defense planning, targeting, then an
 * attack request to the director or tactical movement for its role.
 */
export function stepEnemy(world: World, f: Fighter): void {
  const prof = profileOf(f);
  if (!prof) return;
  if (f.threat > 0 && !holdsReservation(f)) release(f);
  if (f.readyAt.length < AI.slots)
    f.readyAt = [...f.readyAt, ...new Array<number>(AI.slots - f.readyAt.length).fill(0)];
  switch (f.state) {
    case MoveState.Grabbing:
      stepEnemyHold(world, f);
      return;
    case MoveState.Attack:
      stepAiAction(world, f);
      return;
    case MoveState.Pickup:
      if (stepPickup(f)) return;
      break;
    case MoveState.Blockstun:
      f.stateFrame += 1;
      f.x += f.vx;
      f.vx -= Math.trunc(f.vx / 8);
      if (f.stateFrame < f.stun) return;
      f.vx = 0;
      enter(f, f.defense > 0 && world.frame < f.guardUntil ? MoveState.Guard : MoveState.Idle, 0);
      return;
    case MoveState.GuardCrush:
    case MoveState.CounterMiss:
      f.stateFrame += 1;
      if (f.stateFrame < f.stun) return;
      enter(f, MoveState.Idle, 0);
      return;
    case MoveState.Counter:
      f.stateFrame += 1;
      if (world.frame - f.counterFrame < DEFENSE.counterWindow) return;
      counterMissed(world, f);
      return;
    case MoveState.Breaker:
      stepBreaker(f);
      return;
    case MoveState.Flee:
      stepFlee(world, f, prof);
      return;
    case MoveState.Surrender:
    case MoveState.Defeated:
    case MoveState.PhaseShift:
      f.stateFrame += 1;
      f.vx = 0;
      f.vz = 0;
      return;
    default:
      break;
  }
  tickEnemyDefense(f);
  if (f.state === MoveState.Guard && stepGuard(world, f)) return;
  f.vx = 0;
  f.vz = 0;
  if (f.state !== MoveState.Guard) f.state = MoveState.Idle;
  if (morale(world, f, prof)) return;
  if (f.groupWith !== 0) {
    stepGroup(world, f, prof);
    return;
  }
  const target = updateTarget(world, f);
  if (planDefense(world, f, prof)) return;
  if (!target) return;
  if (f.aiMode === AiMode.Warn) {
    stepWarning(world, f, target);
    return;
  }
  if (bossObjective(world, f, prof)) return;
  if (seekWeapon(world, f, prof)) return;
  if (tryGroup(world, f, prof, target)) return;
  if (tryAttack(world, f, prof, target)) return;
  tactical(world, f, prof, target);
}

/** Passive Defense recovery for enemies (same rule as heroes). */
function tickEnemyDefense(f: Fighter): void {
  const calm = f.state === MoveState.Idle || f.state === MoveState.Walk;
  if (!calm) {
    f.defIdle = 0;
    return;
  }
  f.defIdle += 1;
  if (f.defense >= DEFENSE.floor || f.defIdle < DEFENSE.regenDelay) return;
  if ((f.defIdle - DEFENSE.regenDelay) % DEFENSE.regenEvery === 0) f.defense += 1;
}

/** Holding the guard: lowers it when the hold ends; returns true while still guarding. */
function stepGuard(world: World, f: Fighter): boolean {
  f.stateFrame += 1;
  const t = world.bodies.find((b) => b.id === f.targetId);
  if (t) {
    face(f, t.x);
    f.guardX = sign(t.x - f.x) || f.facing;
    f.guardZ = Math.abs(t.z - f.z) > fx(60) ? sign(t.z - f.z) : 0;
  }
  if (f.defense <= 0 || world.frame >= f.guardUntil) {
    enter(f, MoveState.Idle, 0);
    f.exactFrame = NO_FRAME;
    return false;
  }
  return true;
}

function raiseGuard(world: World, f: Fighter, toward: Fighter, hold: number, exact: boolean): void {
  face(f, toward.x);
  f.vx = 0;
  f.vz = 0;
  enter(f, MoveState.Guard, 0);
  f.guardX = sign(toward.x - f.x) || f.facing;
  f.guardZ = Math.abs(toward.z - f.z) > fx(60) ? sign(toward.z - f.z) : 0;
  f.guardNeutral = false;
  f.guardUntil = world.frame + hold;
  f.lastGuardFrame = world.frame;
  if (exact) f.exactFrame = world.frame;
}

/** Can this enemy use an advanced defense now (capability, phase and cooldown)? */
function capable(world: World, f: Fighter, kind: 'exact' | 'counter' | 'breaker'): boolean {
  const prof = profileOf(f);
  if (!prof || world.frame < f.advUntil) return false;
  const phase = bossPhase(world, f);
  if (kind === 'counter') return prof.defense.counter || (phase?.counter ?? false);
  if (kind === 'breaker') return prof.defense.breaker || (phase?.breaker ?? false);
  return prof.defense.exact;
}

/**
 * Defense planning from visible state with the authored perception delay: an incoming
 * strike is judged once, after it has been visible for the perception frames; a hero
 * lingering at close range may draw an anticipatory guard. Never reads inputs.
 */
function planDefense(world: World, f: Fighter, prof: EnemyProfile): boolean {
  const d = difficultyOf(world);
  const perception = d.perception + prof.perception;
  const actionable =
    f.state === MoveState.Idle || f.state === MoveState.Walk || f.state === MoveState.Guard;
  if (!actionable) return false;
  // Carry out a plan that is due.
  if (f.defPlan !== DefPlan.None && world.frame >= f.defAt) {
    const plan = f.defPlan;
    f.defPlan = DefPlan.None;
    const att = world.bodies.find((b) => b.id === f.seenId);
    if (att && runningAction(att)) {
      if (plan === DefPlan.Counter) {
        face(f, att.x);
        enter(f, MoveState.Counter, 0);
        f.counterFrame = world.frame;
        f.counterX = sign(att.x - f.x) || f.facing;
        f.counterZ = 0;
        f.advUntil = world.frame + prof.defense.cooldown;
        return true;
      }
      if (plan === DefPlan.Exact) {
        raiseGuard(world, f, att, prof.defense.guardHold, true);
        f.advUntil = world.frame + prof.defense.cooldown;
        return true;
      }
      if (plan === DefPlan.Guard) {
        raiseGuard(world, f, att, prof.defense.guardHold, false);
        return true;
      }
      if (plan === DefPlan.Evade) {
        const i = actionIndex(f, prof.defense.evade);
        if (i >= 0) {
          face(f, att.x);
          startAction(f, i);
          f.aiAttack = -1;
          return true;
        }
      }
    }
  }
  if (f.defPlan !== DefPlan.None) return f.state === MoveState.Guard;
  const scale = d.guardScale;
  const guardAcc = { v: f.guardAcc };
  const evadeAcc = { v: f.evadeAcc };
  let decided = false;
  for (const h of world.bodies) {
    if (h.team !== 'hero' || decided) continue;
    const a = runningAction(h);
    if (!a || !strikes(a)) continue;
    const dx = f.x - h.x;
    if (sign(dx) !== h.facing && dx !== 0) continue;
    const reachX = a.hitbox.x + a.hitbox.w + HURT_HALF_W + AI.watchSlack;
    const reachZ = a.hitbox.depth + HURT_HALF_D + fx(10);
    if (Math.abs(dx) > reachX || Math.abs(f.z - h.z) > reachZ) continue;
    const start = world.frame - h.stateFrame;
    if (f.seenId === h.id && f.seenStart === start) continue;
    const n = h.stateFrame + 1;
    if (n < perception) continue;
    f.seenId = h.id;
    f.seenStart = start;
    decided = true;
    const contactIn = a.startup + 1 - n;
    if (contactIn < 1) continue;
    const unblockable = a.tags.includes('unblockable');
    const counterable = a.tags.includes('counterable') && !a.tags.includes('uncounterable');
    const when = world.frame + Math.max(0, contactIn - 2);
    if (counterable && !staggered(world, f) && capable(world, f, 'counter')) {
      f.defPlan = DefPlan.Counter;
      f.defAt = when;
    } else if (!unblockable && capable(world, f, 'exact')) {
      f.defPlan = DefPlan.Exact;
      f.defAt = when;
    } else if (
      prof.defense.evade &&
      rate(evadeAcc, prof.defense.evadeEvery, prof.defense.evadeOf, 100)
    ) {
      f.defPlan = DefPlan.Evade;
      f.defAt = world.frame;
    } else if (
      !unblockable &&
      rate(guardAcc, prof.defense.guardEvery, prof.defense.guardOf, scale)
    ) {
      f.defPlan = DefPlan.Guard;
      f.defAt = world.frame;
    }
  }
  // Anticipatory guard: a hero lingering at close range for the perception frames.
  if (!decided && f.state !== MoveState.Guard && f.threat === 0) {
    const near = world.bodies.find(
      (h) =>
        h.team === 'hero' &&
        !h.ko &&
        Math.abs(h.x - f.x) <= AI.nearX &&
        Math.abs(h.z - f.z) <= AI.nearZ &&
        h.facing === (sign(f.x - h.x) || h.facing),
    );
    if (!near) f.nearSince = NO_FRAME;
    else if (f.nearSince === NO_FRAME) f.nearSince = world.frame;
    else if (world.frame - f.nearSince >= perception) {
      f.nearSince = world.frame + prof.defense.guardHold;
      const stance = prof.defense.stance;
      if (stance || rate(guardAcc, prof.defense.guardEvery, prof.defense.guardOf, scale)) {
        raiseGuard(world, f, near, prof.defense.guardHold, false);
        f.guardAcc = guardAcc.v;
        f.evadeAcc = evadeAcc.v;
        return true;
      }
    }
  }
  f.guardAcc = guardAcc.v;
  f.evadeAcc = evadeAcc.v;
  return f.state === MoveState.Guard;
}

/**
 * Enemy Combo Breaker (same gates and costs as heroes): a breaker-capable enemy that is
 * trapped in a combo, after a few hits. Never during a Stagger Break. Returns true when
 * the breaker started.
 */
export function enemyBreaker(world: World, f: Fighter): boolean {
  if (!world.encounter || !profileOf(f) || f.ko) return false;
  if (!f.ctx.open || f.ctx.breakerUsed || f.ctx.hits < AI.breakerAfter) return false;
  if (staggered(world, f) || !capable(world, f, 'breaker')) return false;
  if (f.defense < DEFENSE.breakerCost) return false;
  if (!tryBreaker(world, f)) return false;
  release(f);
  f.advUntil = world.frame + profileOf(f)!.defense.cooldown;
  return true;
}

/** Morale (Pressed Recruits): at low health it flees, or surrenders as the last one. */
function morale(world: World, f: Fighter, prof: EnemyProfile): boolean {
  if (prof.breakAt <= 0 || f.health * 100 > prof.breakAt * f.maxHealth) return false;
  const allies = world.bodies.filter(
    (e) => e.team === 'enemy' && e.id !== f.id && !e.ko && !nonCombatant(e),
  ).length;
  release(f);
  if (f.item !== 0) dropItem(world, f);
  if (allies === 0) enter(f, MoveState.Surrender, 0);
  else enter(f, MoveState.Flee, 0);
  f.vx = 0;
  f.vz = 0;
  return true;
}

function dropItem(world: World, f: Fighter): void {
  const item = heldItem(world, f);
  if (!item) return;
  item.state = ItemState.Ground;
  item.holder = 0;
  item.x = f.x;
  item.z = f.z;
  item.y = 0;
  f.item = 0;
  f.wkit = -1;
}

/** Fleeing: runs for the nearer stage edge (encounter removes it there). */
function stepFlee(world: World, f: Fighter, prof: EnemyProfile): void {
  f.stateFrame += 1;
  const left = f.x - world.bounds.minX <= world.bounds.maxX - f.x;
  const sx: Axis = left ? -1 : 1;
  [f.vx, f.vz] = directed(sx, 0, prof.walkX + fx(2), prof.walkZ, ON_FOOT.diagonal);
  f.facing = sx;
  f.x += f.vx;
}

/** One frame of an AI action (leaps follow a fixed arc); its end releases the threat. */
function stepAiAction(world: World, f: Fighter): void {
  const a = kitOf(f)?.actions[f.action];
  f.stateFrame += 1;
  const n = f.stateFrame + 1;
  if (!a || n > totalFrames(a)) {
    if (a?.tags.includes('objective')) completeObjective(world, f);
    f.state = MoveState.Idle;
    f.stateFrame = 0;
    f.action = -1;
    f.attackKind = 0;
    f.vx = 0;
    f.vz = 0;
    f.y = 0;
    release(f);
    return;
  }
  applyActionMovement(f, a, n, NO_INPUT, ON_FOOT);
  if (a.tags.includes('leap')) {
    const span = a.startup + a.active.reduce((s, x) => s + x, 0);
    const t = Math.min(n, span);
    f.y = n >= span ? 0 : Math.trunc((4 * AI.leapHeight * t * (span - t)) / (span * span));
  }
}

/** Starts attack slot `slot` (action index `index`) on `target`, reserving its threat. */
function commit(
  world: World,
  f: Fighter,
  slot: number,
  at: AiAttackDef,
  index: number,
  target: Fighter,
): void {
  const a = kitOf(f)!.actions[index]!;
  reserve(world, f, a, at.threat, target.id);
  face(f, target.x);
  startAction(f, index);
  applyActionMovement(f, a, 1, NO_INPUT, ON_FOOT);
  f.aiAttack = slot;
  f.aiStep += 1;
  f.readyAt[slot] = world.frame + at.cooldown;
  f.aiMode = AiMode.Approach;
  logDecision(world, f, index, Verdict.Ok);
}

/**
 * Picks the next ready attack (a fixed rotation) and asks the director. With permission
 * it closes to the attack's range and commits there; without it, it returns false and
 * the enemy keeps to its role's waiting position. Returns true when it attacks, warns or
 * approaches.
 */
function tryAttack(world: World, f: Fighter, prof: EnemyProfile, target: Fighter): boolean {
  if (f.threat > 0) return false;
  const list = attackList(world, f);
  const diff = world.encounter?.difficulty ?? 1;
  const n = list.length;
  for (let k = 0; k < n; k += 1) {
    const slot = (f.aiStep + k) % n;
    const at = list[slot]!;
    if (at.minDifficulty > diff || world.frame < (f.readyAt[slot % AI.slots] ?? 0)) continue;
    const index = actionIndex(f, at.action);
    if (index < 0) continue;
    const a = kitOf(f)!.actions[index]!;
    if (targetBusy(world, target, a)) continue;
    const r = rangeOf(a, at);
    const dx = target.x - f.x;
    const dz = target.z - f.z;
    const inRange = Math.abs(dx) <= r.x && Math.abs(dz) <= r.z;
    const offscreen = a.tags.includes('offscreenCapable');
    const verdict = judge(world, f, a, at.threat, target.id);
    if (verdict !== Verdict.Ok && !(verdict === Verdict.Hidden && offscreen)) {
      if (inRange) logDecision(world, f, index, verdict);
      // The first ready attack decides: no shopping for a cheaper one this frame.
      return false;
    }
    if (!inRange) {
      // Permission is available: close in (movement costs no budget).
      f.aiMode = AiMode.Approach;
      const ideal = Math.max(fx(40), r.x - fx(30));
      const tx = Math.abs(dx) > ideal ? target.x - sign(dx) * ideal : f.x;
      walkTo(f, prof, tx, target.z, fx(10), Math.max(fx(4), r.z - fx(12)));
      face(f, target.x);
      return true;
    }
    if (!visible(world, f)) {
      // An offscreenCapable attack: reserve its full cost now and show the warning.
      reserve(world, f, a, at.threat, target.id);
      f.aiAttack = slot % AI.slots;
      f.aiMode = AiMode.Warn;
      f.warnUntil = world.frame + difficultyOf(world).warning;
      face(f, target.x);
      if (world.encounter) world.encounter.offscreenWarned += 1;
      logDecision(world, f, index, Verdict.Hidden);
      return true;
    }
    commit(world, f, slot % AI.slots, at, index, target);
    return true;
  }
  return false;
}

/** The off-screen warning runs its full minimum time, then the warned attack starts. */
function stepWarning(world: World, f: Fighter, target: Fighter): void {
  face(f, target.x);
  if (world.frame < f.warnUntil) return;
  const list = attackList(world, f);
  const at = list[f.aiAttack];
  const index = at ? actionIndex(f, at.action) : -1;
  f.aiMode = AiMode.Kite;
  f.warnUntil = 0;
  if (!at || index < 0) {
    release(f);
    return;
  }
  const a = kitOf(f)!.actions[index]!;
  startAction(f, index);
  applyActionMovement(f, a, 1, NO_INPUT, ON_FOOT);
  f.aiStep += 1;
  f.readyAt[f.aiAttack] = world.frame + at.cooldown;
  logDecision(world, f, index, Verdict.Ok);
}

/**
 * Group attack (Enforcer's Anvil Pin): leader and partner reserve the combined cost under
 * one shared telegraph, move into a pincer, then strike on the same frame.
 */
function tryGroup(world: World, f: Fighter, prof: EnemyProfile, target: Fighter): boolean {
  const g = prof.group;
  const enc = world.encounter;
  if (!g || !enc || f.threat > 0 || world.frame < enc.groupReadyAt) return false;
  if (Math.abs(target.x - f.x) > fx(700)) return false;
  const index = actionIndex(f, g.action);
  if (index < 0) return false;
  let partner: Fighter | null = null;
  let best = 0;
  for (const e of world.bodies) {
    if (e.team !== 'enemy' || e.id === f.id || e.threat > 0 || e.ko || nonCombatant(e)) continue;
    if (isBoss(world, e) || profileOf(e)?.role === 'elite' || profileOf(e)?.role === 'ranged')
      continue;
    if (e.state !== MoveState.Idle && e.state !== MoveState.Walk) continue;
    const d = Math.abs(e.x - target.x) + Math.abs(e.z - target.z);
    if (d > fx(900)) continue;
    if (partner === null || d < best) {
      partner = e;
      best = d;
    }
  }
  if (!partner) return false;
  const a = kitOf(f)!.actions[index]!;
  const verdict = judge(world, f, a, g.threat, target.id, g.partnerThreat);
  logDecision(world, f, index, verdict);
  if (verdict !== Verdict.Ok) return false;
  reserve(world, f, a, g.threat, target.id);
  f.threatFlags |= Threat.Group;
  const pa =
    kitOf(partner)!.actions[actionIndex(partner, attacksOf(world, partner)[0]?.action ?? '')];
  reserve(world, partner, pa ?? a, g.partnerThreat, target.id);
  partner.threatFlags |= Threat.Group;
  f.groupWith = partner.id;
  partner.groupWith = f.id;
  f.groupAt = world.frame + g.telegraph;
  partner.groupAt = f.groupAt;
  f.aiMode = AiMode.Group;
  partner.aiMode = AiMode.Group;
  partner.targetId = target.id;
  enc.groupReadyAt = world.frame + difficultyOf(world).groupCooldown;
  return true;
}

function cancelGroup(world: World, f: Fighter): void {
  const p = world.bodies.find((b) => b.id === f.groupWith);
  f.groupWith = 0;
  release(f);
  f.aiMode = AiMode.Idle;
  if (p && p.groupWith === f.id) {
    p.groupWith = 0;
    if (p.state !== MoveState.Attack) release(p);
    p.aiMode = AiMode.Idle;
  }
}

function stepGroup(world: World, f: Fighter, prof: EnemyProfile): void {
  const p = world.bodies.find((b) => b.id === f.groupWith);
  const t = world.bodies.find((b) => b.id === f.targetId);
  const leader = !!profileOf(f)?.group;
  if (!p || !t || !validTarget(world, t) || p.groupWith !== f.id || nonCombatant(p)) {
    cancelGroup(world, f);
    return;
  }
  const pReady = p.state === MoveState.Idle || p.state === MoveState.Walk;
  if (!pReady) {
    cancelGroup(world, f);
    return;
  }
  if (world.frame < f.groupAt) {
    // The pincer: the leader in front, the partner on the far side of the target.
    const side = leader ? sign(f.x - t.x) || -1 : -(sign(p.x - t.x) || -1);
    walkTo(f, prof, t.x + side * fx(leader ? 170 : 150), t.z, fx(20), fx(10));
    face(f, t.x);
    return;
  }
  // Shared release: both start on the same frame (each runs its own step).
  f.groupWith = 0;
  const g = profileOf(f)?.group;
  const id = leader && g ? g.action : (attacksOf(world, f)[0]?.action ?? '');
  const index = actionIndex(f, id);
  face(f, t.x);
  if (index < 0) {
    release(f);
    return;
  }
  const a = kitOf(f)!.actions[index]!;
  startAction(f, index);
  applyActionMovement(f, a, 1, NO_INPUT, ON_FOOT);
  f.aiMode = AiMode.Approach;
  logDecision(world, f, index, Verdict.Ok);
}

/** Weapon-seeking (Never / Opportunistic / Preferred; F&D §7.1, carried from M6). */
function seekWeapon(world: World, f: Fighter, prof: EnemyProfile): boolean {
  if (prof.weapons === 0 || f.item !== 0 || f.threat > 0) return false;
  const phase = bossPhase(world, f);
  const want = phase ? phase.weapon : '';
  if (prof.weapons === 2 && !want) return false;
  let best = null;
  let bestD = 0;
  for (const item of world.items) {
    if (item.state !== ItemState.Ground || !pickupEligible(world, f, item)) continue;
    if (want && WEAPONS[item.def]?.id !== want) continue;
    const d = Math.abs(item.x - f.x) + Math.abs(item.z - f.z);
    if (prof.weapons === 1 && d > AI.weaponRadius) continue;
    if (best === null || d < bestD) {
      best = item;
      bestD = d;
    }
  }
  if (!best) return false;
  f.aiMode = AiMode.Weapon;
  if (
    Math.abs(best.x - f.x) <= ITEM.reachX - fx(10) &&
    Math.abs(best.z - f.z) <= ITEM.reachZ - fx(6)
  ) {
    return requestPickup(world, f);
  }
  walkTo(f, prof, best.x, best.z, ITEM.reachX - fx(20), ITEM.reachZ - fx(10));
  return true;
}

/**
 * Boss objective (campaign guardrail M7): in a device phase the boss works the device with
 * an authored, visible, interruptible hostile action. Progress counts completed actions,
 * never time.
 */
function bossObjective(world: World, f: Fighter, prof: EnemyProfile): boolean {
  const phase = bossPhase(world, f);
  const enc = world.encounter;
  if (!phase?.device || !enc || f.threat > 0) return false;
  const dev = enc.devices.find((d) => d.kind === phase.device && d.active);
  if (!dev) return false;
  if (f.aiStep % (AI.objectiveEvery + 1) !== AI.objectiveEvery) return false;
  const index = actionIndex(f, 'winch-crank');
  if (index < 0) return false;
  f.aiMode = AiMode.Objective;
  const x = dev.x - fx(90);
  if (!walkTo(f, prof, x, dev.z + fx(20), fx(14), fx(10))) return true;
  f.facing = 1;
  startAction(f, index);
  f.aiAttack = -1;
  return true;
}

function completeObjective(world: World, f: Fighter): void {
  const enc = world.encounter;
  const phase = bossPhase(world, f);
  f.aiStep += 1;
  if (!enc || !phase?.device) return;
  const dev = enc.devices.find((d) => d.kind === phase.device && d.active);
  if (!dev) return;
  dev.progress += 1;
  if (dev.progress < dev.count) return;
  dev.progress = 0;
  const h = world.environment.hazards[dev.hazard];
  if (h) {
    h.phase = 1; // HazardPhase.Warn: the surge is telegraphed before it is active.
    h.phaseFrame = 0;
  }
}

/** Tactical movement while waiting for permission (never standing idle). */
function tactical(world: World, f: Fighter, prof: EnemyProfile, t: Fighter): void {
  const dx = t.x - f.x;
  const side = sign(-dx) || 1;
  const strafe = Math.trunc((world.frame + f.id * 37) / AI.strafePeriod) % 2 === 0 ? 1 : -1;
  const lane = t.z + strafe * AI.strafeDepth * ((f.id % 3) - 1);
  const ring = prof.ring;
  let x = t.x + side * ring;
  let z = lane;
  switch (prof.role) {
    case 'ranged':
      f.aiMode = AiMode.Kite;
      z = t.z;
      if (Math.abs(dx) < ring - fx(150)) x = t.x + side * ring;
      else if (Math.abs(dx) <= ring + fx(150)) x = f.x;
      break;
    case 'flanker': {
      // The open side: the side of the target away from the other enemies.
      f.aiMode = AiMode.Flank;
      const others = world.bodies.filter(
        (o) => o.team === 'enemy' && o.id !== f.id && !o.ko && !nonCombatant(o),
      );
      const leftCount = others.filter((o) => o.x < t.x).length;
      const rightCount = others.length - leftCount;
      const open = leftCount === rightCount ? side : leftCount < rightCount ? -1 : 1;
      x = t.x + open * ring;
      break;
    }
    case 'defender':
      // Lane control: holds the target's lane in front of it.
      f.aiMode = AiMode.Hold;
      z = t.z;
      break;
    default:
      f.aiMode = AiMode.Hold;
      break;
  }
  const minX = world.bounds.minX + fx(40);
  const maxX = world.bounds.maxX - fx(40);
  x = Math.min(maxX, Math.max(minX, x));
  z = Math.min(world.bounds.maxZ, Math.max(world.bounds.minZ, z));
  walkTo(f, prof, x, z, fx(24), fx(12));
  face(f, t.x);
  if (prof.defense.stance && f.state === MoveState.Idle && Math.abs(dx) < ring + fx(120)) {
    raiseGuard(world, f, t, prof.defense.guardHold, false);
  }
}

/** Threat flags helper re-export for tests. */
export { threatFlags };

/** Clears defeated bodies and fled enemies; returns the ids removed. */
export function sweepBodies(world: World): number[] {
  const gone: number[] = [];
  world.bodies = world.bodies.filter((b) => {
    if (b.team !== 'enemy') return true;
    const fled =
      b.state === MoveState.Flee && (b.x <= world.bounds.minX || b.x >= world.bounds.maxX);
    const cleared =
      b.state === MoveState.Defeated && b.stateFrame >= AI.defeatedFrames && !isBoss(world, b);
    if (fled || cleared) gone.push(b.id);
    return !(fled || cleared);
  });
  return gone;
}

export { livingHeroes, REACTION };
