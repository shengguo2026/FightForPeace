import {
  RULES_VERSION,
  type ReplayLog,
  SIM_HZ,
  createAccumulator,
  createWorld,
  hashWorld,
  runReplay,
  step,
} from '@ffp/sim';
import walkSquareJson from './walk-square.json';

const walkSquare = walkSquareJson as ReplayLog;

test('golden replay: walk-square reproduces its recorded hash', () => {
  expect(walkSquare.version).toBe(1);
  expect(walkSquare.rulesVersion).toBe(RULES_VERSION);
  expect(walkSquare.frames).toHaveLength(240);
  expect(runReplay(walkSquare)).toBe(walkSquare.expectedHash);
});

test('a replay recorded under other rules fails loudly', () => {
  expect(() => runReplay({ ...walkSquare, rulesVersion: 'm0.0' })).toThrow(/rules version/);
  expect(() => runReplay({ ...walkSquare, version: 2 as 1 })).toThrow(/format version/);
});

test.each([
  ['144 Hz', 1000 / 144],
  ['60 Hz', 1000 / 60],
  ['30 Hz', 1000 / 30],
])('render rate does not change the result (%s)', (_label, intervalMs) => {
  const acc = createAccumulator({ hz: SIM_HZ, maxSteps: 5 });
  const world = createWorld(walkSquare.seed);
  let frame = 0;
  while (frame < walkSquare.frames.length) {
    const { steps } = acc.advance(intervalMs);
    for (let i = 0; i < steps && frame < walkSquare.frames.length; i += 1) {
      step(world, walkSquare.frames[frame]!);
      frame += 1;
    }
  }
  expect(hashWorld(world)).toBe(walkSquare.expectedHash);
});
