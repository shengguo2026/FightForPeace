import { SIN_QUARTER_TABLE } from './sinTable';

/**
 * Fixed-point maths for the simulation. Every position and speed is an integer in
 * 1/256-pixel units, so results are bit-identical on every JavaScript engine.
 */
export const FX_ONE = 256;

/** Full circle in angle units. 1024 = 90°. */
export const ANGLE_UNITS = 4096;
const QUARTER = ANGLE_UNITS / 4;

/** Integer pixels → fixed point. */
export function fx(pixels: number): number {
  return pixels * FX_ONE;
}

/** Fixed-point multiply, truncated toward zero. */
export function fxMul(a: number, b: number): number {
  return Math.trunc((a * b) / FX_ONE) || 0;
}

/** Fixed-point divide, truncated toward zero. Throws on division by zero. */
export function fxDiv(a: number, b: number): number {
  if (b === 0) throw new RangeError('fxDiv: division by zero');
  return Math.trunc((a * FX_ONE) / b) || 0;
}

/** Sine of an angle in ANGLE_UNITS (wraps), as a fixed-point value in [-256, 256]. */
export function fxSin(angle: number): number {
  const a = ((angle % ANGLE_UNITS) + ANGLE_UNITS) % ANGLE_UNITS;
  let v: number;
  if (a <= QUARTER) v = SIN_QUARTER_TABLE[a]!;
  else if (a <= 2 * QUARTER) v = SIN_QUARTER_TABLE[2 * QUARTER - a]!;
  else if (a <= 3 * QUARTER) v = -SIN_QUARTER_TABLE[a - 2 * QUARTER]!;
  else v = -SIN_QUARTER_TABLE[ANGLE_UNITS - a]!;
  return v || 0; // normalise -0
}

/** Cosine of an angle in ANGLE_UNITS (wraps), as a fixed-point value in [-256, 256]. */
export function fxCos(angle: number): number {
  return fxSin(angle + QUARTER);
}

/** Integer square root: the largest r with r·r ≤ n. Exact for n < 2^53. */
export function isqrt(n: number): number {
  if (!Number.isInteger(n) || n < 0)
    throw new RangeError('isqrt: n must be a non-negative integer');
  if (n < 2) return n;
  let x = n;
  let y = Math.floor((x + 1) / 2);
  while (y < x) {
    x = y;
    y = Math.floor((x + Math.floor(n / x)) / 2);
  }
  return x;
}

/** Fixed point → pixels as a float. Presentation only: never feed the result back into the simulation. */
export function fxToPixels(v: number): number {
  return v / FX_ONE;
}
