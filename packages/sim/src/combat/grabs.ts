import { fx } from '../math/fixed';
import { nonCombatant } from './damage';
import { bossResists } from '../enemies/boss';
import {
  type Axis,
  type Fighter,
  type FrameInput,
  GrabEvent,
  MoveState,
  type World,
} from '../world/types';
import { ActionBit } from '../input/bits';
import { takeBuffered } from './buffer';
import { VerdictTo, resolveDir, selectAction, startAction } from './actions';
import { applyHit, canHit, hurtbox, runningAction, sourceOf, type HitSource } from './hits';
import { enter, interrupt, recoil, toActionable } from './reactions';
import { activeSegment, activeSpan, kitOf, routeAction, routeCodeOf, segmentCount } from './roster';
import { type ActionDef, Dir, Reject } from './types';

/**
 * Candidate grab constants (F&D §6.7, spec §7.8, Appendix B.6). Frames at 60 Hz; distances
 * fixed point. Reach comes from each grab action's hitbox (front edge = x + w).
 */
export const GRAB = {
  /** Grab cone: 45° half-angle around the grab direction. cos²(45°) in 1/10000. */
  coneCos2: 5000,
  /** Inside 22.5° of the grab direction counts as aligned (scored before distance). */
  alignedCos2: 8536,
  /** Where a held target stands, in front of the grabber. */
  holdDist: fx(72),
  /** Grab route decision window, and the fresh window after the extension. */
  decision: 45,
  afterExtension: 30,
  /** Re-grab immunity after any grab ends. */
  regrab: 30,
  /** Non-punishing recovery of the hero who lost a same-frame grab. */
  contested: 8,
  /** Timeout shove and Grab Escape separation. */
  shoveRecoil: 14,
  shovePush: fx(6),
  escapeRecoil: 14,
  escapePush: fx(7),
  /** Freeing a restrained partner with Interact: reach and the rescuer's short recovery. */
  rescueX: fx(140),
  rescueZ: fx(40),
  rescueRecovery: 10,
  /** Offensive buffer used for presses that arrive just before the hold starts. */
  buffer: 9,
} as const;

const byId = (world: World, id: number) => world.bodies.find((b) => b.id === id);

function logGrab(world: World, f: Fighter | undefined, event: number, offset = 0): void {
  if (!f || f.team !== 'hero') return;
  f.grabEvent = event;
  f.grabOffset = offset;
  f.grabFrame = world.frame;
}

/** States a standing grab may take a target from (never airborne, downed or protected). */
const UNGRABBABLE = new Set<number>([
  MoveState.Air,
  MoveState.Launched,
  MoveState.Down,
  MoveState.GetUp,
  MoveState.Recover,
  MoveState.Breaker,
  MoveState.Grabbing,
  MoveState.Grabbed,
  MoveState.Restrained,
]);

/** Can `g` grab `t` right now (ignoring reach and direction)? */
export function grabEligible(world: World, g: Fighter, t: Fighter): boolean {
  return (
    t.team !== g.team &&
    !t.protectedRecovery &&
    !t.cinematic &&
    t.y === 0 &&
    world.frame >= t.regrabUntil &&
    t.grabbedBy === 0 &&
    t.grabId === 0 &&
    !UNGRABBABLE.has(t.state) &&
    !nonCombatant(t) &&
    // Submission states need the boss's Resolve broken first.
    !bossResists(world, t)
  );
}

/** Unit vector ×256 of an 8-way direction. */
function unit(x: Axis, z: Axis): [number, number] {
  if (x !== 0 && z !== 0) return [x * 181, z * 181];
  return [x * 256, z * 256];
}

/**
 * Deterministic grab target (F&D §6.7): eligible targets inside the reach and the cone of
 * the grab direction; aligned ones (within 22.5°) first, then the nearest, then the lower id.
 */
export function pickTarget(world: World, g: Fighter, a: ActionDef): Fighter | null {
  const reach = Math.trunc((a.hitbox.x + a.hitbox.w) / 256);
  const [ux, uz] = unit(g.grabX || g.facing, g.grabZ);
  let best: Fighter | null = null;
  let bestAligned = false;
  let bestD = 0;
  for (const t of [...world.bodies].sort((p, q) => p.id - q.id)) {
    if (!grabEligible(world, g, t)) continue;
    const px = Math.trunc((t.x - g.x) / 256);
    const pz = Math.trunc((t.z - g.z) / 256);
    const d2 = px * px + pz * pz;
    if (d2 > reach * reach) continue;
    const dot = ux * px + uz * pz;
    let aligned = true;
    if (d2 > 0) {
      if (dot <= 0) continue;
      const lhs = dot * dot * 10000;
      if (lhs < GRAB.coneCos2 * 65536 * d2) continue;
      aligned = lhs >= GRAB.alignedCos2 * 65536 * d2;
    }
    const better =
      best === null || (aligned && !bestAligned) || (aligned === bestAligned && d2 < bestD);
    if (better) {
      best = t;
      bestAligned = aligned;
      bestD = d2;
    }
  }
  return best;
}

/**
 * Hero presses Interact with empty hands (Directional Intent Resolver): neutral next to a
 * restrained partner frees them; otherwise a directional or neutral standing grab.
 */
export function startGrabAttempt(world: World, f: Fighter, input: FrameInput): void {
  const neutral = input.moveX === 0 && input.moveZ === 0;
  if (neutral && tryRescue(world, f)) return;
  const index = selectAction(f, 'grab', Dir.Neutral);
  if (index < 0) return;
  let gx: Axis = f.facing;
  let gz: Axis = 0;
  if (!neutral) {
    // An explicit direction always wins over Assisted Facing.
    if (input.moveX !== 0) f.facing = input.moveX;
    gx = input.moveX;
    gz = input.moveZ;
  } else if (f.facingMode === 'assisted') {
    const t = nearestGrabbable(world, f);
    if (t && t.x !== f.x) f.facing = t.x > f.x ? 1 : -1;
    gx = f.facing;
  }
  startAction(f, index);
  f.grabX = gx;
  f.grabZ = gz;
}

function nearestGrabbable(world: World, f: Fighter): Fighter | null {
  let best: Fighter | null = null;
  let bestD = 0;
  for (const t of world.bodies) {
    if (!grabEligible(world, f, t)) continue;
    const dx = Math.trunc((t.x - f.x) / 256);
    const dz = Math.trunc((t.z - f.z) / 256);
    if (Math.abs(dx) > 200 || Math.abs(dz) > 60) continue;
    const d = dx * dx + dz * dz;
    if (best === null || d < bestD || (d === bestD && t.id < best.id)) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** Neutral Interact next to a restrained partner: frees them at once. */
export function tryRescue(world: World, f: Fighter): boolean {
  for (const ally of [...world.bodies].sort((p, q) => p.id - q.id)) {
    if (ally === f || ally.team !== f.team || ally.state !== MoveState.Restrained) continue;
    if (Math.abs(ally.x - f.x) > GRAB.rescueX || Math.abs(ally.z - f.z) > GRAB.rescueZ) continue;
    toActionable(ally);
    ally.regrabUntil = world.frame + GRAB.regrab;
    logGrab(world, ally, GrabEvent.Rescued);
    logGrab(world, f, GrabEvent.RescuedPartner);
    enter(f, MoveState.Landing, GRAB.rescueRecovery);
    f.vx = 0;
    f.vz = 0;
    return true;
  }
  return false;
}

interface Claim {
  g: Fighter;
  t: Fighter;
  d2: number;
}

/**
 * Grab pass, after movement and before strikes: grab attempts in their connect frames
 * claim a target (two claims on one target: the nearer grabber wins, a tie alternates by
 * frame parity); then grab-route moves act on their held targets.
 */
export function resolveGrabs(world: World): void {
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  const claims = new Map<number, Claim[]>();
  for (const g of bodies) {
    const a = runningAction(g);
    if (!a || a.category !== 'grab' || g.grabId !== 0) continue;
    const n = g.stateFrame + 1;
    const end = a.startup + activeSpan(a);
    if (n <= a.startup || n > end) continue;
    const t = pickTarget(world, g, a);
    if (!t) {
      if (n === end && g.team === 'hero') {
        verdict(world, g, Reject.NoTarget);
        logGrab(world, g, GrabEvent.Whiff);
      }
      continue;
    }
    const dx = Math.trunc((t.x - g.x) / 256);
    const dz = Math.trunc((t.z - g.z) / 256);
    const list = claims.get(t.id) ?? [];
    list.push({ g, t, d2: dx * dx + dz * dz });
    claims.set(t.id, list);
  }
  for (const [, list] of [...claims].sort((p, q) => p[0] - q[0])) {
    const even = world.frame % 2 === 0;
    list.sort((p, q) => p.d2 - q.d2 || (even ? p.g.id - q.g.id : q.g.id - p.g.id));
    const [win, ...lose] = list;
    for (const c of lose) {
      // A non-punishing failed contact: the other hero got there first.
      c.g.action = -1;
      c.g.attackKind = 0;
      enter(c.g, MoveState.Landing, GRAB.contested);
      c.g.vx = 0;
      c.g.vz = 0;
      verdict(world, c.g, Reject.Contested);
      logGrab(world, c.g, GrabEvent.Contested);
    }
    connect(world, win!.g, win!.t);
  }

  for (const g of bodies) {
    if (g.grabId === 0) continue;
    const a = runningAction(g);
    if (!a || (a.category !== 'grabStrike' && a.category !== 'throw')) continue;
    const t = byId(world, g.grabId);
    if (!t || t.grabbedBy !== g.id) continue;
    const n = g.stateFrame + 1;
    const seg = activeSegment(a, n);
    if (seg < 0 || seg === g.hitSeg) continue;
    g.hitSeg = seg;
    if (g.contactAt < 0) g.contactAt = n;
    routeHit(world, g, t, a, seg);
  }
}

function verdict(world: World, g: Fighter, reject: number): void {
  if (g.team !== 'hero') return;
  g.verdictTo = VerdictTo.Grab;
  g.verdictReject = reject;
  g.verdictFrame = world.frame;
}

/** A grab connects: the grabber holds, the target is held in front of it. */
function connect(world: World, g: Fighter, t: Fighter): void {
  g.state = MoveState.Grabbing;
  g.stateFrame = 0;
  g.grabId = t.id;
  g.grabStart = world.frame;
  g.vx = 0;
  g.vz = 0;
  if (g.team === 'hero') {
    // Heroes leave the attempt behind and enter the route's decision window.
    g.action = -1;
    g.attackKind = 0;
    g.stun = GRAB.decision;
    g.grabExtUsed = false;
    g.bufAction = 0;
    verdict(world, g, Reject.None);
  }
  interrupt(t);
  t.state = MoveState.Grabbed;
  t.stateFrame = 0;
  t.stun = 0;
  t.grabbedBy = g.id;
  t.vx = 0;
  t.vz = 0;
  t.vy = 0;
  t.y = 0;
  t.escapeTried = false;
  t.bufAction = 0;
  t.facing = g.facing === 1 ? -1 : 1;
  t.thrownBy = 0;
  place(world, g, t);
  logGrab(world, g, GrabEvent.Hold);
  logGrab(world, t, GrabEvent.Grabbed);
}

/** Ends the link between grabber and target and starts the target's re-grab immunity. */
function release(world: World, g: Fighter, t: Fighter): void {
  g.grabId = 0;
  t.grabbedBy = 0;
  t.regrabUntil = world.frame + GRAB.regrab;
}

function hold(t: Fighter): void {
  t.state = MoveState.Grabbed;
  t.stateFrame = 0;
  t.vx = 0;
  t.vz = 0;
  t.vy = 0;
  t.y = 0;
}

/** One grab-route move segment on the held target. */
function routeHit(world: World, g: Fighter, t: Fighter, a: ActionDef, seg: number): void {
  const last = seg === segmentCount(a) - 1;
  if (a.category === 'throw') {
    release(world, g, t);
    if (a.tags.includes('throwBack')) t.x = g.x - g.facing * GRAB.holdDist;
    applyHit(world, sourceOf(g), a, seg, t);
    if (a.tags.includes('bodyProjectile') && t.state === MoveState.Launched) {
      t.thrownBy = g.id;
      t.thrownCode = routeCodeOf(g);
    }
    logGrab(world, g, GrabEvent.Throw);
    return;
  }
  const finisher = a.context === 'grabRelease' || a.context === 'grabSpecial';
  if (finisher && last) {
    release(world, g, t);
    applyHit(world, sourceOf(g), a, seg, t);
    logGrab(
      world,
      g,
      a.context === 'grabSpecial' ? GrabEvent.SpecialFinish : GrabEvent.ReleaseStrike,
    );
    return;
  }
  applyHit(world, sourceOf(g), a, seg, t);
  // Still held, unless the combo's budgets ran out (protected separation): then the
  // integrity pass lets go.
  if (!t.protectedRecovery) hold(t);
  if (a.context === 'grabExtension') logGrab(world, g, GrabEvent.Extension);
}

/**
 * One frame of a hero holding a target (the grab route's decision window). Attack: the
 * extension, then the release strike; Interact: a throw (Backward: the back throw);
 * Special: the Special finisher; nothing until the window ends: a separating shove.
 */
export function stepHeroHold(world: World, f: Fighter, input: FrameInput): void {
  f.stateFrame += 1;
  const t = byId(world, f.grabId);
  if (!t || t.grabbedBy !== f.id) {
    f.grabId = 0;
    toActionable(f);
    return;
  }
  const buffered = takeBuffered(f, world.frame, GRAB.buffer);
  const pressed = input.pressed | buffered;
  let context: 'grabExtension' | 'grabRelease' | 'grabThrow' | 'grabSpecial' | null = null;
  let dir: number = Dir.Neutral;
  if (pressed & (ActionBit.Attack | ActionBit.LowAttack)) {
    context = f.grabExtUsed ? 'grabRelease' : 'grabExtension';
  } else if (pressed & ActionBit.Interact) {
    context = 'grabThrow';
    dir = resolveDir(f, input) === Dir.Backward ? Dir.Backward : Dir.Neutral;
  } else if (pressed & ActionBit.Special) {
    context = 'grabSpecial';
  }
  if (context) {
    const index = selectAction(f, context, dir);
    if (index >= 0) {
      startAction(f, index);
      if (context === 'grabExtension') f.grabExtUsed = true;
      return;
    }
  }
  if (world.frame - f.grabStart >= f.stun) shove(world, f, t);
}

/** After the extension: back to holding, with a fresh (shorter) decision window. */
export function resumeHold(world: World, f: Fighter): void {
  f.state = MoveState.Grabbing;
  f.stateFrame = 0;
  f.grabStart = world.frame;
  f.stun = GRAB.afterExtension;
  f.action = -1;
  f.attackKind = 0;
  f.vx = 0;
  f.vz = 0;
}

/** The decision window ran out: a simple separating shove, no damage. */
function shove(world: World, g: Fighter, t: Fighter): void {
  release(world, g, t);
  recoil(t, GRAB.shoveRecoil, g.facing * GRAB.shovePush);
  toActionable(g);
  logGrab(world, g, GrabEvent.Shove);
}

/**
 * One frame of an enemy holding a hero. At the end of the hold its finisher lands: the
 * action's damage and reaction (a throw), or, tagged `restraint`, the hero is restrained.
 */
export function stepEnemyHold(world: World, f: Fighter): void {
  f.stateFrame += 1;
  const a = kitOf(f)?.actions[f.action];
  const t = byId(world, f.grabId);
  if (!a?.grab || !t || t.grabbedBy !== f.id) {
    f.grabId = 0;
    toActionable(f);
    f.action = -1;
    return;
  }
  if (world.frame - f.grabStart < a.grab.hold) return;
  release(world, f, t);
  applyHit(world, sourceOf(f), a, 0, t);
  if (a.tags.includes('restraint')) {
    interrupt(t);
    t.state = MoveState.Restrained;
    t.stateFrame = 0;
    t.stun = a.grab.restraint;
    t.vx = 0;
    t.vz = 0;
    t.vy = 0;
    t.y = 0;
    logGrab(world, t, GrabEvent.Restrained);
  } else {
    logGrab(world, t, GrabEvent.Thrown);
  }
  // The grab's own recovery follows.
  f.state = MoveState.Attack;
  f.stateFrame = a.startup + activeSpan(a);
}

/** Hold frame (0-based) of the hold `g` is running. */
export function holdFrame(world: World, g: Fighter): number {
  return world.frame - g.grabStart;
}

/** Is the Grab Escape window of this held hero open right now? (the telegraph) */
export function escapeOpen(world: World, t: Fighter): boolean {
  if (t.state !== MoveState.Grabbed || t.grabbedBy === 0) return false;
  const g = byId(world, t.grabbedBy);
  const a = g ? kitOf(g)?.actions[g.action] : undefined;
  if (!g || !a?.grab) return false;
  const h = holdFrame(world, g);
  return h >= a.grab.escapeFrom && h < a.grab.escapeFrom + a.grab.escapeWindow;
}

/**
 * Grab Escape (Telegraph-and-Break): the first fresh Guard press during an enemy hold is
 * the one attempt. Inside the window both separate with no damage; early or late fails and
 * the enemy's route continues.
 */
export function tryEscape(world: World, t: Fighter): void {
  if (t.escapeTried || t.grabbedBy === 0) return;
  const g = byId(world, t.grabbedBy);
  const a = g ? kitOf(g)?.actions[g.action] : undefined;
  if (!g || !a?.grab) return;
  t.escapeTried = true;
  const h = holdFrame(world, g);
  const from = a.grab.escapeFrom;
  const to = from + a.grab.escapeWindow;
  if (h < from) {
    logGrab(world, t, GrabEvent.EscapeEarly, from - h);
    return;
  }
  if (h >= to) {
    logGrab(world, t, GrabEvent.EscapeLate, h - to + 1);
    return;
  }
  release(world, g, t);
  g.regrabUntil = world.frame + GRAB.regrab;
  const dir = t.x === g.x ? -t.facing : t.x > g.x ? 1 : -1;
  recoil(t, GRAB.escapeRecoil, dir * GRAB.escapePush);
  recoil(g, GRAB.escapeRecoil, -dir * GRAB.escapePush);
  logGrab(world, t, GrabEvent.Escape, h - from);
}

/** Is a fighter in a state that keeps holding its grabbed target? */
function holding(world: World, f: Fighter): boolean {
  if (f.state === MoveState.Grabbing) return true;
  const a = runningAction(f);
  return !!a && (a.category === 'grabStrike' || a.category === 'throw') && f.team === 'hero';
}

/**
 * Integrity pass, after all hits: a grab is valid only while the grabber holds and the
 * target is held by that grabber. Anything else (the grabber was hit, the target was
 * freed) releases both sides safely, with re-grab immunity for the target.
 */
export function grabIntegrity(world: World): void {
  for (const f of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (f.grabId !== 0) {
      const t = byId(world, f.grabId);
      const valid =
        !!t && t.grabbedBy === f.id && t.state === MoveState.Grabbed && holding(world, f);
      if (!valid) {
        f.grabId = 0;
        if (f.state === MoveState.Grabbing) {
          toActionable(f);
          f.action = -1;
        }
        if (t && t.grabbedBy === f.id) {
          t.grabbedBy = 0;
          t.regrabUntil = world.frame + GRAB.regrab;
          if (t.state === MoveState.Grabbed) toActionable(t);
          // A hero freed because a partner struck the enemy holding it: a rescue.
          logGrab(world, t, GrabEvent.Rescued);
        }
        logGrab(world, f, GrabEvent.Interrupted);
      }
    }
    if (f.grabbedBy !== 0) {
      const g = byId(world, f.grabbedBy);
      if (!g || g.grabId !== f.id) {
        f.grabbedBy = 0;
        f.regrabUntil = world.frame + GRAB.regrab;
        if (f.state === MoveState.Grabbed) toActionable(f);
      }
    } else if (f.state === MoveState.Grabbed) {
      toActionable(f);
    }
    if (f.thrownBy !== 0 && f.state !== MoveState.Launched) f.thrownBy = 0;
  }
}

/** Keeps every held target in front of its grabber (after collision), inside the stage. */
export function holdPositions(world: World): void {
  for (const g of world.bodies) {
    if (g.grabId === 0) continue;
    const t = byId(world, g.grabId);
    if (t && t.state === MoveState.Grabbed) place(world, g, t);
  }
}

function place(world: World, g: Fighter, t: Fighter): void {
  const { minX, maxX } = world.bounds;
  const x = g.x + g.facing * GRAB.holdDist;
  t.x = x < minX ? minX : x > maxX ? maxX : x;
  t.z = g.z;
  t.y = 0;
}

/** The thrown body's collision with the enemy it hits: a knockdown of its own. */
const BODY_ACTIONS = new Map<string, ActionDef>();
function bodyAction(a: ActionDef): ActionDef {
  let b = BODY_ACTIONS.get(a.id + a.pose);
  if (!b) {
    b = {
      ...a,
      damage: a.bodyDamage,
      active: [1],
      reaction: {
        kind: 'knockdown',
        hitstun: 30,
        push: fx(6),
        lift: fx(5),
        airPop: fx(3),
        counterTrip: false,
      },
      tags: ['terminalKnockdown'],
    };
    BODY_ACTIONS.set(a.id + a.pose, b);
  }
  return b;
}

/**
 * Controlled Single-Impact Collision (F&D §6.7): a body thrown with `bodyProjectile` hits
 * the first other enemy it overlaps (nearest along the throw, then the lower id) once;
 * then its damaging body switches off. Heroes are ignored. The struck enemy gets its own
 * combo context; the thrower earns only the crowd bonus.
 */
export function hitBodies(world: World, bodies: readonly Fighter[]): void {
  for (const f of bodies) {
    if (f.thrownBy === 0 || f.state !== MoveState.Launched) continue;
    const thrower = byId(world, f.thrownBy);
    const a = routeAction(f.thrownCode);
    if (!thrower || !a) {
      f.thrownBy = 0;
      continue;
    }
    const hb = hurtbox(f);
    let best: Fighter | null = null;
    let bestD = 0;
    for (const e of bodies) {
      if (e === f || e.team !== f.team || !canHit(thrower, a, e)) continue;
      const eb = hurtbox(e);
      const overlap =
        hb.x0 < eb.x1 &&
        eb.x0 < hb.x1 &&
        hb.y0 < eb.y1 &&
        eb.y0 < hb.y1 &&
        Math.abs(hb.z - eb.z) <= hb.depth + eb.depth;
      if (!overlap) continue;
      const d = Math.abs(e.x - f.x);
      if (best === null || d < bestD) {
        best = e;
        bestD = d;
      }
    }
    if (!best) continue;
    const src: HitSource = {
      owner: thrower,
      x: f.x,
      facing: f.vx > 0 ? 1 : f.vx < 0 ? -1 : thrower.facing,
      vx: 0,
      // The thrown enemy was the action's first target: this one earns the crowd bonus.
      contactIds: [f.id],
      contactScales: [100],
      code: f.thrownCode,
    };
    applyHit(world, src, bodyAction(a), 0, best);
    f.thrownBy = 0;
    f.vx = Math.trunc(f.vx / 2);
    logGrab(world, thrower, GrabEvent.BodyHit);
  }
}

/** Restrained heroes wait for a rescue; the time-out frees them (a solo hero is never stuck). */
export function stepRestraint(world: World, f: Fighter): boolean {
  f.stateFrame += 1;
  if (f.stateFrame < f.stun) return true;
  f.regrabUntil = world.frame + GRAB.regrab;
  logGrab(world, f, GrabEvent.RestraintEnded);
  return toActionable(f);
}
