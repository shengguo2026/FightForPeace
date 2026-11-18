import { fx } from '../math/fixed';

/**
 * Every movement number in one data object. M1 has one profile (on foot); the mounted
 * corridor in M17 adds a second profile rather than a second movement system. All
 * values are candidates for Combat Lab tuning (60 Hz frames, fixed point 1/256 px).
 */
export interface MovementProfile {
  walkX: number;
  walkZ: number;
  /** 1/√2 in fixed point; diagonal speeds are multiplied by this. */
  diagonal: number;
  /** A second press of the same direction within this many frames dashes. */
  doubleTapFrames: number;
  dashFrames: number;
  /** Top dash speed, held for `dashFastFrames` frames, then easing down to the end. */
  dashX: number;
  dashZ: number;
  dashFastFrames: number;
  /** Frames after a dash ends before the next dash may start. */
  dashRecovery: number;
  /** Backsteps and sidesteps cannot be hit on these dash frames (0 = the first frame). */
  evadeFrom: number;
  evadeTo: number;
  /** Double tap and hold: running speed once the dash ends with the direction still held. */
  runX: number;
  runZ: number;
  jumpVy: number;
  gravity: number;
  /** Air correction acceleration per frame. */
  airAccel: number;
  /** Largest drift against the takeoff direction (cannot reverse a jump). */
  airReverseX: number;
  airReverseZ: number;
  /** Largest drift during a neutral jump. */
  airNeutralX: number;
  airNeutralZ: number;
  /** Attack stub length (stands in for M2's real attacks). */
  attackFrames: number;
  /**
   * Low-attack chord tolerance: during a dash, Attack and Guard pressed within this many
   * frames of each other (either order) make a low attack instead of the dash attack.
   */
  chordFrames: number;
  /** Frames after a walk turn in which Attack + that direction still reads as Backward. */
  turnGraceFrames: number;
  /** Offensive input buffer window. */
  bufferFrames: number;
  /** Landing recovery after a plain jump (aerial attacks use their own). */
  jumpLandingFrames: number;
  /** Assisted Facing search box around the hero. */
  assistRangeX: number;
  assistRangeZ: number;
}

export const ON_FOOT: MovementProfile = {
  walkX: 768,
  walkZ: 512,
  diagonal: 181,
  doubleTapFrames: 12,
  // Dash and run (2026-11-18): about 197 px across and 127 px in depth (was 126 and 84),
  // fast at the start and easing out, so a backstep or sidestep clears a typical enemy
  // reach of about 175 px. Runs at twice the walking speed.
  dashFrames: 18,
  dashX: fx(14),
  dashZ: fx(9),
  dashFastFrames: 8,
  dashRecovery: 8,
  evadeFrom: 2,
  evadeTo: 7,
  runX: 1536,
  runZ: 1024,
  jumpVy: fx(16),
  gravity: fx(1),
  airAccel: 32,
  airReverseX: 192,
  airReverseZ: 128,
  airNeutralX: 384,
  airNeutralZ: 256,
  attackFrames: 18,
  chordFrames: 3,
  turnGraceFrames: 8,
  bufferFrames: 9,
  jumpLandingFrames: 4,
  assistRangeX: fx(480),
  assistRangeZ: fx(160),
};

/** Collision footprint in the floor plane (half sizes) and dummy behaviour. */
export const BODY_HALF_W = fx(36);
export const BODY_HALF_D = fx(14);
/** Gentle separation per frame for allies (and enemies among themselves). */
export const SOFT_PUSH = fx(1);
/** Share of an enemy collision push taken by the enemy (out of 4). */
export const ENEMY_YIELD_QUARTERS = 1;
/** Frames of blocked movement before enemies turn soft for a pinned hero. */
export const PIN_FRAMES = 30;
export const DUMMY_SPEED_X = 384;
export const DUMMY_SPEED_Z = 256;
