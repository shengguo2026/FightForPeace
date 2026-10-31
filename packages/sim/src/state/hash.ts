/** xxHash32 (reference algorithm), using Math.imul for exact uint32 arithmetic. */
const P1 = 0x9e3779b1;
const P2 = 0x85ebca77;
const P3 = 0xc2b2ae3d;
const P4 = 0x27d4eb2f;
const P5 = 0x165667b1;

function rotl(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r));
}

function readU32(d: Uint8Array, i: number): number {
  return (d[i]! | (d[i + 1]! << 8) | (d[i + 2]! << 16) | (d[i + 3]! << 24)) >>> 0;
}

function round(acc: number, input: number): number {
  acc = (acc + Math.imul(input, P2)) | 0;
  acc = rotl(acc, 13);
  return Math.imul(acc, P1);
}

/** Returns the unsigned 32-bit xxHash of `data`. */
export function xxh32(data: Uint8Array, seed = 0): number {
  const len = data.length;
  let i = 0;
  let h: number;

  if (len >= 16) {
    let v1 = (seed + P1 + P2) | 0;
    let v2 = (seed + P2) | 0;
    let v3 = seed | 0;
    let v4 = (seed - P1) | 0;
    const limit = len - 16;
    while (i <= limit) {
      v1 = round(v1, readU32(data, i));
      v2 = round(v2, readU32(data, i + 4));
      v3 = round(v3, readU32(data, i + 8));
      v4 = round(v4, readU32(data, i + 12));
      i += 16;
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) | 0;
  } else {
    h = (seed + P5) | 0;
  }

  h = (h + len) | 0;

  while (i + 4 <= len) {
    h = (h + Math.imul(readU32(data, i), P3)) | 0;
    h = Math.imul(rotl(h, 17), P4);
    i += 4;
  }
  while (i < len) {
    h = (h + Math.imul(data[i]!, P5)) | 0;
    h = Math.imul(rotl(h, 11), P1);
    i += 1;
  }

  h ^= h >>> 15;
  h = Math.imul(h, P2);
  h ^= h >>> 13;
  h = Math.imul(h, P3);
  h ^= h >>> 16;
  return h >>> 0;
}
