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
  loadCoop,
  loadHero,
  loadGreenhouse,
  loadMounted,
  loadStage,
  loadWeapon,
  stageFileList,
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

test('roster order puts the founders first, then the twins (M16)', () => {
  expect(files.map((f) => basename(f))).toEqual([
    'mountain.yaml',
    'river.yaml',
    'wind.yaml',
    'fire.yaml',
  ]);
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

test('another hero file becomes another roster entry with no code change (Review Focus 7)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'heroes-'));
  for (const f of files) copyFileSync(f, join(dir, basename(f)));
  writeFileSync(join(dir, 'zz-test.yaml'), base.replace('id: mountain', 'id: test-hero'));
  const source = generate(heroFiles(join(dir, '/')), [], undefined, null);
  expect(source).toContain('"id": "test-hero"');
  expect(source.match(/"bodyWidth"/g)).toHaveLength(files.length + 1);
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
    expect(enemyFiles().map((f) => basename(f))[0]).toBe('trainer.yaml');
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
      'disarming-swipe',
    ]);
    expect(tags['disarming-swipe']).toEqual(expect.arrayContaining(['selectOnly']));
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

describe('co-op rules (M8)', () => {
  const coopPath = new URL('../coop/coop.yaml', import.meta.url);
  // CRLF-safe: a Windows checkout may have CRLF endings; YAML parsing does not care.
  const coop = readFileSync(coopPath, 'utf8');
  const heroes = () => files.map((f) => loadHero(readFileSync(f, 'utf8'), basename(f)));

  test('coop.yaml loads against all four heroes and names no hero', () => {
    const c = loadCoop(coop, heroes());
    expect(c.teamFinishers.map((f) => [f.id, f.pair])).toEqual([
      ['twin-accord', ['twin', 'twin']],
      ['confluence', ['guardian', 'guardian']],
    ]);
    expect(coop).not.toMatch(/\bmountain\b|\briver\b|\bwind\b|\bfire\b/);
  });

  test('a hero action with an undeclared handoff tag fails', () => {
    const hs = heroes();
    hs[0]!.actions[0]!.tags = ['handoffSomewhere'];
    expect(() => loadCoop(coop, hs)).toThrow(/handoff tag handoffSomewhere is not declared/);
  });

  test('a paired hero without the team move fails', () => {
    const hs = heroes();
    hs[1]!.actions = hs[1]!.actions.filter((a) => a.category !== 'team');
    expect(() => loadCoop(coop, hs)).toThrow(/river has no team move "confluence-strike"/);
  });

  test('team finisher parts use category and context team together', () => {
    const bad = base.replace('category: team', 'category: special');
    expect(() => loadHero(bad)).toThrow(HeroDataError);
  });
});

// --- M9 stage definitions -----------------------------------------------------------------

const KITS = [
  'trainer',
  'recruit',
  'shield',
  'runner',
  'overseer',
  'lookout',
  'enforcer',
  'commander',
];
const stage1 = () => readFileSync(stageFileList()[0]!, 'utf8');

test('stage1.yaml compiles to eight beats with one arena per beat and per camera lock', () => {
  const { stage, arenas } = loadStage(stage1(), KITS, 100) as {
    stage: { beats: { base: number; locks: { arena: number }[] }[] };
    arenas: { id: string; stage: boolean }[];
  };
  expect(stage.beats).toHaveLength(8);
  const locks = stage.beats.reduce((n, b) => n + b.locks.length, 0);
  expect(arenas).toHaveLength(8 + locks);
  expect(arenas.every((a) => a.stage)).toBe(true);
  expect(stage.beats[0]!.base).toBe(100);
  expect(stage.beats[0]!.locks[0]!.arena).toBe(101);
});

test('a lock whose enemies start outside its view is rejected', () => {
  const bad = stage1().replace(
    '{ kit: recruit, x: 1500, z: 760 }',
    '{ kit: recruit, x: 4000, z: 760 }',
  );
  expect(() => loadStage(bad, KITS, 0)).toThrow(/starts outside its view/);
});

test('an unknown enemy kit in a lock is rejected', () => {
  const bad = stage1().replace(
    '{ kit: shield, x: 4000, z: 820 }',
    '{ kit: dragon, x: 4000, z: 820 }',
  );
  expect(() => loadStage(bad, KITS, 0)).toThrow(/unknown enemy kit "dragon"/);
});

test('the stage must end on the sponsor evidence', () => {
  const bad = stage1().replace(/\n {4}# Appears when the Commander[\s\S]*$/, '\n');
  expect(() => loadStage(bad, KITS, 0)).toThrow(/must hold the sponsor evidence/);
});

test('a stage may lock its roster and add guests; unknown heroes are rejected', () => {
  const src = stage1().replace(
    "name: 'The Broken Water Pact'",
    "name: 'X'\nroster: [river]\nguests: [mountain]",
  );
  const { stage } = loadStage(src, KITS, 0, 's.yaml', ['mountain', 'river']) as {
    stage: { roster: string[]; guests: string[] };
  };
  expect(stage.roster).toEqual(['river']);
  expect(stage.guests).toEqual(['mountain']);
  const bad = src.replace('roster: [river]', 'roster: [kael]');
  expect(() => loadStage(bad, KITS, 0, 's.yaml', ['mountain', 'river'])).toThrow(
    /unknown roster hero "kael"/,
  );
});

test('beats follow in file order unless they branch with next', () => {
  const { stage } = loadStage(stage1(), KITS, 0) as { stage: { beats: { next: number[] }[] } };
  expect(stage.beats.map((b) => b.next)).toEqual([[1], [2], [3], [4], [5], [6], [7], []]);
  const branch = stage1().replace(
    "objective: 'Cross the dry fields toward the bridge'",
    "objective: 'Cross the dry fields toward the bridge'\n    next: [bridge, rescue]",
  );
  const out = loadStage(branch, KITS, 0) as { stage: { beats: { next: number[] }[] } };
  expect(out.stage.beats[0]!.next).toEqual([1, 2]);
  const back = stage1().replace(
    "objective: 'Break the formation on the bridge'",
    "objective: 'Break the formation on the bridge'\n    next: [fields]",
  );
  expect(() => loadStage(back, KITS, 0)).toThrow(/must come later in the file/);
  const skip = stage1().replace(
    "objective: 'Cross the dry fields toward the bridge'",
    "objective: 'Cross the dry fields toward the bridge'\n    next: [rescue]",
  );
  expect(() => loadStage(skip, KITS, 0)).toThrow(/bridge: no beat leads here/);
});

describe('mounted system (M17)', () => {
  const MOUNTED = readFileSync(new URL('../mounted/mounted.yaml', import.meta.url), 'utf8');
  const IDS = ['mountain', 'river', 'wind', 'fire'];
  const mounted = (src = MOUNTED) =>
    loadMounted(src, IDS) as {
      heroes: { slot: number }[][];
      corridors: { id: string }[];
    };

  test('mounted.yaml compiles: six slots per hero in roster order, one corridor', () => {
    const m = mounted();
    expect(m.heroes).toHaveLength(4);
    for (const kit of m.heroes) expect(kit.map((a) => a.slot)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(m.corridors.map((c) => c.id)).toEqual(['perimeter-pursuit']);
  });

  test('a hero without a mounted kit is rejected', () => {
    expect(() => loadMounted(MOUNTED, [...IDS, 'lake'])).toThrow(/hero "lake" has no mounted kit/);
  });

  test('a kit missing its lean is rejected', () => {
    const bad = MOUNTED.replace(/slot: lean/, 'slot: hop');
    expect(() => mounted(bad)).toThrow(/needs exactly one "lean" action/);
  });

  test('a wave that targets unknown equipment is rejected', () => {
    const bad = MOUNTED.replace('target: valve', 'target: windmill');
    expect(() => mounted(bad)).toThrow(/targets unknown "windmill"/);
  });
});

describe('greenhouse systems (M18)', () => {
  const SRC = readFileSync(new URL('../greenhouse/greenhouse.yaml', import.meta.url), 'utf8');
  const WEAPONS = [
    'service-lance',
    'six-round-sidearm',
    'support-gun',
    'breaching-grenade',
    'support-rail',
  ];
  const KITS = ['training', 'recruit', 'runner'];
  const load = (src = SRC) =>
    loadGreenhouse(src, WEAPONS, KITS, 20) as {
      greenhouse: { rooms: { arena: number; assets: { id: string }[] }[] };
      arenas: { id: string; stage: boolean }[];
    };

  test('greenhouse.yaml compiles: one room, a hidden arena, the shutter and rack assets', () => {
    const g = load();
    expect(g.greenhouse.rooms).toHaveLength(1);
    expect(g.greenhouse.rooms[0]!.arena).toBe(20);
    expect(g.arenas[0]!.stage).toBe(true);
    expect(g.greenhouse.rooms[0]!.assets.map((a) => a.id)).toContain('shutter');
  });

  test('rejects a protected container with integrity and an unknown content', () => {
    expect(() =>
      load(
        SRC.replace(
          'ownership: protected, open: 18, size: [40, 22, 50]',
          'ownership: protected, integrity: 5, size: [40, 22, 50]',
        ),
      ),
    ).toThrow(/protected containers open with Interact/);
    expect(() => load(SRC.replace('weapon: service-lance }', 'weapon: laser-lance }'))).toThrow(
      /unknown weapon "laser-lance"/,
    );
  });

  test('rejects grade bands that do not fall to 0 and a slow cooperative redirect', () => {
    expect(() =>
      load(
        SRC.replace(
          '{ id: damaged, name: Damaged, min: 0 }',
          '{ id: damaged, name: Damaged, min: 10 }',
        ),
      ),
    ).toThrow(/grades run/);
    expect(() => load(SRC.replace('solo: 180, coop: 60', 'solo: 60, coop: 180'))).toThrow(
      /cooperative redirect is faster/,
    );
  });

  test('firearms: one shot, an optional whenEmpty strike on its input, a throw', () => {
    const src = readFileSync(new URL('../weapons/six-round-sidearm.yaml', import.meta.url), 'utf8');
    expect(() => loadWeapon(src, 'six-round-sidearm.yaml')).not.toThrow();
    expect(() =>
      loadWeapon(
        src.replace('    tags: [whenEmpty]\n', '    tags: [whenEmpty]\n    ammo: 1\n'),
        'x.yaml',
      ),
    ).toThrow(/exactly one action that spends rounds|whenEmpty strike uses/);
    const melee = readFileSync(new URL('../weapons/handwheel.yaml', import.meta.url), 'utf8');
    expect(() =>
      loadWeapon(melee.replace('ammo', 'x') + 'fire: { defenseCost: 5 }\n', 'h.yaml'),
    ).toThrow(/only firearms have a fire cost/);
  });
});
