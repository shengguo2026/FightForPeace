import { fx } from '../math/fixed';
import { carryFull, dealDamage, nonCombatant } from './damage';
import { Cheat, heroCheat, outgoingDamage } from '../cheats/cheats';
import { bossBudgets, bossHit, bossResists } from '../enemies/boss';
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
import { bossResolve } from '../enemies/boss';
import { TEAM_FINISHERS, coopAction, logCoop } from '../coop/data';
import { canClaim, claimHandoff, openHandoff, partnerOf, targetState } from '../coop/handoff';
import { CoopEvent } from '../world/types';

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
    a.category !== 'throw' &&
    !a.tags.includes('evade') &&
    !a.tags.includes('objective')
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
  if (nonCombatant(t) || nonCombatant(att)) return false;
  if (t.state === MoveState.GetUp || t.state === MoveState.Recover) return false;
  // Restrained heroes are out of the fight. Held targets belong to their grabber's route,
  // except for the one tagged partner assist on an enemy a hero holds (F&D §6.7).
  if (t.state === MoveState.Restrained) return false;
  if (t.state === MoveState.Grabbed) return assistAllowed(att, a, t);
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

/** An enemy's running grab may be broken by a partner's strike (the partner-interrupt tag). */
function grabInterruptible(t: Fighter): boolean {
  const a = kitOf(t)?.actions[t.action];
  return a?.tags.includes(coopAction('interrupt').tag) ?? false;
}

/**
 * One Tagged Partner Assist: the free partner's action carrying the assist tag may strike
 * an enemy a hero holds, once per grab.
 */
function assistAllowed(att: Fighter, a: ActionDef, t: Fighter): boolean {
  return (
    att.team === 'hero' &&
    t.team !== 'hero' &&
    t.grabbedBy !== att.id &&
    t.assist === 1 &&
    a.tags.includes(coopAction('assist').tag)
  );
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

/** A strike contact waiting in a Combined Hit Bundle. */
interface Contact {
  att: Fighter;
  a: ActionDef;
  seg: number;
  src: HitSource;
}

/**
 * Targets that two or more heroes' strikes will reach on this frame (judged on the state at
 * the start of the hit pass): their contacts resolve together as one Combined Hit Bundle.
 */
function bundleTargets(bodies: readonly Fighter[]): Set<number> {
  const count = new Map<number, number>();
  for (const att of bodies) {
    if (att.team !== 'hero') continue;
    const a = runningAction(att);
    if (!a || !strikes(a)) continue;
    const seg = activeSegment(a, att.stateFrame + 1);
    if (seg < 0) continue;
    const ids = seg === att.hitSeg ? att.hitIds : [];
    const box = activeHitbox(att)!;
    for (const t of bodies) {
      if (ids.includes(t.id) || !canHit(att, a, t) || !overlaps(box, hurtbox(t))) continue;
      count.set(t.id, (count.get(t.id) ?? 0) + 1);
    }
  }
  return new Set([...count].filter(([, n]) => n >= 2).map(([id]) => id));
}

/**
 * Hit pass, after all movement. Attackers and targets are visited in ascending id order.
 * Heroes never hit heroes. Each target can be hit once per active segment. A contact on a
 * defender first goes through its defense (guard, exact block, counter), judged against
 * the defender's guard state as it was when this pass began. Same-frame strikes of both
 * heroes on one target form a Combined Hit Bundle, resolved before any enemy strikes.
 */
export function resolveHits(world: World): void {
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  const snaps = defenseSnapshots(bodies);
  const bundled = bundleTargets(bodies);
  const pending = new Map<number, Contact[]>();
  let flushed = bundled.size === 0;
  const flush = () => {
    if (flushed) return;
    flushed = true;
    for (const [id, list] of [...pending].sort((p, q) => p[0] - q[0])) {
      const t = bodies.find((b) => b.id === id)!;
      applyBundle(world, t, list);
      for (const c of list) afterContact(world, c.att, c.a, t);
    }
  };
  for (const att of bodies) {
    // Heroes have the low ids: their bundles land before any enemy strikes this frame.
    if (att.team !== 'hero') flush();
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
        if (
          t.state === MoveState.GuardCrush &&
          a.tags.includes('crushDisarm') &&
          !bossResists(world, t)
        )
          tryDisarm(world, att, a, t);
        continue;
      }
      att.hitIds.push(t.id);
      if (att.contactAt < 0) att.contactAt = att.stateFrame + 1;
      payContact(world, att, false);
      if (armored(t, a)) {
        // Armor: the strike lands (damage) but causes no reaction and opens no combo.
        dealDamage(world, t, outgoingDamage(world, att, a.damage));
        if (t.team === 'hero') logDefense(world, t, DefEvent.Armored, 0, att);
        continue;
      }
      if (att.team === 'hero' && bundled.has(t.id)) {
        const list = pending.get(t.id) ?? [];
        list.push({ att, a, seg, src: sourceOf(att) });
        pending.set(t.id, list);
        continue;
      }
      applyHit(world, sourceOf(att), a, seg, t);
      afterContact(world, att, a, t);
    }
  }
  flush();
  hitProjectiles(world, bodies);
  hitItems(world, bodies, snaps);
  hitBodies(world, bodies);
}

function afterContact(world: World, att: Fighter, a: ActionDef, t: Fighter): void {
  // Resolve-gated: the boss keeps its weapon until its Stagger Break.
  if (!bossResists(world, t)) tryDisarm(world, att, a, t);
  // Cinematic protection from the Ultimate's first valid contact until it ends.
  if (a.category === 'ultimate') att.cinematic = true;
}

function lifts(a: ActionDef): boolean {
  const k = a.reaction.kind;
  return k === 'launch' || k === 'knockdown' || k === 'trip';
}

/** What one hit paid, for the reaction that follows. */
interface Paid {
  downed: boolean;
  airborne: boolean;
  hitstun: number;
  band: number;
  juggleOut: boolean;
  dmg: number;
  last: boolean;
  first: boolean;
}

/** Shared numbers at the start of a bundle's frame (no player-slot ordering advantage). */
interface FrameStart {
  scale: number;
  stun: number;
  juggle: number;
  meter: number;
}

/** Opens the target's combo context if needed (the first confirmed hit). */
function openContext(world: World, t: Fighter): ComboContext {
  if (!t.ctx.open) {
    t.ctx = { ...emptyContext(), open: true };
    bossBudgets(world, t);
  }
  return t.ctx;
}

/** Damage-scale floor of a team finisher's part (its finisher's minScale). */
function scaleFloor(a: ActionDef): number {
  if (!a.tags.includes('teamFinisher')) return 0;
  return TEAM_FINISHERS.find((f) => f.move === a.id)?.minScale ?? 0;
}

/**
 * Pays one hit of action `a` (active segment `seg`) from source `s` on target `t`: opens
 * or continues the target's combo context, pays the budgets on the action's first hit,
 * awards meter and deals scaled damage. In a bundle, `start` holds the shared numbers of
 * the frame's start, so every participant uses the same scale, stun and meter band.
 */
function payHit(
  world: World,
  s: HitSource,
  a: ActionDef,
  seg: number,
  t: Fighter,
  start?: FrameStart,
): Paid {
  const ctx = openContext(world, t);
  t.thrownBy = 0;
  if (s.owner.team !== t.team) {
    t.lastHitBy = s.owner.id;
    t.lastHitFrame = world.frame;
  }

  const downed = t.state === MoveState.Down;
  const airborne = !downed && (t.y > 0 || t.state === MoveState.Launched);
  let k = s.contactIds.indexOf(t.id);
  const first = k === -1;
  let hitstun: number;
  let band = juggleBand(start ? start.juggle : ctx.juggleBudget);
  let juggleOut = false;
  if (first) {
    // Budgets and meter are paid once per offensive action, on its first hit.
    k = s.contactIds.length;
    s.contactIds.push(t.id);
    s.contactScales.push(start ? start.scale : ctx.scale);
    hitstun = scaledHitstun(a.reaction.hitstun, start ? start.stun : ctx.stunBudget);
    ctx.stunBudget = Math.max(0, ctx.stunBudget - a.stunDecayCost);
    if (ctx.stunBudget === 0) ctx.exhausted = true;
    // The juggle budget pays for holding or launching an airborne target; a ground
    // relaunch pays when its finisher resolves.
    if (airborne || (!downed && lifts(a))) {
      ctx.juggleBudget = Math.max(0, ctx.juggleBudget - a.juggleCost);
      juggleOut = a.juggleCost > 0 && ctx.juggleBudget === 0;
    }
    // A full carryover pool earns no self-refunding Attack meter (F&D §8). Each hero
    // earns only from its own participation.
    if (!carryFull(world, t)) awardHitMeter(world, s.owner, a, ctx, k, start?.meter);
    const cost = ctx.actions === 0 ? a.starterProration : a.damageScaleCost;
    ctx.scale = Math.max(DAMAGE_FLOOR, ctx.scale - cost);
    ctx.actions += 1;
    if (ctx.route.length < ROUTE_CAP) ctx.route.push(s.code);
  } else {
    hitstun = scaledHitstun(a.reaction.hitstun, ctx.stunBudget + a.stunDecayCost);
    band = juggleBand(ctx.juggleBudget + a.juggleCost);
  }
  const scale = Math.max(s.contactScales[k]!, scaleFloor(a));
  const dmg = outgoingDamage(world, s.owner, splitDamage(a.damage, scale, seg, segmentCount(a)));
  dealDamage(world, t, dmg);
  ctx.damage += dmg;
  ctx.lastDamage = dmg;
  ctx.hits += 1;
  return {
    downed,
    airborne,
    hitstun,
    band,
    juggleOut,
    dmg,
    last: seg === segmentCount(a) - 1,
    first,
  };
}

/** The reaction to a paid hit: ground route, the boss's Resolve, or the ordinary reaction. */
function reactHit(world: World, s: HitSource, a: ActionDef, t: Fighter, p: Paid): void {
  if (p.downed) groundReact(world, s, a, t, p.hitstun, p.last);
  else if (bossHit(world, a, t, p.dmg, pushDir(s, a, t))) {
    // Resolve absorbed the control: a limited flinch, or the Stagger Break telegraph.
    t.impactArmed = false;
  } else {
    react(world, s, a, t, p.hitstun, p.band, p.juggleOut, p.airborne, p.last);
    // Environment eligibility of this hit: an impact surface may now slam the target.
    t.impactArmed = impactEligible(a);
  }
}

/**
 * After the reaction: a team finisher's last hit concludes with protected recovery and
 * closes the combo context; a sender-tagged hit may open a handoff for the partner.
 */
function afterHit(world: World, s: HitSource, a: ActionDef, t: Fighter, p: Paid): void {
  if (a.tags.includes('teamFinisher')) {
    if (!p.last || t.protectedRecovery) return;
    enterProtection(world, t, Protect.TeamFinisher);
    world.coop.finishers += 1;
    logCoop(world, CoopEvent.Finisher, s.owner.id, partnerOf(world, s.owner)?.id ?? 0, t.id);
    return;
  }
  openHandoff(world, s.owner, a, t);
}

/**
 * Applies one hit of action `a` (active segment `seg`) from source `s` to target `t`:
 * opens or continues the target's combo context, pays the budgets on the action's first
 * hit, deals scaled damage and starts the reaction.
 */
export function applyHit(world: World, s: HitSource, a: ActionDef, seg: number, t: Fighter): void {
  if (assistHit(world, s, a, seg, t)) return;
  if (canClaim(world, s.owner, a, t, targetState(t))) claimHandoff(world, s.owner, t);
  const p = payHit(world, s, a, seg, t);
  reactHit(world, s, a, t, p);
  afterHit(world, s, a, t, p);
}

/**
 * The partner's grab assist (One Tagged Partner Assist): authored damage, scale and stun
 * costs and meter inside the held target's combo context, but no reaction: the hold stays
 * dominant. On the frame a grab finisher released the target the assist still lands, and
 * the finisher keeps the reaction.
 */
function assistHit(world: World, s: HitSource, a: ActionDef, seg: number, t: Fighter): boolean {
  const owner = s.owner;
  if (owner.team !== 'hero' || t.team === 'hero' || t.assist !== 1) return false;
  if (!a.tags.includes(coopAction('assist').tag)) return false;
  const held = t.state === MoveState.Grabbed && t.grabbedBy !== 0 && t.grabbedBy !== owner.id;
  const released = t.grabbedBy === 0 && t.releasedAt === world.frame && t.lastHitBy !== owner.id;
  if (!held && !released) return false;
  const grabber = held ? t.grabbedBy : t.lastHitBy;
  payHit(world, s, a, seg, t);
  t.assist = 2;
  world.coop.assists += 1;
  logCoop(world, CoopEvent.Assist, owner.id, grabber, t.id);
  return true;
}

/** Reaction priority in a bundle (F&D §6.5); higher wins. */
function priority(world: World, c: Contact, t: Fighter, state: number): number {
  const tags = c.a.tags;
  if (tags.includes('teamFinisher')) return 5;
  if (canClaim(world, c.att, c.a, t, state)) return 4;
  if (tags.includes('wallBounce') || tags.includes('groundBounce') || tags.includes('relaunch'))
    return 3;
  const k = c.a.reaction.kind;
  if (k === 'launch' || k === 'knockdown' || k === 'trip') return 2;
  return k === 'knockback' ? 1 : 0;
}

/**
 * Neutral deterministic tie-breaker from combat state and action identity: never the
 * player slot, the hero's id, host status or arrival order.
 */
function neutralKey(code: number, t: Fighter): number {
  let h = Math.imul(code ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(t.ctx.hits + 1, 0xc2b2ae35);
  h ^= Math.imul(t.ctx.actions + 7, 0x27d4eb2f);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * Combined Hit Bundle (F&D §6.5): every legal same-frame hit on one target contributes its
 * damage, costs and its owner's meter, all from the shared numbers at the start of the
 * frame; then one dominant reaction follows (team finisher, handoff receiver, special
 * forced reaction, launcher or knockdown, heavy, light), with a neutral tie-breaker. If the
 * bundle exhausts the budgets, the forced separation inside the reaction overrides it.
 */
function applyBundle(world: World, t: Fighter, list: readonly Contact[]): void {
  if (list.length === 1) {
    const c = list[0]!;
    applyHit(world, c.src, c.a, c.seg, t);
    return;
  }
  const state = targetState(t);
  const ctx = openContext(world, t);
  const start: FrameStart = {
    scale: ctx.scale,
    stun: ctx.stunBudget,
    juggle: ctx.juggleBudget,
    meter: ctx.meterBudget,
  };
  // Choose the dominant contact before anything is paid (claims read the open handoff).
  let d = 0;
  let best = -1;
  let bestKey = 0;
  list.forEach((c, i) => {
    const pr = priority(world, c, t, state);
    const key = neutralKey(c.src.code, t);
    if (pr > best || (pr === best && key < bestKey)) {
      d = i;
      best = pr;
      bestKey = key;
    }
  });
  const dom = list[d]!;
  if (best === 4) claimHandoff(world, dom.att, t);
  const paid = list.map((c) => payHit(world, c.src, c.a, c.seg, t, start));
  const boss = world.encounter?.boss;
  if (boss && boss.id === t.id)
    list.forEach((c, i) => {
      if (i !== d && !paid[i]!.downed) bossResolve(world, c.a, t, paid[i]!.dmg);
    });
  const p = { ...paid[d]!, juggleOut: paid.some((x) => x.juggleOut) };
  reactHit(world, dom.src, dom.a, t, p);
  afterHit(world, dom.src, dom.a, t, p);
  const c = world.coop;
  c.bundles += 1;
  c.bundleFrame = world.frame;
  c.bundleTarget = t.id;
  c.bundleHits = list.length;
  c.bundleDominant = dom.src.code;
  const other = list.find((x) => x.att !== dom.att)?.att.id ?? 0;
  // A finisher or claim already logged its own event this frame; the bundle is in `c`.
  if (best < 4) logCoop(world, CoopEvent.Bundle, dom.att.id, other, t.id, list.length);
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

  let kind = trip ? 'trip' : r.kind;
  t.vx = dir * push;
  t.vz = 0;
  // STEADYFEET: an eligible knockdown is a bounded standing stumble (launches remain).
  if ((kind === 'knockdown' || kind === 'trip') && heroCheat(world, t, Cheat.STEADYFEET))
    kind = 'stagger';
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
