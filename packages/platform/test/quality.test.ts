import { QUALITY, QualityGovernor, RENDER_SCALE } from '../src/render/quality';

const feed = (q: QualityGovernor, ms: number, total: number) => {
  for (let t = 0; t < total; t += ms) q.sample(ms);
  return q.level;
};

test('Auto Quality steps down after sustained slow frames, one level at a time', () => {
  const q = new QualityGovernor();
  expect(feed(q, 16.7, 5000)).toBe('high');
  expect(feed(q, 33, QUALITY.downAfterMs + 600)).toBe('medium');
  expect(feed(q, 33, QUALITY.downAfterMs + 100)).toBe('low');
  // M14: the last step lowers the internal resolution.
  expect(feed(q, 33, QUALITY.downAfterMs + 100)).toBe('minimal');
  expect(feed(q, 33, 10000)).toBe('minimal');
  expect(RENDER_SCALE.minimal).toBeLessThan(1);
  expect(RENDER_SCALE.low).toBe(1);
});

test('it steps back up only after a longer fast period (hysteresis)', () => {
  const q = new QualityGovernor();
  feed(q, 40, 3000);
  expect(q.level).toBe('medium');
  expect(feed(q, 8, 3000)).toBe('medium');
  expect(feed(q, 8, QUALITY.upAfterMs)).toBe('high');
});

test('stalls (a hidden tab, a debugger) are not measurements', () => {
  const q = new QualityGovernor();
  for (let i = 0; i < 50; i += 1) q.sample(5000);
  expect(q.level).toBe('high');
});

test('a manual level holds regardless of frame times; Auto starts again from High', () => {
  const q = new QualityGovernor();
  q.set('low');
  expect(feed(q, 8, 20000)).toBe('low');
  q.set('auto');
  expect(q.level).toBe('high');
});
