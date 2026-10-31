/**
 * Hero action data: YAML files in packages/data/heroes are validated against a TypeBox
 * schema, checked for consistency (link targets, unique input slots), converted to the
 * simulation's integer units and written to packages/sim/src/combat/heroes.gen.ts.
 *
 *   pnpm gen:heroes
 *
 * The generated module is committed; a test fails when it is out of date. This file has
 * no relative imports so Node can run it directly with type stripping.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Static, Type as T } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { parse } from 'yaml';

const Dir = T.Union([
  T.Literal('neutral'),
  T.Literal('forward'),
  T.Literal('backward'),
  T.Literal('up'),
  T.Literal('down'),
  T.Literal('vertical'),
]);
const Frames = T.Integer({ minimum: 0, maximum: 600 });
const Px = T.Number({ minimum: -2000, maximum: 2000 });

const Hitbox = T.Object(
  {
    x: Px,
    w: T.Number({ exclusiveMinimum: 0, maximum: 2000 }),
    y: Px,
    h: T.Number({ exclusiveMinimum: 0, maximum: 2000 }),
    depth: T.Number({ exclusiveMinimum: 0, maximum: 1000 }),
  },
  { additionalProperties: false },
);

const Reaction = T.Object(
  {
    kind: T.Union([
      T.Literal('stagger'),
      T.Literal('knockback'),
      T.Literal('launch'),
      T.Literal('knockdown'),
      T.Literal('trip'),
    ]),
    hitstun: Frames,
    push: T.Optional(Px),
    lift: T.Optional(Px),
    airPop: T.Optional(Px),
    counterTrip: T.Optional(T.Boolean()),
  },
  { additionalProperties: false },
);

const Move = T.Object(
  {
    from: T.Integer({ minimum: 1, maximum: 600 }),
    to: T.Integer({ minimum: 1, maximum: 600 }),
    forward: T.Optional(Px),
    depth: T.Optional(Px),
    /** 'fixed': depth sign as written (negative = up-stage); 'input': multiplied by the held depth direction. */
    depthFrom: T.Optional(T.Union([T.Literal('fixed'), T.Literal('input')])),
    vy: T.Optional(Px),
  },
  { additionalProperties: false },
);

const Link = T.Object(
  {
    to: T.String({ minLength: 1 }),
    input: T.Optional(Dir),
    category: T.Union([
      T.Literal('chain'),
      T.Literal('air'),
      T.Literal('jumpChase'),
      T.Literal('dashBridge'),
      T.Literal('special'),
      T.Literal('ultimate'),
    ]),
    on: T.Array(T.Union([T.Literal('hit'), T.Literal('guard'), T.Literal('whiff')]), {
      minItems: 1,
    }),
    premium: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
  },
  { additionalProperties: false },
);

const Action = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    category: T.Union([
      T.Literal('standing'),
      T.Literal('aerial'),
      T.Literal('ground'),
      T.Literal('dash'),
      T.Literal('low'),
    ]),
    input: T.Object(
      {
        context: T.Union([
          T.Literal('neutral'),
          T.Literal('chain'),
          T.Literal('air'),
          T.Literal('groundFocus'),
          T.Literal('dash'),
          T.Literal('dashLow'),
        ]),
        dir: Dir,
      },
      { additionalProperties: false },
    ),
    frames: T.Object(
      {
        startup: T.Integer({ minimum: 1, maximum: 600 }),
        active: T.Union([
          T.Integer({ minimum: 1, maximum: 600 }),
          T.Array(T.Integer({ minimum: 1, maximum: 600 }), { minItems: 1 }),
        ]),
        recovery: Frames,
        landing: T.Optional(T.Boolean()),
      },
      { additionalProperties: false },
    ),
    hitbox: Hitbox,
    hurtbox: T.Optional(T.Union([T.Literal('standing'), T.Literal('low')])),
    damage: T.Integer({ minimum: 0, maximum: 10000 }),
    reaction: Reaction,
    costs: T.Object(
      {
        stun: T.Integer({ minimum: 0, maximum: 100 }),
        scale: T.Integer({ minimum: 0, maximum: 100 }),
        starter: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
        juggle: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
      },
      { additionalProperties: false },
    ),
    meter: T.Integer({ minimum: 0, maximum: 100 }),
    moves: T.Optional(T.Array(Move)),
    tags: T.Optional(T.Array(T.String({ pattern: '^[a-z][A-Za-z0-9]*$' }))),
    links: T.Optional(T.Array(Link)),
    note: T.Optional(T.String()),
  },
  { additionalProperties: false },
);

export const HeroSchema = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    bodyWidth: T.Integer({ minimum: 20, maximum: 400 }),
    actions: T.Array(Action, { minItems: 1, maxItems: 32 }),
  },
  { additionalProperties: false },
);

export type HeroYaml = Static<typeof HeroSchema>;

const DIR_CODE = { neutral: 0, forward: 1, backward: 2, up: 3, down: 4, vertical: 5 } as const;
const FX = 256;
const fx = (px: number | undefined) => Math.round((px ?? 0) * FX);

export class HeroDataError extends Error {}

/** Parses and validates one hero file. Throws HeroDataError with every problem listed. */
export function loadHero(source: string, file = 'hero.yaml'): HeroYaml {
  const raw: unknown = parse(source);
  const errors = [...Value.Errors(HeroSchema, raw)].map(
    (e) => `${file}: ${e.path || '/'} ${e.message}`,
  );
  if (errors.length > 0) throw new HeroDataError(errors.slice(0, 10).join('\n'));
  const hero = raw as HeroYaml;
  const problems: string[] = [];
  const ids = new Set<string>();
  const slots = new Map<string, string>();
  for (const a of hero.actions) {
    if (ids.has(a.id)) problems.push(`duplicate action id "${a.id}"`);
    ids.add(a.id);
    if (a.input.context === 'chain') continue;
    const dirs = a.input.dir === 'vertical' ? ['up', 'down'] : [a.input.dir];
    for (const d of dirs) {
      const key = `${a.input.context}/${d}`;
      const other = slots.get(key);
      if (other) problems.push(`"${a.id}" and "${other}" both use input ${key}`);
      slots.set(key, a.id);
    }
    if (a.frames.landing && a.category !== 'aerial')
      problems.push(`"${a.id}": only aerial actions use landing recovery`);
  }
  if (!slots.has('neutral/neutral'))
    problems.push('no neutral starter (context neutral, dir neutral)');
  for (const a of hero.actions) {
    for (const l of a.links ?? []) {
      const special = ['jump', 'dash', 'special', 'ultimate'].includes(l.to);
      if (!special && !ids.has(l.to)) problems.push(`"${a.id}" links to unknown action "${l.to}"`);
    }
    for (const m of a.moves ?? []) {
      if (m.to < m.from) problems.push(`"${a.id}": move sample ends before it starts`);
    }
  }
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  return hero;
}

/** Converts a validated hero into the simulation's HeroDef shape (fixed-point units). */
export function compileHero(hero: HeroYaml): unknown {
  const index = new Map(hero.actions.map((a, i) => [a.id, i]));
  return {
    id: hero.id,
    name: hero.name,
    bodyWidth: hero.bodyWidth,
    actions: hero.actions.map((a) => {
      const active = Array.isArray(a.frames.active) ? a.frames.active : [a.frames.active];
      return {
        id: a.id,
        name: a.name,
        category: a.category,
        context: a.input.context,
        dir: DIR_CODE[a.input.dir],
        startup: a.frames.startup,
        active,
        recovery: a.frames.recovery,
        landing: a.frames.landing ?? false,
        hitbox: {
          x: fx(a.hitbox.x),
          w: fx(a.hitbox.w),
          y: fx(a.hitbox.y),
          h: fx(a.hitbox.h),
          depth: fx(a.hitbox.depth),
        },
        hurtbox: a.hurtbox ?? (a.category === 'low' ? 'low' : 'standing'),
        damage: a.damage,
        reaction: {
          kind: a.reaction.kind,
          hitstun: a.reaction.hitstun,
          push: fx(a.reaction.push),
          lift: fx(a.reaction.lift),
          airPop: fx(a.reaction.airPop),
          counterTrip: a.reaction.counterTrip ?? false,
        },
        stunDecayCost: a.costs.stun,
        damageScaleCost: a.costs.scale,
        starterProration: a.costs.starter ?? 0,
        juggleCost: a.costs.juggle ?? 0,
        meterGain: a.meter,
        moves: (a.moves ?? []).map((m) => ({
          from: m.from,
          to: m.to,
          forward: m.forward === undefined ? null : fx(m.forward),
          depth: fx(m.depth),
          depthFromInput: m.depthFrom === 'input',
          vy: m.vy === undefined ? null : fx(m.vy),
        })),
        tags: [...(a.tags ?? [])].sort(),
        links: (a.links ?? []).map((l) => {
          const kind = ['jump', 'dash', 'special', 'ultimate'].includes(l.to) ? l.to : 'action';
          const to = kind === 'action' ? index.get(l.to)! : -1;
          const target = kind === 'action' ? hero.actions[to]! : undefined;
          const dir = l.input ?? (target ? target.input.dir : 'neutral');
          return {
            kind,
            to,
            dir: DIR_CODE[dir],
            category: l.category,
            onHit: l.on.includes('hit'),
            onGuard: l.on.includes('guard'),
            onWhiff: l.on.includes('whiff'),
            premium: l.premium ?? 0,
          };
        }),
        pose: `hero.${hero.id}.pose.${a.category}.${a.id}`,
      };
    }),
  };
}

const HEROES_DIR = fileURLToPath(new URL('../heroes/', import.meta.url));
export const GENERATED_PATH = fileURLToPath(
  new URL('../../sim/src/combat/heroes.gen.ts', import.meta.url),
);

/** Hero files in roster order: founders first (by file name order), then the rest. */
export function heroFiles(dir = HEROES_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((f) => `${dir}${f}`);
}

const ROSTER_ORDER = ['mountain.yaml', 'river.yaml'];
function order(file: string): number {
  const i = ROSTER_ORDER.indexOf(file);
  return i === -1 ? ROSTER_ORDER.length : i;
}

/** Builds the source of heroes.gen.ts from the given hero files. */
export function generate(files = heroFiles()): string {
  const heroes = files.map((f) =>
    compileHero(loadHero(readFileSync(f, 'utf8'), f.split('/').pop())),
  );
  const body = JSON.stringify(heroes, null, 2);
  return `// GENERATED by packages/data/src/generate.ts from packages/data/heroes/*.yaml.
// Do not edit by hand: change the YAML and run \`pnpm gen:heroes\`.
import type { HeroDef } from './types';

export const HERO_DATA: readonly HeroDef[] = ${body};
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(GENERATED_PATH, generate());
  console.log(`wrote ${GENERATED_PATH}`);
}
