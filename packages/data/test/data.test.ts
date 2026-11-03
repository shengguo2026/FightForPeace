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
  // Counters are counted separately from the 15 normal actions (F&D §13).
  const normals = hero.actions.filter((a) => a.category !== 'counter');
  expect(normals).toHaveLength(15);
  const counts: Record<string, number> = {};
  for (const a of normals) counts[a.category] = (counts[a.category] ?? 0) + 1;
  expect(counts).toEqual(split);
  for (const a of normals) {
    expect([a.frames.startup, a.frames.active, a.frames.recovery]).toEqual(SAR[a.id]);
    expect(a.frames.landing ?? false).toBe(a.category === 'aerial');
  }
});

const base = readFileSync(files[0]!, 'utf8');

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
      expect(hero.actions.at(-1)!.category).toBe('counter');
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
