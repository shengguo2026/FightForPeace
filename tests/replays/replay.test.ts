import {
  DefEvent,
  GrabEvent,
  HEROES,
  PursuitPhase,
  RULES_VERSION,
  type ReplayLog,
  SIM_HZ,
  createAccumulator,
  createWorld,
  hashWorld,
  recipeDone,
  routeAction,
  runReplay,
  step,
} from '@ffp/sim';
import walkSquareJson from './walk-square.json';
import dashJumpJson from './dash-jump.json';
import crowdJson from './crowd.json';
import comboRoutesJson from './combo-routes.json';
import academyRecipesJson from './academy-recipes.json';
import defenseDrillsJson from './defense-drills.json';
import specialsGrabsJson from './specials-grabs.json';
import grabEscapeJson from './grab-escape.json';
import coopDrillsJson from './coop-drills.json';
import stageRescueJson from './stage-rescue.json';
import heroMountainJson from './hero-mountain.json';
import heroRiverJson from './hero-river.json';
import heroWindJson from './hero-wind.json';
import heroFireJson from './hero-fire.json';
import pairMountainRiverJson from './pair-mountain-river.json';
import pairMountainWindJson from './pair-mountain-wind.json';
import pairMountainFireJson from './pair-mountain-fire.json';
import pairRiverWindJson from './pair-river-wind.json';
import pairRiverFireJson from './pair-river-fire.json';
import pairWindFireJson from './pair-wind-fire.json';
import pursuitFireJson from './pursuit-fire.json';
import pursuitMountainWindJson from './pursuit-mountain-wind.json';
import { PAIRS, SCRIPTS } from './scripts';

/** The founders (roster entries 0 and 1); the twins have their own M16 replays. */
const FOUNDERS = HEROES.filter((h) => h.tags.includes('founder'));

const LOGS: [string, ReplayLog][] = [
  ['walk-square', walkSquareJson as ReplayLog],
  ['dash-jump', dashJumpJson as ReplayLog],
  ['crowd', crowdJson as ReplayLog],
  ['combo-routes', comboRoutesJson as ReplayLog],
  ['academy-recipes', academyRecipesJson as ReplayLog],
  ['defense-drills', defenseDrillsJson as ReplayLog],
  ['specials-grabs', specialsGrabsJson as ReplayLog],
  ['grab-escape', grabEscapeJson as ReplayLog],
  ['coop-drills', coopDrillsJson as ReplayLog],
  ['stage-rescue', stageRescueJson as ReplayLog],
  ['hero-mountain', heroMountainJson as ReplayLog],
  ['hero-river', heroRiverJson as ReplayLog],
  ['hero-wind', heroWindJson as ReplayLog],
  ['hero-fire', heroFireJson as ReplayLog],
  ['pair-mountain-river', pairMountainRiverJson as ReplayLog],
  ['pair-mountain-wind', pairMountainWindJson as ReplayLog],
  ['pair-mountain-fire', pairMountainFireJson as ReplayLog],
  ['pair-river-wind', pairRiverWindJson as ReplayLog],
  ['pair-river-fire', pairRiverFireJson as ReplayLog],
  ['pair-wind-fire', pairWindFireJson as ReplayLog],
  ['pursuit-fire', pursuitFireJson as ReplayLog],
  ['pursuit-mountain-wind', pursuitMountainWindJson as ReplayLog],
];

test('the pursuit replays ride the corridor to its Response Record, solo and in co-op', () => {
  for (const log of [pursuitFireJson, pursuitMountainWindJson] as ReplayLog[]) {
    const world = createWorld(log.seed, log.options);
    for (const f of log.frames) step(world, f);
    const p = world.pursuit!;
    expect(p.phase).toBe(PursuitPhase.Complete);
    expect(p.record.dismounted).toBeGreaterThan(0);
  }
});

/** Plays a log and collects each hero's grab events and every action that connected. */
function playM5(log: ReplayLog): { events: number[]; connected: Set<string> } {
  const world = createWorld(log.seed, log.options);
  const events: number[] = [];
  const connected = new Set<string>();
  const seen = new Set<string>();
  for (const f of log.frames) {
    step(world, f);
    for (const b of world.bodies) {
      for (const c of b.ctx.route) connected.add(routeAction(c)?.id ?? '?');
      const key = `${b.id}/${b.grabFrame}`;
      if (b.team === 'hero' && b.grabEvent !== GrabEvent.None && !seen.has(key)) {
        seen.add(key);
        events.push(b.grabEvent);
      }
    }
  }
  return { events, connected };
}

test('specials-grabs lands Specials, both throws, a grab route and the Ultimate', () => {
  const { events, connected } = playM5(specialsGrabsJson as ReplayLog);
  for (const id of [
    'stonewake-palm',
    'gatebreaker-advance',
    'sluicegate-toss',
    'keystone-knee',
    'lintel-drop',
    'rivergate-oath',
    'current-crescent',
    'eddy-swing',
  ])
    expect(connected).toContain(id);
  expect(events).toEqual(
    expect.arrayContaining([GrabEvent.Hold, GrabEvent.Throw, GrabEvent.Extension]),
  );
});

test('grab-escape: one Grab escape inside the window, then an early press that is thrown', () => {
  const { events } = playM5(grabEscapeJson as ReplayLog);
  expect(events).toEqual([
    GrabEvent.Grabbed,
    GrabEvent.Escape,
    GrabEvent.Grabbed,
    GrabEvent.EscapeEarly,
    GrabEvent.Thrown,
  ]);
});

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
      FOUNDERS.forEach((h, i) => {
        for (const r of h.recipes) if (recipeDone(r, d.ctx.route, i)) done.add(`${h.id}/${r.id}`);
      });
      const heroes = new Set(d.ctx.route.map((c) => Math.trunc(c / 64)));
      if (heroes.size === 2) coop = true;
    }
  }
  expect([...done].sort()).toEqual(
    FOUNDERS.flatMap((h) => h.recipes.map((r) => `${h.id}/${r.id}`)).sort(),
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

test('coop-drills: an airborne handoff, a team finisher bundle and one grab assist', () => {
  const log = coopDrillsJson as ReplayLog;
  const world = createWorld(log.seed, log.options);
  for (const f of log.frames) step(world, f);
  const c = world.coop;
  expect(c.handoffs).toBe(1);
  expect(c.finishers).toBe(1);
  expect(c.bundles).toBe(1);
  expect(c.bundleHits).toBe(2);
  expect(c.assists).toBe(1);
});

/** M16: plays a log and collects every connected action and the co-op counters. */
function playM16(log: ReplayLog) {
  const world = createWorld(log.seed, log.options);
  const connected = new Set<string>();
  for (const f of log.frames) {
    step(world, f);
    for (const b of world.bodies)
      for (const c of b.ctx.route) connected.add(routeAction(c)?.id ?? '?');
  }
  return { connected, coop: world.coop };
}

const HERO_LOGS: Record<string, ReplayLog> = {
  mountain: heroMountainJson as ReplayLog,
  river: heroRiverJson as ReplayLog,
  wind: heroWindJson as ReplayLog,
  fire: heroFireJson as ReplayLog,
};

test.each(HEROES.map((h) => h.id))(
  'hero-%s lands its recipes, three starting Specials and the signature Ultimate',
  (id) => {
    const h = HEROES.find((x) => x.id === id)!;
    const { connected } = playM16(HERO_LOGS[id]!);
    const starting = h.actions.filter((a) => a.category === 'special' && a.context === 'special');
    const specials = starting.filter((a) => connected.has(a.id));
    expect(specials.length, [...connected].join(' ')).toBeGreaterThanOrEqual(3);
    expect(h.actions.some((a) => a.category === 'ultimate' && connected.has(a.id))).toBe(true);
    expect(h.actions.some((a) => a.category === 'low' && connected.has(a.id))).toBe(true);
  },
);

test('hero-wind lands Clear-Sky Return off a whiff punish and Four-Wind Vigil', () => {
  const { connected } = playM16(heroWindJson as ReplayLog);
  for (const id of [
    'slipstream-backfist',
    'clear-sky-return',
    'four-wind-vigil',
    'skyward-sentinel',
  ])
    expect(connected).toContain(id);
});

test("hero-fire converts Flashpoint Clinch and Warden's Crucible on contact", () => {
  const { connected } = playM16(heroFireJson as ReplayLog);
  for (const id of [
    'flashpoint-clinch',
    'flashpoint-takedown',
    'wardens-crucible',
    'crucible-takedown',
  ])
    expect(connected).toContain(id);
  expect(connected).not.toContain('crucible-braced'); // the dummy is not a large enemy
});

const PAIR_LOGS: Record<string, ReplayLog> = {
  'mountain-river': pairMountainRiverJson as ReplayLog,
  'mountain-wind': pairMountainWindJson as ReplayLog,
  'mountain-fire': pairMountainFireJson as ReplayLog,
  'river-wind': pairRiverWindJson as ReplayLog,
  'river-fire': pairRiverFireJson as ReplayLog,
  'wind-fire': pairWindFireJson as ReplayLog,
};

test('there is one pair replay for each of the six legal pairs', () => {
  expect(PAIRS.map((p) => p.join('-')).sort()).toEqual(Object.keys(PAIR_LOGS).sort());
});

test.each(PAIRS.map((p) => p.join('-')))('pair-%s hands off and lands its team finisher', (key) => {
  const { connected, coop } = playM16(PAIR_LOGS[key]!);
  expect(coop.handoffs).toBeGreaterThanOrEqual(1);
  expect(coop.finishers).toBe(1);
  const twins = key === 'wind-fire';
  expect(connected.has('twin-accord')).toBe(twins);
  expect(connected.has('confluence-strike')).toBe(!twins);
  // Reciprocal Handoffs belong to the twins: both routes, once each.
  expect(coop.reciprocal).toBe(twins ? 2 : 0);
});
