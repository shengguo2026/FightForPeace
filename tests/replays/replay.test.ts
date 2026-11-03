import {
  DefEvent,
  HEROES,
  RULES_VERSION,
  type ReplayLog,
  SIM_HZ,
  createAccumulator,
  createWorld,
  hashWorld,
  recipeDone,
  runReplay,
  step,
} from '@ffp/sim';
import walkSquareJson from './walk-square.json';
import dashJumpJson from './dash-jump.json';
import crowdJson from './crowd.json';
import comboRoutesJson from './combo-routes.json';
import academyRecipesJson from './academy-recipes.json';
import defenseDrillsJson from './defense-drills.json';
import { SCRIPTS } from './scripts';

const LOGS: [string, ReplayLog][] = [
  ['walk-square', walkSquareJson as ReplayLog],
  ['dash-jump', dashJumpJson as ReplayLog],
  ['crowd', crowdJson as ReplayLog],
  ['combo-routes', comboRoutesJson as ReplayLog],
  ['academy-recipes', academyRecipesJson as ReplayLog],
  ['defense-drills', defenseDrillsJson as ReplayLog],
];

test('defense-drills performs exact block, guard, counter and breaker against the trainer', () => {
  const log = defenseDrillsJson as ReplayLog;
  const world = createWorld(log.seed, log.options);
  const events: number[] = [];
  let last = -1;
  for (const f of log.frames) {
    step(world, f);
    const h = world.bodies.find((b) => b.team === 'hero')!;
    if (h.defEvent !== DefEvent.None && h.defFrame !== last) {
      last = h.defFrame;
      events.push(h.defEvent);
    }
  }
  expect(events).toEqual(
    expect.arrayContaining([
      DefEvent.Exact,
      DefEvent.ExactEarly,
      DefEvent.Counter,
      DefEvent.Breaker,
    ]),
  );
  // The bell hammer (true unblockable) was dodged: the last event is the breaker.
  expect(events.at(-1)).toBe(DefEvent.Breaker);
});

test('academy-recipes performs every §8.3 recipe of both founders and a shared co-op juggle', () => {
  const log = academyRecipesJson as ReplayLog;
  const world = createWorld(log.seed, log.options);
  const done = new Set<string>();
  let coop = false;
  for (const f of log.frames) {
    step(world, f);
    for (const d of world.bodies.filter((b) => b.team === 'enemy')) {
      HEROES.forEach((h, i) => {
        for (const r of h.recipes) if (recipeDone(r, d.ctx.route, i)) done.add(`${h.id}/${r.id}`);
      });
      const heroes = new Set(d.ctx.route.map((c) => Math.trunc(c / 64)));
      if (heroes.size === 2) coop = true;
    }
  }
  expect([...done].sort()).toEqual(
    HEROES.flatMap((h) => h.recipes.map((r) => `${h.id}/${r.id}`)).sort(),
  );
  expect(coop).toBe(true);
});

test.each(LOGS)('golden replay %s reproduces its recorded hash', (name, log) => {
  expect(log.version).toBe(2);
  expect(log.rulesVersion).toBe(RULES_VERSION);
  expect(runReplay(log)).toBe(log.expectedHash);
  // The committed file still matches its script (catches hand edits).
  expect(log.frames).toEqual(SCRIPTS.find((s) => s.name === name)!.frames);
});

test('a replay recorded under other rules or format fails loudly', () => {
  const log = walkSquareJson as ReplayLog;
  expect(() => runReplay({ ...log, rulesVersion: 'm0.1' })).toThrow(/rules version/);
  expect(() => runReplay({ ...log, version: 1 as 2 })).toThrow(/format version/);
});

test('walk-square still walks a square', () => {
  expect((walkSquareJson as ReplayLog).frames).toHaveLength(240);
});

test('the crowd replay has Player 2 join on frame 30', () => {
  const log = crowdJson as ReplayLog;
  expect(log.frames[29]).toHaveLength(1);
  expect(log.frames[30]).toHaveLength(2);
});

test('the combo-routes replay lands a three-action combo for both heroes', () => {
  const log = comboRoutesJson as ReplayLog;
  const world = createWorld(log.seed, log.options);
  let best = 0;
  for (const f of log.frames) {
    step(world, f);
    for (const d of world.bodies) if (d.team === 'enemy') best = Math.max(best, d.ctx.actions);
  }
  expect(best).toBeGreaterThanOrEqual(3);
});

describe.each(LOGS)('%s: render rate does not change the result', (_name, log) => {
  test.each([
    ['144 Hz', 1000 / 144],
    ['60 Hz', 1000 / 60],
    ['30 Hz', 1000 / 30],
  ])('%s', (_label, intervalMs) => {
    const acc = createAccumulator({ hz: SIM_HZ, maxSteps: 5 });
    const world = createWorld(log.seed, log.options);
    let frame = 0;
    while (frame < log.frames.length) {
      const { steps } = acc.advance(intervalMs);
      for (let i = 0; i < steps && frame < log.frames.length; i += 1) {
        step(world, log.frames[frame]!);
        frame += 1;
      }
    }
    expect(hashWorld(world)).toBe(log.expectedHash);
  });
});
