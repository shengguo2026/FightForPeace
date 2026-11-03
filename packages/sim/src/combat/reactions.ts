import { fx } from '../math/fixed';
import { Bounce, type Fighter, GroundTag, MoveState, Protect, type World } from '../world/types';
import { GROUND_BOUNCE_COST, WALL_BOUNCE_COST, bandLift, juggleBand } from './context';

/** Candidate reaction constants (frames, fixed point). */
export const REACTION = {
  gravity: 256,
  downFrames: 36,
  getUpFrames: 12,
  /** Forced safe separation when the hit-stun budget runs out (protected soft reset). */
  separationHitstun: 12,
  separationPush: 8 * 256,
  /** Protected landing after air recovery. */
  recoverFrames: 12,
  /** Ground window opened by an opensGroundWindow knockdown, and re-opened by an extension. */
  groundWindow: 40,
  groundFollowWindow: 40,
  /** Upward speed of a wall rebound or ground bounce (before the juggle band). */
  bounceLift: fx(8),
  /** Rebound speed off a wall, and the speed a target needs to rebound at all. */
  wallRebound: fx(4),
  wallMinSpeed: fx(4),
} as const;

export function inReaction(f: Fighter): boolean {
  return (
    f.state === MoveState.Hitstun ||
    f.state === MoveState.Launched ||
    f.state === MoveState.Down ||
    f.state === MoveState.GetUp ||
    f.state === MoveState.Recover
  );
}

/** Push decays by 1/8 per frame (integer, symmetric for both signs). */
function decay(v: number): number {
  return v - Math.trunc(v / 8);
}

/**
 * Advances a fighter that is in a reaction state by one frame. Returns true while the
 * fighter is still reacting (not actionable).
 */
export function stepReaction(world: World, f: Fighter): boolean {
  switch (f.state) {
    case MoveState.Hitstun:
      f.stateFrame += 1;
      f.x += f.vx;
      f.z += f.vz;
      f.vx = decay(f.vx);
      f.vz = decay(f.vz);
      if (wallCheck(world, f)) return true;
      if (f.stateFrame >= f.stun) return toActionable(f);
      return true;
    case MoveState.Launched:
      f.stateFrame += 1;
      f.x += f.vx;
      f.z += f.vz;
      f.y += f.vy;
      f.vy -= f.heavyFall ? REACTION.gravity + REACTION.gravity / 2 : REACTION.gravity;
      if (wallCheck(world, f)) return true;
      if (f.y <= 0) land(world, f);
      return true;
    case MoveState.Down:
      f.stateFrame += 1;
      f.x += f.vx;
      f.vx = decay(f.vx);
      if (f.groundWindow > 0) {
        f.groundWindow -= 1;
        // Missing the authored ground window leads directly to protected recovery.
        if (f.groundWindow === 0) enterProtection(world, f, Protect.MissedWindow);
      }
      if (f.stateFrame >= f.stun) enter(f, MoveState.GetUp, REACTION.getUpFrames);
      return true;
    case MoveState.GetUp:
    case MoveState.Recover:
      f.stateFrame += 1;
      if (f.stateFrame >= f.stun) return toActionable(f);
      return true;
    default:
      return false;
  }
}

/** Touchdown of a launched fighter: protected landing, ground bounce, ground window or get-up. */
function land(world: World, f: Fighter): void {
  const ctx = f.ctx;
  f.y = 0;
  f.vy = 0;
  if (f.airRecover) {
    f.vx = 0;
    f.vz = 0;
    enter(f, MoveState.Recover, REACTION.recoverFrames);
    enterProtection(world, f, Protect.AirRecovery);
    return;
  }
  if (ctx.open && f.bounce & Bounce.Ground && !ctx.groundBounceUsed) {
    ctx.groundBounceUsed = true;
    f.bounce &= ~Bounce.Ground;
    const band = juggleBand(ctx.juggleBudget);
    ctx.juggleBudget = Math.max(0, ctx.juggleBudget - GROUND_BOUNCE_COST);
    f.vy = bandLift(REACTION.bounceLift, band);
    f.y = 1;
    f.vx = Math.trunc(f.vx / 2);
    f.heavyFall = band === 40;
    if (ctx.juggleBudget === 0) exhaustJuggle(world, f);
    return;
  }
  f.vx = 0;
  f.vz = 0;
  f.bounce = 0;
  f.heavyFall = false;
  if (ctx.open && !ctx.exhausted && ctx.groundTag === GroundTag.Opens && !ctx.groundOpened) {
    ctx.groundOpened = true;
    enter(f, MoveState.Down, REACTION.groundWindow);
    f.groundWindow = REACTION.groundWindow;
    return;
  }
  enter(f, MoveState.Down, REACTION.downFrames);
  if (ctx.open) enterProtection(world, f, Protect.GetUp);
}

/**
 * Wall rebound: a target armed by a wallBounce hit that reaches a stage edge fast enough
 * bounces off once per combo. Returns true when it rebounded this frame.
 */
function wallCheck(world: World, f: Fighter): boolean {
  if (!(f.bounce & Bounce.Wall)) return false;
  const { minX, maxX } = world.bounds;
  const right = f.x >= maxX && f.vx > 0;
  const left = f.x <= minX && f.vx < 0;
  if (!right && !left) return false;
  f.bounce &= ~Bounce.Wall;
  const ctx = f.ctx;
  if (!ctx.open || ctx.wallBounceUsed || Math.abs(f.vx) < REACTION.wallMinSpeed) return false;
  ctx.wallBounceUsed = true;
  const band = juggleBand(ctx.juggleBudget);
  ctx.juggleBudget = Math.max(0, ctx.juggleBudget - WALL_BOUNCE_COST);
  f.x = right ? maxX : minX;
  f.state = MoveState.Launched;
  f.stateFrame = 0;
  f.vx = right ? -REACTION.wallRebound : REACTION.wallRebound;
  f.vz = 0;
  f.vy = bandLift(REACTION.bounceLift, band);
  f.y = Math.max(f.y, 1);
  f.heavyFall = band === 40;
  f.airRecover = false;
  if (ctx.juggleBudget === 0) exhaustJuggle(world, f);
  return true;
}

/** The juggle budget ran out: the target drifts down in protected air recovery. */
export function exhaustJuggle(world: World, f: Fighter): void {
  f.state = MoveState.Launched;
  f.vy = Math.min(f.vy, 0);
  f.airRecover = true;
  f.bounce = 0;
  enterProtection(world, f, Protect.AirRecovery);
}

/**
 * Protected recovery (F&D §6.4): closes the combo context at once (its numbers stay for
 * the Lab), and the fighter cannot be hit until it is actionable again.
 */
export function enterProtection(world: World, f: Fighter, kind: number): void {
  f.protectedRecovery = true;
  f.groundWindow = 0;
  f.bounce = 0;
  if (f.ctx.open) {
    f.ctx.open = false;
    f.ctx.ended = kind;
    refill(world, f);
  }
}

export function enter(f: Fighter, state: MoveState, frames: number): void {
  f.state = state;
  f.stateFrame = 0;
  f.stun = frames;
}

function toActionable(f: Fighter): false {
  f.state = MoveState.Idle;
  f.stateFrame = 0;
  f.stun = 0;
  f.vx = 0;
  f.vz = 0;
  f.vy = 0;
  f.airRecover = false;
  f.protectedRecovery = false;
  f.heavyFall = false;
  f.bounce = 0;
  f.groundWindow = 0;
  return false;
}

function refill(world: World, f: Fighter): void {
  if (world.dummy.refill && f.team === 'enemy') f.health = f.maxHealth;
}

/**
 * Closes the target's combo context once it is actionable again. Every budget, quota, the
 * damage scale and the dash bridge reset with the next hit (which opens a fresh context);
 * the closed context's numbers stay readable. The Lab may refill health.
 */
export function closeContextIfActionable(world: World, f: Fighter): void {
  if (!f.ctx.open || inReaction(f)) return;
  f.ctx.open = false;
  refill(world, f);
}
