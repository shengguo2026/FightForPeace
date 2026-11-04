/**
 * Action data: hero files in packages/data/heroes and enemy kits in packages/data/enemies
 * are validated against a TypeBox schema, checked for consistency (link targets, unique
 * input slots), converted to the simulation's integer units and written to
 * packages/sim/src/combat/heroes.gen.ts.
 *
 *   pnpm gen:heroes
 *
 * The generated module is committed; a test fails when it is out of date. This file has
 * no relative imports so Node can run it directly with type stripping.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
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
const Frame1 = T.Integer({ minimum: 1, maximum: 600 });
const FrameRange = T.Object({ from: Frame1, to: Frame1 }, { additionalProperties: false });
const SlotDir = T.Union([
  T.Literal('neutral'),
  T.Literal('forward'),
  T.Literal('backward'),
  T.Literal('up'),
  T.Literal('down'),
]);
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
      T.Literal('grab'),
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
      T.Literal('counter'),
      T.Literal('special'),
      T.Literal('ultimate'),
      T.Literal('grab'),
      T.Literal('grabStrike'),
      T.Literal('throw'),
      /** A held weapon's throw (weapon files only): releases the item on its first active frame. */
      T.Literal('weaponThrow'),
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
          T.Literal('counter'),
          T.Literal('script'),
          T.Literal('special'),
          T.Literal('ultimate'),
          T.Literal('grab'),
          T.Literal('grabExtension'),
          T.Literal('grabRelease'),
          T.Literal('grabThrow'),
          T.Literal('grabSpecial'),
          /** Interact while holding a weapon (weapon files only). */
          T.Literal('weaponThrow'),
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
        /** Guard reaction of a defender who normally guards this action (default hit-stun − 4, at least 6). */
        blockstun: T.Optional(Frames),
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
        /** Defense-meter percent a normal guard of this action costs (default 10). */
        guard: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
        /** Meter-gain budget points this action spends on a target's combo (default 10). */
        meterDecay: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
      },
      { additionalProperties: false },
    ),
    meter: T.Integer({ minimum: 0, maximum: 100 }),
    /** Loadout slots a Special or Ultimate may be equipped in (default: its input direction). */
    slots: T.Optional(T.Array(SlotDir, { minItems: 1 })),
    /** Owned in the Lab but not equipped by default (spec Appendix A). */
    catalogue: T.Optional(T.Boolean()),
    /** Action frames that absorb strikes (damage, no reaction); grabs and guardPiercing win. */
    armor: T.Optional(FrameRange),
    /** Action frames that strikes cannot hit (grabs still connect). */
    invulnerable: T.Optional(FrameRange),
    /** Action frames with the hurtbox shifted `x` px backwards. */
    hurtShift: T.Optional(
      T.Object({ from: Frame1, to: Frame1, x: Px }, { additionalProperties: false }),
    ),
    /** The first active frame launches a projectile (the hitbox is its box) instead of striking. */
    projectile: T.Optional(
      T.Object(
        { speed: T.Number({ exclusiveMinimum: 0, maximum: 100 }), life: Frame1 },
        { additionalProperties: false },
      ),
    ),
    /** Enemy grabs: hold length, Grab Escape window and restraint length (frames). */
    grab: T.Optional(
      T.Object(
        {
          hold: Frame1,
          escapeFrom: T.Integer({ minimum: 0, maximum: 600 }),
          escapeWindow: Frame1,
          restraint: T.Optional(Frame1),
        },
        { additionalProperties: false },
      ),
    ),
    /** Throws tagged bodyProjectile: damage the thrown body deals to the enemy it hits. */
    bodyDamage: T.Optional(T.Integer({ minimum: 0, maximum: 10000 })),
    /** Tagged Clashes with Authored Strength: only actions with a strength can clash. */
    clash: T.Optional(T.Union([T.Literal('light'), T.Literal('heavy'), T.Literal('crushing')])),
    /** Tagged Impact Disarming: disarms when it meets the held weapon's grip resistance. */
    disarmPower: T.Optional(T.Integer({ minimum: 0, maximum: 1000 })),
    /** Damage to breakable scenery, once per action (default: half the damage). */
    breakPower: T.Optional(T.Integer({ minimum: 0, maximum: 1000 })),
    /** Hooks: draws the target towards the attacker at this speed instead of pushing it. */
    pull: T.Optional(T.Number({ exclusiveMinimum: 0, maximum: 100 })),
    /** Weapon files: rounds of the held weapon's finite ammunition this action spends. */
    ammo: T.Optional(T.Integer({ minimum: 1, maximum: 100 })),
    /** Hero Specials and Ultimates while armed (default: unavailable with a two-handed weapon). */
    armed: T.Optional(T.Union([T.Literal('unchanged'), T.Literal('unavailable')])),
    /** Weapon affinity overrides: the core action this one replaces. */
    replaces: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    moves: T.Optional(T.Array(Move)),
    tags: T.Optional(T.Array(T.String({ pattern: '^[a-z][A-Za-z0-9]*$' }))),
    links: T.Optional(T.Array(Link)),
    note: T.Optional(T.String()),
  },
  { additionalProperties: false },
);

const Recipe = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    family: T.Union([T.Literal('foundation'), T.Literal('aerial'), T.Literal('ground')]),
    /** Action ids in order; "a|b" accepts either; "jump" is a hint and is not matched. */
    steps: T.Array(T.String({ pattern: '^[a-z][a-z0-9|-]*$' }), { minItems: 1, maxItems: 12 }),
    setup: T.Optional(
      T.Object({ counterHit: T.Optional(T.Boolean()) }, { additionalProperties: false }),
    ),
  },
  { additionalProperties: false },
);

export const HeroSchema = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    bodyWidth: T.Integer({ minimum: 20, maximum: 400 }),
    actions: T.Array(Action, { minItems: 1, maxItems: 32 }),
    recipes: T.Optional(T.Array(Recipe, { maxItems: 16 })),
  },
  { additionalProperties: false },
);

export type HeroYaml = Static<typeof HeroSchema>;
type ActionYaml = Static<typeof Action>;

const Responses = T.Array(
  T.Union([
    T.Literal('blockable'),
    T.Literal('exactDeflectable'),
    T.Literal('counterReturnable'),
    T.Literal('strikeDeflectable'),
    T.Literal('catchable'),
  ]),
);

/**
 * A weapon (spec §11, F&D §7.1): its lifecycle profile and its Weapon Core in the hero
 * action schema, plus limited per-hero affinity overrides that replace core actions.
 */
export const WeaponSchema = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    class: T.Union([
      T.Literal('temporaryMelee'),
      T.Literal('recoverableThrown'),
      T.Literal('improvisedDebris'),
      T.Literal('firearm'),
      T.Literal('guardModifier'),
    ]),
    hands: T.Union([T.Literal(1), T.Literal(2)]),
    /** improvisedDebris: light (throw only, consumed), long (a shared strike and a throw), heavy. */
    debris: T.Optional(T.Union([T.Literal('light'), T.Literal('long'), T.Literal('heavy')])),
    integrity: T.Object(
      {
        max: T.Integer({ minimum: 1, maximum: 1000 }),
        worn: T.Integer({ minimum: 0, maximum: 1000 }),
        critical: T.Integer({ minimum: 0, maximum: 1000 }),
        hit: T.Integer({ minimum: 0, maximum: 1000 }),
        guard: T.Integer({ minimum: 0, maximum: 1000 }),
        clash: T.Integer({ minimum: 0, maximum: 1000 }),
        throw: T.Integer({ minimum: 0, maximum: 1000 }),
        deflect: T.Optional(T.Integer({ minimum: 0, maximum: 1000 })),
      },
      { additionalProperties: false },
    ),
    gripResistance: T.Integer({ minimum: 0, maximum: 1000 }),
    /** Finite rounds carried by the physical weapon (0 = none). */
    ammo: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
    /** Frames of the pickup. */
    pickup: T.Integer({ minimum: 1, maximum: 60 }),
    /** A destructive hazard may destroy it instead of the landing correction saving it. */
    hazardDestructible: T.Optional(T.Boolean()),
    /** Guard-modifier items: share (percent) of the Defense cost a normal guard pays. */
    guard: T.Optional(
      T.Object(
        { costPercent: T.Integer({ minimum: 0, maximum: 100 }) },
        { additionalProperties: false },
      ),
    ),
    throw: T.Object(
      {
        speed: T.Number({ exclusiveMinimum: 0, maximum: 60 }),
        lift: T.Number({ minimum: 0, maximum: 30 }),
        responses: Responses,
        /** Light debris: disabled after its impact instead of landing as a pickup. */
        consumed: T.Optional(T.Boolean()),
      },
      { additionalProperties: false },
    ),
    actions: T.Array(Action, { minItems: 1, maxItems: 24 }),
    affinity: T.Optional(T.Record(T.String({ pattern: '^[a-z][a-z0-9-]*$' }), T.Array(Action))),
  },
  { additionalProperties: false },
);

export type WeaponYaml = Static<typeof WeaponSchema>;

const CLASH_CODE = { light: 1, heavy: 2, crushing: 3 } as const;
const MELEE_CLASSES = ['temporaryMelee', 'improvisedDebris'];

/** Defense-profile tags only an enemy kit may use (heroes' attacks stay guardable). */
const ENEMY_ONLY_TAGS = ['unblockable', 'guardPiercing', 'restraint', 'rescueInterruptible'];
/** Contexts every hero kit fills exactly once with a neutral entry (M5 full kits). */
const REQUIRED_NEUTRAL = [
  'special',
  'ultimate',
  'grab',
  'grabExtension',
  'grabRelease',
  'grabThrow',
];
const LOADOUT_CONTEXTS = ['special', 'ultimate'];
const DEFAULT_GUARD_COST = 10;
const DEFAULT_METER_DECAY = 10;
/** Link targets that are not action ids: a jump, a dash, a loadout slot or the grab. */
const LINK_KINDS = ['jump', 'dash', 'special', 'ultimate', 'grab'];

/** Frame range as [from, to]; [0, -1] when absent (never matches). */
const range = (r: { from: number; to: number } | undefined): [number, number] =>
  r ? [r.from, r.to] : [0, -1];

const DIR_CODE = { neutral: 0, forward: 1, backward: 2, up: 3, down: 4, vertical: 5 } as const;
const FX = 256;
const fx = (px: number | undefined) => Math.round((px ?? 0) * FX);

export class HeroDataError extends Error {}

/**
 * Parses and validates one hero file (or, with kind 'enemy', one enemy kit). Throws
 * HeroDataError with every problem listed.
 */
export function loadHero(
  source: string,
  file = 'hero.yaml',
  kind: 'hero' | 'enemy' = 'hero',
): HeroYaml {
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
    if (kind === 'hero') {
      for (const t of a.tags ?? []) {
        if (ENEMY_ONLY_TAGS.includes(t)) problems.push(`"${a.id}": tag ${t} is for enemies only`);
      }
      if (a.input.context === 'script') problems.push(`"${a.id}": context script is for enemies`);
    }
    if ((a.category === 'counter') !== (a.input.context === 'counter'))
      problems.push(`"${a.id}": counter actions use category and context counter together`);
    const loadout = LOADOUT_CONTEXTS.includes(a.input.context);
    if (loadout && a.category !== a.input.context)
      problems.push(`"${a.id}": ${a.input.context} moves use category ${a.input.context}`);
    if ((a.slots || a.catalogue) && !loadout)
      problems.push(`"${a.id}": only Specials and Ultimates have loadout slots`);
    const slotList = a.slots ?? (a.input.dir === 'vertical' ? [] : [a.input.dir]);
    if (loadout && !slotList.includes(a.input.dir as never))
      problems.push(`"${a.id}": its input direction must be one of its slots`);
    if (loadout && slotList.includes('neutral') && (slotList.length > 1 || a.catalogue))
      problems.push(`"${a.id}": the neutral slot holds a fixed signature move only`);
    if (a.grab && (kind === 'hero' || a.category !== 'grab'))
      problems.push(`"${a.id}": grab hold data is for enemy grabs`);
    if (a.projectile && a.category !== 'special')
      problems.push(`"${a.id}": only Specials launch projectiles`);
    if (a.category === 'throw' && a.input.context !== 'grabThrow')
      problems.push(`"${a.id}": throws use context grabThrow`);
    if (
      a.category === 'weaponThrow' ||
      a.input.context === 'weaponThrow' ||
      a.ammo !== undefined ||
      a.replaces !== undefined
    )
      problems.push(`"${a.id}": weapon throws, ammunition and replaces belong in weapon files`);
    if (a.armed && !loadout) problems.push(`"${a.id}": only Specials and Ultimates declare armed`);
    if (a.input.context === 'chain' || a.input.context === 'script' || a.catalogue) continue;
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
  if (kind === 'hero' && !slots.has('neutral/neutral'))
    problems.push('no neutral starter (context neutral, dir neutral)');
  if (kind === 'hero') {
    for (const c of REQUIRED_NEUTRAL)
      if (!slots.has(`${c}/neutral`)) problems.push(`no ${c} move (context ${c}, dir neutral)`);
  }
  for (const a of hero.actions) {
    for (const l of a.links ?? []) {
      const special = LINK_KINDS.includes(l.to);
      if (!special && !ids.has(l.to)) problems.push(`"${a.id}" links to unknown action "${l.to}"`);
    }
    for (const m of a.moves ?? []) {
      if (m.to < m.from) problems.push(`"${a.id}": move sample ends before it starts`);
    }
  }
  const recipeIds = new Set<string>();
  for (const r of hero.recipes ?? []) {
    if (recipeIds.has(r.id)) problems.push(`duplicate recipe id "${r.id}"`);
    recipeIds.add(r.id);
    for (const step of r.steps) {
      if (step === 'jump') continue;
      for (const id of step.split('|')) {
        if (!ids.has(id)) problems.push(`recipe "${r.id}" names unknown action "${id}"`);
      }
    }
  }
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  return hero;
}


/** Compiles one action; `index` maps action ids to indices (links), `all` holds the targets. */
function compileAction(
  a: ActionYaml,
  index: Map<string, number>,
  all: readonly ActionYaml[],
  pose: string,
): unknown {
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
    blockstun: a.frames.blockstun ?? Math.max(6, a.reaction.hitstun - 4),
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
    guardCost: a.costs.guard ?? DEFAULT_GUARD_COST,
    meterGain: a.meter,
    meterDecay: a.costs.meterDecay ?? DEFAULT_METER_DECAY,
    slots: LOADOUT_CONTEXTS.includes(a.input.context)
      ? (a.slots ?? [a.input.dir]).map((d) => DIR_CODE[d])
      : [],
    catalogue: a.catalogue ?? false,
    armor: range(a.armor),
    invulnerable: range(a.invulnerable),
    hurtShift: a.hurtShift
      ? { from: a.hurtShift.from, to: a.hurtShift.to, x: fx(a.hurtShift.x) }
      : null,
    projectile: a.projectile ? { speed: fx(a.projectile.speed), life: a.projectile.life } : null,
    grab: a.grab
      ? {
          hold: a.grab.hold,
          escapeFrom: a.grab.escapeFrom,
          escapeWindow: a.grab.escapeWindow,
          restraint: a.grab.restraint ?? 0,
        }
      : null,
    bodyDamage: a.bodyDamage ?? 0,
    clash: a.clash ? CLASH_CODE[a.clash] : 0,
    disarmPower: a.disarmPower ?? 0,
    breakPower: a.breakPower ?? Math.trunc(a.damage / 2),
    pull: fx(a.pull),
    ammo: a.ammo ?? 0,
    armed: a.armed ?? 'default',
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
      const kind = LINK_KINDS.includes(l.to) ? l.to : 'action';
      const to = kind === 'action' ? index.get(l.to)! : -1;
      const target = kind === 'action' ? all[to] : undefined;
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
    pose,
  };
}

/** Converts a validated hero into the simulation's HeroDef shape (fixed-point units). */
export function compileHero(hero: HeroYaml, kind: 'hero' | 'enemy' = 'hero'): unknown {
  const index = new Map(hero.actions.map((a, i) => [a.id, i]));
  return {
    id: hero.id,
    name: hero.name,
    bodyWidth: hero.bodyWidth,
    actions: hero.actions.map((a) =>
      compileAction(a, index, hero.actions, `${kind}.${hero.id}.pose.${a.category}.${a.id}`),
    ),
    recipes: (hero.recipes ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      family: r.family,
      steps: r.steps.map((step) =>
        step === 'jump'
          ? { jump: true, any: [] }
          : { jump: false, any: step.split('|').map((id) => index.get(id)!) },
      ),
      counterHit: r.setup?.counterHit ?? false,
    })),
  };
}

/**
 * Parses and validates one weapon file. `heroes` are the roster ids its affinity may name.
 * Throws HeroDataError with every problem listed.
 */
export function loadWeapon(
  source: string,
  file = 'weapon.yaml',
  heroes: readonly string[] = [],
): WeaponYaml {
  const raw: unknown = parse(source);
  const errors = [...Value.Errors(WeaponSchema, raw)].map(
    (e) => `${file}: ${e.path || '/'} ${e.message}`,
  );
  if (errors.length > 0) throw new HeroDataError(errors.slice(0, 10).join('\n'));
  const w = raw as WeaponYaml;
  const problems: string[] = [];
  const ids = new Map<string, ActionYaml>();
  const slots = new Map<string, string>();
  for (const a of w.actions) {
    if (ids.has(a.id)) problems.push(`duplicate action id "${a.id}"`);
    ids.set(a.id, a);
    if (a.replaces) problems.push(`"${a.id}": only affinity actions replace core actions`);
    if ((a.category === 'weaponThrow') !== (a.input.context === 'weaponThrow'))
      problems.push(`"${a.id}": weapon throws use category and context weaponThrow together`);
    if (a.input.context === 'chain') continue;
    const dirs = a.input.dir === 'vertical' ? ['up', 'down'] : [a.input.dir];
    for (const d of dirs) {
      const key = `${a.input.context}/${d}`;
      const other = slots.get(key);
      if (other) problems.push(`"${a.id}" and "${other}" both use input ${key}`);
      slots.set(key, a.id);
    }
  }
  const throws = w.actions.filter((a) => a.category === 'weaponThrow');
  if (throws.length !== 1 || throws[0]!.input.dir !== 'neutral')
    problems.push('needs exactly one weapon throw (context weaponThrow, dir neutral)');
  const melee = MELEE_CLASSES.includes(w.class) && w.debris !== 'light';
  if (melee && !slots.has('neutral/neutral'))
    problems.push('a melee weapon needs a neutral starter (context neutral, dir neutral)');
  if (!melee && w.actions.length !== 1) problems.push('only melee weapons have a Weapon Core');
  if (w.integrity.critical > w.integrity.worn || w.integrity.worn > w.integrity.max)
    problems.push('integrity thresholds must satisfy critical <= worn <= max');
  if (w.guard && w.class !== 'guardModifier')
    problems.push('only guardModifier items modify the guard');
  for (const a of w.actions) {
    if (a.ammo && !w.ammo) problems.push(`"${a.id}": spends ammunition the weapon does not carry`);
  }
  const check = (a: ActionYaml) => {
    for (const l of a.links ?? []) {
      if (!LINK_KINDS.includes(l.to) && !ids.has(l.to))
        problems.push(`"${a.id}" links to unknown action "${l.to}"`);
    }
  };
  for (const a of w.actions) check(a);
  for (const [hero, list] of Object.entries(w.affinity ?? {})) {
    if (heroes.length > 0 && !heroes.includes(hero))
      problems.push(`affinity names unknown hero "${hero}"`);
    for (const a of list) {
      const core = a.replaces ? ids.get(a.replaces) : undefined;
      if (!core) {
        problems.push(`${hero} affinity "${a.id}" must replace a core action`);
        continue;
      }
      if (core.input.context !== a.input.context || core.input.dir !== a.input.dir)
        problems.push(`${hero} affinity "${a.id}" must keep the input of "${core.id}"`);
      check(a);
    }
  }
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  return w;
}

const RESPONSES = [
  'blockable',
  'exactDeflectable',
  'counterReturnable',
  'strikeDeflectable',
  'catchable',
] as const;

/** Converts a validated weapon into the simulation's WeaponDef shape. */
export function compileWeapon(w: WeaponYaml): unknown {
  const index = new Map(w.actions.map((a, i) => [a.id, i]));
  const pose = (a: ActionYaml) => `weapon.${w.id}.pose.${a.category}.${a.id}`;
  return {
    id: w.id,
    name: w.name,
    class: w.class,
    hands: w.hands,
    debris: w.debris ?? 'none',
    melee: MELEE_CLASSES.includes(w.class) && w.debris !== 'light',
    integrity: { deflect: 0, ...w.integrity },
    gripResistance: w.gripResistance,
    ammo: w.ammo ?? 0,
    pickup: w.pickup,
    hazardDestructible: w.hazardDestructible ?? false,
    guardCostPercent: w.guard?.costPercent ?? 100,
    throw: {
      speed: fx(w.throw.speed),
      lift: fx(w.throw.lift),
      consumed: w.throw.consumed ?? false,
      ...Object.fromEntries(RESPONSES.map((r) => [r, w.throw.responses.includes(r)])),
    },
    actions: w.actions.map((a) => compileAction(a, index, w.actions, pose(a))),
    affinity: Object.entries(w.affinity ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hero, list]) => ({
        hero,
        actions: list.map((a) => ({
          replaces: index.get(a.replaces!)!,
          action: compileAction(a, index, w.actions, `weapon.${w.id}.pose.${hero}.${a.id}`),
        })),
      })),
  };
}

const WEAPONS_DIR = fileURLToPath(new URL('../weapons/', import.meta.url));

/** Weapon files in registry order: the Stage 1 pair first, then by file name. */
export function weaponFiles(dir = WEAPONS_DIR): string[] {
  const first = ['workstaff.yaml', 'handwheel.yaml'];
  const rank = (f: string) => (first.includes(f) ? first.indexOf(f) : first.length);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((f) => join(dir, f));
}

const HEROES_DIR = fileURLToPath(new URL('../heroes/', import.meta.url));
const ENEMIES_DIR = fileURLToPath(new URL('../enemies/', import.meta.url));
export const GENERATED_PATH = fileURLToPath(
  new URL('../../sim/src/combat/heroes.gen.ts', import.meta.url),
);

/** Hero files in roster order: founders first (by file name order), then the rest. */
export function heroFiles(dir = HEROES_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((f) => join(dir, f));
}

/** Enemy kit files, by file name. */
export function enemyFiles(dir = ENEMIES_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => join(dir, f));
}

const ROSTER_ORDER = ['mountain.yaml', 'river.yaml'];
function order(file: string): number {
  const i = ROSTER_ORDER.indexOf(file);
  return i === -1 ? ROSTER_ORDER.length : i;
}

/** Builds the source of heroes.gen.ts from the given hero, enemy and weapon files. */
export function generate(
  files = heroFiles(),
  enemies = enemyFiles(),
  weapons = weaponFiles(),
): string {
  const compile = (f: string, kind: 'hero' | 'enemy') =>
    compileHero(loadHero(readFileSync(f, 'utf8'), basename(f), kind), kind);
  const roster = files.map((f) => compile(f, 'hero') as { id: string });
  const heroes = JSON.stringify(roster, null, 2);
  const kits = JSON.stringify(
    enemies.map((f) => compile(f, 'enemy')),
    null,
    2,
  );
  const heroIds = roster.map((h) => h.id);
  const arms = JSON.stringify(
    weapons.map((f) => compileWeapon(loadWeapon(readFileSync(f, 'utf8'), basename(f), heroIds))),
    null,
    2,
  );
  return `// GENERATED by packages/data/src/generate.ts from packages/data/heroes/*.yaml,
// packages/data/enemies/*.yaml and packages/data/weapons/*.yaml. Do not edit by hand:
// change the YAML and run \`pnpm gen:heroes\`.
import type { HeroDef, WeaponDef } from './types';

export const HERO_DATA: readonly HeroDef[] = ${heroes};

export const ENEMY_DATA: readonly HeroDef[] = ${kits};

export const WEAPON_DATA: readonly WeaponDef[] = ${arms};
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(GENERATED_PATH, generate());
  console.log(`wrote ${GENERATED_PATH}`);
}
