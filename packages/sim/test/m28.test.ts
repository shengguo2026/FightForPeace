import { Cheat } from '../src/cheats/cheats';
import { ARENAS } from '../src/enemies/data';
import { STAGES, stageResults } from '../src/stage/run';
import { RunPhase, type World } from '../src/world/types';
import { createWorld, hashWorld, step } from '../src/world/world';
import { snapshotWorld, restoreWorld } from '../src/net/snapshot';
import { stage3BotInput } from './stage3Bot';

/**
 * M28 Stage 3 · Shadows over the Herb Mountain: the route as data (spec §5, §22.4), the
 * rescues and research record on the M25 ladder, Tomas's story moments, the epilogue and
 * a whole bot journey solo and in co-op.
 */
const S3 = STAGES.find((s) => s.id === 'stage3')!;
const SAFE = Cheat.SAFEHEART | Cheat.STEADYRIDE;
const MAX = 60 * 60 * 30;

function world(heroes: string[], seed = 7): World {
  return createWorld(seed, {
    stage: 'stage3',
    difficulty: 'medium',
    heroes,
    cheats: { hero: heroes.map(() => SAFE), session: 0, marked: false },
  } as never);
}

function play(w: World, heroes: number, frames = MAX): number {
  let i = 0;
  for (; i < frames && w.run!.phase !== RunPhase.Complete; i += 1)
    step(
      w,
      Array.from({ length: heroes }, (_, s) => stage3BotInput(w, s, { branches: true })),
    );
  return i;
}

describe('M28 Stage 3 route', () => {
  test('seventeen beats over six areas and two branches, with five checkpoints', () => {
    expect(S3.name).toBe('Shadows over the Herb Mountain');
    expect(S3.beats).toHaveLength(17);
    const areas = [...new Set(S3.beats.filter((b) => !b.branch).map((b) => b.area))];
    expect(areas).toEqual(['switchback', 'qinglan', 'basin', 'quarry', 'camp', 'terrace']);
    expect(S3.beats.filter((b) => b.branch).map((b) => [b.branch!.id, b.area])).toEqual([
      ['signal-hut', 'signalhut'],
      ['herbalist-shelter', 'shelter'],
    ]);
    expect(S3.beats.filter((b) => b.checkpoint).map((b) => b.id)).toEqual([
      'switchback-ride',
      'drying-racks',
      'loose-scaffold',
      'ridge-ride',
      'terrace',
    ]);
    expect(S3.beats.filter((b) => b.corridor).map((b) => b.corridor)).toEqual([
      's3-switchback-ride',
      's3-ridge-pursuit',
    ]);
  });

  test('the twelve encounters, the boss and the branches carry the §22.4 names', () => {
    const named = S3.beats
      .filter((b) => b.arena >= 0 && !b.branch && b.id !== 'terrace')
      .map((b) => b.name);
    expect(named).toEqual([
      'Hoofprints in the Mud',
      'Rope across the Trail',
      'Empty Drying Racks',
      'The Watch Path',
      'Mist over the Beds',
      'Two Voices in the Mist',
      'Loose Scaffold',
      'Hammer Line',
      'Cart Rails',
      'Outer Fence',
      'Lantern Row',
      "Ren Xia's Enclosure",
    ]);
    expect(ARENAS.find((a) => a.id === 's3-terrace')!.name).toBe('Chief of the Broken Ridge');
    expect(ARENAS.find((a) => a.id === 's3-signal-hut')!.name).toBe('The Silent Antenna');
    expect(ARENAS.find((a) => a.id === 's3-herbalist-shelter')!.name).toBe('Baskets Left Behind');
  });

  test('four rescues on the main route and Wei Shan in the Signal Hut, one research record', () => {
    const units = (b: (typeof S3.beats)[number]) =>
      b.arena >= 0 ? (ARENAS[b.arena]!.objectives?.units ?? []).map((u) => u.id) : [];
    expect(S3.beats.filter((b) => !b.branch).flatMap(units)).toEqual([
      'gao-wen',
      'tao-min',
      'an-bo',
      'ren-xia',
    ]);
    expect(S3.beats.filter((b) => b.branch).flatMap(units)).toEqual(['wei-shan']);
    const cases = S3.beats.flatMap((b) =>
      b.arena >= 0 ? (ARENAS[b.arena]!.objectives?.cases ?? []).map((c) => c.id) : [],
    );
    expect(cases).toEqual(['sample-case']);
    expect(
      S3.beats.filter((b) => b.story || b.storyClear).map((b) => [b.id, b.story, b.storyClear]),
    ).toEqual([
      ['mist-beds', 'radio', ''],
      ['ren-enclosure', 'cabin', 'escape'],
    ]);
  });

  test('the grade follows §22.2 and Stage 1 and 2 keep no journey record', () => {
    expect(S3.grade.categories.map((c) => [c.id, c.weight])).toEqual([
      ['rescue', 35],
      ['record', 15],
      ['capture', 20],
      ['combat', 20],
      ['branches', 10],
    ]);
    expect(S3.grade.conditionCaps).toEqual([{ ladder: 'rescue', state: 'critical', rank: 'A' }]);
    expect(S3.grade.cheat).toBe('none');
    for (const stage of ['stage1', 'stage2']) {
      const w = createWorld(1, { stage, difficulty: 'medium', heroes: ['mountain'] } as never);
      expect(w.run!.journey).toBeUndefined();
    }
    expect(world(['mountain']).run!.journey).toBeDefined();
  });
});

describe('M28 Stage 3 journey', () => {
  test('a solo bot clears all seventeen beats: rescues, record, Tomas, Garran, the invoice', () => {
    const w = world(['mountain']);
    const seen = new Set<number>();
    let i = 0;
    for (; i < MAX && w.run!.phase !== RunPhase.Complete; i += 1) {
      seen.add(w.run!.beat);
      step(w, [stage3BotInput(w, 0, { branches: true })]);
    }
    expect(w.run!.phase).toBe(RunPhase.Complete);
    expect(seen.size).toBe(17);
    const r = stageResults(w)!;
    const j = r.journey!;
    expect(j.rescues.map((x) => [x.id, x.branch])).toEqual([
      ['wei-shan', true],
      ['gao-wen', false],
      ['tao-min', false],
      ['an-bo', false],
      ['ren-xia', false],
    ]);
    for (const x of j.rescues) expect(['secure', 'strained', 'critical']).toContain(x.stateId);
    expect(['documented', 'recovered', 'disturbed']).toContain(j.record);
    expect(j.story).toEqual(['radio', 'cabin']);
    expect(j.storyClear).toEqual(['escape']);
    expect(r.branches.map((b) => [b.id, b.artifact])).toEqual([
      ['signal-hut', 'qinglan-rescue-bell'],
      ['herbalist-shelter', 'gao-wen-trail-ledger'],
    ]);
    expect(r.capture).not.toBeNull();
    // A Cheat-Assisted run receives no grade (§22.2).
    expect(r.cheatAssisted).toBe(true);
    expect(r.overall).toBe('-');
    // The epilogue: capture, each main-route rescue, the record, branches, invoice, lowland.
    const cards = r.epilogue;
    expect(cards[0]).toMatch(/^capture\.(resolve|forced)$/);
    expect(cards.filter((c) => c.startsWith('rescue.')).map((c) => c.split('.')[1])).toEqual([
      'gao-wen',
      'tao-min',
      'an-bo',
      'ren-xia',
    ]);
    expect(cards).toContain(`record.${j.record}`);
    expect(cards.slice(-4)).toEqual([
      'branch.signal-hut',
      'branch.herbalist-shelter',
      'invoice',
      'lowland',
    ]);
  });

  test('two heroes clear the stage together', () => {
    const w = world(['mountain', 'river'], 11);
    play(w, 2);
    expect(w.run!.phase).toBe(RunPhase.Complete);
    expect(stageResults(w)!.journey!.rescues.filter((x) => !x.branch)).toHaveLength(4);
  });

  test('the journey is deterministic and survives a snapshot mid-stage', () => {
    const a = world(['mountain'], 5);
    const b = world(['mountain'], 5);
    play(a, 1, 60 * 240);
    play(b, 1, 60 * 240);
    expect(a.run!.beat).toBeGreaterThan(3);
    expect(hashWorld(a)).toBe(hashWorld(b));
    const c = restoreWorld(snapshotWorld(a));
    expect(hashWorld(c)).toBe(hashWorld(a));
    for (let i = 0; i < 600; i += 1) {
      step(a, [stage3BotInput(a, 0, { branches: true })]);
      step(c, [stage3BotInput(c, 0, { branches: true })]);
    }
    expect(hashWorld(c)).toBe(hashWorld(a));
  });
});
