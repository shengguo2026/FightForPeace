import {
  ANGLE_UNITS,
  FX_ONE,
  fx,
  fxCos,
  fxDiv,
  fxMul,
  fxSin,
  fxToPixels,
  isqrt,
} from '../src/math/fixed';
import { SIN_QUARTER_TABLE } from '../src/math/sinTable';

test('fixed-point conversion and arithmetic', () => {
  expect(FX_ONE).toBe(256);
  expect(fx(3)).toBe(768);
  expect(fxMul(fx(3), fx(2))).toBe(fx(6));
  expect(fxMul(fx(-3), fx(2))).toBe(fx(-6));
  expect(fxDiv(fx(7), fx(2))).toBe(896); // 3.5 px
  expect(fxDiv(fx(-7), fx(2))).toBe(-896);
  expect(fxDiv(-1, fx(2))).toBe(0); // truncates toward zero, never -0
  expect(Object.is(fxDiv(-1, fx(2)), -0)).toBe(false);
  expect(() => fxDiv(1, 0)).toThrow();
  expect(fxToPixels(896)).toBe(3.5);
});

test('lookup-table sine and cosine', () => {
  expect(ANGLE_UNITS).toBe(4096);
  expect(SIN_QUARTER_TABLE).toHaveLength(1025);
  expect(fxSin(0)).toBe(0);
  expect(fxSin(1024)).toBe(256); // 90°
  expect(fxSin(2048)).toBe(0);
  expect(Object.is(fxSin(2048), -0)).toBe(false);
  expect(fxSin(3072)).toBe(-256);
  expect(fxCos(0)).toBe(256);
  expect(fxCos(2048)).toBe(-256); // 180°
  expect(fxSin(4096 + 1024)).toBe(256); // wraps
  expect(fxSin(-1024)).toBe(-256); // negative angles wrap too
  expect(fxSin(512)).toBe(181); // 45° ≈ 256/√2
  for (let a = 0; a < ANGLE_UNITS; a += 1) {
    expect(fxSin(a)).toBe(-fxSin(ANGLE_UNITS - a) || 0); // odd symmetry
  }
});

test('integer square root', () => {
  expect(isqrt(0)).toBe(0);
  expect(isqrt(1)).toBe(1);
  expect(isqrt(65536)).toBe(256);
  expect(isqrt(65535)).toBe(255);
  expect(isqrt(2 ** 40)).toBe(2 ** 20);
  expect(isqrt(2 ** 40 - 1)).toBe(2 ** 20 - 1);
  expect(() => isqrt(-1)).toThrow();
});
