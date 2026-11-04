import { readFileSync, mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
  GENERATED_PATH,
  HeroDataError,
  compileHero,
  enemyFiles,
  generate,
  heroFiles,
  loadHero,
} from '../src/generate';

const files = heroFiles();
const load = (name: string) =>
  loadHero(
    readFileSync(
      files.find((f) => f.endsWith(name))!,
      'utf8',
    ),
  );

test('the committed heroes.gen.ts is up to date (run pnpm gen:heroes)', () => {
  // A Windows checkout may have CRLF line endings; compare the text, not the line endings.
  expect(readFileSync(GENERATED_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(generate());
});

test('roster order puts the founders first', () => {
  expect(files.map((f) => basename(f))).toEqual(['mountain.yaml', 'river.yaml']);
});

const NORMAL = ['standing', 'aerial', 'ground', 'dash', 'low'];

const SAR: Record<string, [number, number | number[], number]> = {
  'masons-touch': [5, 3, 9],
  'brace-elbow': [7, 3, 12],
  'gatepost-hammer': [11, 4, 19],
  'stone-shoulder': [12, 5, 18],
  'anchor-hook': [8, 3, 14],
  'high-bank-lift': [10, 4, 20],
  'low-bank-sweep': [9, 4, 17],
  'rafter-palm': [5, 4, 8],
  'stonefall-knee': [9, 6, 14],
  'cornerstone-sweep': [8, 5, 12],
  'settling-palm': [8, 4, 15],
  'lockgate-press': [10, [6, 1, 5, 1, 5], 20],
  'foundation-rise': [12, 5, 23],
  'rampart-charge': [9, 5, 18],
  'faultline-reap': [8, 5, 22],
  'reed-tap': [4, 3, 8],
  'turning-current': [6, 3, 10],
  'open-channel-kick': [9, 4, 16],
  'rapids-step': [7, 4, 13],
  'ebb-heel': [8, 3, 15],
  'northbank-arc': [8, 4, 16],
  'southbank-slide': [9, 6, 18],
  'reedwing-tap': [4, 4, 7],
  'current-chase': [7, 5, 10],
  'bank-switch-arc': [8, 6, 12],
  'ebbturn-heel': [6, 4, 9],
  'skipping-current': [6, 4, 12],
  'rising-eddy': [9, 5, 20],
  'rapid-crossing': [6, 5, 15],
  'undertow-slide': [6, 7, 24],
};

test.each([
  ['mountain.yaml', { standing: 7, aerial: 3, ground: 3, dash: 1, low: 1 }],
  ['river.yaml', { standing: 7, aerial: 4, ground: 2, dash: 1, low: 1 }],
])('%s has 15 actions with the §10.2 category split and Appendix B frame data', (file, split) => {
  const hero = load(file);
  // Counters, Specials, Ultimates and grab moves are counted separately from the 15
  // normal actions (F&D §13).
  const normals = hero.actions.filter((a) => NORMAL.includes(a.category));
  expect(normals).toHaveLength(15);
  const counts: Record<string, number> = {};
  for (const a of normals) counts[a.category] = (counts[a.category] ?? 0) + 1;
  expect(counts).toEqual(split);
  for (const a of normals) {
    expect([a.frames.startup, a.frames.active, a.frames.recovery]).toEqual(SAR[a.id]);
    expect(a.frames.landing ?? false).toBe(a.category === 'aerial');
  }
});

// A Windows checkout may have CRLF line endings: edits below match LF text.
const base = readFileSync(files[0]!, 'utf8').replace(/\r\n/g, '\n');

test('a missing link target fails with a readable message', () => {
  const bad = base.replace('to: brace-elbow,', 'to: brace-elbo,');
  expect(() => loadHero(bad)).toThrow(/unknown action "brace-elbo"/);
});

test('two actions on one input slot fail', () => {
  const bad = base.replace(
    'input: { context: neutral, dir: backward }',
    'input: { context: neutral, dir: forward }',
  );
  expect(() => loadHero(bad)).toThrow(HeroDataError);
  expect(() => loadHero(bad)).toThrow(/both use input neutral\/forward/);
});

test('a negative frame count fails the schema', () => {
  const bad = base.replace('recovery: 9 }', 'recovery: -9 }');
  expect(() => loadHero(bad)).toThrow(/frames\/recovery/);
});

test('pose IDs name the hero, category and action', () => {
  const compiled = compileHero(load('mountain.yaml')) as { actions: { pose: string }[] };
  expect(compiled.actions[7]!.pose).toBe('hero.mountain.pose.aerial.rafter-palm');
});

test('a third hero file becomes a third roster entry with no code change (Review Focus 7)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'heroes-'));
  for (const f of files) copyFileSync(f, join(dir, basename(f)));
  writeFileSync(join(dir, 'zz-test.yaml'), base.replace('id: mountain', 'id: test-hero'));
  const source = generate(heroFiles(join(dir, '/')), []);
  expect(source).toContain('"id": "test-hero"');
  expect(source.match(/"bodyWidth"/g)).toHaveLength(3);
});

describe('Academy recipes (M3)', () => {
  test.each(['mountain.yaml', 'river.yaml'])('%s has the three §8.3 recipes', (file) => {
    const hero = load(file);
    expect(hero.recipes?.map((r) => r.family)).toEqual(['foundation', 'aerial', 'ground']);
    expect(hero.recipes?.find((r) => r.family === 'ground')?.setup?.counterHit).toBe(true);
  });

  test('a recipe step naming an unknown action fails with a readable message', () => {
    const bad = base.replace(
      'steps: [masons-touch, brace-elbow, gatepost-hammer]',
      'steps: [masons-touch, brace-elbo]',
    );
    expect(() => loadHero(bad)).toThrow(/recipe "foundation" names unknown action "brace-elbo"/);
  });

  test('alternatives compile to action indices and jump steps are hints', () => {
    const compiled = compileHero(load('mountain.yaml')) as {
      actions: { id: string }[];
      recipes: { steps: { jump: boolean; any: number[] }[] }[];
    };
    const ids = (any: number[]) => any.map((i) => compiled.actions[i]!.id);
    expect(compiled.recipes[1]!.steps[1]).toEqual({ jump: true, any: [] });
    expect(ids(compiled.recipes[2]!.steps[2]!.any)).toEqual(['lockgate-press', 'foundation-rise']);
  });
});

describe('Defense data (M4)', () => {
  const trainer = () => loadHero(readFileSync(enemyFiles()[0]!, 'utf8'), 'trainer.yaml', 'enemy');

  test.each(['mountain.yaml', 'river.yaml'])(
    '%s has one counter action, after the normals',
    (file) => {
      const hero = load(file);
      const counters = hero.actions.filter((a) => a.category === 'counter');
      expect(counters).toHaveLength(1);
      expect(hero.actions[15]!.category).toBe('counter');
      expect(counters[0]!.input.context).toBe('counter');
    },
  );

  test('the training enemy has one attack per defense-response profile', () => {
    const t = trainer();
    expect(enemyFiles().map((f) => basename(f))).toEqual(['trainer.yaml']);
    const tags = Object.fromEntries(t.actions.map((a) => [a.id, a.tags ?? []]));
    expect(Object.keys(tags)).toEqual([
      'jab',
      'club',
      'thrust',
      'two-step',
      'barrage',
      'bell-hammer',
      'collar-grab',
      'rope-snare',
    ]);
    expect(tags['jab']).toContain('counterable');
    expect(tags['club']).toContain('guardPressure');
    expect(tags['thrust']).toEqual(expect.arrayContaining(['guardPiercing', 'uncounterable']));
    expect(tags['two-step']).toContain('deflectBreak');
    expect(tags['bell-hammer']).toEqual(expect.arrayContaining(['unblockable', 'uncounterable']));
    for (const a of t.actions) expect(a.input.context).toBe('script');
  });

  test('guard cost and block-stun compile with defaults', () => {
    const c = compileHero(trainer(), 'enemy') as {
      actions: { id: string; guardCost: number; blockstun: number; pose: string }[];
    };
    const club = c.actions.find((a) => a.id === 'club')!;
    expect(club.guardCost).toBe(35);
    expect(club.blockstun).toBe(18);
    expect(club.pose).toBe('enemy.trainer.pose.standing.club');
    const m = compileHero(load('mountain.yaml')) as {
      actions: { guardCost: number; blockstun: number }[];
    };
    expect(m.actions[0]).toMatchObject({ guardCost: 10, blockstun: 14 });
  });

  test('a hero attack cannot be unblockable', () => {
    const bad = base.replace('tags: [wallBounce]', 'tags: [wallBounce, unblockable]');
    expect(() => loadHero(bad)).toThrow(/tag unblockable is for enemies only/);
  });

  test('a counter action must use the counter context', () => {
    const bad = base.replace(
      'input: { context: counter, dir: neutral }',
      'input: { context: neutral, dir: neutral }',
    );
    expect(() => loadHero(bad)).toThrow(/counter actions use category and context counter/);
  });
});

describe('Specials, Ultimates and grabs (M5)', () => {
  const B3: Record<string, [number, number | number[], number]> = {
    'stonewake-palm': [12, 4, 22],
    'gatebreaker-advance': [16, 8, 28],
    'rising-rampart': [7, 8, 30],
    'rivergate-oath': [10, [3, 4, 3, 4, 3, 4, 3], 42],
    'current-crescent': [10, 3, 20],
    'gale-wheel': [8, [3, 1, 2, 1, 3, 1, 2, 1, 4], 23],
    'ebbstep-return': [6, 4, 26],
    'tempest-crossing': [8, [3, 3, 3, 2, 3, 2, 3, 2, 5], 40],
  };
  const span = (a: number | number[]) => (Array.isArray(a) ? a.reduce((s, n) => s + n, 0) : a);

  test.each([
    [
      'mountain.yaml',
      ['stonewake-palm', 'gatebreaker-advance', 'rising-rampart'],
      'rivergate-oath',
    ],
    ['river.yaml', ['current-crescent', 'gale-wheel', 'ebbstep-return'], 'tempest-crossing'],
  ])('%s: core Specials and signature Ultimate with Appendix B.3 frames', (file, specials, ult) => {
    const hero = load(file);
    const core = hero.actions.filter((a) => a.category === 'special' && !a.catalogue);
    expect(core.map((a) => a.id)).toEqual(specials);
    expect(core.map((a) => a.input.dir)).toEqual(['neutral', 'forward', 'backward']);
    const ults = hero.actions.filter((a) => a.category === 'ultimate' && !a.catalogue);
    expect(ults.map((a) => [a.id, a.input.dir])).toEqual([[ult, 'neutral']]);
    for (const a of [...core, ...ults]) {
      expect([a.frames.startup, a.frames.active, a.frames.recovery]).toEqual(B3[a.id]);
    }
    // Ultimates: 24 (Mountain) and 26 (River) active frames, as in B.3.
    expect(span(ults[0]!.frames.active)).toBe(file === 'mountain.yaml' ? 24 : 26);
  });

  test.each(['mountain.yaml', 'river.yaml'])(
    '%s has two catalogue moves and the six grab-route moves',
    (file) => {
      const hero = load(file);
      const cat = hero.actions.filter((a) => a.catalogue);
      expect(cat.map((a) => a.category).sort()).toEqual(['special', 'ultimate']);
      const ctx = hero.actions
        .filter((a) => a.input.context.startsWith('grab'))
        .map((a) => `${a.input.context}/${a.input.dir}`)
        .sort();
      expect(ctx).toEqual([
        'grab/neutral',
        'grabExtension/neutral',
        'grabRelease/neutral',
        'grabSpecial/neutral',
        'grabThrow/backward',
        'grabThrow/neutral',
      ]);
      expect(hero.actions.length).toBeLessThanOrEqual(32);
    },
  );

  test('the neutral slot holds a fixed signature only', () => {
    const bad = base.replace(
      'input: { context: special, dir: neutral }\n    frames: { startup: 12',
      'input: { context: special, dir: neutral }\n    catalogue: true\n    frames: { startup: 12',
    );
    expect(() => loadHero(bad)).toThrow(/neutral slot holds a fixed signature/);
  });

  test('a hero kit without a grab fails', () => {
    const bad = base.replace(
      'input: { context: grab, dir: neutral }',
      'input: { context: grab, dir: up }',
    );
    expect(() => loadHero(bad)).toThrow(/no grab move/);
  });

  test('restraint is an enemy-only outcome', () => {
    const bad = base.replace(
      'tags: [opensGroundWindow]\n',
      'tags: [opensGroundWindow, restraint]\n',
    );
    expect(() => loadHero(bad)).toThrow(/tag restraint is for enemies only/);
  });

  test("the training enemy's grabs carry their hold data and tags", () => {
    const t = loadHero(readFileSync(enemyFiles()[0]!, 'utf8'), 'trainer.yaml', 'enemy');
    const collar = t.actions.find((a) => a.id === 'collar-grab')!;
    const snare = t.actions.find((a) => a.id === 'rope-snare')!;
    expect(collar.grab).toEqual({ hold: 48, escapeFrom: 20, escapeWindow: 11 });
    expect(collar.tags).toContain('rescueInterruptible');
    expect(snare.tags).toEqual(expect.arrayContaining(['restraint', 'rescueInterruptible']));
    expect(snare.grab?.restraint).toBe(150);
  });
});
