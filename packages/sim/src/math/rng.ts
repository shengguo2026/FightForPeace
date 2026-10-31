/**
 * Seeded pseudo-random numbers for the simulation: xoshiro128** with SplitMix32 seeding.
 * The state is four uint32 words and is part of the world state, so it is encoded,
 * hashed and restored with everything else.
 */
export type RngState = [number, number, number, number];

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** Returns an independent copy of a state. */
export function rngFromState(s: Readonly<RngState>): RngState {
  return [s[0] >>> 0, s[1] >>> 0, s[2] >>> 0, s[3] >>> 0];
}

/** Expands a 32-bit seed into a full state with SplitMix32. */
export function createRngState(seed: number): RngState {
  let x = seed >>> 0;
  const next = (): number => {
    x = (x + 0x9e3779b9) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  const s: RngState = [next(), next(), next(), next()];
  // xoshiro must never hold an all-zero state.
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1;
  return s;
}

/** Next uint32 (xoshiro128**). Mutates `s`. */
export function nextU32(s: RngState): number {
  const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
  const t = (s[1] << 9) >>> 0;
  s[2] = (s[2] ^ s[0]) >>> 0;
  s[3] = (s[3] ^ s[1]) >>> 0;
  s[1] = (s[1] ^ s[2]) >>> 0;
  s[0] = (s[0] ^ s[3]) >>> 0;
  s[2] = (s[2] ^ t) >>> 0;
  s[3] = rotl(s[3], 11);
  return result;
}

const TWO_32 = 0x1_0000_0000;

/** Unbiased integer in [0, maxExclusive) by rejection sampling. Mutates `s`. */
export function nextInt(s: RngState, maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > TWO_32) {
    throw new RangeError('nextInt: maxExclusive must be an integer in [1, 2^32]');
  }
  const limit = TWO_32 - (TWO_32 % maxExclusive);
  for (;;) {
    const r = nextU32(s);
    if (r < limit) return r % maxExclusive;
  }
}
