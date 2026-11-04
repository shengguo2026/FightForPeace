import { fx } from '../math/fixed';
import {
  Bounce,
  type ComboContext,
  type Fighter,
  GroundTag,
  MoveState,
  Protect,
  ROUTE_CAP,
  type World,
} from '../world/types';
import {
  DAMAGE_FLOOR,
  bandLift,
  emptyContext,
  juggleBand,
  scaledHitstun,
  splitDamage,
} from './context';
import { defend, defenseSnapshots, logDefense } from './defense';
import { awardHitMeter } from './meter';
import { REACTION, enter, enterProtection, exhaustJuggle, interrupt } from './reactions';
import { activeSegment, kitOf, routeCodeOf, segmentCount } from './roster';
import type { ActionDef } from './types';
import { DefEvent, type Facing } from '../world/types';
import { hitProjectiles } from './projectiles';
import { hitBodies } from './grabs';
import { hitItems, payContact, strikeItems, tryDisarm } from './items';
import { impactEligible, strikeScenery } from './environment';

/** Target hurtbox (M2 candidate): half width, half depth, standing and low heights. */
export const HURT_HALF_W = fx(40);
export const HURT_HALF_D = fx(14);
export const HURT_H = fx(300);
export const HURT_H_LOW = fx(180);
/** A downed fighter's hurtbox height. */
export const HURT_H_DOWN = fx(60);
/** Hold between the hits of a finalReaction move: hit-stun on the ground, a small lift in the air. */
const HOLD_STUN = 24;
const HOLD_LIFT = fx(2);

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z: number;
  depth: number;
}

/** The running action of a fighter, or undefined. */
export function runningAction(f: Fighter): ActionDef | undefined {
  if (f.state !== MoveState.Attack || f.action < 0) return undefined;
  return kitOf(f)?.actions[f.action];
}

/** Does this action strike with its own hitbox (not a grab, a grab-route move or a projectile)? */
export function strikes(a: ActionDef): boolean {
  return (
    a.projectile === null &&
    a.category !== 'grab' &&
    a.category !== 'grabStrike' &&
    a.category !== 'throw'
  );
}

/** Is action frame n inside the inclusive range [from, to]? */
function within(r: readonly [number, number], n: number): boolean {
  return n >= r[0] && n <= r[1];
}

/** World-space hitbox of a fighter's action on its current frame, or null when not active. */
export function activeHitbox(f: Fighter): Box | null {
  const a = runningAction(f);
  if (!a || !strikes(a) || activeSegment(a, f.stateFrame + 1) < 0) return null;
  const hb = a.hitbox;
  const x0 = f.facing === 1 ? f.x + hb.x : f.x - hb.x - hb.w;
  return { x0, x1: x0 + hb.w, y0: f.y + hb.y, y1: f.y + hb.y + hb.h, z: f.z, depth: hb.depth };
}

/**
 * World-space hurtbox. A fighter performing a low action uses the lowered profile; a
 * downed fighter lies on the floor.
 */
export function hurtbox(f: Fighter): Box {
  const a = runningAction(f);
  const low = a?.hurtbox === 'low';
  const h = f.state === MoveState.Down ? HURT_H_DOWN : low ? HURT_H_LOW : HURT_H;
  // A retreating hurtbox (Ebbstep Return) shifts backwards for its authored frames.
  const n = f.stateFrame + 1;
  const shift = a?.hurtShift && n >= a.hurtShift.from && n <= a.hurtShift.to ? a.hurtShift.x : 0;
  const cx = f.x - f.facing * shift;
  return {
    x0: cx - HURT_HALF_W,
    x1: cx + HURT_HALF_W,
    y0: f.y,
    y1: f.y + h,
    z: f.z,
    depth: HURT_HALF_D,
  };
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x0 < b.x1 &&
    b.x0 < a.x1 &&
    a.y0 < b.y1 &&
    b.y0 < a.y1 &&
    Math.abs(a.z - b.z) <= a.depth + b.depth
  );
}

/**
 * Can this action hit this target now? Protected, getting-up and landing-recovery targets
 * cannot be hit. Only ground actions hit a downed target, only while its ground window is
 * open and the shared route still allows that action; ground actions never hit standing
 * targets.
 */
export function canHit(att: Fighter, a: ActionDef, t: Fighter): boolean {
  if (t.team === att.team || t.protectedRecovery || t.cinematic) return false;
  if (t.state === MoveState.GetUp || t.state === MoveState.Recover) return false;
  // Held targets belong to their grabber's route; restrained heroes are out of the fight.
  if (t.state === MoveState.Grabbed || t.state === MoveState.Restrained) return false;
  const ta = runningAction(t);
  if (ta && within(ta.invulnerable, t.stateFrame + 1)) return false;
  // An enemy grab that is not rescue-interruptible is a protected phase.
  if (t.state === MoveState.Grabbing && t.team === 'enemy' && !grabInterruptible(t)) return false;
  const downed = t.state === MoveState.Down;
  if (a.category !== 'ground') return !downed;
  if (!downed || t.groundWindow <= 0 || !t.ctx.open) return false;
  return groundAllows(t.ctx, a) || att.contactIds.includes(t.id);
}

/** The shared ground route still allows this ground action (one extension, one finisher). */
export function groundAllows(ctx: ComboContext, a: ActionDef): boolean {
  if (ctx.groundFinUsed) return false;
  return !(a.tags.includes('groundExtension') && ctx.groundExtUsed);
}

/** An enemy's running grab may be broken by a partner's strike. */
function grabInterruptible(t: Fighter): boolean {
  const a = kitOf(t)?.actions[t.action];
  return a?.tags.includes('rescueInterruptible') ?? false;
}

/** Armor (Gatebreaker Advance): the defender's action absorbs this strike on this frame. */
export function armored(t: Fighter, a: ActionDef): boolean {
  const ta = runningAction(t);
  return !!ta && within(ta.armor, t.stateFrame + 1) && !a.tags.includes('guardPiercing');
}

/**
 * Where a hit comes from: a fighter's running action, a projectile or a thrown body. The
 * owner earns the meter; contact lists lock the damage scale per target for one action.
 */
export interface HitSource {
  owner: Fighter;
  x: number;
  facing: Facing;
  vx: number;
  contactIds: number[];
  contactScales: number[];
  /** Route-log code of the action. */
  code: number;
}

export function sourceOf(f: Fighter): HitSource {
  return {
    owner: f,
    x: f.x,
    facing: f.facing,
    vx: f.vx,
    contactIds: f.contactIds,
    contactScales: f.contactScales,
    code: routeCodeOf(f),
  };
}

/**
 * Hit pass, after all movement. Attackers and targets are visited in ascending id order.
 * Heroes never hit heroes. Each target can be hit once per active segment. A contact on a
 * defender first goes through its defense (guard, exact block, counter), judged against
 * the defender's guard state as it was when this pass began.
 */
export function resolveHits(world: World): void {
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  const snaps = defenseSnapshots(bodies);
  for (const att of bodies) {
    const a = runningAction(att);
    if (!a || !strikes(a)) continue;
    const n = att.stateFrame + 1;
    const seg = activeSegment(a, n);
    if (seg < 0) continue;
    if (seg !== att.hitSeg) {
      att.hitSeg = seg;
      att.hitIds = [];
    }
    const box = activeHitbox(att)!;
    strikeScenery(world, att, a, box);
    strikeItems(world, att, a, box);
    for (const t of bodies) {
      // A counter or deflect may have stopped this action part-way through the targets.
      if (runningAction(att) !== a) break;
      if (att.hitIds.includes(t.id) || !canHit(att, a, t)) continue;
      if (!overlaps(box, hurtbox(t))) continue;
      const snap = snaps.get(t.id);
      if (snap && defend(world, att, a, seg, t, snap)) {
        att.hitIds.push(t.id);
        if (att.contactAt < 0) att.contactAt = att.stateFrame + 1;
        payContact(world, att, true);
        // A crushDisarm move that breaks the guard also knocks the weapon away.
        if (t.state === MoveState.GuardCrush && a.tags.includes('crushDisarm'))
          tryDisarm(world, att, a, t);
        continue;
      }
      att.hitIds.push(t.id);
      if (att.contactAt < 0) att.contactAt = att.stateFrame + 1;
      payContact(world, att, false);
      if (armored(t, a)) {
        // Armor: the strike lands (damage) but causes no reaction and opens no combo.
        t.health = Math.max(0, t.health - a.damage);
        if (t.team === 'hero') logDefense(world, t, DefEvent.Armored, 0, att);
        continue;
      }
      applyHit(world, sourceOf(att), a, seg, t);
      tryDisarm(world, att, a, t);
      // Cinematic protection from the Ultimate's first valid contact until it ends.
      if (a.category === 'ultimate') att.cinematic = true;
    }
  }
  hitProjectiles(world, bodies);
  hitItems(world, bodies, snaps);
  hitBodies(world, bodies);
}

function lifts(a: ActionDef): boolean {
  const k = a.reaction.kind;
  return k === 'launch' || k === 'knockdown' || k === 'trip';
}

/**
 * Applies one hit of action `a` (active segment `seg`) from source `s` to target `t`:
 * opens or continues the target's combo context, pays the budgets on the action's first
 * hit, deals scaled damage and starts the reaction.
 */
export function applyHit(world: World, s: HitSource, a: ActionDef, seg: number, t: Fighter): void {
  const ctx = t.ctx.open ? t.ctx : { ...emptyContext(), open: true };
  t.ctx = ctx;
  t.thrownBy = 0;

  const downed = t.state === MoveState.Down;
  const airborne = !downed && (t.y > 0 || t.state === MoveState.Launched);
  let k = s.contactIds.indexOf(t.id);
  const first = k === -1;
  let hitstun: number;
  let band = juggleBand(ctx.juggleBudget);
  let juggleOut = false;
  if (first) {
    // Budgets and meter are paid once per offensive action, on its first hit.
    k = s.contactIds.length;
    s.contactIds.push(t.id);
    s.contactScales.push(ctx.scale);
    hitstun = scaledHitstun(a.reaction.hitstun, ctx.stunBudget);
    ctx.stunBudget = Math.max(0, ctx.stunBudget - a.stunDecayCost);
    if (ctx.stunBudget === 0) ctx.exhausted = true;
    // The juggle budget pays for holding or launching an airborne target; a ground
    // relaunch pays when its finisher resolves.
    if (airborne || (!downed && lifts(a))) {
      ctx.juggleBudget = Math.max(0, ctx.juggleBudget - a.juggleCost);
      juggleOut = a.juggleCost > 0 && ctx.juggleBudget === 0;
    }
    awardHitMeter(world, s.owner, a, ctx, k);
    const cost = ctx.actions === 0 ? a.starterProration : a.damageScaleCost;
    ctx.scale = Math.max(DAMAGE_FLOOR, ctx.scale - cost);
    ctx.actions += 1;
    if (ctx.route.length < ROUTE_CAP) ctx.route.push(s.code);
  } else {
    hitstun = scaledHitstun(a.reaction.hitstun, ctx.stunBudget + a.stunDecayCost);
    band = juggleBand(ctx.juggleBudget + a.juggleCost);
  }
  const dmg = splitDamage(a.damage, s.contactScales[k]!, seg, segmentCount(a));
  t.health = Math.max(0, t.health - dmg);
  ctx.damage += dmg;
  ctx.lastDamage = dmg;
  ctx.hits += 1;

  const last = seg === segmentCount(a) - 1;
  if (downed) groundReact(world, s, a, t, hitstun, last);
  else {
    react(world, s, a, t, hitstun, band, juggleOut, airborne, last);
    // Environment eligibility of this hit: an impact surface may now slam the target.
    t.impactArmed = impactEligible(a);
  }
}

function pushDir(att: HitSource, a: ActionDef, t: Fighter): number {
  const away = t.x === att.x ? att.facing : t.x > att.x ? 1 : -1;
  // A hook pulls the target towards the attacker.
  if (a.pull > 0) return -away;
  // A side-switching move pushes towards the attacker's facing, whatever side the target is on.
  return a.tags.includes('sideSwitch') || a.tags.includes('carry') ? att.facing : away;
}

function react(
  world: World,
  att: HitSource,
  a: ActionDef,
  t: Fighter,
  hitstun: number,
  band: number,
  juggleOut: boolean,
  airborne: boolean,
  last: boolean,
): void {
  const r = a.reaction;
  const dir = pushDir(att, a, t);
  const push = a.pull > 0 ? a.pull : r.push;
  const trip = r.counterTrip && world.dummy.counterHit;
  const ctx = t.ctx;
  interrupt(t);
  t.stateFrame = 0;

  if (ctx.exhausted || (juggleOut && !airborne)) {
    // Forced safe separation: the hit still lands, but control ends.
    t.vx = dir * Math.max(r.push, REACTION.separationPush);
    t.vz = 0;
    if (airborne) {
      exhaustJuggle(world, t);
    } else {
      enter(t, MoveState.Hitstun, REACTION.separationHitstun);
      enterProtection(world, t, Protect.SoftReset);
    }
    return;
  }

  // A multi-hit Special or Ultimate holds its target until the final hit, carrying it along.
  if (!last && a.tags.includes('finalReaction')) {
    t.vx = att.vx;
    t.vz = 0;
    if (airborne) {
      t.state = MoveState.Launched;
      t.vy = Math.max(t.vy, HOLD_LIFT);
    } else {
      t.state = MoveState.Hitstun;
      t.stun = Math.max(hitstun, HOLD_STUN);
    }
    return;
  }

  // Bounces armed by this hit (the latest hit decides); each quota is spent on impact.
  t.bounce =
    (a.tags.includes('wallBounce') && !ctx.wallBounceUsed ? Bounce.Wall : 0) |
    (a.tags.includes('groundBounce') && !ctx.groundBounceUsed ? Bounce.Ground : 0);

  if (airborne) {
    t.state = MoveState.Launched;
    t.vy = bandLift(r.airPop !== 0 ? r.airPop : Math.max(t.vy, r.lift), band);
    t.vx = dir * push;
    t.vz = 0;
    t.airRecover = false;
    t.heavyFall = band === 40;
    if (a.tags.includes('terminalKnockdown')) ctx.groundTag = GroundTag.Terminal;
    if (juggleOut) exhaustJuggle(world, t);
    return;
  }

  const kind = trip ? 'trip' : r.kind;
  t.vx = dir * push;
  t.vz = 0;
  if (kind === 'launch' || kind === 'knockdown' || kind === 'trip') {
    t.state = MoveState.Launched;
    const lift = Math.max(r.lift, fx(3));
    t.vy = kind === 'launch' ? bandLift(lift, band) : lift;
    t.y = Math.max(t.y, 1);
    t.airRecover = false;
    t.heavyFall = kind === 'launch' && band === 40;
    if (kind !== 'launch') {
      if (a.tags.includes('opensGroundWindow')) ctx.groundTag = GroundTag.Opens;
      else if (a.tags.includes('terminalKnockdown')) ctx.groundTag = GroundTag.Terminal;
    }
    return;
  }
  t.state = MoveState.Hitstun;
  t.stun = hitstun;
}

/**
 * A ground action on a downed target (Tagged Two-Step Ground Route): an extension keeps
 * the target down and re-opens a short window for the finisher; a finisher concludes on
 * its last hit with protected get-up, a relaunch, or a separating kick when relaunching
 * is no longer allowed.
 */
function groundReact(
  world: World,
  att: HitSource,
  a: ActionDef,
  t: Fighter,
  hitstun: number,
  last: boolean,
): void {
  const ctx = t.ctx;
  const finisher = a.tags.includes('groundFinisher');
  interrupt(t);
  t.vx = 0;
  t.vz = 0;
  if (finisher) ctx.groundFinUsed = true;
  else ctx.groundExtUsed = true;
  if (ctx.exhausted) {
    enter(t, MoveState.Down, REACTION.downFrames);
    enterProtection(world, t, Protect.SoftReset);
    return;
  }
  if (!finisher) {
    enter(t, MoveState.Down, Math.max(REACTION.groundFollowWindow + 6, hitstun));
    t.groundWindow = REACTION.groundFollowWindow;
    return;
  }
  if (!last) {
    // A multi-hit finisher keeps the target down until its last hit.
    enter(t, MoveState.Down, REACTION.downFrames);
    t.groundWindow = Math.max(t.groundWindow, 12);
    return;
  }
  const dir = pushDir(att, a, t);
  if (a.tags.includes('relaunch')) {
    if (!ctx.groundBounceUsed && ctx.juggleBudget > 0) {
      // A ground relaunch spends the combo's ground-bounce quota and its juggle cost.
      ctx.groundBounceUsed = true;
      const band = juggleBand(ctx.juggleBudget);
      ctx.juggleBudget = Math.max(0, ctx.juggleBudget - a.juggleCost);
      t.groundWindow = 0;
      t.state = MoveState.Launched;
      t.stateFrame = 0;
      t.vy = bandLift(Math.max(a.reaction.lift, fx(3)), band);
      t.y = 1;
      t.vx = dir * a.reaction.push;
      t.heavyFall = band === 40;
      t.airRecover = false;
      if (ctx.juggleBudget === 0) exhaustJuggle(world, t);
      return;
    }
    // Relaunch not allowed: an authored separating kick instead of a failure.
    t.vx = dir * REACTION.separationPush;
  }
  enter(t, MoveState.Down, REACTION.downFrames);
  enterProtection(world, t, Protect.GetUp);
}
