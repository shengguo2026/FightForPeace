import { fx } from '../math/fixed';
import { type Fighter, GroundTag, MoveState, type World } from '../world/types';
import { DAMAGE_FLOOR, emptyContext, scaledHitstun, splitDamage } from './context';
import { REACTION, hittable } from './reactions';
import { HEROES, activeSegment, segmentCount } from './roster';
import type { ActionDef } from './types';

/** Target hurtbox (M2 candidate): half width, half depth, standing and low heights. */
export const HURT_HALF_W = fx(40);
export const HURT_HALF_D = fx(14);
export const HURT_H = fx(300);
export const HURT_H_LOW = fx(180);

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
  if (f.state !== MoveState.Attack || f.action < 0 || f.hero < 0) return undefined;
  return HEROES[f.hero]?.actions[f.action];
}

/** World-space hitbox of a fighter's action on its current frame, or null when not active. */
export function activeHitbox(f: Fighter): Box | null {
  const a = runningAction(f);
  if (!a || activeSegment(a, f.stateFrame + 1) < 0) return null;
  const hb = a.hitbox;
  const x0 = f.facing === 1 ? f.x + hb.x : f.x - hb.x - hb.w;
  return { x0, x1: x0 + hb.w, y0: f.y + hb.y, y1: f.y + hb.y + hb.h, z: f.z, depth: hb.depth };
}

/** World-space hurtbox. A fighter performing a low action uses the lowered profile. */
export function hurtbox(f: Fighter): Box {
  const low = runningAction(f)?.hurtbox === 'low';
  return {
    x0: f.x - HURT_HALF_W,
    x1: f.x + HURT_HALF_W,
    y0: f.y,
    y1: f.y + (low ? HURT_H_LOW : HURT_H),
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
 * Hit pass, after all movement. Attackers and targets are visited in ascending id order.
 * Heroes never hit heroes. Each target can be hit once per active segment.
 */
export function resolveHits(world: World): void {
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  for (const att of bodies) {
    const a = runningAction(att);
    if (!a) continue;
    const n = att.stateFrame + 1;
    const seg = activeSegment(a, n);
    if (seg < 0) continue;
    if (seg !== att.hitSeg) {
      att.hitSeg = seg;
      att.hitIds = [];
    }
    const box = activeHitbox(att)!;
    for (const t of bodies) {
      if (t.team === att.team || !hittable(t) || att.hitIds.includes(t.id)) continue;
      if (!overlaps(box, hurtbox(t))) continue;
      applyHit(world, att, a, seg, t);
    }
  }
}

function applyHit(world: World, att: Fighter, a: ActionDef, seg: number, t: Fighter): void {
  const ctx = t.ctx.open ? t.ctx : { ...emptyContext(), open: true };
  t.ctx = ctx;
  att.hitIds.push(t.id);
  if (att.contactAt < 0) att.contactAt = att.stateFrame + 1;

  let k = att.contactIds.indexOf(t.id);
  const first = k === -1;
  let hitstun: number;
  if (first) {
    // Budgets and meter are paid once per offensive action, on its first hit.
    k = att.contactIds.length;
    att.contactIds.push(t.id);
    att.contactScales.push(ctx.scale);
    hitstun = scaledHitstun(a.reaction.hitstun, ctx.stunBudget);
    ctx.stunBudget = Math.max(0, ctx.stunBudget - a.stunDecayCost);
    if (ctx.stunBudget === 0) ctx.exhausted = true;
    ctx.juggleBudget = Math.max(0, ctx.juggleBudget - a.juggleCost);
    const gain = Math.min(a.meterGain, ctx.meterBudget);
    ctx.meterBudget -= gain;
    att.meter = Math.min(100, att.meter + gain);
    const cost = ctx.actions === 0 ? a.starterProration : a.damageScaleCost;
    ctx.scale = Math.max(DAMAGE_FLOOR, ctx.scale - cost);
    ctx.actions += 1;
  } else {
    hitstun = scaledHitstun(a.reaction.hitstun, ctx.stunBudget + a.stunDecayCost);
  }
  const dmg = splitDamage(a.damage, att.contactScales[k]!, seg, segmentCount(a));
  t.health = Math.max(0, t.health - dmg);
  ctx.damage += dmg;
  ctx.lastDamage = dmg;
  ctx.hits += 1;

  react(world, att, a, t, hitstun);
}

function react(world: World, att: Fighter, a: ActionDef, t: Fighter, hitstun: number): void {
  const r = a.reaction;
  const away = t.x === att.x ? att.facing : t.x > att.x ? 1 : -1;
  // A side-switching move pushes towards the attacker's facing, whatever side the target is on.
  const dir = a.tags.includes('sideSwitch') || a.tags.includes('carry') ? att.facing : away;
  const airborne = t.y > 0 || t.state === MoveState.Launched;
  const trip = r.counterTrip && world.dummy.counterHit;
  const ctx = t.ctx;
  t.action = -1;
  t.stateFrame = 0;

  if (ctx.exhausted) {
    // Forced safe separation: the hit still lands, but control ends.
    t.vx = dir * Math.max(r.push, REACTION.separationPush);
    t.vz = 0;
    if (airborne) {
      t.state = MoveState.Launched;
      t.vy = Math.min(t.vy, 0);
      t.airRecover = true;
    } else {
      t.state = MoveState.Hitstun;
      t.stun = REACTION.separationHitstun;
    }
    return;
  }

  if (airborne) {
    t.state = MoveState.Launched;
    t.vy = r.airPop !== 0 ? r.airPop : Math.max(t.vy, r.lift);
    t.vx = dir * r.push;
    t.vz = 0;
    t.airRecover = false;
    if (a.tags.includes('terminalKnockdown')) ctx.groundTag = GroundTag.Terminal;
    return;
  }

  const kind = trip ? 'trip' : r.kind;
  t.vx = dir * r.push;
  t.vz = 0;
  if (kind === 'launch' || kind === 'knockdown' || kind === 'trip') {
    t.state = MoveState.Launched;
    t.vy = Math.max(r.lift, fx(3));
    t.y = Math.max(t.y, 1);
    t.airRecover = false;
    if (kind !== 'launch') {
      if (a.tags.includes('opensGroundWindow')) ctx.groundTag = GroundTag.Opens;
      else if (a.tags.includes('terminalKnockdown')) ctx.groundTag = GroundTag.Terminal;
    }
    return;
  }
  t.state = MoveState.Hitstun;
  t.stun = hitstun;
}
