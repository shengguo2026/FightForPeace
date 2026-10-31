import { ByteWriter } from '../src/state/encode';
import { xxh32 } from '../src/state/hash';

// ASCII only; the sim package deliberately has no DOM or Node types (no TextEncoder).
const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

test('xxHash32 reference vectors', () => {
  expect(xxh32(enc(''))).toBe(0x02cc5d05);
  expect(xxh32(enc('abc'))).toBe(0x32d153ff);
  expect(xxh32(Uint8Array.from({ length: 16 }, (_, i) => i))).toBe(0xb72837f4);
  // Longer than one 16-byte stripe plus a tail of 4-byte words and single bytes.
  expect(xxh32(enc('Nobody inspects the spammish repetition'))).toBe(0xe2293b2f);
  expect(xxh32(enc(''), 1)).not.toBe(xxh32(enc('')));
});

test('ByteWriter writes little-endian and grows', () => {
  const w = new ByteWriter();
  w.i32(-1);
  w.u8(7);
  expect([...w.bytes()]).toEqual([255, 255, 255, 255, 7]);

  const big = new ByteWriter(2);
  for (let i = 0; i < 100; i += 1) big.u32(0x01020304);
  const bytes = big.bytes();
  expect(bytes).toHaveLength(400);
  expect([...bytes.slice(0, 4)]).toEqual([4, 3, 2, 1]);
});

test('ByteWriter rejects values that do not fit', () => {
  const w = new ByteWriter();
  expect(() => w.u8(256)).toThrow();
  expect(() => w.i32(2 ** 31)).toThrow();
  expect(() => w.u32(-1)).toThrow();
  expect(() => w.i32(1.5)).toThrow();
});
