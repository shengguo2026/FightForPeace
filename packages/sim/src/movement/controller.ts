import { fxMul } from '../math/fixed';
import { ActionBit, DirBit, OFFENSIVE_MASK } from '../input/bits';
import { type Axis, type Fighter, type FrameInput, MoveState, type World } from '../world/types';
import { bufferPress, takeBuffered } from '../combat/buffer';
import type { MovementProfile } from './profile';

/** "No unconsumed press" marker for Fighter.lastTap. */
export const NO_TAP = -1_000_000;

const DIR_BITS = [DirBit.up, DirBit.down, DirBit.left, DirBit.right] as const;
const DIR_VECTORS: readonly [Axis, Axis][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
const OPPOSITE = [1, 0, 3, 2] as const;

export interface DashRequest {
  dx: Axis;
  dz: Axis;
}

/**
 * Double-tap detector. A press of a direction counts as a double tap when the same
 * direction was pressed no more than `window` frames earlier and nothing consumed that
 * press. Pressing the opposite direction forgets the earlier press, so D, A, D is not a
 * dash. Returns the tapped directions combined, or null.
 */
export function detectDoubleTap(
  f: Fighter,
  dirPressed: number,
  frame: number,
  window: number,
): DashRequest | null {
  if (dirPressed === 0) return null;
  let dx = 0;
  let dz = 0;
  let hit = false;
  for (let i = 0; i < 4; i += 1) {
    if ((dirPressed & DIR_BITS[i]!) === 0) continue;
    f.lastTap[OPPOSITE[i]!] = NO_TAP;
    if (frame - f.lastTap[i]! <= window) {
      hit = true;
      f.lastTap[i] = NO_TAP;
      dx += DIR_VECTORS[i]![0];
      dz += DIR_VECTORS[i]![1];
    } else {
      f.lastTap[i] = frame;
    }
  }
  return hit ? { dx: sign(dx), dz: sign(dz) } : null;
}

function sign(v: number): Axis {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** Speed vector for a direction, with normalized diagonals. */
export function directed(
  dx: Axis,
  dz: Axis,
  speedX: number,
  speedZ: number,
  diagonal: number,
): [number, number] {
  let vx = dx * speedX;
  let vz = dz * speedZ;
  if (dx !== 0 && dz !== 0) {
    vx = fxMul(vx, diagonal);
    vz = fxMul(vz, diagonal);
  }
  return [vx || 0, vz || 0];
}

function actionable(f: Fighter): boolean {
  return f.state === MoveState.Idle || f.state === MoveState.Walk || f.state === MoveState.Dash;
}

/** Advances one hero by one frame. Collision runs afterwards, for all fighters at once. */
export function stepHero(world: World, f: Fighter, input: FrameInput, p: MovementProfile): void {
  const frame = world.frame;
  const tap = detectDoubleTap(f, input.dirPressed, frame, p.doubleTapFrames);
  bufferPress(f, input.pressed & OFFENSIVE_MASK, frame, p.bufferFrames);
  const dashPressed = (input.pressed & ActionBit.Dash) !== 0;

  // 1. Advance the current state; it may become actionable this frame.
  let chained = false;
  let moved = false;
  switch (f.state) {
    case MoveState.Attack:
      f.stateFrame += 1;
      if (f.stateFrame >= p.attackFrames) {
        f.state = MoveState.Idle;
        f.attackKind = 0;
        chained = true;
      }
      break;
    case MoveState.Dash:
      f.stateFrame += 1;
      if (f.stateFrame >= p.dashFrames) toIdle(f);
      break;
    case MoveState.Air:
      airStep(f, input, p);
      moved = true;
      break;
    default:
      break;
  }

  // 2. Start a new action if allowed. Buffered offensive actions win over a dash.
  if (actionable(f)) {
    const action = takeBuffered(f, frame, p.bufferFrames);
    if (action === ActionBit.Jump) {
      startJump(f, input, p);
    } else if (action !== 0) {
      startAttack(world, f, input, action, chained, p);
    } else if (f.state !== MoveState.Dash && (tap !== null || dashPressed)) {
      const [hx, hz] = [input.moveX, input.moveZ];
      if (hx !== 0 || hz !== 0) startDash(f, hx, hz, p);
      else if (tap !== null) startDash(f, tap.dx, tap.dz, p);
      else startDash(f, f.facing, 0, p);
    }
  }

  // 3. Move according to the (possibly new) state.
  if (moved) return;
  switch (f.state) {
    case MoveState.Idle:
    case MoveState.Walk: {
      const [vx, vz] = directed(input.moveX, input.moveZ, p.walkX, p.walkZ, p.diagonal);
      f.vx = vx;
      f.vz = vz;
      f.state = vx !== 0 || vz !== 0 ? MoveState.Walk : MoveState.Idle;
      if (input.moveX !== 0) f.facing = input.moveX;
      f.x += vx;
      f.z += vz;
      break;
    }
    case MoveState.Dash:
      f.x += f.vx;
      f.z += f.vz;
      break;
    case MoveState.Air:
      airStep(f, input, p);
      break;
    default:
      break; // Attack: rooted in place.
  }
}

function toIdle(f: Fighter): void {
  f.state = MoveState.Idle;
  f.stateFrame = 0;
  f.vx = 0;
  f.vz = 0;
  f.vy = 0;
  f.dirX = 0;
  f.dirZ = 0;
}

function startDash(f: Fighter, dx: Axis, dz: Axis, p: MovementProfile): void {
  f.state = MoveState.Dash;
  f.stateFrame = 0;
  f.dirX = dx;
  f.dirZ = dz;
  [f.vx, f.vz] = directed(dx, dz, p.dashX, p.dashZ, p.diagonal);
  if (dx !== 0) f.facing = dx;
}

function startJump(f: Fighter, input: FrameInput, p: MovementProfile): void {
  // A jump out of a dash keeps the dash direction; otherwise the held direction decides.
  const fromDash = f.state === MoveState.Dash;
  const dx = fromDash ? f.dirX : input.moveX;
  const dz = fromDash ? f.dirZ : input.moveZ;
  f.state = MoveState.Air;
  f.stateFrame = 0;
  f.dirX = dx;
  f.dirZ = dz;
  [f.vx, f.vz] = directed(dx, dz, p.walkX, p.walkZ, p.diagonal);
  f.vy = p.jumpVy;
  if (dx !== 0) f.facing = dx;
}

/** One airborne frame: limited correction, gravity, landing. Facing never changes here. */
function airStep(f: Fighter, input: FrameInput, p: MovementProfile): void {
  f.vx = correct(f.vx, input.moveX, f.dirX, p.airAccel, p.walkX, p.airReverseX, p.airNeutralX);
  f.vz = correct(f.vz, input.moveZ, f.dirZ, p.airAccel, p.walkZ, p.airReverseZ, p.airNeutralZ);
  f.x += f.vx;
  f.z += f.vz;
  f.y += f.vy;
  f.vy -= p.gravity;
  f.stateFrame += 1;
  if (f.y <= 0) {
    f.y = 0;
    toIdle(f);
  }
}

function correct(
  v: number,
  held: Axis,
  takeoff: Axis,
  accel: number,
  same: number,
  reverse: number,
  neutral: number,
): number {
  if (held === 0) return v;
  const cap = takeoff === 0 ? neutral : held === takeoff ? same : reverse;
  const next = v + held * accel;
  if (held > 0) return next > cap ? Math.max(v, cap) : next;
  return next < -cap ? Math.min(v, -cap) : next;
}

function startAttack(
  world: World,
  f: Fighter,
  input: FrameInput,
  action: number,
  chained: boolean,
  p: MovementProfile,
): void {
  f.state = MoveState.Attack;
  f.stateFrame = 0;
  f.attackKind = action;
  f.vx = 0;
  f.vz = 0;
  f.dirX = 0;
  f.dirZ = 0;
  if (input.moveX !== 0) {
    // An explicit left/right input always decides, in both facing modes.
    f.facing = input.moveX;
    f.targetId = 0;
    return;
  }
  if (f.facingMode !== 'assisted' || action !== ActionBit.Attack) {
    f.targetId = 0;
    return;
  }
  const kept = chained && f.targetId !== 0 ? world.bodies.find((b) => b.id === f.targetId) : null;
  const target = kept ?? nearestEnemy(world, f, p);
  f.targetId = target ? target.id : 0;
  if (target && target.x !== f.x) f.facing = target.x > f.x ? 1 : -1;
}

/** Nearest enemy inside the Assisted Facing box; ties go to the lower id. */
export function nearestEnemy(world: World, f: Fighter, p: MovementProfile): Fighter | null {
  let best: Fighter | null = null;
  let bestD = 0;
  for (const e of world.bodies) {
    if (e.team !== 'enemy') continue;
    const dx = e.x - f.x;
    const dz = e.z - f.z;
    if (Math.abs(dx) > p.assistRangeX || Math.abs(dz) > p.assistRangeZ) continue;
    const d = dx * dx + dz * dz;
    if (best === null || d < bestD || (d === bestD && e.id < best.id)) {
      best = e;
      bestD = d;
    }
  }
  return best;
}
