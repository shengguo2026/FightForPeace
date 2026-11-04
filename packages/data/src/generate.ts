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
      /** A team-finisher part (M8): started only by a confirmed Team Attack invitation. */
      T.Literal('team'),
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
          /** Team finisher part (M8): never an input of its own; see coop/coop.yaml. */
          T.Literal('team'),
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

const DifficultyId = T.Union([
  T.Literal('easy'),
  T.Literal('medium'),
  T.Literal('hard'),
  T.Literal('extreme'),
  T.Literal('ultimate'),
]);
const Rate = T.Object(
  { every: T.Integer({ minimum: 1, maximum: 100 }), of: T.Integer({ minimum: 0, maximum: 100 }) },
  { additionalProperties: false },
);
const AiAttack = T.Object(
  {
    action: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    /** Threat cost reserved on commitment (spec Appendix D.1). */
    threat: T.Integer({ minimum: 1, maximum: 200 }),
    /** Frames before this attack may start again. */
    cooldown: T.Integer({ minimum: 0, maximum: 1200 }),
    minDifficulty: T.Optional(DifficultyId),
    /** Reach override in px (ranged attacks); default: the action's hitbox. */
    range: T.Optional(T.Integer({ minimum: 1, maximum: 4000 })),
  },
  { additionalProperties: false },
);
const AiDefense = T.Object(
  {
    tier: T.Union([
      T.Literal('basic'),
      T.Literal('specialist'),
      T.Literal('elite'),
      T.Literal('boss'),
    ]),
    /** Normal Block: guard on `of` out of every `every` chances (scaled by difficulty). */
    guard: T.Optional(Rate),
    exact: T.Optional(T.Boolean()),
    counter: T.Optional(T.Boolean()),
    breaker: T.Optional(T.Boolean()),
    /** Keeps the guard raised while a hero is near, even without a chance roll (Bridge Shield). */
    stance: T.Optional(T.Boolean()),
    guardHold: T.Optional(T.Integer({ minimum: 1, maximum: 600 })),
    /** Share (percent) of a normal guard's Defense cost. */
    guardCost: T.Optional(T.Integer({ minimum: 0, maximum: 200 })),
    /** Frames between advanced defenses (exact block, counter, breaker). */
    cooldown: T.Optional(T.Integer({ minimum: 0, maximum: 1200 })),
    evade: T.Optional(
      T.Object(
        {
          every: T.Integer({ minimum: 1, maximum: 100 }),
          of: T.Integer({ minimum: 0, maximum: 100 }),
          action: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
const BossPhase = T.Object(
  {
    name: T.String({ minLength: 1 }),
    /** Health percent at which this phase begins (the first phase: 100). */
    from: T.Integer({ minimum: 1, maximum: 100 }),
    resolve: T.Integer({ minimum: 1, maximum: 10000 }),
    /** Presentation: 1 = first look, 2 = second look (sheets with -P2). */
    look: T.Optional(T.Integer({ minimum: 1, maximum: 2 })),
    weapon: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    counter: T.Optional(T.Boolean()),
    breaker: T.Optional(T.Boolean()),
    supports: T.Optional(T.Array(T.String({ pattern: '^[a-z][a-z0-9-]*$' }), { maxItems: 2 })),
    device: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    attacks: T.Array(AiAttack, { minItems: 1 }),
  },
  { additionalProperties: false },
);
const Profile = T.Object(
  {
    role: T.Union([
      T.Literal('pressure'),
      T.Literal('defender'),
      T.Literal('flanker'),
      T.Literal('grappler'),
      T.Literal('ranged'),
      T.Literal('elite'),
      T.Literal('boss'),
    ]),
    health: T.Integer({ minimum: 1, maximum: 100000 }),
    walk: T.Object({ x: Px, z: Px }, { additionalProperties: false }),
    /** Frames added to the difficulty's perception floor. */
    perception: T.Integer({ minimum: 0, maximum: 120 }),
    /** Distance (px) at which it waits for attack permission. */
    ring: T.Integer({ minimum: 0, maximum: 2000 }),
    defense: AiDefense,
    morale: T.Optional(
      T.Object(
        { breakAt: T.Integer({ minimum: 1, maximum: 99 }) },
        { additionalProperties: false },
      ),
    ),
    weapons: T.Union([T.Literal('never'), T.Literal('opportunistic'), T.Literal('preferred')]),
    group: T.Optional(
      T.Object(
        {
          action: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
          threat: T.Integer({ minimum: 1, maximum: 200 }),
          partnerThreat: T.Integer({ minimum: 1, maximum: 200 }),
          telegraph: T.Integer({ minimum: 1, maximum: 300 }),
        },
        { additionalProperties: false },
      ),
    ),
    attacks: T.Array(AiAttack),
    boss: T.Optional(
      T.Object(
        {
          flinchCap: T.Integer({ minimum: 1, maximum: 20 }),
          budgets: T.Object(
            {
              stun: T.Integer({ minimum: 1, maximum: 100 }),
              juggle: T.Integer({ minimum: 1, maximum: 100 }),
            },
            { additionalProperties: false },
          ),
          stagger: T.Object(
            { telegraph: Frame1, duration: Frame1, reentry: Frame1 },
            { additionalProperties: false },
          ),
          transition: T.Object(
            { grace: Frame1, carryCap: T.Integer({ minimum: 0, maximum: 10000 }), shift: Frame1 },
            { additionalProperties: false },
          ),
          /** Threat budget points kept for the boss; supports share the rest. */
          share: T.Integer({ minimum: 0, maximum: 200 }),
          phases: T.Array(BossPhase, { minItems: 1, maxItems: 6 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const HeroSchema = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    bodyWidth: T.Integer({ minimum: 20, maximum: 400 }),
    /** Hero tags (M8): team finishers name the pairs they support by these, never by hero id. */
    tags: T.Optional(T.Array(T.String({ pattern: '^[a-z][A-Za-z0-9]*$' }))),
    actions: T.Array(Action, { minItems: 1, maxItems: 32 }),
    recipes: T.Optional(T.Array(Recipe, { maxItems: 16 })),
    /** Enemy kits (M7): role, AI, defense capability profile, morale and boss phases. */
    profile: T.Optional(Profile),
  },
  { additionalProperties: false },
);

export type ProfileYaml = Static<typeof Profile>;
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
    if (a.projectile && a.category !== 'special' && kind === 'hero')
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
    if ((a.category === 'team') !== (a.input.context === 'team'))
      problems.push(`"${a.id}": team finisher parts use category and context team together`);
    if (a.category === 'team' && kind !== 'hero')
      problems.push(`"${a.id}": team finisher parts are for heroes`);
    if (a.category === 'team' && (a.links ?? []).length > 0)
      problems.push(`"${a.id}": team finisher parts have no links`);
    if (
      a.input.context === 'chain' ||
      a.input.context === 'script' ||
      a.input.context === 'team' ||
      a.catalogue
    )
      continue;
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
  if (kind === 'hero' && hero.profile) problems.push('only enemy kits have an AI profile');
  if (hero.profile) problems.push(...profileProblems(hero.profile, ids));
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

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'extreme', 'ultimate'] as const;
const WEAPON_POLICY = { never: 0, opportunistic: 1, preferred: 2 } as const;

/** Profile checks that only need the kit's own action ids (boss phases: see generate). */
function profileProblems(p: ProfileYaml, ids: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const a of p.attacks)
    if (!ids.has(a.action)) out.push(`profile attack "${a.action}" is not in the kit`);
  if (p.group && !ids.has(p.group.action))
    out.push(`profile group action "${p.group.action}" is not in the kit`);
  if (p.defense.evade && !ids.has(p.defense.evade.action))
    out.push(`profile evade action "${p.defense.evade.action}" is not in the kit`);
  if (p.role === 'boss' && !p.boss) out.push('a boss profile needs boss phases');
  if (p.boss) {
    if (p.boss.phases[0]!.from !== 100) out.push('the first boss phase starts at 100');
    for (let i = 1; i < p.boss.phases.length; i += 1)
      if (p.boss.phases[i]!.from >= p.boss.phases[i - 1]!.from)
        out.push('boss phase thresholds must fall');
  }
  if (p.attacks.length === 0 && !p.boss) out.push('an enemy profile needs at least one attack');
  return out;
}

function compileAttack(a: Static<typeof AiAttack>): unknown {
  return {
    action: a.action,
    threat: a.threat,
    cooldown: a.cooldown,
    minDifficulty: DIFFICULTY_ORDER.indexOf(a.minDifficulty ?? 'easy'),
    range: fx(a.range ?? 0),
  };
}

/** Converts an enemy profile into the simulation's EnemyProfile shape. */
export function compileProfile(p: ProfileYaml): unknown {
  const d = p.defense;
  return {
    role: p.role,
    health: p.health,
    walkX: fx(p.walk.x),
    walkZ: fx(p.walk.z),
    perception: p.perception,
    ring: fx(p.ring),
    defense: {
      tier: d.tier,
      guardEvery: d.guard?.every ?? 1,
      guardOf: d.guard?.of ?? 0,
      exact: d.exact ?? false,
      counter: d.counter ?? false,
      breaker: d.breaker ?? false,
      stance: d.stance ?? false,
      guardHold: d.guardHold ?? 20,
      guardCost: d.guardCost ?? 100,
      cooldown: d.cooldown ?? 150,
      evadeEvery: d.evade?.every ?? 1,
      evadeOf: d.evade?.of ?? 0,
      evade: d.evade?.action ?? '',
    },
    breakAt: p.morale?.breakAt ?? 0,
    weapons: WEAPON_POLICY[p.weapons],
    group: p.group ?? null,
    attacks: p.attacks.map(compileAttack),
    boss: p.boss
      ? {
          flinchCap: p.boss.flinchCap,
          budgets: p.boss.budgets,
          stagger: p.boss.stagger,
          transition: p.boss.transition,
          share: p.boss.share,
          phases: p.boss.phases.map((ph) => ({
            name: ph.name,
            from: ph.from,
            resolve: ph.resolve,
            look: ph.look ?? 1,
            weapon: ph.weapon ?? '',
            counter: ph.counter ?? false,
            breaker: ph.breaker ?? false,
            supports: ph.supports ?? [],
            device: ph.device ?? '',
            attacks: ph.attacks.map(compileAttack),
          })),
        }
      : null,
  };
}

const Pair = T.Tuple([
  T.Integer({ minimum: 0, maximum: 1000 }),
  T.Integer({ minimum: 0, maximum: 1000 }),
]);
export const DifficultySchema = T.Object(
  {
    difficulties: T.Array(
      T.Object(
        {
          id: DifficultyId,
          name: T.String({ minLength: 1 }),
          budget: Pair,
          cap: T.Integer({ minimum: 1, maximum: 1000 }),
          perception: T.Integer({ minimum: 0, maximum: 120 }),
          attackers: Pair,
          projectiles: Pair,
          hardCC: T.Integer({ minimum: 1, maximum: 10 }),
          groupCooldown: T.Integer({ minimum: 0, maximum: 3600 }),
          warning: T.Integer({ minimum: 1, maximum: 600 }),
          guardScale: T.Integer({ minimum: 0, maximum: 400 }),
        },
        { additionalProperties: false },
      ),
      { minItems: 5, maxItems: 5 },
    ),
  },
  { additionalProperties: false },
);

const KitId = T.String({ pattern: '^[a-z][a-z0-9-]*$' });
export const ArenaSchema = T.Object(
  {
    arenas: T.Array(
      T.Object(
        {
          id: KitId,
          name: T.String({ minLength: 1 }),
          /** Stage 1 area of environments/stage1 (fields, bridge, mill, canal, courtyard, sluice). */
          area: T.Union([
            T.Literal('fields'),
            T.Literal('bridge'),
            T.Literal('mill'),
            T.Literal('canal'),
            T.Literal('courtyard'),
            T.Literal('sluice'),
          ]),
          backdrop: T.Optional(T.Union([T.Literal('layers'), T.Literal('plate')])),
          width: T.Integer({ minimum: 1920, maximum: 7680 }),
          heroX: T.Optional(T.Integer({ minimum: 0, maximum: 7680 })),
          minDifficulty: T.Optional(DifficultyId),
          /** Stage layout for weapons and scenery (mill: the Lab's mill corner). */
          layout: T.Optional(T.Literal('mill')),
          weaponSpot: T.Optional(
            T.Object({ x: T.Integer(), z: T.Integer() }, { additionalProperties: false }),
          ),
          devices: T.Optional(
            T.Array(
              T.Object(
                {
                  kind: T.Literal('winch'),
                  x: T.Integer(),
                  z: T.Integer(),
                  count: T.Integer({ minimum: 1, maximum: 20 }),
                },
                { additionalProperties: false },
              ),
            ),
          ),
          surge: T.Optional(
            T.Object(
              {
                z0: T.Integer(),
                z1: T.Integer(),
                warn: Frame1,
                active: Frame1,
                damage: T.Integer({ minimum: 0, maximum: 1000 }),
              },
              { additionalProperties: false },
            ),
          ),
          waves: T.Array(
            T.Object(
              {
                enemies: T.Array(
                  T.Object(
                    {
                      kit: KitId,
                      x: T.Integer({ minimum: 0, maximum: 7680 }),
                      z: T.Integer({ minimum: 0, maximum: 2000 }),
                      minDifficulty: T.Optional(DifficultyId),
                      coop: T.Optional(T.Boolean()),
                    },
                    { additionalProperties: false },
                  ),
                  { minItems: 1, maxItems: 8 },
                ),
                next: T.Optional(T.Integer({ minimum: 0, maximum: 8 })),
              },
              { additionalProperties: false },
            ),
            { minItems: 1 },
          ),
          substitutions: T.Optional(
            T.Array(
              T.Object(
                {
                  from: KitId,
                  to: KitId,
                  minDifficulty: DifficultyId,
                  count: T.Integer({ minimum: 1, maximum: 8 }),
                },
                { additionalProperties: false },
              ),
            ),
          ),
        },
        { additionalProperties: false },
      ),
      { minItems: 1 },
    ),
  },
  { additionalProperties: false },
);

function validate<S extends Parameters<typeof Value.Errors>[0]>(
  schema: S,
  source: string,
  file: string,
): unknown {
  const raw: unknown = parse(source);
  const errors = [...Value.Errors(schema, raw)].map(
    (e) => `${file}: ${e.path || '/'} ${e.message}`,
  );
  if (errors.length > 0) throw new HeroDataError(errors.slice(0, 10).join('\n'));
  return raw;
}

/** Validates difficulty.yaml and converts it (order easy … ultimate). */
export function loadDifficulties(source: string, file = 'difficulty.yaml'): unknown[] {
  const d = validate(DifficultySchema, source, file) as Static<typeof DifficultySchema>;
  const ids = d.difficulties.map((x) => x.id);
  if (ids.join() !== DIFFICULTY_ORDER.join())
    throw new HeroDataError(
      `${file}: difficulties must be ${DIFFICULTY_ORDER.join(', ')} in order`,
    );
  return d.difficulties.map((x) => ({
    ...x,
    budget: [...x.budget],
    attackers: [...x.attackers],
    projectiles: [...x.projectiles],
  }));
}

/** Validates arenas.yaml against the enemy kit ids and converts it to pixel data. */
export function loadArenas(
  source: string,
  kits: readonly string[],
  file = 'arenas.yaml',
): unknown[] {
  const d = validate(ArenaSchema, source, file) as Static<typeof ArenaSchema>;
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const a of d.arenas) {
    if (seen.has(a.id)) problems.push(`duplicate arena "${a.id}"`);
    seen.add(a.id);
    for (const w of a.waves)
      for (const e of w.enemies) {
        if (!kits.includes(e.kit)) problems.push(`${a.id}: unknown enemy kit "${e.kit}"`);
        if (e.x > a.width) problems.push(`${a.id}: an enemy starts outside the arena`);
      }
    for (const s of a.substitutions ?? [])
      for (const k of [s.from, s.to])
        if (!kits.includes(k)) problems.push(`${a.id}: unknown enemy kit "${k}"`);
  }
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  const lvl = (x: string | undefined) => DIFFICULTY_ORDER.indexOf((x ?? 'easy') as never);
  return d.arenas.map((a) => ({
    id: a.id,
    name: a.name,
    area: a.area,
    backdrop: a.backdrop ?? 'layers',
    width: a.width,
    heroX: a.heroX ?? 500,
    minDifficulty: lvl(a.minDifficulty),
    layout: a.layout ?? '',
    weaponSpot: a.weaponSpot ?? null,
    devices: a.devices ?? [],
    surge: a.surge ?? null,
    waves: a.waves.map((w) => ({
      next: w.next ?? 0,
      enemies: w.enemies.map((e) => ({
        kit: e.kit,
        x: e.x,
        z: e.z,
        minDifficulty: lvl(e.minDifficulty),
        coop: e.coop ?? false,
      })),
    })),
    substitutions: (a.substitutions ?? []).map((s) => ({
      from: s.from,
      to: s.to,
      minDifficulty: lvl(s.minDifficulty),
      count: s.count,
    })),
  }));
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
    tags: [...(hero.tags ?? [])].sort(),
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

// --- M8 same-device co-op ---------------------------------------------------------------

const Tag = T.String({ pattern: '^[a-z][A-Za-z0-9]*$' });
const TargetState = T.Union([T.Literal('airborne'), T.Literal('stagger'), T.Literal('down')]);
const STATE_CODE = { airborne: 1, stagger: 2, down: 3 } as const;
const Reach = T.Object(
  { x: T.Integer({ minimum: 1, maximum: 2000 }), z: T.Integer({ minimum: 1, maximum: 1000 }) },
  { additionalProperties: false },
);

/**
 * Co-op rules (F&D §6.5, §6.7; roadmap guardrails M8): handoff states keyed by sender and
 * receiver action tags, team finishers keyed by hero tags, and the tagged co-op actions.
 */
export const CoopSchema = T.Object(
  {
    handoff: T.Object(
      {
        preBuffer: T.Integer({ minimum: 0, maximum: 20 }),
        states: T.Array(
          T.Object(
            {
              tag: Tag,
              state: TargetState,
              window: Frame1,
              receivers: T.Array(Tag, { minItems: 1 }),
            },
            { additionalProperties: false },
          ),
          { minItems: 1 },
        ),
      },
      { additionalProperties: false },
    ),
    teamFinishers: T.Array(
      T.Object(
        {
          id: KitId,
          name: T.String({ minLength: 1 }),
          pair: T.Tuple([Tag, Tag]),
          targets: T.Array(TargetState, { minItems: 1 }),
          move: KitId,
          range: Reach,
          place: T.Integer({ minimum: 0, maximum: 1000 }),
          cost: T.Integer({ minimum: 0, maximum: 100 }),
          confirm: Frame1,
          minScale: T.Integer({ minimum: 0, maximum: 100 }),
        },
        { additionalProperties: false },
      ),
    ),
    coopActions: T.Array(
      T.Union([
        T.Object(
          {
            id: KitId,
            kind: T.Literal('release'),
            reach: Reach,
            recovery: Frames,
          },
          { additionalProperties: false },
        ),
        T.Object(
          { id: KitId, kind: T.Union([T.Literal('interrupt'), T.Literal('assist')]), tag: Tag },
          { additionalProperties: false },
        ),
      ]),
    ),
  },
  { additionalProperties: false },
);
export type CoopYaml = Static<typeof CoopSchema>;

/**
 * Validates coop.yaml against the hero kits: every sender or receiver tag on a hero action
 * is declared, every hero a finisher pairs has that finisher's team move, and each kind of
 * co-op action exists once.
 */
export function loadCoop(
  source: string,
  heroes: readonly HeroYaml[],
  file = 'coop.yaml',
): CoopYaml {
  const c = validate(CoopSchema, source, file) as CoopYaml;
  const problems: string[] = [];
  const senders = new Set(c.handoff.states.map((s) => s.tag));
  const receivers = new Set(c.handoff.states.flatMap((s) => s.receivers));
  for (const h of heroes)
    for (const a of h.actions)
      for (const t of a.tags ?? []) {
        if (t.startsWith('handoff') && !senders.has(t))
          problems.push(`${h.id}/${a.id}: handoff tag ${t} is not declared`);
        if (t.startsWith('receive') && !receivers.has(t))
          problems.push(`${h.id}/${a.id}: receiver tag ${t} is not declared`);
      }
  const ids = new Set<string>();
  for (const f of c.teamFinishers) {
    if (ids.has(f.id)) problems.push(`duplicate team finisher "${f.id}"`);
    ids.add(f.id);
    const paired = heroes.filter((h) => f.pair.some((t) => (h.tags ?? []).includes(t)));
    if (paired.length === 0)
      problems.push(`team finisher "${f.id}": no hero carries its pair tags`);
    for (const h of paired) {
      const move = h.actions.find((a) => a.id === f.move);
      if (!move || move.category !== 'team')
        problems.push(`team finisher "${f.id}": ${h.id} has no team move "${f.move}"`);
    }
  }
  for (const kind of ['release', 'interrupt', 'assist'])
    if (c.coopActions.filter((a) => a.kind === kind).length !== 1)
      problems.push(`exactly one co-op action of kind ${kind} is needed`);
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  return c;
}

/** Converts coop.yaml to the simulation's CoopDef (fixed point, state codes). */
export function compileCoop(c: CoopYaml): unknown {
  return {
    preBuffer: c.handoff.preBuffer,
    handoffs: c.handoff.states.map((s) => ({
      tag: s.tag,
      state: STATE_CODE[s.state],
      window: s.window,
      receivers: [...s.receivers].sort(),
    })),
    finishers: c.teamFinishers.map((f) => ({
      id: f.id,
      name: f.name,
      pair: [...f.pair],
      targets: f.targets.map((t) => STATE_CODE[t]),
      move: f.move,
      rangeX: fx(f.range.x),
      rangeZ: fx(f.range.z),
      place: fx(f.place),
      cost: f.cost,
      confirm: f.confirm,
      minScale: f.minScale,
    })),
    actions: c.coopActions.map((a) =>
      a.kind === 'release'
        ? {
            id: a.id,
            kind: a.kind,
            tag: '',
            reachX: fx(a.reach.x),
            reachZ: fx(a.reach.z),
            recovery: a.recovery,
          }
        : { id: a.id, kind: a.kind, tag: a.tag, reachX: 0, reachZ: 0, recovery: 0 },
    ),
  };
}

const COOP_FILE = fileURLToPath(new URL('../coop/coop.yaml', import.meta.url));

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

/** Enemy kit files: the training enemy first (kit 0, the Lab dummies), then by file name. */
export function enemyFiles(dir = ENEMIES_DIR): string[] {
  const rank = (f: string) => (f === 'trainer.yaml' ? 0 : 1);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((f) => join(dir, f));
}

const ROSTER_ORDER = ['mountain.yaml', 'river.yaml'];
function order(file: string): number {
  const i = ROSTER_ORDER.indexOf(file);
  return i === -1 ? ROSTER_ORDER.length : i;
}

const ENCOUNTERS_DIR = fileURLToPath(new URL('../encounters/', import.meta.url));

/** Builds the source of heroes.gen.ts from the given hero, enemy and weapon files. */
export function generate(
  files = heroFiles(),
  enemies = enemyFiles(),
  weapons = weaponFiles(),
  encounters: string | null = ENCOUNTERS_DIR,
  coopFile: string | null = COOP_FILE,
): string {
  const load = (f: string, kind: 'hero' | 'enemy') =>
    loadHero(readFileSync(f, 'utf8'), basename(f), kind);
  const heroYaml = files.map((f) => load(f, 'hero'));
  const roster = heroYaml.map((h) => compileHero(h, 'hero') as { id: string });
  const heroes = JSON.stringify(roster, null, 2);
  const enemyYaml = enemies.map((f) => load(f, 'enemy'));
  const kits = JSON.stringify(
    enemyYaml.map((h) => compileHero(h, 'enemy')),
    null,
    2,
  );
  const heroIds = roster.map((h) => h.id);
  const weaponYaml = weapons.map((f) => loadWeapon(readFileSync(f, 'utf8'), basename(f), heroIds));
  const arms = JSON.stringify(weaponYaml.map(compileWeapon), null, 2);
  // Boss phases may use the actions of the weapon the phase claims.
  const problems: string[] = [];
  for (const k of enemyYaml) {
    for (const ph of k.profile?.boss?.phases ?? []) {
      const w = ph.weapon ? weaponYaml.find((x) => x.id === ph.weapon) : undefined;
      if (ph.weapon && !w)
        problems.push(`${k.id}: phase "${ph.name}" claims unknown weapon "${ph.weapon}"`);
      const ids = new Set([...k.actions.map((a) => a.id), ...(w?.actions.map((a) => a.id) ?? [])]);
      for (const a of ph.attacks)
        if (!ids.has(a.action))
          problems.push(`${k.id}: phase "${ph.name}" attack "${a.action}" is unknown`);
      for (const s of ph.supports ?? [])
        if (!enemyYaml.some((e) => e.id === s))
          problems.push(`${k.id}: unknown support kit "${s}"`);
    }
  }
  if (problems.length > 0) throw new HeroDataError(problems.join('\n'));
  const profiles = JSON.stringify(
    enemyYaml.map((h) => (h.profile ? compileProfile(h.profile) : null)),
    null,
    2,
  );
  const kitIds = enemyYaml.map((e) => e.id);
  const difficulty = encounters
    ? loadDifficulties(readFileSync(join(encounters, 'difficulty.yaml'), 'utf8'))
    : [];
  const arenas = encounters
    ? loadArenas(readFileSync(join(encounters, 'arenas.yaml'), 'utf8'), kitIds)
    : [];
  const coop = coopFile
    ? compileCoop(loadCoop(readFileSync(coopFile, 'utf8'), heroYaml, basename(coopFile)))
    : { preBuffer: 0, handoffs: [], finishers: [], actions: [] };
  return `// GENERATED by packages/data/src/generate.ts from packages/data/heroes/*.yaml,
// packages/data/enemies/*.yaml, packages/data/weapons/*.yaml,
// packages/data/encounters/*.yaml and packages/data/coop/coop.yaml. Do not edit by hand:
// change the YAML and run \`pnpm gen:heroes\`.
import type {
  ArenaDef,
  CoopDef,
  DifficultyDef,
  EnemyProfile,
  HeroDef,
  WeaponDef,
} from './types';

export const HERO_DATA: readonly HeroDef[] = ${heroes};

export const ENEMY_DATA: readonly HeroDef[] = ${kits};

/** AI profiles aligned with ENEMY_DATA (null: the training enemy has none). */
export const ENEMY_PROFILES: readonly (EnemyProfile | null)[] = ${profiles};

export const WEAPON_DATA: readonly WeaponDef[] = ${arms};

export const DIFFICULTY_DATA: readonly DifficultyDef[] = ${JSON.stringify(difficulty, null, 2)};

export const ARENA_DATA: readonly ArenaDef[] = ${JSON.stringify(arenas, null, 2)};

export const COOP_DATA: CoopDef = ${JSON.stringify(coop, null, 2)};
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(GENERATED_PATH, generate());
  console.log(`wrote ${GENERATED_PATH}`);
}
