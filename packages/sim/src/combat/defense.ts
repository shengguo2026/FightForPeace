import { fx } from '../math/fixed';
import { type Axis, DefEvent, type Fighter, MoveState, Protect, type World } from '../world/types';
import { selectAction, startAction } from './actions';
import { awardGuardMeter } from './meter';
import { guardCostFor } from './held';
import { NO_FRAME, REACTION, enter, enterProtection, interrupt, recoil } from './reactions';
import { routeCodeOf, segmentCount } from './roster';
import { type ActionDef, Dir } from './types';

/**
 * Candidate defense constants (F&D §6.3, §6.4, §10; spec §7.6). Frames at 60 Hz; the
 * Defense meter is in percent.
 */
export const DEFENSE = {
  max: 100,
  /** Guard arc: half-angle 75° (a 150° frontal arc). cos²(75°) ≈ 0.0670, in 1/10000. */
  arcCos2: 670,
  pivotFrames: 5,
  /** Health damage that still gets through a normal guard, in percent. */
  chipPercent: 20,
  /** Exact Block window: the press frame and the next 4 (5 frames ending on contact). */
  exactWindow: 5,
  precisionCooldown: 20,
  exactReward: 15,
  deflectRecoil: 20,
  deflectBreakRecoil: 32,
  /** Counter: chord tolerance between the direction and Guard, and the window. */
  counterChord: 3,
  counterWindow: 3,
  counterReward: 25,
  counterRecoil: 30,
  counterMissFrames: 24,
  guardCrushFrames: 27,
  /** Passive recovery: floor, delay, and one point every `regenEvery` frames. */
  floor: 25,
  regenDelay: 90,
  regenEvery: 4,
  breakerCost: 75,
  breakerChord: 3,
  breakerFrames: 30,
  breakerRadius: fx(260),
  breakerRecoil: 24,
  /** A Guard press this soon after an unguarded contact is reported as "too late". */
  lateReport: 12,
  /** A fresh press this long before a guarded contact is reported as "too early". */
  earlyReport: 30,
} as const;

/** The guard state each contact of one frame is judged against. */
export interface DefenseSnapshot {
  state: number;
  guarding: boolean;
  guardX: Axis;
  guardZ: Axis;
  exactFrame: number;
  counterFrame: number;
  counterX: Axis;
  counterZ: Axis;
}

/** Same-frame contacts resolve against one stable snapshot per defender (F&D §6.3). */
export function defenseSnapshots(bodies: readonly Fighter[]): Map<number, DefenseSnapshot> {
  const snaps = new Map<number, DefenseSnapshot>();
  for (const f of bodies) {
    if (f.team !== 'hero') continue;
    snaps.set(f.id, {
      state: f.state,
      guarding: isGuarding(f),
      guardX: f.guardX,
      guardZ: f.guardZ,
      exactFrame: f.exactFrame,
      counterFrame: f.counterFrame,
      counterX: f.counterX,
      counterZ: f.counterZ,
    });
  }
  return snaps;
}

/** Normal guard is up: guarding or in block-stun, with Defense left. */
export function isGuarding(f: Fighter): boolean {
  return (f.state === MoveState.Guard || f.state === MoveState.Blockstun) && f.defense > 0;
}

/** Unit vectors (×256) for an 8-way direction; diagonals are 181/256 ≈ 1/√2. */
function unit(x: Axis, z: Axis): [number, number] {
  if (x !== 0 && z !== 0) return [x * 181, z * 181];
  return [x * 256, z * 256];
}

/**
 * Is the point (vx, vz) — the attacker relative to the defender, fixed point — inside the
 * 150° arc around the 8-way direction (dx, dz)? Integer test in whole pixels:
 * dot > 0 and dot² ≥ cos²(75°) × |v|². A contact from exactly the same spot counts as
 * inside (nothing to tell the side from).
 */
export function inArc(dx: Axis, dz: Axis, vx: number, vz: number): boolean {
  const px = Math.trunc(vx / 256);
  const pz = Math.trunc(vz / 256);
  if (px === 0 && pz === 0) return true;
  if (dx === 0 && dz === 0) return false;
  const [ux, uz] = unit(dx, dz);
  const dot = ux * px + uz * pz;
  if (dot <= 0) return false;
  return dot * dot * 10000 >= DEFENSE.arcCos2 * 65536 * (px * px + pz * pz);
}

export function logDefense(
  world: World,
  t: Fighter,
  event: number,
  offset: number,
  att?: Fighter,
): void {
  t.defEvent = event;
  t.defOffset = offset;
  t.defFrame = world.frame;
  t.defAction = att && att.action >= 0 ? routeCodeOf(att) : -1;
}

export function addDefense(world: World, f: Fighter, amount: number): void {
  f.defense = Math.min(DEFENSE.max, f.defense + amount);
  if (world.infiniteDefense) f.defense = DEFENSE.max;
}

/**
 * Judges one contact of `a` (active segment `seg`) from `att` on defender `t`. Returns true
 * when the defense handled it (counter, exact block, normal guard or guard crush); false
 * means the contact is an ordinary hit, after recording why for the Lab.
 */
export function defend(
  world: World,
  att: Fighter,
  a: ActionDef,
  seg: number,
  t: Fighter,
  s: DefenseSnapshot,
): boolean {
  const c = world.frame;
  const vx = att.x - t.x;
  const vz = att.z - t.z;
  const tags = a.tags;
  const unblockable = tags.includes('unblockable');
  t.defIdle = 0;

  // Directional Predictive Counter: committed; a failure never falls back to guard.
  if (s.state === MoveState.Counter && t.state === MoveState.Counter) {
    const counterable = tags.includes('counterable') && !tags.includes('uncounterable');
    if (!counterable) {
      logDefense(world, t, DefEvent.CounterUncounterable, c - s.counterFrame, att);
      return false;
    }
    if (!inArc(s.counterX, s.counterZ, vx, vz)) {
      logDefense(world, t, DefEvent.CounterWrongDir, c - s.counterFrame, att);
      return false;
    }
    counterSuccess(world, att, t, c - s.counterFrame);
    return true;
  }

  const inGuardArc = inArc(s.guardX, s.guardZ, vx, vz);
  const raised = s.state === MoveState.Guard || s.state === MoveState.Blockstun;

  // Exact Block: a fresh press on the contact frame or up to 4 frames before it.
  const sinceExact = c - s.exactFrame;
  if (raised && inGuardArc && !unblockable && sinceExact >= 0 && sinceExact < DEFENSE.exactWindow) {
    exactBlock(world, att, a, seg, t, sinceExact);
    return true;
  }

  // Normal guard (Committed Directional Guard).
  if (s.guarding && inGuardArc && !unblockable && !tags.includes('guardPiercing')) {
    normalGuard(world, att, a, t);
    // A guarded contact earns the attacker a quarter of the action's gain, once.
    if (seg === 0) awardGuardMeter(world, att, a);
    return true;
  }

  if (unblockable) logDefense(world, t, DefEvent.Unblockable, 0, att);
  else if (s.guarding && !inGuardArc) logDefense(world, t, DefEvent.Behind, 0, att);
  else if (s.guarding) logDefense(world, t, DefEvent.Pierced, 0, att);
  else logDefense(world, t, DefEvent.Hit, 0, att);
  return false;
}

function exactBlock(
  world: World,
  att: Fighter,
  a: ActionDef,
  seg: number,
  t: Fighter,
  offset: number,
): void {
  // Exact block: no damage, no Defense cost; the reward comes once per incoming action.
  if (!att.rewardIds.includes(t.id)) {
    att.rewardIds.push(t.id);
    addDefense(world, t, DEFENSE.exactReward);
  }
  t.exactFrame = NO_FRAME;
  const n = segmentCount(a);
  const breaks = a.tags.includes('deflectBreak') && n > 1 && seg === n - 1;
  logDefense(world, t, breaks ? DefEvent.ExactBreak : DefEvent.Exact, offset, att);
  if (n === 1 || breaks) {
    recoil(att, breaks ? DEFENSE.deflectBreakRecoil : DEFENSE.deflectRecoil);
  }
  // The defender recovers first: straight back to guard, no block-stun.
  if (t.state === MoveState.Blockstun) {
    t.state = MoveState.Guard;
    t.stateFrame = 0;
    t.stun = 0;
  }
  t.vx = 0;
  t.vz = 0;
}

/** A normal guard of `a` (chip damage, Defense cost, block-stun or Guard Crush). */
export function normalGuard(world: World, att: Fighter, a: ActionDef, t: Fighter): void {
  const c = world.frame;
  t.health = Math.max(0, t.health - Math.trunc((a.damage * DEFENSE.chipPercent) / 100));
  // Simultaneous guarded contacts add their guard damage but crush only once.
  if (t.state === MoveState.GuardCrush && t.defFrame === c) return;
  // A held guard-modifier item scales the cost (campaign guardrail M6).
  const cost = world.infiniteDefense ? 0 : guardCostFor(world, t, a.guardCost);
  if (cost > 0 && cost >= t.defense) {
    t.defense = 0;
    interrupt(t);
    enter(t, MoveState.GuardCrush, DEFENSE.guardCrushFrames);
    t.vx = 0;
    t.vz = 0;
    logDefense(world, t, DefEvent.GuardCrush, 0, att);
    return;
  }
  t.defense -= cost;
  const dir = t.x === att.x ? att.facing : t.x > att.x ? 1 : -1;
  t.pivotAt = NO_FRAME;
  enter(t, MoveState.Blockstun, a.blockstun);
  t.vx = dir * Math.max(fx(1), Math.trunc(a.reaction.push / 2));
  t.vz = 0;
  const early = c - t.lastGuardFrame;
  if (early < DEFENSE.exactWindow && early >= 0)
    logDefense(world, t, DefEvent.Cooldown, early, att);
  else if (early < DEFENSE.earlyReport) logDefense(world, t, DefEvent.ExactEarly, early, att);
  else logDefense(world, t, DefEvent.Guard, 0, att);
}

function counterSuccess(world: World, att: Fighter, t: Fighter, offset: number): void {
  addDefense(world, t, DEFENSE.counterReward);
  logDefense(world, t, DefEvent.Counter, offset, att);
  recoil(att, DEFENSE.counterRecoil);
  t.counterFrame = NO_FRAME;
  if (att.x !== t.x) t.facing = att.x > t.x ? 1 : -1;
  const index = selectAction(t, 'counter', Dir.Neutral);
  if (index >= 0) {
    t.chainUsed = 0;
    startAction(t, index);
  } else {
    enter(t, MoveState.Idle, 0);
  }
}

/**
 * Combo Breaker (F&D §6.4): accepted only while trapped (hit-stun, an active juggle, or an
 * open ground window) and atomically checks 75 % Defense and the combo's unused breaker
 * before spending anything. Returns true when the breaker started.
 */
export function tryBreaker(world: World, f: Fighter): boolean {
  const trapped =
    !f.protectedRecovery &&
    f.ctx.open &&
    (f.state === MoveState.Hitstun ||
      (f.state === MoveState.Launched && !f.airRecover) ||
      (f.state === MoveState.Down && f.groundWindow > 0));
  if (!trapped) {
    logDefense(world, f, DefEvent.BreakerDenied, 2);
    return false;
  }
  if (f.ctx.breakerUsed) {
    logDefense(world, f, DefEvent.BreakerDenied, 3);
    return false;
  }
  if (!world.infiniteDefense && f.defense < DEFENSE.breakerCost) {
    logDefense(world, f, DefEvent.BreakerDenied, 1);
    return false;
  }
  if (!world.infiniteDefense) f.defense -= DEFENSE.breakerCost;
  f.ctx.breakerUsed = true;
  interrupt(f);
  enterProtection(world, f, Protect.Breaker);
  enter(f, MoveState.Breaker, DEFENSE.breakerFrames);
  f.vx = 0;
  f.vz = 0;
  f.vy = Math.min(f.vy, 0);
  f.airRecover = false;
  f.heavyFall = false;
  f.bufAction = 0;
  f.bufFrame = 0;
  logDefense(world, f, DefEvent.Breaker, 0);
  const r2 = DEFENSE.breakerRadius / 256;
  for (const e of world.bodies) {
    if (e.team === f.team) continue;
    const dx = Math.trunc((e.x - f.x) / 256);
    const dz = Math.trunc((e.z - f.z) / 256);
    if (dx * dx + dz * dz > r2 * r2) continue;
    const dir = dx === 0 ? f.facing : dx > 0 ? 1 : -1;
    const push = dir * REACTION.separationPush;
    if (e.state === MoveState.Launched || e.state === MoveState.Down) e.vx = push;
    else recoil(e, DEFENSE.breakerRecoil, push);
  }
  return true;
}

/** One frame of the Breaker state: protected, falling if airborne, then neutral. */
export function stepBreaker(f: Fighter): boolean {
  f.stateFrame += 1;
  if (f.y > 0) {
    f.y = Math.max(0, f.y + f.vy);
    f.vy -= REACTION.gravity;
  }
  if (f.stateFrame < f.stun || f.y > 0) return true;
  f.y = 0;
  f.vy = 0;
  f.protectedRecovery = false;
  enter(f, MoveState.Idle, 0);
  return false;
}

/**
 * Passive Defense recovery (F&D §10): only below the 25 % floor, after 90 frames
 * actionable without guarding, attacking or taking damage; +1 every 4 frames up to 25 %.
 */
export function tickDefense(world: World, f: Fighter): void {
  if (world.infiniteDefense) {
    f.defense = DEFENSE.max;
    return;
  }
  const calm =
    f.state === MoveState.Idle ||
    f.state === MoveState.Walk ||
    f.state === MoveState.Dash ||
    f.state === MoveState.Air ||
    f.state === MoveState.Landing;
  if (!calm) {
    f.defIdle = 0;
    return;
  }
  f.defIdle += 1;
  if (f.defense >= DEFENSE.floor || f.defIdle < DEFENSE.regenDelay) return;
  if ((f.defIdle - DEFENSE.regenDelay) % DEFENSE.regenEvery === 0) f.defense += 1;
}

/** Records "Guard pressed too late" when a press follows an unguarded contact closely. */
export function noteLatePress(world: World, f: Fighter): void {
  const since = world.frame - f.defFrame;
  if (f.defEvent === DefEvent.Hit && since > 0 && since <= DEFENSE.lateReport) {
    f.defEvent = DefEvent.Late;
    f.defOffset = since;
    f.defFrame = world.frame;
  }
}

/** Records a counter attempt that met no contact in its window. */
export function counterMissed(world: World, f: Fighter): void {
  logDefense(world, f, DefEvent.CounterMiss, 0);
  f.counterFrame = NO_FRAME;
  enter(f, MoveState.CounterMiss, DEFENSE.counterMissFrames);
}
