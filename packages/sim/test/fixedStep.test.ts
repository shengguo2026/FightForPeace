import { createAccumulator } from '../src/loop/fixedStep';

test('accumulator steps at a fixed rate', () => {
  const acc = createAccumulator({ hz: 60, maxSteps: 5 });
  expect(acc.advance(1000 / 60).steps).toBe(1);
  expect(acc.advance(8).steps).toBe(0); // accumulates
  const r = acc.advance(9);
  expect(r.steps).toBe(1);
  expect(r.alpha).toBeGreaterThan(0);
  expect(r.alpha).toBeLessThan(1);
});

test('a huge elapsed time is capped and the debt is dropped (tab hidden for minutes)', () => {
  const acc = createAccumulator({ hz: 60, maxSteps: 5 });
  expect(acc.advance(10 * 60 * 1000).steps).toBe(5);
  expect(acc.advance(1000 / 60).steps).toBe(1); // debt was dropped, not carried
});

test('negative or non-finite elapsed times are ignored', () => {
  const acc = createAccumulator({ hz: 60, maxSteps: 5 });
  expect(acc.advance(-100).steps).toBe(0);
  expect(acc.advance(Number.NaN).steps).toBe(0);
  expect(acc.advance(1000 / 60).steps).toBe(1);
});
