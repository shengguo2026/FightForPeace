import { createRngState, nextInt, nextU32, rngFromState } from '../src/math/rng';

test('xoshiro128** reference sequence', () => {
  const s = rngFromState([1, 2, 3, 4]);
  expect([nextU32(s), nextU32(s), nextU32(s), nextU32(s)]).toEqual([11520, 0, 5927040, 70819200]);
});

test('rngFromState copies instead of aliasing', () => {
  const original: [number, number, number, number] = [1, 2, 3, 4];
  const s = rngFromState(original);
  nextU32(s);
  expect(original).toEqual([1, 2, 3, 4]);
});

test('the same seed produces the same sequence', () => {
  const a = createRngState(42);
  const b = createRngState(42);
  const outA = Array.from({ length: 100 }, () => nextU32(a));
  const outB = Array.from({ length: 100 }, () => nextU32(b));
  expect(outA).toEqual(outB);
  expect(new Set(outA).size).toBeGreaterThan(95);
  expect(outA.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff)).toBe(true);
});

test('different seeds produce different sequences', () => {
  expect(nextU32(createRngState(1))).not.toBe(nextU32(createRngState(2)));
});

test('nextInt stays in range and covers it', () => {
  const s = createRngState(7);
  const seen = new Set<number>();
  for (let i = 0; i < 10_000; i += 1) {
    const v = nextInt(s, 6);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(5);
    seen.add(v);
  }
  expect(seen.size).toBe(6);
  expect(() => nextInt(s, 0)).toThrow();
});

test('a copied state continues the identical sequence', () => {
  const s = createRngState(99);
  for (let i = 0; i < 10; i += 1) nextU32(s);
  const copy = rngFromState(s);
  expect(Array.from({ length: 20 }, () => nextU32(copy))).toEqual(
    Array.from({ length: 20 }, () => nextU32(s)),
  );
});
