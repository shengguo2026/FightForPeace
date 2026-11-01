import { type Fighter, MoveState, type World } from '../world/types';
import { emptyContext } from './context';

/** Candidate reaction constants (frames, fixed point). */
export const REACTION = {
  gravity: 256,
  downFrames: 36,
  getUpFrames: 12,
  /** Forced safe separation when the hit-stun budget runs out. */
  separationHitstun: 12,
  separationPush: 8 * 256,
} as const;

/** Can this fighter be hit right now? Downed and getting-up targets cannot (M2). */
export function hittable(f: Fighter): boolean {
  return f.state !== MoveState.Down && f.state !== MoveState.GetUp;
}

export function inReaction(f: Fighter): boolean {
  return (
    f.state === MoveState.Hitstun ||
    f.state === MoveState.Launched ||
    f.state === MoveState.Down ||
    f.state === MoveState.GetUp
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
export function stepReaction(f: Fighter): boolean {
  switch (f.state) {
    case MoveState.Hitstun:
      f.stateFrame += 1;
      f.x += f.vx;
      f.z += f.vz;
      f.vx = decay(f.vx);
      f.vz = decay(f.vz);
      if (f.stateFrame >= f.stun) return toActionable(f);
      return true;
    case MoveState.Launched:
      f.stateFrame += 1;
      f.x += f.vx;
      f.z += f.vz;
      f.y += f.vy;
      f.vy -= REACTION.gravity;
      if (f.y <= 0) {
        f.y = 0;
        f.vy = 0;
        f.vx = 0;
        f.vz = 0;
        if (f.airRecover) return toActionable(f);
        enter(f, MoveState.Down, REACTION.downFrames);
      }
      return true;
    case MoveState.Down:
      f.stateFrame += 1;
      if (f.stateFrame >= f.stun) enter(f, MoveState.GetUp, REACTION.getUpFrames);
      return true;
    case MoveState.GetUp:
      f.stateFrame += 1;
      if (f.stateFrame >= f.stun) return toActionable(f);
      return true;
    default:
      return false;
  }
}

function enter(f: Fighter, state: MoveState, frames: number): void {
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
  return false;
}

/**
 * Closes the target's combo context once it is actionable again: every budget, the
 * damage scale and the dash bridge reset; the Lab may refill health.
 */
export function closeContextIfActionable(world: World, f: Fighter): void {
  if (!f.ctx.open || inReaction(f)) return;
  f.ctx = emptyContext();
  if (world.dummy.refill && f.team === 'enemy') f.health = f.maxHealth;
}
