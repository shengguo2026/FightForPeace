import { fxMul } from '../math/fixed';
import { ActionBit, DirBit, OFFENSIVE_MASK } from '../input/bits';
import { type Axis, type Fighter, type FrameInput, MoveState, type World } from '../world/types';
import { bufferPress, takeBuffered } from '../combat/buffer';
import {
  VerdictTo,
  actionOf,
  applyActionMovement,
  cancelPresses,
  commitLink,
  framesLeft,
  noteCardinal,
  pressDuringAction,
  queuedLink,
  resolveDir,
  selectAction,
  startAction,
} from '../combat/actions';
import { activeSpan, totalFrames } from '../combat/roster';
import { groundFocus } from '../combat/ground';
import { groundAllows } from '../combat/hits';
import {
  DEFENSE,
  counterMissed,
  noteLatePress,
  stepBreaker,
  tickDefense,
  tryBreaker,
} from '../combat/defense';
import { REACTION, enter, inReaction, stepReaction } from '../combat/reactions';
import { type ActionDef, Dir, Reject } from '../combat/types';
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
  return (
    f.state === MoveState.Idle ||
    f.state === MoveState.Walk ||
    f.state === MoveState.Dash ||
    f.state === MoveState.Guard
  );
}

/** Advances one hero by one frame. Collision and hits run afterwards, for everyone at once. */
export function stepHero(world: World, f: Fighter, input: FrameInput, p: MovementProfile): void {
  stepHeroFrame(world, f, input, p);
  tickDefense(world, f);
}

/** States in which a Guard + Ultimate chord is about breaking a combo, not neutral play. */
function trappedOrDefending(f: Fighter): boolean {
  return (
    inReaction(f) ||
    f.state === MoveState.Blockstun ||
    f.state === MoveState.GuardCrush ||
    f.state === MoveState.CounterMiss ||
    f.state === MoveState.Breaker
  );
}

function stepHeroFrame(world: World, f: Fighter, input: FrameInput, p: MovementProfile): void {
  const frame = world.frame;
  noteCardinal(f, input.dirPressed);
  const tap = detectDoubleTap(f, input.dirPressed, frame, p.doubleTapFrames);
  const dashPressed = (input.pressed & ActionBit.Dash) !== 0;
  const guardPressed = (input.pressed & ActionBit.Guard) !== 0;
  const ultPressed = (input.pressed & ActionBit.Ultimate) !== 0;
  if (guardPressed) {
    f.lastGuardFrame = frame;
    noteLatePress(world, f);
  }
  if (input.dirPressed !== 0) f.lastDirFrame = frame;
  if (ultPressed) f.lastUltFrame = frame;

  // An exact-block attempt that met no contact closes with a precision cooldown.
  if (f.exactFrame !== NO_TAP && frame - f.exactFrame >= DEFENSE.exactWindow) {
    f.exactFrame = NO_TAP;
    f.precisionUntil = frame + DEFENSE.precisionCooldown;
  }

  // Combo Breaker: Guard + Ultimate inside the chord tolerance while trapped. An invalid
  // chord spends nothing and never activates later.
  const breakerChord =
    (guardPressed || ultPressed) &&
    Math.abs(f.lastGuardFrame - f.lastUltFrame) <= DEFENSE.breakerChord &&
    frame - Math.min(f.lastGuardFrame, f.lastUltFrame) <= DEFENSE.breakerChord;
  if (breakerChord && trappedOrDefending(f)) {
    f.lastUltFrame = NO_TAP;
    if (tryBreaker(world, f)) return;
  }

  if (stepDefenseState(world, f, input, guardPressed, p)) return;
  if (inReaction(f)) {
    if (f.state === MoveState.GetUp && f.stateFrame === 0) getUpRoll(f, input);
    if (stepReaction(world, f)) return;
  }

  // 1. Advance the current state; it may become actionable this frame.
  let chained = false;
  let moved = false;
  if (f.state === MoveState.Attack && f.action >= 0) {
    if (stepRunningAction(world, f, input, tap, dashPressed, guardPressed, p)) return;
    chained = true;
  } else {
    bufferPress(f, input.pressed & OFFENSIVE_MASK, frame, p.bufferFrames);
  }
  switch (f.state) {
    case MoveState.Attack:
      // Special and Ultimate stubs (M5): a fixed pose with no hitbox.
      f.stateFrame += 1;
      if (f.stateFrame >= p.attackFrames) {
        f.state = MoveState.Idle;
        f.attackKind = 0;
        chained = true;
      }
      break;
    case MoveState.Landing:
      f.stateFrame += 1;
      if (f.stateFrame >= f.stun) {
        toIdle(f);
        chained = true;
      }
      break;
    case MoveState.Dash:
      f.stateFrame += 1;
      if (f.stateFrame >= p.dashFrames) toIdle(f);
      break;
    case MoveState.Air:
      if (tryAerial(f, input, p)) return;
      airStep(f, input, p);
      moved = true;
      break;
    default:
      break;
  }

  // 2. Start a new action if allowed. Buffered offensive actions win over a dash.
  if (actionable(f)) {
    if (f.state !== MoveState.Dash) {
      // Back in neutral on the ground: the previous string is over.
      f.chainUsed = 0;
      f.bridged = false;
    }
    const action = takeBuffered(f, frame, p.bufferFrames);
    if (action === ActionBit.Jump && f.bridged) {
      // A bridged dash only leads into the hero's authored dash follow-ups.
      f.verdictTo = VerdictTo.Jump;
      f.verdictReject = Reject.Unlinked;
      f.verdictFrame = frame;
    } else if (action === ActionBit.Jump) {
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

  // 2b. Guard: committed directional guard, its pivot, and the counter chord.
  if (stepGuard(world, f, input, guardPressed)) return;

  // 3. Move according to the (possibly new) state.
  if (moved) return;
  switch (f.state) {
    case MoveState.Idle:
    case MoveState.Walk: {
      const [vx, vz] = directed(input.moveX, input.moveZ, p.walkX, p.walkZ, p.diagonal);
      f.vx = vx;
      f.vz = vz;
      f.state = vx !== 0 || vz !== 0 ? MoveState.Walk : MoveState.Idle;
      if (input.moveX !== 0 && input.moveX !== f.facing) {
        f.turnFrom = f.facing;
        f.turnFrame = frame;
        f.facing = input.moveX;
      }
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
    case MoveState.Attack: {
      // An action that started this frame moves on its first frame.
      const a = actionOf(f);
      if (a) applyActionMovement(f, a, 1, input, p);
      break;
    }
    default:
      break;
  }
}

/** Guard held or pressed: the 8-way direction held, if any. */
function heldDir(input: FrameInput): [Axis, Axis] {
  return [input.moveX, input.moveZ];
}

function openAttempt(f: Fighter, frame: number): void {
  // Holding Guard never re-attempts; a press during the precision cooldown only guards.
  if (frame >= f.precisionUntil) f.exactFrame = frame;
}

function startCounter(f: Fighter, frame: number, dx: Axis, dz: Axis): void {
  f.state = MoveState.Counter;
  f.stateFrame = 0;
  f.stun = DEFENSE.counterWindow;
  f.counterFrame = frame;
  f.counterX = dx;
  f.counterZ = dz;
  f.exactFrame = NO_TAP;
  f.pivotAt = NO_TAP;
  f.vx = 0;
  f.vz = 0;
}

/**
 * Committed Directional Guard (F&D §6.3). Returns true when the hero is guarding or
 * started a counter this frame (no walking).
 */
function stepGuard(world: World, f: Fighter, input: FrameInput, guardPressed: boolean): boolean {
  const frame = world.frame;
  const held = ((input.held | input.pressed) & ActionBit.Guard) !== 0;
  const [dx, dz] = heldDir(input);
  const freshDir = frame - f.lastDirFrame <= DEFENSE.counterChord && (dx !== 0 || dz !== 0);
  if (f.state === MoveState.Guard) {
    if (held && guardPressed) openAttempt(f, frame);
    // A tap keeps the guard up for its exact-block attempt; after that only holding does.
    if (f.exactFrame === NO_TAP && (!held || f.defense <= 0)) {
      f.state = MoveState.Idle;
      f.stateFrame = 0;
      f.pivotAt = NO_TAP;
      return false;
    }
    f.stateFrame += 1;
    // Guard first, then a fresh direction inside the chord tolerance: a counter.
    if (
      f.guardNeutral &&
      input.dirPressed !== 0 &&
      freshDir &&
      frame - f.lastGuardFrame <= DEFENSE.counterChord
    ) {
      startCounter(f, frame, dx, dz);
      return true;
    }
    // A direction pressed while Guard is held requests a committed pivot.
    if (input.dirPressed !== 0 && (dx !== 0 || dz !== 0)) {
      f.pivotX = dx;
      f.pivotZ = dz;
      f.pivotAt = frame + DEFENSE.pivotFrames;
      f.guardNeutral = false;
    }
    if (f.pivotAt !== NO_TAP && frame >= f.pivotAt) {
      f.guardX = f.pivotX;
      f.guardZ = f.pivotZ;
      if (f.pivotX !== 0) f.facing = f.pivotX;
      f.pivotAt = NO_TAP;
    }
    f.vx = 0;
    f.vz = 0;
    return true;
  }
  if ((f.state !== MoveState.Idle && f.state !== MoveState.Walk) || !held) return false;
  // A fresh direction and Guard inside the chord tolerance: a counter attempt.
  if (guardPressed && freshDir) {
    startCounter(f, frame, dx, dz);
    return true;
  }
  if (guardPressed) openAttempt(f, frame);
  // Normal guard needs Defense; at 0 a fresh press still shows the exact-block attempt.
  if (f.defense <= 0 && f.exactFrame === NO_TAP) return false;
  f.state = MoveState.Guard;
  f.stateFrame = 0;
  f.guardNeutral = dx === 0 && dz === 0;
  if (f.guardNeutral) {
    f.guardX = f.facing;
    f.guardZ = 0;
  } else {
    // A direction held before Guard sets the defensive facing.
    f.guardX = dx;
    f.guardZ = dz;
    if (dx !== 0) f.facing = dx;
  }
  f.pivotAt = NO_TAP;
  f.vx = 0;
  f.vz = 0;
  return true;
}

/**
 * Defense states that own the whole frame: block-stun, guard crush, the counter window,
 * the failed-counter recovery and the breaker. Returns true while the hero stays in one.
 */
function stepDefenseState(
  world: World,
  f: Fighter,
  input: FrameInput,
  guardPressed: boolean,
  p: MovementProfile,
): boolean {
  const frame = world.frame;
  switch (f.state) {
    case MoveState.Blockstun: {
      f.stateFrame += 1;
      f.x += f.vx;
      f.vx -= Math.trunc(f.vx / 8);
      if (guardPressed) openAttempt(f, frame);
      bufferPress(f, input.pressed & OFFENSIVE_MASK, frame, p.bufferFrames);
      if (f.stateFrame < f.stun) return true;
      f.vx = 0;
      const held = ((input.held | input.pressed) & ActionBit.Guard) !== 0;
      const guard = held && f.defense > 0;
      enter(f, guard ? MoveState.Guard : MoveState.Idle, 0);
      return guard;
    }
    case MoveState.GuardCrush:
    case MoveState.CounterMiss:
      f.stateFrame += 1;
      if (f.stateFrame < f.stun) return true;
      enter(f, MoveState.Idle, 0);
      return false;
    case MoveState.Counter:
      f.stateFrame += 1;
      if (frame - f.counterFrame < DEFENSE.counterWindow) return true;
      counterMissed(world, f);
      return true;
    case MoveState.Breaker:
      return stepBreaker(f);
    default:
      return false;
  }
}

/** A hero holding a direction on the first get-up frame rolls that way. */
function getUpRoll(f: Fighter, input: FrameInput): void {
  if (input.moveX === 0 && input.moveZ === 0) return;
  [f.vx, f.vz] = directed(input.moveX, input.moveZ, REACTION.getUpRoll, REACTION.getUpRoll, 181);
}

/** Attack pressed in the air: the hero's aerial for that direction, once per jump. */
function tryAerial(f: Fighter, input: FrameInput, p: MovementProfile): boolean {
  const attack = (input.pressed & (ActionBit.Attack | ActionBit.LowAttack)) !== 0;
  if (!attack || f.airUsed || f.hero < 0) return false;
  const index = selectAction(f, 'air', resolveDir(f, input));
  if (index < 0) return false;
  f.bufAction = 0;
  f.bufFrame = 0;
  startAction(f, index);
  runActionFrame(f, actionOf(f)!, 1, input, p);
  return true;
}

/**
 * One frame of a data-driven action: low-attack chord, cancel presses, queued cancel,
 * movement, aerial landing and the end of the action. Returns false when the action
 * ended this frame and the hero is actionable again.
 */
function stepRunningAction(
  world: World,
  f: Fighter,
  input: FrameInput,
  tap: DashRequest | null,
  dashPressed: boolean,
  guardPressed: boolean,
  p: MovementProfile,
): boolean {
  const frame = world.frame;
  f.stateFrame += 1;
  let a = actionOf(f)!;
  let n = f.stateFrame + 1;

  // Guard arriving just after Attack out of a dash turns the dash attack into the low
  // attack. In this chord Guard is only a modifier: it never guards.
  if (guardPressed && a.context === 'dash' && f.stateFrame <= p.chordFrames) {
    const low = selectAction(f, 'dashLow', Dir.Neutral);
    if (low >= 0) {
      const kept = f.stateFrame;
      f.chainUsed &= ~(1 << f.action);
      startAction(f, low);
      f.stateFrame = kept;
      a = actionOf(f)!;
      n = f.stateFrame + 1;
    }
  }

  bufferPress(f, 0, frame, p.bufferFrames);
  if (!a.landing && n > totalFrames(a)) {
    // The action is over: this frame belongs to whatever comes next.
    endAction(f);
    bufferPress(f, input.pressed & OFFENSIVE_MASK, frame, p.bufferFrames);
    return false;
  }
  const dir = resolveDir(f, input);
  const dashRequested = dashPressed || (tap !== null && tap.dx === f.facing && tap.dz === 0);
  const activeEnd = a.startup + activeSpan(a);
  for (const press of cancelPresses(input, dashRequested, dir)) {
    const outcome = pressDuringAction(world, f, a, press);
    if (outcome !== 'unlinked' || press.kind === 'dash') continue;
    // No link: a press near the end still starts a fresh action afterwards (one-slot
    // buffer); anything earlier is discarded, never a delayed standalone attack.
    const nearEnd = a.landing ? n > activeEnd : framesLeft(a, n) < p.bufferFrames;
    if (!nearEnd) continue;
    f.verdictTo = VerdictTo.None;
    f.verdictReject = Reject.None;
    bufferPress(f, input.pressed & OFFENSIVE_MASK, frame, p.bufferFrames);
  }

  const link = queuedLink(world, f, a);
  if (link) {
    commitLink(world, f, link);
    if (link.kind === 'action') {
      startAction(f, link.to);
      runActionFrame(f, actionOf(f)!, 1, input, p);
    } else if (link.kind === 'jump') {
      f.action = -1;
      f.ghost = false;
      startJump(f, input, p);
      airStep(f, input, p);
    } else if (link.kind === 'dash') {
      f.action = -1;
      f.ghost = false;
      startDash(f, f.facing, 0, p);
      f.bridged = true;
      f.x += f.vx;
      f.z += f.vz;
    }
    return true;
  }

  runActionFrame(f, a, n, input, p);
  return true;
}

/** Movement and landing for one action frame. Returns false if the hero landed. */
function runActionFrame(
  f: Fighter,
  a: ActionDef,
  n: number,
  input: FrameInput,
  p: MovementProfile,
): boolean {
  applyActionMovement(f, a, n, input, p);
  if (a.category !== 'aerial' || f.y > 0) return true;
  // Touching down ends an aerial at once and applies its landing recovery.
  endAction(f);
  f.y = 0;
  f.state = MoveState.Landing;
  f.stateFrame = 0;
  f.stun = a.recovery;
  f.airUsed = false;
  return false;
}

function endAction(f: Fighter): void {
  toIdle(f);
  f.action = -1;
  f.attackKind = 0;
  f.ghost = false;
  f.reqLink = -1;
}

function toIdle(f: Fighter): void {
  f.state = MoveState.Idle;
  f.stateFrame = 0;
  f.vx = 0;
  f.vz = 0;
  f.vy = 0;
  f.dirX = 0;
  f.dirZ = 0;
  f.airUsed = false;
}

function startDash(f: Fighter, dx: Axis, dz: Axis, p: MovementProfile): void {
  f.state = MoveState.Dash;
  f.stateFrame = 0;
  f.dirX = dx;
  f.dirZ = dz;
  [f.vx, f.vz] = directed(dx, dz, p.dashX, p.dashZ, p.diagonal);
  if (dx !== 0) f.facing = dx;
  f.bridged = false;
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
    if (p.jumpLandingFrames > 0) {
      f.state = MoveState.Landing;
      f.stun = p.jumpLandingFrames;
    }
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
  const fromDash = f.state === MoveState.Dash;
  const stub = action === ActionBit.Special || action === ActionBit.Ultimate || f.hero < 0;
  f.attackFromDash = fromDash;
  // Explicit left/right never turns the hero: it selects Forward or Backward (spec §5.3).
  // Turn grace: a walk turn toward the held direction only a few frames before Attack
  // (Left held a moment before the press) is undone, so the press still reads Backward.
  if (input.moveX !== 0) {
    f.targetId = 0;
    if (
      !fromDash &&
      input.moveX === f.facing &&
      f.turnFrom === -f.facing &&
      frame(world) - f.turnFrame <= p.turnGraceFrames
    ) {
      f.facing = f.facing === 1 ? -1 : 1;
    }
  } else if (f.facingMode === 'assisted' && !stub && !fromDash) {
    const kept = chained && f.targetId !== 0 ? world.bodies.find((b) => b.id === f.targetId) : null;
    const target = kept ?? nearestEnemy(world, f, p);
    f.targetId = target ? target.id : 0;
    if (target && target.x !== f.x) f.facing = target.x > f.x ? 1 : -1;
  } else {
    f.targetId = 0;
  }
  if (stub) {
    f.state = MoveState.Attack;
    f.stateFrame = 0;
    f.action = -1;
    f.attackKind = action;
    f.vx = 0;
    f.vz = 0;
    f.dirX = 0;
    f.dirZ = 0;
    return;
  }
  // Guard pressed just before Attack out of a dash, or the Low Attack binding: the low attack.
  const low =
    action === ActionBit.LowAttack ||
    (fromDash && frame(world) - f.lastGuardFrame <= p.chordFrames);
  // Ground-Opportunity Focus: near a marked downed target, Attack selects ground actions.
  const focus = low || fromDash ? null : groundFocus(world.bodies, f);
  if (focus) {
    const ground = selectAction(f, 'groundFocus', resolveDir(f, input));
    if (ground >= 0) {
      if (!groundAllows(focus.ctx, actionOf(f, ground)!)) {
        f.verdictTo = ground;
        f.verdictReject = Reject.GroundSpent;
        f.verdictFrame = frame(world);
        return;
      }
      startAction(f, ground);
      return;
    }
  }
  const context = low ? 'dashLow' : fromDash ? 'dash' : 'neutral';
  const index = selectAction(f, context, low || fromDash ? Dir.Neutral : resolveDir(f, input));
  if (index >= 0) startAction(f, index);
}

function frame(world: World): number {
  return world.frame;
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
