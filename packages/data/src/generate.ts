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
    /** `punish`: only after a hit that caught the target in an attack's recovery (whiff punish). */
    on: T.Array(
      T.Union([T.Literal('hit'), T.Literal('guard'), T.Literal('whiff'), T.Literal('punish')]),
      { minItems: 1 },
    ),
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
    /**
     * M16 Contact-Confirmed Conversion (Fire Warden's catches and clinches): the first
     * confirmed hit on an eligible target starts `to` once this action's active frames end.
     * A target whose kit is tagged `large` is eligible only in a vulnerable state (a boss's
     * Stagger Break, a Guard Crush); otherwise `large` starts instead, if given. `unarmed`
     * also needs a target with empty hands (a limb attack to catch). Never through guard.
     */
    convert: T.Optional(
      T.Object(
        {
          to: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
          large: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
          unarmed: T.Optional(T.Boolean()),
        },
        { additionalProperties: false },
      ),
    ),
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
    /** M19: never from closer than this (px): point-blank shots are refused. */
    minRange: T.Optional(T.Integer({ minimum: 1, maximum: 4000 })),
    /** M19: only while holding a weapon (armed) or only with empty hands (unarmed). */
    when: T.Optional(T.Union([T.Literal('armed'), T.Literal('unarmed')])),
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
    /** Presentation: 1 = first look, 2 = second look (sheets with -P2); Marek uses 1–4. */
    look: T.Optional(T.Integer({ minimum: 1, maximum: 4 })),
    weapon: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    counter: T.Optional(T.Boolean()),
    breaker: T.Optional(T.Boolean()),
    supports: T.Optional(T.Array(T.String({ pattern: '^[a-z][a-z0-9-]*$' }), { maxItems: 2 })),
    /** Co-op only, from `minDifficulty`: extra supports that arrive with this phase. */
    coopSupports: T.Optional(
      T.Object(
        {
          minDifficulty: DifficultyId,
          kits: T.Array(T.String({ pattern: '^[a-z][a-z0-9-]*$' }), { minItems: 1, maxItems: 2 }),
        },
        { additionalProperties: false },
      ),
    ),
    /** Hard and above: the support pair's elite variant (replaces `supports`). */
    eliteSupports: T.Optional(T.Array(T.String({ pattern: '^[a-z][a-z0-9-]*$' }), { maxItems: 2 })),
    device: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    attacks: T.Array(AiAttack, { minItems: 1 }),
    /** M19: a weapon put into the boss's hands as the phase starts. */
    armed: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    /** M19: the phase also ends when the boss no longer holds a loaded `armed` weapon. */
    untilDisarmed: T.Optional(T.Boolean()),
    /** M19: a command action that brings the supports once (instead of at the start). */
    summon: T.Optional(T.String({ pattern: '^[a-z][a-z0-9-]*$' })),
    /** M19: Scorched Claim, a bounded low-Health objective behaviour (no phase, no refill). */
    scorch: T.Optional(
      T.Object(
        {
          below: T.Integer({ minimum: 1, maximum: 99 }),
          action: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
          look: T.Integer({ minimum: 1, maximum: 4 }),
          cooldown: T.Integer({ minimum: 0, maximum: 3600 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
const Command = T.Object(
  {
    kind: T.Union([T.Literal('crossfang'), T.Literal('guard'), T.Literal('replace')]),
    action: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    threat: T.Integer({ minimum: 1, maximum: 200 }),
    cooldown: T.Integer({ minimum: 0, maximum: 3600 }),
    minDifficulty: T.Optional(DifficultyId),
    frames: T.Integer({ minimum: 1, maximum: 3600 }),
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
      /** M19: Systems Saboteur (Control Breach). */
      T.Literal('objective'),
      /** M19: Jackal Signalman (calls). */
      T.Literal('commander'),
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
        {
          breakAt: T.Integer({ minimum: 1, maximum: 99 }),
          /** M19: the threshold once isolated, disarmed or shaken by interruptions. */
          shaken: T.Optional(T.Integer({ minimum: 1, maximum: 99 })),
        },
        { additionalProperties: false },
      ),
    ),
    /** M19: may pick up firearms and the grenade (default true; Stage 2 roles: false). */
    firearms: T.Optional(T.Boolean()),
    /** M19: spawns holding this weapon with these rounds [easy … ultimate]. */
    armed: T.Optional(
      T.Object(
        {
          weapon: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
          ammo: T.Array(T.Integer({ minimum: 0, maximum: 100 }), { minItems: 5, maxItems: 5 }),
        },
        { additionalProperties: false },
      ),
    ),
    /** M19: Control Breach (Systems Saboteur). */
    objective: T.Optional(
      T.Object(
        {
          threat: T.Integer({ minimum: 1, maximum: 200 }),
          cooldown: T.Integer({ minimum: 0, maximum: 3600 }),
        },
        { additionalProperties: false },
      ),
    ),
    /** M19: Lockstep Escort for a Marauder or Saboteur. */
    escort: T.Optional(
      T.Object(
        {
          threat: T.Integer({ minimum: 1, maximum: 200 }),
          range: T.Integer({ minimum: 1, maximum: 2000 }),
        },
        { additionalProperties: false },
      ),
    ),
    /** M19: Signalman calls. */
    commands: T.Optional(T.Array(Command, { maxItems: 3 })),
    /** M19: 'dismount' arrives knocked down with protected recovery (Road Rider on foot). */
    entry: T.Optional(T.Union([T.Literal('walk'), T.Literal('dismount')])),
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
          /** M19: a Resolve break at or below this Health percent is a clean surrender. */
          surrender: T.Optional(T.Integer({ minimum: 1, maximum: 99 })),
          /** M19: the capture presentation (Resolve surrender or forced capture). */
          capture: T.Optional(T.Boolean()),
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
    actions: T.Array(Action, { minItems: 1, maxItems: 48 }),
    recipes: T.Optional(T.Array(Recipe, { maxItems: 16 })),
    /** Enemy kits (M7): role, AI, defense capability profile, morale and boss phases. */
    profile: T.Optional(Profile),
    /**
     * M19 enemy variants: generated kits with the same actions and art and a changed
     * profile (Hard elite, Ultimate master). A wave picks the strongest one its
     * difficulty allows.
     */
    variants: T.Optional(
      T.Array(
        T.Object(
          {
            id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
            name: T.String({ minLength: 1 }),
            minDifficulty: DifficultyId,
            health: T.Optional(T.Integer({ minimum: 1, maximum: 100000 })),
            defense: T.Optional(AiDefense),
            attacks: T.Optional(T.Array(AiAttack)),
            ammo: T.Optional(
              T.Array(T.Integer({ minimum: 0, maximum: 100 }), { minItems: 5, maxItems: 5 }),
            ),
            commands: T.Optional(T.Array(Command, { maxItems: 3 })),
          },
          { additionalProperties: false },
        ),
        { maxItems: 3 },
      ),
    ),
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
    /** M18 firearms: Defense a hero pays for every shot (refused without enough Defense). */
    fire: T.Optional(
      T.Object(
        { defenseCost: T.Integer({ minimum: 0, maximum: 100 }) },
        { additionalProperties: false },
      ),
    ),
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
    const converted = hero.actions.some((x) => x.convert?.to === a.id || x.convert?.large === a.id);
    if (kind === 'hero') {
      for (const t of a.tags ?? []) {
        if (ENEMY_ONLY_TAGS.includes(t)) problems.push(`"${a.id}": tag ${t} is for enemies only`);
      }
      // Heroes use context script only for conversion destinations (never an input).
      if (a.input.context === 'script' && !converted)
        problems.push(`"${a.id}": context script is for enemies and conversions`);
    }
    // A counter's conversion (Ember Catch's trip) keeps the counter category.
    const counterOk = a.input.context === 'counter' || (converted && a.category === 'counter');
    if ((a.category === 'counter') !== counterOk)
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
      (a.ammo !== undefined && kind === 'hero') ||
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
  if (hero.variants && !hero.profile) problems.push('variants need a base profile');
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
    for (const c of [a.convert?.to, a.convert?.large]) {
      if (c === undefined) continue;
      if (!ids.has(c)) problems.push(`"${a.id}" converts into unknown action "${c}"`);
      const dest = hero.actions.find((x) => x.id === c);
      if (dest && dest.input.context !== 'script')
        problems.push(`"${a.id}": conversion "${c}" must use context script (never an input)`);
      // M19: enemy routes (jab, cross, kick) may chain hit-confirmed conversions.
      if (dest?.convert && kind === 'hero')
        problems.push(`"${a.id}": conversion "${c}" may not convert again`);
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
  // An armed profile may also name its weapon's actions (checked in generate()).
  for (const a of p.attacks)
    if (!ids.has(a.action) && !p.armed)
      out.push(`profile attack "${a.action}" is not in the kit`);
  for (const c of p.commands ?? [])
    if (!ids.has(c.action)) out.push(`profile command "${c.action}" is not in the kit`);
  for (const ph of p.boss?.phases ?? []) {
    if (ph.summon && !ids.has(ph.summon))
      out.push(`phase "${ph.name}" summon "${ph.summon}" is not in the kit`);
    if (ph.scorch && !ids.has(ph.scorch.action))
      out.push(`phase "${ph.name}" scorch "${ph.scorch.action}" is not in the kit`);
    if (ph.untilDisarmed && !ph.armed) out.push(`phase "${ph.name}": untilDisarmed needs armed`);
  }
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
    minRange: fx(a.minRange ?? 0),
    when: a.when === 'armed' ? 1 : a.when === 'unarmed' ? 2 : 0,
  };
}

const CALL_CODE = { crossfang: 1, guard: 2, replace: 3 } as const;
function compileCommand(c: Static<typeof Command>): unknown {
  return {
    kind: CALL_CODE[c.kind],
    action: c.action,
    threat: c.threat,
    cooldown: c.cooldown,
    minDifficulty: DIFFICULTY_ORDER.indexOf(c.minDifficulty ?? 'easy'),
    frames: c.frames,
  };
}

/** A profile with a variant's changes applied (M19 elite and master kits). */
function variantProfile(p: ProfileYaml, v: NonNullable<HeroYaml['variants']>[number]): ProfileYaml {
  return {
    ...p,
    health: v.health ?? p.health,
    defense: v.defense ?? p.defense,
    attacks: v.attacks ?? p.attacks,
    armed: p.armed && v.ammo ? { ...p.armed, ammo: v.ammo } : p.armed,
    commands: v.commands ?? p.commands,
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
    firearms: p.firearms ?? true,
    shaken: p.morale?.shaken ?? 0,
    armed: p.armed ? { weapon: p.armed.weapon, ammo: p.armed.ammo } : null,
    objective: p.objective ?? null,
    escort: p.escort ? { threat: p.escort.threat, range: fx(p.escort.range) } : null,
    commands: (p.commands ?? []).map(compileCommand),
    entry: p.entry ?? 'walk',
    boss: p.boss
      ? {
          flinchCap: p.boss.flinchCap,
          budgets: p.boss.budgets,
          stagger: p.boss.stagger,
          transition: p.boss.transition,
          share: p.boss.share,
          surrender: p.boss.surrender ?? 0,
          capture: p.boss.capture ?? false,
          phases: p.boss.phases.map((ph) => ({
            name: ph.name,
            from: ph.from,
            resolve: ph.resolve,
            look: ph.look ?? 1,
            weapon: ph.weapon ?? '',
            counter: ph.counter ?? false,
            breaker: ph.breaker ?? false,
            supports: ph.supports ?? [],
            eliteSupports: ph.eliteSupports ?? ph.supports ?? [],
            coopSupports: ph.coopSupports
              ? {
                  minDifficulty: DIFFICULTY_ORDER.indexOf(ph.coopSupports.minDifficulty),
                  kits: ph.coopSupports.kits,
                }
              : null,
            device: ph.device ?? '',
            attacks: ph.attacks.map(compileAttack),
            armed: ph.armed ?? '',
            untilDisarmed: ph.untilDisarmed ?? false,
            summon: ph.summon ?? '',
            scorch: ph.scorch ?? null,
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
          pace: T.Integer({ minimum: 25, maximum: 400 }),
          recovery: T.Integer({ minimum: 0, maximum: 200 }),
          riposte: T.Boolean(),
          /** M19: firearm aims (warned lines) active together [solo, co-op]. */
          aims: Pair,
        },
        { additionalProperties: false },
      ),
      { minItems: 5, maxItems: 5 },
    ),
  },
  { additionalProperties: false },
);

const KitId = T.String({ pattern: '^[a-z][a-z0-9-]*$' });
/** Stage 1 area of environments/stage1 (fields, bridge, mill, canal, courtyard, sluice). */
const AreaId = T.Union([
  T.Literal('fields'),
  T.Literal('bridge'),
  T.Literal('mill'),
  T.Literal('canal'),
  T.Literal('courtyard'),
  T.Literal('sluice'),
]);
const Backdrop = T.Union([T.Literal('layers'), T.Literal('plate')]);
const Spot = T.Object({ x: T.Integer(), z: T.Integer() }, { additionalProperties: false });
const Devices = T.Array(
  T.Object(
    {
      kind: T.Literal('winch'),
      x: T.Integer(),
      z: T.Integer(),
      count: T.Integer({ minimum: 1, maximum: 20 }),
    },
    { additionalProperties: false },
  ),
);
const Surge = T.Object(
  {
    z0: T.Integer(),
    z1: T.Integer(),
    warn: Frame1,
    active: Frame1,
    damage: T.Integer({ minimum: 0, maximum: 1000 }),
  },
  { additionalProperties: false },
);
const Waves = T.Array(
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
);
const Substitutions = T.Array(
  T.Object(
    {
      from: KitId,
      to: KitId,
      minDifficulty: DifficultyId,
      count: T.Integer({ minimum: 1, maximum: 8 }),
    },
    { additionalProperties: false },
  ),
);
export const ArenaSchema = T.Object(
  {
    arenas: T.Array(
      T.Object(
        {
          id: KitId,
          name: T.String({ minLength: 1 }),
          area: AreaId,
          backdrop: T.Optional(Backdrop),
          width: T.Integer({ minimum: 1920, maximum: 7680 }),
          heroX: T.Optional(T.Integer({ minimum: 0, maximum: 7680 })),
          minDifficulty: T.Optional(DifficultyId),
          /** Stage layout for weapons and scenery (mill: the Lab's mill corner). */
          layout: T.Optional(T.Literal('mill')),
          weaponSpot: T.Optional(Spot),
          devices: T.Optional(Devices),
          surge: T.Optional(Surge),
          waves: Waves,
          substitutions: T.Optional(Substitutions),
          /** M19: finite reserve for Replace the Line (kit ids). */
          reserve: T.Optional(T.Array(KitId, { maxItems: 4 })),
        },
        { additionalProperties: false },
      ),
      { minItems: 1 },
    ),
  },
  { additionalProperties: false },
);

const Percent = T.Integer({ minimum: 1, maximum: 100 });
const Pickup = T.Object(
  {
    x: T.Integer({ minimum: 0, maximum: 7680 }),
    z: T.Integer({ minimum: 0, maximum: 2000 }),
    heal: T.Integer({ minimum: 1, maximum: 1000 }),
    /** Cell of the food sheet (PROP-FOOD) drawn for it. */
    look: T.Integer({ minimum: 0, maximum: 5 }),
  },
  { additionalProperties: false },
);
const BeatX = T.Integer({ minimum: 0, maximum: 7680 });
const BeatZ = T.Integer({ minimum: 0, maximum: 2000 });
const Place = T.Object({ x: BeatX, z: BeatZ }, { additionalProperties: false });
const Story = T.Object(
  { x: BeatX, z: BeatZ, text: T.String({ minLength: 1 }) },
  { additionalProperties: false },
);
const WorkerYaml = T.Object(
  { x: BeatX, z: BeatZ, look: T.Union([T.Literal('a'), T.Literal('b')]) },
  { additionalProperties: false },
);
/** A stage definition (M9): beats, camera locks, checkpoints, rescues, clues, evidence. */
export const StageSchema = T.Object(
  {
    id: KitId,
    name: T.String({ minLength: 1 }),
    continues: T.Object(
      {
        easy: T.Integer({ minimum: 0, maximum: 9 }),
        medium: T.Integer({ minimum: 0, maximum: 9 }),
        hard: T.Integer({ minimum: 0, maximum: 9 }),
        extreme: T.Integer({ minimum: 0, maximum: 9 }),
        ultimate: T.Integer({ minimum: 0, maximum: 9 }),
      },
      { additionalProperties: false },
    ),
    rules: T.Object(
      {
        reviveFrames: Frame1,
        revivePercent: Percent,
        rejoinPercent: Percent,
        continuePercent: Percent,
        reachX: T.Integer({ minimum: 1, maximum: 600 }),
        reachZ: T.Integer({ minimum: 1, maximum: 300 }),
        workerFrames: Frame1,
        clueFrames: Frame1,
        evidenceFrames: Frame1,
        pickupReachX: T.Integer({ minimum: 1, maximum: 300 }),
        pickupReachZ: T.Integer({ minimum: 1, maximum: 300 }),
        defeatHold: Frame1,
        transition: Frame1,
        exitMargin: T.Integer({ minimum: 0, maximum: 1000 }),
      },
      { additionalProperties: false },
    ),
    // A locked hero roster (only these heroes may play the stage) and guest heroes who
    // join the roster for this stage only. Both are optional; Stage 1 declares neither.
    roster: T.Optional(T.Array(KitId, { minItems: 1, maxItems: 8 })),
    guests: T.Optional(T.Array(KitId, { maxItems: 4 })),
    timePar: T.Tuple([
      T.Integer({ minimum: 1 }),
      T.Integer({ minimum: 1 }),
      T.Integer({ minimum: 1 }),
    ]),
    grade: T.Object(
      {
        categories: T.Array(
          T.Object(
            {
              id: KitId,
              measure: T.Union([
                T.Literal('workers'),
                T.Literal('clues'),
                T.Literal('continues'),
                T.Literal('time'),
              ]),
              weight: T.Integer({ minimum: 1, maximum: 100 }),
              allowance: T.Optional(T.Integer({ minimum: 1, maximum: 9 })),
            },
            { additionalProperties: false },
          ),
          { minItems: 1, maxItems: 8 },
        ),
        ranks: T.Object({ S: Percent, A: Percent, B: Percent }, { additionalProperties: false }),
        caps: T.Optional(
          T.Array(
            T.Object(
              {
                category: KitId,
                below: Percent,
                rank: T.Union([T.Literal('A'), T.Literal('B'), T.Literal('C')]),
              },
              { additionalProperties: false },
            ),
          ),
        ),
      },
      { additionalProperties: false },
    ),
    score: T.Object(
      {
        surrendered: T.Integer({ minimum: 0, maximum: 100000 }),
        defeated: T.Integer({ minimum: 0, maximum: 100000 }),
        fled: T.Integer({ minimum: 0, maximum: 100000 }),
        worker: T.Integer({ minimum: 0, maximum: 100000 }),
        clue: T.Integer({ minimum: 0, maximum: 100000 }),
        evidence: T.Integer({ minimum: 0, maximum: 100000 }),
        comboHit: T.Integer({ minimum: 0, maximum: 100000 }),
        timeBonus: T.Integer({ minimum: 0, maximum: 1000 }),
        continuePenalty: T.Integer({ minimum: 0, maximum: 100000 }),
        difficulty: T.Tuple([
          T.Integer({ minimum: 1, maximum: 1000 }),
          T.Integer({ minimum: 1, maximum: 1000 }),
          T.Integer({ minimum: 1, maximum: 1000 }),
          T.Integer({ minimum: 1, maximum: 1000 }),
          T.Integer({ minimum: 1, maximum: 1000 }),
        ]),
      },
      { additionalProperties: false },
    ),
    beats: T.Array(
      T.Object(
        {
          id: KitId,
          name: T.String({ minLength: 1 }),
          area: AreaId,
          backdrop: T.Optional(Backdrop),
          width: T.Integer({ minimum: 1920, maximum: 7680 }),
          heroX: T.Optional(T.Integer({ minimum: 0, maximum: 7680 })),
          layout: T.Optional(T.Literal('mill')),
          checkpoint: T.Optional(T.Boolean()),
          objective: T.String({ minLength: 1 }),
          // Branches: the beats that may follow (default: the next beat in the file). With
          // two, the heroes choose by the lane they leave on: the upper half of the floor
          // takes the first, the lower half the second.
          next: T.Optional(T.Array(KitId, { minItems: 1, maxItems: 2 })),
          locks: T.Optional(
            T.Array(
              T.Object(
                {
                  at: T.Integer({ minimum: 0, maximum: 7680 }),
                  view: T.Integer({ minimum: 0, maximum: 7680 }),
                  weaponSpot: T.Optional(Spot),
                  devices: T.Optional(Devices),
                  surge: T.Optional(Surge),
                  waves: Waves,
                  substitutions: T.Optional(Substitutions),
                },
                { additionalProperties: false },
              ),
            ),
          ),
          pickups: T.Optional(T.Array(Pickup)),
          workers: T.Optional(T.Array(WorkerYaml, { maxItems: 4 })),
          pen: T.Optional(Place),
          cache: T.Optional(
            T.Object(
              {
                x: T.Integer({ minimum: 0, maximum: 7680 }),
                z: T.Integer({ minimum: 0, maximum: 2000 }),
                pickups: T.Array(Pickup, { minItems: 1 }),
              },
              { additionalProperties: false },
            ),
          ),
          clue: T.Optional(Story),
          evidence: T.Optional(Story),
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
  return convertArenas(d.arenas, kits, file, false);
}

type ArenaYaml = Static<typeof ArenaSchema>['arenas'][number];

/** Checks arena entries against the enemy kit ids and converts them to pixel data. */
function convertArenas(
  arenas: readonly ArenaYaml[],
  kits: readonly string[],
  file: string,
  stage: boolean,
): unknown[] {
  const d = { arenas };
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
    for (const k of a.reserve ?? [])
      if (!kits.includes(k)) problems.push(`${a.id}: unknown reserve kit "${k}"`);
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
    reserve: a.reserve ?? [],
    stage,
  }));
}

const VIEW_W = 1920;

/**
 * Validates a stage file (M9) and converts it. Every beat gets a quiet base arena (no
 * waves: the time between camera locks) and every camera lock an arena of its own, so the
 * encounter engine runs locks exactly like the M7 arenas. Those arenas are appended to the
 * arena table from index `firstArena` and marked `stage` (they are not Lab arenas).
 */
export function loadStage(
  source: string,
  kits: readonly string[],
  firstArena: number,
  file = 'stage.yaml',
  heroes: readonly string[] = [],
): { stage: unknown; arenas: unknown[] } {
  const d = validate(StageSchema, source, file) as Static<typeof StageSchema>;
  const problems: string[] = [];
  const seen = new Set<string>();
  const arenas: ArenaYaml[] = [];
  const beats = d.beats.map((b, bi) => {
    if (seen.has(b.id)) problems.push(`duplicate beat "${b.id}"`);
    seen.add(b.id);
    const inside = (what: string, x: number) => {
      if (x > b.width) problems.push(`${b.id}: ${what} is outside the beat`);
    };
    const base = firstArena + arenas.length;
    const shared = {
      name: b.name,
      area: b.area,
      width: b.width,
      ...(b.backdrop ? { backdrop: b.backdrop } : {}),
      ...(b.layout ? { layout: b.layout } : {}),
    };
    arenas.push({ id: `${d.id}.${b.id}`, ...shared, waves: [] as never });
    const locks = (b.locks ?? []).map((l, li) => {
      if (l.view + VIEW_W > b.width) problems.push(`${b.id}: lock ${li + 1} view leaves the beat`);
      inside(`lock ${li + 1}`, l.at);
      for (const w of l.waves)
        for (const e of w.enemies)
          if (e.x < l.view || e.x > l.view + VIEW_W)
            problems.push(`${b.id}: lock ${li + 1} enemy at ${e.x} starts outside its view`);
      const arena = firstArena + arenas.length;
      arenas.push({
        id: `${d.id}.${b.id}.${li + 1}`,
        ...shared,
        waves: l.waves,
        ...(l.weaponSpot ? { weaponSpot: l.weaponSpot } : {}),
        ...(l.devices ? { devices: l.devices } : {}),
        ...(l.surge ? { surge: l.surge } : {}),
        ...(l.substitutions ? { substitutions: l.substitutions } : {}),
      });
      return { at: l.at, view: l.view, arena };
    });
    for (let i = 1; i < locks.length; i += 1)
      if (locks[i]!.at <= locks[i - 1]!.at) problems.push(`${b.id}: locks must be in x order`);
    for (const p of b.pickups ?? []) inside('a pickup', p.x);
    for (const w of b.workers ?? []) inside('a worker', w.x);
    if ((b.pen || b.cache) && !(b.workers ?? []).length)
      problems.push(`${b.id}: a pen or cache needs workers`);
    if (b.clue) inside('the clue', b.clue.x);
    if (b.evidence) inside('the evidence', b.evidence.x);
    return {
      id: b.id,
      name: b.name,
      area: b.area,
      backdrop: b.backdrop ?? 'layers',
      width: b.width,
      heroX: b.heroX ?? 300,
      layout: b.layout ?? '',
      checkpoint: b.checkpoint ?? false,
      objective: b.objective,
      base,
      locks,
      pickups: b.pickups ?? [],
      workers: (b.workers ?? []).map((w) => ({ x: w.x, z: w.z, look: w.look === 'b' ? 1 : 0 })),
      pen: b.pen ?? null,
      cache: b.cache ?? null,
      clue: b.clue ?? null,
      evidence: b.evidence ?? null,
      next: (b.next ?? (bi + 1 < d.beats.length ? [d.beats[bi + 1]!.id] : [])).map((id) => {
        const n = d.beats.findIndex((x) => x.id === id);
        if (n < 0) problems.push(`${b.id}: next beat "${id}" is unknown`);
        else if (n <= bi) problems.push(`${b.id}: next beat "${id}" must come later in the file`);
        return n;
      }),
    };
  });
  for (const [what, list] of [
    ['roster', d.roster ?? []],
    ['guest', d.guests ?? []],
  ] as const)
    for (const h of list)
      if (heroes.length > 0 && !heroes.includes(h)) problems.push(`unknown ${what} hero "${h}"`);
  // The stage ends on the sponsor evidence: a beat holds it exactly when no beat follows.
  for (const b of beats) {
    if (b.evidence && b.next.length > 0)
      problems.push(`${b.id}: only a final beat (no next beat) may hold the sponsor evidence`);
    if (!b.evidence && b.next.length === 0)
      problems.push(`${b.id}: a final beat must hold the sponsor evidence (the stage ends on it)`);
  }
  // Every beat can be reached from the first one.
  const reach = new Set([0]);
  for (let i = 0; i < beats.length; i += 1)
    if (reach.has(i)) for (const n of beats[i]!.next) if (n >= 0) reach.add(n);
  for (let i = 0; i < beats.length; i += 1)
    if (!reach.has(i)) problems.push(`${beats[i]!.id}: no beat leads here`);
  // The grade is a 100-point grade; caps name a category of it; ranks fall from S to B.
  const weights = d.grade.categories.reduce((n, c) => n + c.weight, 0);
  if (weights !== 100) problems.push(`grade weights add up to ${weights}, not 100`);
  const cats = new Set(d.grade.categories.map((c) => c.id));
  if (cats.size !== d.grade.categories.length) problems.push('grade category ids repeat');
  for (const cap of d.grade.caps ?? [])
    if (!cats.has(cap.category))
      problems.push(`grade cap names unknown category "${cap.category}"`);
  const r = d.grade.ranks;
  if (!(r.S > r.A && r.A > r.B)) problems.push('grade ranks must fall from S to A to B');
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  const c = d.continues;
  return {
    stage: {
      id: d.id,
      name: d.name,
      continues: [c.easy, c.medium, c.hard, c.extreme, c.ultimate],
      rules: d.rules,
      roster: d.roster ?? [],
      guests: d.guests ?? [],
      timePar: [...d.timePar],
      grade: {
        categories: d.grade.categories.map((c) => ({
          id: c.id,
          measure: c.measure,
          weight: c.weight,
          allowance: c.allowance ?? 3,
        })),
        ranks: [d.grade.ranks.S, d.grade.ranks.A, d.grade.ranks.B],
        caps: (d.grade.caps ?? []).map((c) => ({ ...c })),
      },
      score: { ...d.score, difficulty: [...d.score.difficulty] },
      beats,
    },
    arenas: convertArenas(arenas, kits, file, true),
  };
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
    convert: a.convert
      ? {
          to: index.get(a.convert.to)!,
          large: a.convert.large === undefined ? -1 : index.get(a.convert.large)!,
          unarmed: a.convert.unarmed ?? false,
        }
      : null,
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
        onPunish: l.on.includes('punish'),
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
    // M18: a firearm's empty-state strike shares the input of the shot it replaces.
    if (a.tags?.includes('whenEmpty')) continue;
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
  if (w.class === 'firearm') {
    // M18: a shot that spends rounds, an optional empty-state strike on the same input, a throw.
    const shots = w.actions.filter((a) => a.ammo);
    const empty = w.actions.filter((a) => a.tags?.includes('whenEmpty'));
    if (shots.length !== 1) problems.push('a firearm needs exactly one action that spends rounds');
    if (empty.length > 1) problems.push('a firearm has at most one whenEmpty action');
    if (w.actions.length !== 1 + shots.length + empty.length)
      problems.push('a firearm has only its shot, an optional whenEmpty strike and its throw');
    const shot = shots[0];
    for (const e of empty)
      if (
        shot &&
        (e.input.context !== shot.input.context || e.input.dir !== shot.input.dir || e.ammo)
      )
        problems.push(`"${e.id}": a whenEmpty strike uses the shot's input and spends no rounds`);
  } else if (!melee && w.actions.length !== 1)
    problems.push('only melee weapons have a Weapon Core');
  if (w.fire && w.class !== 'firearm') problems.push('only firearms have a fire cost');
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
    fire: { defenseCost: w.fire?.defenseCost ?? 0 },
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
              /**
               * M16 authored pair route (Reciprocal Handoffs): opens only when the sender and
               * the partner carry these hero tags (sender first); named in the Lab.
               */
              route: T.Optional(
                T.Object(
                  { id: KitId, name: T.String({ minLength: 1 }), pair: T.Tuple([Tag, Tag]) },
                  { additionalProperties: false },
                ),
              ),
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
          /**
           * M16: a boss whose Resolve holds may still be the target; it then takes the
           * coordinated strikes as Resolve pressure (a flinch), not the full lift.
           */
          bossStrike: T.Optional(T.Boolean()),
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
  for (const s of c.handoff.states) {
    if (!s.route) continue;
    for (const t of s.route.pair)
      if (!heroes.some((h) => (h.tags ?? []).includes(t)))
        problems.push(`handoff route "${s.route.id}": no hero carries tag ${t}`);
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
      route: s.route ? { id: s.route.id, name: s.route.name, pair: [...s.route.pair] } : null,
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
      bossStrike: f.bossStrike ?? false,
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

// --- M11 progression ---------------------------------------------------------------------

const ContentId = T.String({ pattern: '^[a-z0-9]+(\\.[a-z0-9-]+)+$' });
const Credits = T.Integer({ minimum: 0, maximum: 100000 });
const RankLetter = T.Union([T.Literal('S'), T.Literal('A'), T.Literal('B'), T.Literal('C')]);
const GoalName = T.Union(
  ['walk', 'jump', 'dash', 'recipe', 'guard', 'exact', 'counter', 'special', 'ultimate'].map((g) =>
    T.Literal(g),
  ),
);
const LessonPhase = T.Object(
  {
    goals: T.Array(GoalName, { minItems: 1, maxItems: 4 }),
    count: T.Integer({ minimum: 1, maximum: 10 }),
    frames: T.Integer({ minimum: 0, maximum: 36000 }),
  },
  { additionalProperties: false },
);

const ProgressionYaml = T.Object(
  {
    bands: T.Object(
      { low: Credits, medium: Credits, high: Credits },
      { additionalProperties: false },
    ),
    payout: T.Object(
      {
        completion: Credits,
        difficulty: T.Tuple([Credits, Credits, Credits, Credits, Credits]),
        rank: T.Object(
          { C: Credits, B: Credits, A: Credits, S: Credits },
          { additionalProperties: false },
        ),
        once: T.Object(
          {
            firstClear: Credits,
            firstRank: T.Object(
              { B: Credits, A: Credits, S: Credits },
              { additionalProperties: false },
            ),
            allClues: Credits,
          },
          { additionalProperties: false },
        ),
        academy: T.Object(
          { certified: Credits, mastered: Credits },
          { additionalProperties: false },
        ),
        masteryLevel: Credits,
      },
      { additionalProperties: false },
    ),
    mastery: T.Object(
      {
        clear: Credits,
        perRank: Credits,
        perLevel: T.Integer({ minimum: 1, maximum: 100000 }),
        maxLevel: T.Integer({ minimum: 1, maximum: 100 }),
      },
      { additionalProperties: false },
    ),
    store: T.Array(
      T.Object(
        {
          id: ContentId,
          group: T.Union([
            T.Literal('wardrobe'),
            T.Literal('training'),
            T.Literal('technique'),
            T.Literal('collection'),
          ]),
          hero: T.Optional(KitId),
          kind: T.Union([
            T.Literal('special'),
            T.Literal('ultimate'),
            T.Literal('outfit'),
            T.Literal('badge'),
          ]),
          action: T.Optional(KitId),
          name: T.Optional(T.String({ minLength: 1 })),
          tint: T.Optional(T.String({ pattern: '^#[0-9a-f]{6}$' })),
          band: T.Union([T.Literal('low'), T.Literal('medium'), T.Literal('high')]),
          reveal: T.Union([
            T.Literal('always'),
            T.Object({ clear: ContentId }, { additionalProperties: false }),
          ]),
          requires: T.Optional(
            T.Object({ achievement: ContentId }, { additionalProperties: false }),
          ),
          mastery: T.Optional(T.Integer({ minimum: 1, maximum: 100 })),
        },
        { additionalProperties: false },
      ),
    ),
    achievements: T.Array(
      T.Object(
        {
          id: ContentId,
          group: T.Union(
            [
              'story',
              'stageMastery',
              'heroMastery',
              'combatTechnique',
              'discovery',
              'coop',
              'academy',
              'difficulty',
            ].map((g) => T.Literal(g)),
          ),
          name: T.String({ minLength: 1 }),
          credits: Credits,
          narrative: T.Optional(T.Boolean()),
          rule: T.Object(
            {
              kind: T.Union([
                T.Literal('clear'),
                T.Literal('heroes'),
                T.Literal('stat'),
                T.Literal('academy'),
              ]),
              content: T.Optional(ContentId),
              rank: T.Optional(RankLetter),
              difficulty: T.Optional(T.Union(DIFFICULTY_ORDER.map((d) => T.Literal(d)))),
              count: T.Optional(T.Integer({ minimum: 1, maximum: 100 })),
              stat: T.Optional(
                T.Union([T.Literal('bestHits'), T.Literal('revives'), T.Literal('allClues')]),
              ),
              min: T.Optional(T.Integer({ minimum: 1, maximum: 100000 })),
              coop: T.Optional(T.Boolean()),
              state: T.Optional(T.Union([T.Literal('certified'), T.Literal('mastered')])),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
    academy: T.Array(
      T.Object(
        {
          id: ContentId,
          name: T.String({ minLength: 1 }),
          lessons: T.Array(
            T.Object(
              {
                id: ContentId,
                course: T.Union(
                  [
                    'orientation',
                    'foundations',
                    'defense',
                    'conversion',
                    'resources',
                    'specialization',
                    'mastery',
                  ].map((c) => T.Literal(c)),
                ),
                name: T.String({ minLength: 1 }),
                demo: T.Optional(KitId),
                recipe: T.Optional(KitId),
                trainer: T.Optional(T.Boolean()),
                meter: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
                guided: T.Array(GoalName, { minItems: 1, maxItems: 4 }),
                trial: LessonPhase,
                mastery: LessonPhase,
              },
              { additionalProperties: false },
            ),
            { minItems: 1 },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
type ProgressionYaml = Static<typeof ProgressionYaml>;

/** Validates progression.yaml against the heroes it names. */
export function loadProgression(
  source: string,
  heroes: readonly {
    id: string;
    actions: readonly { id: string; category: string; catalogue?: boolean }[];
    recipes?: readonly { id: string }[];
  }[],
  file = 'progression.yaml',
): unknown {
  const d = validate(ProgressionYaml, source, file) as ProgressionYaml;
  const problems: string[] = [];
  const ids = new Set<string>();
  const unique = (id: string) => {
    if (ids.has(id)) problems.push(`id "${id}" repeats`);
    ids.add(id);
  };
  const achievements = new Set(d.achievements.map((a) => a.id));
  for (const e of d.store) {
    unique(e.id);
    const hero = e.hero ? heroes.find((h) => h.id === e.hero) : undefined;
    if (e.hero && !hero) problems.push(`${e.id}: unknown hero "${e.hero}"`);
    if (e.kind === 'special' || e.kind === 'ultimate') {
      if (e.group !== 'technique')
        problems.push(`${e.id}: techniques belong to the technique group`);
      const a = hero?.actions.find((x) => x.id === e.action);
      if (!a) problems.push(`${e.id}: unknown action "${e.action}"`);
      else if (a.category !== e.kind || !a.catalogue)
        problems.push(`${e.id}: "${e.action}" is not a catalogue ${e.kind}`);
    } else if (e.action) problems.push(`${e.id}: only techniques name an action`);
    if ((e.kind === 'outfit' || e.kind === 'badge') && !e.name)
      problems.push(`${e.id}: needs a name`);
    if (e.kind === 'outfit' && (!hero || e.group !== 'wardrobe'))
      problems.push(`${e.id}: an outfit is a wardrobe entry of one hero`);
    if (e.requires && !achievements.has(e.requires.achievement))
      problems.push(`${e.id}: unknown achievement "${e.requires.achievement}"`);
  }
  for (const a of d.achievements) unique(a.id);
  for (const r of d.academy) {
    unique(r.id);
    for (const l of r.lessons) {
      unique(l.id);
      const usesRecipe = [...l.guided, ...l.trial.goals, ...l.mastery.goals].includes('recipe');
      if (usesRecipe && !l.recipe) problems.push(`${l.id}: a recipe goal needs a recipe`);
      for (const name of [l.recipe, l.demo])
        if (name)
          for (const h of heroes)
            if (!(h.recipes ?? []).some((x) => x.id === name))
              problems.push(`${l.id}: ${h.id} has no recipe "${name}"`);
    }
  }
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  return {
    bands: d.bands,
    payout: {
      ...d.payout,
      difficulty: [...d.payout.difficulty],
    },
    mastery: d.mastery,
    store: d.store.map((e) => ({
      id: e.id,
      group: e.group,
      hero: e.hero ?? null,
      kind: e.kind,
      action: e.action ?? null,
      name: e.name ?? null,
      tint: e.tint ?? null,
      price: d.bands[e.band],
      band: e.band,
      reveal: e.reveal === 'always' ? null : e.reveal.clear,
      requires: e.requires?.achievement ?? null,
      mastery: e.mastery ?? 0,
    })),
    achievements: d.achievements.map((a) => ({
      id: a.id,
      group: a.group,
      name: a.name,
      credits: a.credits,
      narrative: a.narrative ?? false,
      rule: {
        kind: a.rule.kind,
        content: a.rule.content ?? null,
        rank: a.rule.rank ?? null,
        difficulty: a.rule.difficulty ?? null,
        count: a.rule.count ?? 1,
        stat: a.rule.stat ?? null,
        min: a.rule.min ?? 1,
        coop: a.rule.coop ?? false,
        state: a.rule.state ?? null,
      },
    })),
    academy: d.academy.map((r) => ({
      id: r.id,
      name: r.name,
      lessons: r.lessons.map((l) => ({
        id: l.id,
        course: l.course,
        name: l.name,
        demo: l.demo ?? null,
        recipe: l.recipe ?? null,
        trainer: l.trainer ?? false,
        meter: l.meter ?? 0,
        guided: [...l.guided],
        trial: { ...l.trial, goals: [...l.trial.goals] },
        mastery: { ...l.mastery, goals: [...l.mastery.goals] },
      })),
    })),
  };
}

// --- M17 mounted system ---------------------------------------------------------------

const MPx = T.Number({ minimum: 0, maximum: 4000 });
/** Distance along a corridor (pixels). */
const Dist = T.Integer({ minimum: 0, maximum: 60000 });
const MFrames = T.Integer({ minimum: 0, maximum: 600 });
const Amount = T.Integer({ minimum: 0, maximum: 1000 });
const Speed = T.Number({ minimum: 0, maximum: 40 });
const MountedSlot = T.Union([
  T.Literal('neutral'),
  T.Literal('directional'),
  T.Literal('hop'),
  T.Literal('lean'),
  T.Literal('special'),
  T.Literal('ultimate'),
]);
const MountedAction = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    slot: MountedSlot,
    startup: MFrames,
    active: MFrames,
    recovery: MFrames,
    reach: T.Optional(
      T.Object(
        { x: MPx, z: T.Optional(MPx), near: T.Optional(MPx), far: T.Optional(MPx) },
        { additionalProperties: false },
      ),
    ),
    damage: T.Optional(Amount),
    stability: T.Optional(Amount),
    meter: T.Optional(Amount),
    miss: T.Optional(MFrames),
    evade: T.Optional(T.Object({ from: MFrames, to: MFrames }, { additionalProperties: false })),
    restore: T.Optional(Amount),
    seek: T.Optional(T.Union([T.Literal('threat'), T.Literal('partner'), T.Literal('ahead')])),
    guard: T.Optional(MFrames),
    boost: T.Optional(Speed),
    radius: T.Optional(MPx),
  },
  { additionalProperties: false },
);
const RiderActionKind = T.Union([
  T.Literal('check'),
  T.Literal('boot'),
  T.Literal('cutoff'),
  T.Literal('fade'),
  T.Literal('brace'),
  T.Literal('breakaway'),
]);
const RiderAction = T.Object(
  {
    id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
    name: T.String({ minLength: 1 }),
    kind: RiderActionKind,
    windup: MFrames,
    active: MFrames,
    recovery: MFrames,
    reach: T.Object({ x: MPx, z: MPx }, { additionalProperties: false }),
    damage: Amount,
    stability: Amount,
  },
  { additionalProperties: false },
);
const Recover = T.Object(
  { delay: MFrames, every: T.Integer({ minimum: 1, maximum: 60 }), amount: Amount },
  { additionalProperties: false },
);
const MountedDifficulty = T.Object(
  {
    riderStability: T.Integer({ minimum: 10, maximum: 400 }),
    damage: T.Integer({ minimum: 10, maximum: 400 }),
    windup: MFrames,
    committed: T.Integer({ minimum: 1, maximum: 4 }),
    brace: T.Integer({ minimum: 0, maximum: 10 }),
  },
  { additionalProperties: false },
);
const RoadPoint = T.Object({ at: Dist, top: MPx, bottom: MPx }, { additionalProperties: false });
export const MountedSchema = T.Object(
  {
    bike: T.Object(
      {
        id: T.String(),
        name: T.String(),
        plates: T.Array(T.String({ minLength: 1 }), { minItems: 2, maxItems: 2 }),
        speed: T.Object(
          { base: Speed, min: Speed, max: Speed, accel: Speed, brake: Speed },
          { additionalProperties: false },
        ),
        steer: Speed,
        laneDrift: Speed,
        assistDrift: Speed,
        stability: Amount,
        recover: Recover,
        wobble: MFrames,
        impact: T.Object(
          { barrier: Amount, gate: Amount, push: MPx },
          { additionalProperties: false },
        ),
        crash: MFrames,
        protect: MFrames,
        rescue: T.Object(
          { window: MFrames, x: MPx, z: MPx, restore: Amount },
          { additionalProperties: false },
        ),
        tether: T.Object(
          { soft: MPx, hard: MPx, slow: Speed, assist: Speed },
          { additionalProperties: false },
        ),
        hop: T.Object(
          {
            frames: MFrames,
            height: MPx,
            rampFrames: MFrames,
            rampHeight: MPx,
            shift: MPx,
            shiftFrames: MFrames,
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
    roadRider: T.Object(
      {
        id: T.String(),
        name: T.String(),
        health: Amount,
        stability: Amount,
        recover: Recover,
        warn: MFrames,
        catchUp: Speed,
        steer: Speed,
        settle: MFrames,
        crash: MFrames,
        braceShare: T.Integer({ minimum: 0, maximum: 100 }),
        breakaway: T.Integer({ minimum: 1, maximum: 20 }),
        actions: T.Array(RiderAction, { minItems: 6 }),
      },
      { additionalProperties: false },
    ),
    difficulty: T.Object(
      {
        easy: MountedDifficulty,
        medium: MountedDifficulty,
        hard: MountedDifficulty,
        extreme: MountedDifficulty,
        ultimate: MountedDifficulty,
      },
      { additionalProperties: false },
    ),
    heroes: T.Record(T.String(), T.Array(MountedAction)),
    corridors: T.Array(
      T.Object(
        {
          id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
          name: T.String({ minLength: 1 }),
          goal: T.String({ minLength: 1 }),
          start: Dist,
          finish: Dist,
          length: Dist,
          road: T.Array(RoadPoint, { minItems: 2 }),
          obstacles: T.Array(
            T.Object(
              {
                at: Dist,
                z: MPx,
                kind: T.Union([T.Literal('barrier'), T.Literal('gate'), T.Literal('ramp')]),
              },
              { additionalProperties: false },
            ),
          ),
          equipment: T.Array(
            T.Object(
              {
                id: T.String({ pattern: '^[a-z][a-z0-9-]*$' }),
                name: T.String({ minLength: 1 }),
                at: Dist,
                side: T.Union([T.Literal('top'), T.Literal('bottom')]),
              },
              { additionalProperties: false },
            ),
          ),
          checkpoints: T.Array(Dist),
          // M19 Marek's mounted intercept: the boss rides in once the lead passes `at`;
          // `stability` is his Stability in percent of a Road Rider's. He never breaks away.
          boss: T.Optional(
            T.Object(
              {
                at: Dist,
                stability: T.Integer({ minimum: 100, maximum: 1000 }),
                lane: T.Integer({ minimum: 0, maximum: 2 }),
              },
              { additionalProperties: false },
            ),
          ),
          waves: T.Array(
            T.Object(
              {
                at: Dist,
                min: DifficultyId,
                target: T.Optional(T.String()),
                riders: T.Array(
                  T.Object(
                    {
                      from: T.Union([T.Literal('behind'), T.Literal('ahead')]),
                      lane: T.Integer({ minimum: 0, maximum: 2 }),
                    },
                    { additionalProperties: false },
                  ),
                  { minItems: 1 },
                ),
              },
              { additionalProperties: false },
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
export type MountedYaml = Static<typeof MountedSchema>;

const MOUNTED_SLOTS = ['neutral', 'directional', 'hop', 'lean', 'special', 'ultimate'] as const;
const SEEK_CODE = { threat: 1, partner: 2, ahead: 3 } as const;
const RIDER_KIND = { check: 0, boot: 1, cutoff: 2, fade: 3, brace: 4, breakaway: 5 } as const;
const OBSTACLE_KIND = { barrier: 0, gate: 1, ramp: 2 } as const;
/** Obstacle half sizes along and across the road (pixels). */
const OBSTACLE_SIZE = { barrier: [30, 40], gate: [40, 40], ramp: [80, 55] } as const;
/** Speeds and sub-pixel amounts: pixels (per frame) to fixed point, rounded. */
const fxs = (v: number) => Math.round(v * FX);

/**
 * Validates mounted.yaml: every roster hero has exactly the six mounted slots, ids are
 * unique, road points run forward, waves name known equipment, and the finish lies on
 * the road. Returns the simulation's MountedDef (fixed point, codes, roster order).
 */
export function loadMounted(
  source: string,
  heroIds: readonly string[],
  file = 'mounted.yaml',
): unknown {
  const m = validate(MountedSchema, source, file) as MountedYaml;
  const problems: string[] = [];
  for (const id of heroIds) {
    const kit = m.heroes[id];
    if (!kit) {
      problems.push(`${file}: hero "${id}" has no mounted kit`);
      continue;
    }
    const slots = kit.map((a) => a.slot);
    for (const s of MOUNTED_SLOTS)
      if (slots.filter((x) => x === s).length !== 1)
        problems.push(`${file}: ${id} needs exactly one "${s}" action`);
    const ids = new Set<string>();
    for (const a of kit) {
      if (ids.has(a.id)) problems.push(`${file}: ${id} repeats "${a.id}"`);
      ids.add(a.id);
      if (a.slot === 'directional' && (a.reach?.near === undefined || a.reach.far === undefined))
        problems.push(`${file}: ${id}/${a.id} needs reach near and far`);
      if ((a.slot === 'neutral' || a.slot === 'special') && a.reach?.z === undefined)
        problems.push(`${file}: ${id}/${a.id} needs reach x and z`);
      if (a.slot === 'ultimate' && a.radius === undefined)
        problems.push(`${file}: ${id}/${a.id} needs a radius`);
      if (a.evade && a.evade.from > a.evade.to)
        problems.push(`${file}: ${id}/${a.id} evade runs backwards`);
    }
  }
  for (const h of Object.keys(m.heroes))
    if (!heroIds.includes(h)) problems.push(`${file}: unknown hero "${h}"`);
  for (const k of Object.keys(RIDER_KIND))
    if (!m.roadRider.actions.some((a) => a.kind === k))
      problems.push(`${file}: the Road Rider needs a "${k}" action`);
  for (const c of m.corridors) {
    for (let i = 1; i < c.road.length; i += 1)
      if (c.road[i]!.at <= c.road[i - 1]!.at)
        problems.push(`${file}: ${c.id} road points must run forward`);
    for (const r of c.road)
      if (r.bottom - r.top < 200) problems.push(`${file}: ${c.id} road is too narrow at ${r.at}`);
    if (c.road[c.road.length - 1]!.at < c.length)
      problems.push(`${file}: ${c.id} road ends before the corridor`);
    if (!(c.start < c.finish && c.finish < c.length))
      problems.push(`${file}: ${c.id} needs start < finish < length`);
    const eq = c.equipment.map((e) => e.id);
    for (const w of c.waves)
      if (w.target !== undefined && !eq.includes(w.target))
        problems.push(`${file}: ${c.id} wave at ${w.at} targets unknown "${w.target}"`);
    for (let i = 1; i < c.checkpoints.length; i += 1)
      if (c.checkpoints[i]! <= c.checkpoints[i - 1]!)
        problems.push(`${file}: ${c.id} checkpoints must run forward`);
  }
  if (problems.length > 0) throw new HeroDataError(problems.join('\n'));
  const b = m.bike;
  const recover = (r: Static<typeof Recover>) => ({ ...r });
  return {
    bike: {
      id: b.id,
      name: b.name,
      plates: [...b.plates],
      base: fxs(b.speed.base),
      min: fxs(b.speed.min),
      max: fxs(b.speed.max),
      accel: fxs(b.speed.accel),
      brake: fxs(b.speed.brake),
      steer: fxs(b.steer),
      laneDrift: fxs(b.laneDrift),
      assistDrift: fxs(b.assistDrift),
      stability: b.stability,
      recover: recover(b.recover),
      wobble: b.wobble,
      impact: { barrier: b.impact.barrier, gate: b.impact.gate, push: fx(b.impact.push) },
      crash: b.crash,
      protect: b.protect,
      rescue: {
        window: b.rescue.window,
        x: fx(b.rescue.x),
        z: fx(b.rescue.z),
        restore: b.rescue.restore,
      },
      tether: {
        soft: fx(b.tether.soft),
        hard: fx(b.tether.hard),
        slow: fxs(b.tether.slow),
        assist: fxs(b.tether.assist),
      },
      hop: {
        frames: b.hop.frames,
        height: fx(b.hop.height),
        rampFrames: b.hop.rampFrames,
        rampHeight: fx(b.hop.rampHeight),
        shift: fx(b.hop.shift),
        shiftFrames: b.hop.shiftFrames,
      },
    },
    rider: {
      id: m.roadRider.id,
      name: m.roadRider.name,
      health: m.roadRider.health,
      stability: m.roadRider.stability,
      recover: recover(m.roadRider.recover),
      warn: m.roadRider.warn,
      catchUp: fxs(m.roadRider.catchUp),
      steer: fxs(m.roadRider.steer),
      settle: m.roadRider.settle,
      crash: m.roadRider.crash,
      braceShare: m.roadRider.braceShare,
      breakaway: m.roadRider.breakaway,
      actions: m.roadRider.actions.map((a) => ({
        id: a.id,
        name: a.name,
        kind: RIDER_KIND[a.kind],
        windup: a.windup,
        active: a.active,
        recovery: a.recovery,
        reachX: fx(a.reach.x),
        reachZ: fx(a.reach.z),
        damage: a.damage,
        stability: a.stability,
      })),
    },
    difficulty: DIFFICULTY_ORDER.map((d) => ({ ...m.difficulty[d] })),
    heroes: heroIds.map((id) =>
      MOUNTED_SLOTS.map((slot) => {
        const a = m.heroes[id]!.find((x) => x.slot === slot)!;
        return {
          id: a.id,
          name: a.name,
          slot: MOUNTED_SLOTS.indexOf(slot),
          startup: a.startup,
          active: a.active,
          recovery: a.recovery,
          reachX: fx(a.reach?.x ?? 0),
          reachZ: fx(a.reach?.z ?? 0),
          near: fx(a.reach?.near ?? 0),
          far: fx(a.reach?.far ?? 0),
          damage: a.damage ?? 0,
          stability: a.stability ?? 0,
          meter: a.meter ?? 0,
          miss: a.miss ?? 0,
          evadeFrom: a.evade?.from ?? 0,
          evadeTo: a.evade?.to ?? -1,
          restore: a.restore ?? 0,
          seek: a.seek ? SEEK_CODE[a.seek] : 0,
          guard: a.guard ?? 0,
          boost: fxs(a.boost ?? 0),
          radius: fx(a.radius ?? 0),
        };
      }),
    ),
    corridors: m.corridors.map((c) => ({
      id: c.id,
      name: c.name,
      goal: c.goal,
      start: fx(c.start),
      finish: fx(c.finish),
      length: fx(c.length),
      road: c.road.map((r) => ({ at: fx(r.at), top: fx(r.top), bottom: fx(r.bottom) })),
      obstacles: c.obstacles.map((o) => ({
        at: fx(o.at),
        z: fx(o.z),
        kind: OBSTACLE_KIND[o.kind],
        hw: fx(OBSTACLE_SIZE[o.kind][0]),
        hd: fx(OBSTACLE_SIZE[o.kind][1]),
      })),
      equipment: c.equipment.map((e) => ({
        id: e.id,
        name: e.name,
        at: fx(e.at),
        side: e.side === 'top' ? 0 : 1,
      })),
      checkpoints: c.checkpoints.map((x) => fx(x)),
      boss: c.boss
        ? { at: fx(c.boss.at), stability: c.boss.stability, lane: c.boss.lane }
        : null,
      waves: c.waves.map((w) => ({
        at: fx(w.at),
        min: DIFFICULTY_ORDER.indexOf(w.min),
        target: w.target === undefined ? -1 : c.equipment.findIndex((e) => e.id === w.target),
        riders: w.riders.map((r) => ({ from: r.from === 'behind' ? 0 : 1, lane: r.lane })),
      })),
    })),
  };
}

// --- M18 greenhouse: pantry, containers, Preservation Ledger, grenade, rooms -------------

const Id = T.String({ pattern: '^[a-z][a-z0-9-]*$' });
const Pos = T.Integer({ minimum: 0, maximum: 7680 });
const Depth = T.Integer({ minimum: 0, maximum: 2000 });
const Long = T.Integer({ minimum: 1, maximum: 7200 });
const Size = T.Tuple([
  T.Integer({ minimum: 1, maximum: 400 }),
  T.Integer({ minimum: 1, maximum: 400 }),
  T.Integer({ minimum: 1, maximum: 600 }),
]);
const Category = T.Union([
  T.Literal('workers'),
  T.Literal('aquatic'),
  T.Literal('crops'),
  T.Literal('systems'),
  T.Literal('supplies'),
]);
const Content = T.Object(
  { item: T.Optional(Id), weapon: T.Optional(Id) },
  { additionalProperties: false },
);
export const GreenhouseSchema = T.Object(
  {
    pantry: T.Object(
      {
        reach: T.Object(
          {
            x: T.Integer({ minimum: 1, maximum: 400 }),
            z: T.Integer({ minimum: 1, maximum: 400 }),
          },
          { additionalProperties: false },
        ),
        items: T.Array(
          T.Object(
            {
              id: Id,
              name: T.String({ minLength: 1 }),
              health: T.Optional(T.Integer({ minimum: 0, maximum: 1000 })),
              defense: T.Optional(T.Integer({ minimum: 0, maximum: 100 })),
              meter: T.Optional(T.Integer({ minimum: 0, maximum: 1000 })),
              rare: T.Optional(T.Boolean()),
            },
            { additionalProperties: false },
          ),
          { minItems: 1 },
        ),
      },
      { additionalProperties: false },
    ),
    containers: T.Array(
      T.Object(
        {
          id: Id,
          name: T.String({ minLength: 1 }),
          ownership: T.Union([T.Literal('protected'), T.Literal('hostile')]),
          open: T.Optional(Frame1),
          integrity: T.Optional(T.Integer({ minimum: 1, maximum: 1000 })),
          size: Size,
        },
        { additionalProperties: false },
      ),
      { minItems: 1 },
    ),
    ledger: T.Object(
      {
        kinds: T.Array(
          T.Object(
            {
              id: Id,
              name: T.String({ minLength: 1 }),
              category: Category,
              condition: T.Integer({ minimum: 1, maximum: 1000 }),
              damaged: T.Integer({ minimum: 0, maximum: 1000 }),
              critical: T.Integer({ minimum: 0, maximum: 1000 }),
              weight: T.Integer({ minimum: 1, maximum: 10 }),
              essential: T.Optional(T.Boolean()),
              aquatic: T.Optional(T.Boolean()),
              circulation: T.Optional(T.Boolean()),
              /** M19: a control a Systems Saboteur may breach. */
              control: T.Optional(T.Boolean()),
              repair: T.Object(
                { every: Frame1, amount: T.Integer({ minimum: 1, maximum: 100 }) },
                { additionalProperties: false },
              ),
              size: Size,
            },
            { additionalProperties: false },
          ),
          { minItems: 1 },
        ),
        rules: T.Object(
          {
            strike: T.Integer({ minimum: 0, maximum: 1000 }),
            impact: T.Integer({ minimum: 0, maximum: 1000 }),
            maxHit: T.Integer({ minimum: 1, maximum: 1000 }),
            guard: Frames,
            drain: T.Object(
              { every: Frame1, floor: T.Integer({ minimum: 0, maximum: 100 }) },
              { additionalProperties: false },
            ),
            stable: Long,
            reach: T.Object(
              {
                x: T.Integer({ minimum: 1, maximum: 400 }),
                z: T.Integer({ minimum: 1, maximum: 400 }),
              },
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
        grades: T.Array(
          T.Object(
            {
              id: Id,
              name: T.String({ minLength: 1 }),
              min: T.Integer({ minimum: 0, maximum: 100 }),
            },
            { additionalProperties: false },
          ),
          { minItems: 2 },
        ),
      },
      { additionalProperties: false },
    ),
    grenade: T.Object(
      {
        weapon: Id,
        remove: Frame1,
        arm: Frame1,
        aim: Frame1,
        fuse: Long,
        radius: T.Integer({ minimum: 1, maximum: 1000 }),
        damage: T.Integer({ minimum: 0, maximum: 1000 }),
        push: T.Number({ minimum: 0, maximum: 60 }),
        lift: T.Number({ minimum: 0, maximum: 60 }),
        integrity: T.Integer({ minimum: 0, maximum: 1000 }),
        ledger: T.Integer({ minimum: 0, maximum: 1000 }),
        every: Long,
      },
      { additionalProperties: false },
    ),
    rooms: T.Array(
      T.Object(
        {
          id: Id,
          name: T.String({ minLength: 1 }),
          width: T.Integer({ minimum: 1920, maximum: 7680 }),
          waves: T.Optional(Waves),
          /** M19: hidden-arena extras (hero start, weapon spot, substitutions, reserve). */
          heroX: T.Optional(Pos),
          substitutions: T.Optional(Substitutions),
          reserve: T.Optional(T.Array(Id, { maxItems: 4 })),
          /** M19: the room's one grenade belongs to its first Systems Saboteur. */
          grenade: T.Optional(T.Literal('saboteur')),
          /** M19: the optional asset Marek's Scorched Claim threatens (asset id). */
          scorch: T.Optional(Id),
          /** M19: story NPCs (Tomas Rell). */
          npcs: T.Optional(
            T.Array(
              T.Object({ id: T.Literal('tomas'), x: Pos, z: Depth }, { additionalProperties: false }),
              { maxItems: 2 },
            ),
          ),
          assets: T.Array(
            T.Object({ id: Id, kind: Id, x: Pos, z: Depth }, { additionalProperties: false }),
          ),
          containers: T.Array(
            T.Object(
              { kind: Id, x: Pos, z: Depth, contents: T.Array(Content, { maxItems: 4 }) },
              { additionalProperties: false },
            ),
          ),
          pantry: T.Array(
            T.Object({ item: Id, x: Pos, z: Depth }, { additionalProperties: false }),
          ),
          shutter: T.Optional(
            T.Object({ x: Pos, z: Depth, asset: Id }, { additionalProperties: false }),
          ),
          rack: T.Optional(
            T.Object(
              {
                x: Pos,
                z: Depth,
                asset: Id,
                thresholds: T.Tuple([
                  T.Integer({ minimum: 1, maximum: 1000 }),
                  T.Integer({ minimum: 1, maximum: 1000 }),
                ]),
                fragment: Id,
                fall: T.Object(
                  {
                    w: T.Integer({ minimum: 1, maximum: 1000 }),
                    d: T.Integer({ minimum: 1, maximum: 400 }),
                    damage: T.Integer({ minimum: 0, maximum: 1000 }),
                    seedlings: T.Integer({ minimum: 0, maximum: 1000 }),
                  },
                  { additionalProperties: false },
                ),
                right: Frame1,
              },
              { additionalProperties: false },
            ),
          ),
          jet: T.Optional(
            T.Object(
              {
                valve: T.Object({ x: Pos, z: Depth }, { additionalProperties: false }),
                lanes: T.Array(
                  T.Object(
                    { x0: Pos, x1: Pos, z0: Depth, z1: Depth },
                    { additionalProperties: false },
                  ),
                  { minItems: 1, maxItems: 2 },
                ),
                warn: Frame1,
                active: Frame1,
                cooldown: Long,
                damage: T.Integer({ minimum: 0, maximum: 1000 }),
                push: T.Number({ minimum: 0, maximum: 60 }),
                restore: T.Integer({ minimum: 0, maximum: 1000 }),
              },
              { additionalProperties: false },
            ),
          ),
          redirect: T.Optional(
            T.Object(
              {
                x: Pos,
                z: Depth,
                solo: Long,
                coop: Long,
                restore: T.Integer({ minimum: 0, maximum: 1000 }),
                cooldown: Long,
              },
              { additionalProperties: false },
            ),
          ),
          restraint: T.Optional(
            T.Object(
              {
                x: Pos,
                z: Depth,
                zone: T.Object(
                  {
                    x: Pos,
                    z: Depth,
                    hw: T.Integer({ minimum: 1, maximum: 1000 }),
                    hd: T.Integer({ minimum: 1, maximum: 400 }),
                  },
                  { additionalProperties: false },
                ),
                frames: Long,
                large: Long,
                cooldown: Long,
              },
              { additionalProperties: false },
            ),
          ),
          grenadier: T.Optional(T.Object({ x: Pos, z: Depth }, { additionalProperties: false })),
        },
        { additionalProperties: false },
      ),
      { minItems: 1 },
    ),
  },
  { additionalProperties: false },
);
export type GreenhouseYaml = Static<typeof GreenhouseSchema>;

const CATEGORY_CODE = { workers: 0, aquatic: 1, crops: 2, systems: 3, supplies: 4 } as const;

/**
 * Validates greenhouse.yaml against the weapon and enemy ids and converts it to the
 * simulation's GreenhouseDef (fixed point positions, indices). Room waves become hidden
 * arenas appended from index `firstArena` (like stage camera locks).
 */
export function loadGreenhouse(
  source: string,
  weapons: readonly string[],
  kits: readonly string[],
  firstArena: number,
  file = 'greenhouse.yaml',
): { greenhouse: unknown; arenas: unknown[] } {
  const g = validate(GreenhouseSchema, source, file) as GreenhouseYaml;
  const problems: string[] = [];
  const unique = (list: readonly { id: string }[], what: string) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(x.id)) problems.push(`duplicate ${what} "${x.id}"`);
      seen.add(x.id);
    }
  };
  unique(g.pantry.items, 'pantry item');
  unique(g.containers, 'container');
  unique(g.ledger.kinds, 'ledger kind');
  unique(g.rooms, 'room');
  const pantryIds = g.pantry.items.map((p) => p.id);
  const containerIds = g.containers.map((c) => c.id);
  const kindIds = g.ledger.kinds.map((k) => k.id);
  for (const p of g.pantry.items)
    if (!p.health && !p.defense && !p.meter) problems.push(`pantry "${p.id}" restores nothing`);
  for (const c of g.containers) {
    if (c.ownership === 'protected' && (!c.open || c.integrity))
      problems.push(
        `container "${c.id}": protected containers open with Interact (open, no integrity)`,
      );
    if (c.ownership === 'hostile' && (!c.integrity || c.open))
      problems.push(`container "${c.id}": hostile containers break (integrity, no open)`);
  }
  for (const k of g.ledger.kinds)
    if (!(k.critical <= k.damaged && k.damaged < k.condition))
      problems.push(`ledger kind "${k.id}" needs critical <= damaged < condition`);
  const mins = g.ledger.grades.map((x) => x.min);
  if (mins.some((m, i) => i > 0 && m >= mins[i - 1]!) || mins[mins.length - 1] !== 0)
    problems.push('grades run from the highest band down to a band at 0');
  if (!weapons.includes(g.grenade.weapon))
    problems.push(`grenade: unknown weapon "${g.grenade.weapon}"`);
  for (const r of g.rooms) {
    const where = `room "${r.id}"`;
    unique(r.assets, `${where} asset`);
    for (const a of r.assets)
      if (!kindIds.includes(a.kind)) problems.push(`${where}: unknown ledger kind "${a.kind}"`);
    for (const c of r.containers) {
      if (!containerIds.includes(c.kind)) problems.push(`${where}: unknown container "${c.kind}"`);
      for (const x of c.contents) {
        if (!!x.item === !!x.weapon) problems.push(`${where}: a content is an item or a weapon`);
        if (x.item && !pantryIds.includes(x.item))
          problems.push(`${where}: unknown item "${x.item}"`);
        if (x.weapon && !weapons.includes(x.weapon))
          problems.push(`${where}: unknown weapon "${x.weapon}"`);
      }
    }
    for (const p of r.pantry)
      if (!pantryIds.includes(p.item)) problems.push(`${where}: unknown item "${p.item}"`);
    if (r.scorch) {
      const a = r.assets.find((x) => x.id === r.scorch);
      const k = a ? g.ledger.kinds.find((x) => x.id === a.kind) : undefined;
      if (!a) problems.push(`${where}: unknown scorch asset "${r.scorch}"`);
      else if (k?.essential)
        problems.push(`${where}: Scorched Claim may only threaten an optional asset`);
    }
    if (r.grenade && r.grenadier) problems.push(`${where}: one grenade owner (drill or saboteur)`);
    if (r.grenade && !(r.waves ?? []).some((w) => w.enemies.some((e) => e.kit === 'saboteur')))
      problems.push(`${where}: grenade: saboteur needs a saboteur in its waves`);
    for (const a of [r.shutter?.asset, r.rack?.asset])
      if (a !== undefined && !kindIds.includes(a))
        problems.push(`${where}: unknown ledger kind "${a}"`);
    if (r.rack) {
      if (r.rack.thresholds[0] >= r.rack.thresholds[1])
        problems.push(`${where}: rack thresholds must rise`);
      if (!weapons.includes(r.rack.fragment))
        problems.push(`${where}: unknown fragment "${r.rack.fragment}"`);
    }
    for (const l of r.jet?.lanes ?? [])
      if (l.x0 >= l.x1 || l.z0 >= l.z1)
        problems.push(`${where}: a jet lane needs x0 < x1, z0 < z1`);
    if (r.redirect && !r.jet) problems.push(`${where}: a redirect needs a jet`);
    if (r.redirect && r.redirect.coop >= r.redirect.solo)
      problems.push(`${where}: the cooperative redirect is faster than the solo one`);
    if (r.redirect && r.jet && r.jet.lanes.length < 2)
      problems.push(`${where}: a redirect needs two jet lanes`);
    if (r.restraint && r.restraint.large > r.restraint.frames)
      problems.push(`${where}: a large enemy is held no longer than others`);
  }
  if (problems.length > 0) throw new HeroDataError(problems.map((p) => `${file}: ${p}`).join('\n'));
  const f = (v: number) => fx(v);
  const kindOf = (id: string) => kindIds.indexOf(id);
  const arenas: unknown[] = [];
  const rooms = g.rooms.map((r) => {
    let arena = -1;
    if (r.waves) {
      arena = firstArena + arenas.length;
      arenas.push(
        ...convertArenas(
          [
            {
              id: `${r.id}-waves`,
              name: r.name,
              area: 'mill',
              width: r.width,
              heroX: r.heroX,
              waves: r.waves,
              substitutions: r.substitutions,
              reserve: r.reserve,
            },
          ],
          kits,
          file,
          true,
        ),
      );
    }
    // The shutter's and the rack's own assets follow the authored ones.
    const assets = r.assets.map((a) => ({ id: a.id, kind: kindOf(a.kind), x: f(a.x), z: f(a.z) }));
    let shutterAsset = -1;
    if (r.shutter) {
      shutterAsset = assets.length;
      assets.push({
        id: 'shutter',
        kind: kindOf(r.shutter.asset),
        x: f(r.shutter.x),
        z: f(r.shutter.z),
      });
    }
    let rackAsset = -1;
    if (r.rack) {
      rackAsset = assets.length;
      assets.push({ id: 'seedlings', kind: kindOf(r.rack.asset), x: f(r.rack.x), z: f(r.rack.z) });
    }
    return {
      id: r.id,
      name: r.name,
      width: r.width,
      arena,
      assets,
      containers: r.containers.map((c) => ({
        kind: containerIds.indexOf(c.kind),
        x: f(c.x),
        z: f(c.z),
        contents: c.contents.map((x) => ({
          item: x.item ? pantryIds.indexOf(x.item) : -1,
          weapon: x.weapon ?? '',
        })),
      })),
      pantry: r.pantry.map((p) => ({ item: pantryIds.indexOf(p.item), x: f(p.x), z: f(p.z) })),
      shutter: r.shutter ? { x: f(r.shutter.x), z: f(r.shutter.z), asset: shutterAsset } : null,
      rack: r.rack
        ? {
            x: f(r.rack.x),
            z: f(r.rack.z),
            asset: rackAsset,
            loose: r.rack.thresholds[0],
            topple: r.rack.thresholds[1],
            fragment: r.rack.fragment,
            fallW: f(r.rack.fall.w),
            fallD: f(r.rack.fall.d),
            fallDamage: r.rack.fall.damage,
            seedlings: r.rack.fall.seedlings,
            right: r.rack.right,
          }
        : null,
      jet: r.jet
        ? {
            x: f(r.jet.valve.x),
            z: f(r.jet.valve.z),
            lanes: r.jet.lanes.map((l) => ({ x0: f(l.x0), x1: f(l.x1), z0: f(l.z0), z1: f(l.z1) })),
            warn: r.jet.warn,
            active: r.jet.active,
            cooldown: r.jet.cooldown,
            damage: r.jet.damage,
            push: fxs(r.jet.push),
            restore: r.jet.restore,
          }
        : null,
      redirect: r.redirect ? { ...r.redirect, x: f(r.redirect.x), z: f(r.redirect.z) } : null,
      restraint: r.restraint
        ? {
            x: f(r.restraint.x),
            z: f(r.restraint.z),
            zx: f(r.restraint.zone.x),
            zz: f(r.restraint.zone.z),
            hw: f(r.restraint.zone.hw),
            hd: f(r.restraint.zone.hd),
            frames: r.restraint.frames,
            large: r.restraint.large,
            cooldown: r.restraint.cooldown,
          }
        : null,
      grenadier: r.grenadier ? { x: f(r.grenadier.x), z: f(r.grenadier.z) } : null,
      saboteurGrenade: r.grenade === 'saboteur',
      scorch: r.scorch ? assets.findIndex((a) => a.id === r.scorch) : -1,
      npcs: (r.npcs ?? []).map((n) => ({ id: n.id, x: f(n.x), z: f(n.z) })),
    };
  });
  const size = (s: readonly [number, number, number]) => ({ hw: f(s[0]), hd: f(s[1]), h: f(s[2]) });
  const gr = g.grenade;
  const greenhouse = {
    pantry: g.pantry.items.map((p) => ({
      id: p.id,
      name: p.name,
      health: p.health ?? 0,
      defense: p.defense ?? 0,
      meter: p.meter ?? 0,
      rare: p.rare ?? false,
    })),
    pantryReach: { x: f(g.pantry.reach.x), z: f(g.pantry.reach.z) },
    containers: g.containers.map((c) => ({
      id: c.id,
      name: c.name,
      hostile: c.ownership === 'hostile',
      open: c.open ?? 0,
      integrity: c.integrity ?? 0,
      ...size(c.size),
    })),
    ledger: g.ledger.kinds.map((k) => ({
      id: k.id,
      name: k.name,
      category: CATEGORY_CODE[k.category],
      condition: k.condition,
      damaged: k.damaged,
      critical: k.critical,
      weight: k.weight,
      essential: k.essential ?? false,
      aquatic: k.aquatic ?? false,
      circulation: k.circulation ?? false,
      control: k.control ?? false,
      repairEvery: k.repair.every,
      repairAmount: k.repair.amount,
      ...size(k.size),
    })),
    rules: {
      ...g.ledger.rules,
      drain: { ...g.ledger.rules.drain },
      reach: { x: f(g.ledger.rules.reach.x), z: f(g.ledger.rules.reach.z) },
    },
    grades: g.ledger.grades.map((x) => ({ ...x })),
    grenade: {
      weapon: gr.weapon,
      remove: gr.remove,
      arm: gr.arm,
      aim: gr.aim,
      fuse: gr.fuse,
      radius: f(gr.radius),
      damage: gr.damage,
      push: fxs(gr.push),
      lift: fxs(gr.lift),
      integrity: gr.integrity,
      ledger: gr.ledger,
      every: gr.every,
    },
    rooms,
  };
  return { greenhouse, arenas };
}

const MOUNTED_FILE = fileURLToPath(new URL('../mounted/mounted.yaml', import.meta.url));
const GREENHOUSE_FILE = fileURLToPath(new URL('../greenhouse/greenhouse.yaml', import.meta.url));

const PROGRESSION_FILE = fileURLToPath(new URL('../progression/progression.yaml', import.meta.url));

const COOP_FILE = fileURLToPath(new URL('../coop/coop.yaml', import.meta.url));
const STAGES_DIR = fileURLToPath(new URL('../stages/', import.meta.url));

/** Stage files (M9), in file-name order (stage1.yaml first). */
export function stageFileList(dir = STAGES_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => join(dir, f));
}

const WEAPONS_DIR = fileURLToPath(new URL('../weapons/', import.meta.url));

/** Weapon files in registry order: the Stage 1 pair first, then by file name. */
export function weaponFiles(dir = WEAPONS_DIR): string[] {
  // Stage 1 weapons keep their registry indices; later files follow by name.
  const first = ['workstaff.yaml', 'handwheel.yaml', 'timber-board.yaml'];
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

/** The art key of an enemy kit (a variant draws with its base kit's sheets). */
const VARIANT_BASE = new Map<string, string>();
function artOf(k: HeroYaml): string {
  return VARIANT_BASE.get(k.id) ?? k.id;
}

/** Each base kit followed by its generated variants (ids must be unique overall). */
export function expandVariants(kits: readonly HeroYaml[]): HeroYaml[] {
  const out: HeroYaml[] = [];
  for (const k of kits) {
    const { variants, ...base } = k;
    out.push(base);
    for (const v of variants ?? []) {
      VARIANT_BASE.set(v.id, k.id);
      out.push({ ...base, id: v.id, name: v.name, profile: variantProfile(k.profile!, v) });
    }
  }
  const seen = new Set<string>();
  for (const k of out) {
    if (seen.has(k.id)) throw new HeroDataError(`duplicate enemy kit "${k.id}"`);
    seen.add(k.id);
  }
  return out;
}

/** Variant kit id -> [base kit id, difficulty index] (the encounter's variant pick). */
export function variantTable(kits: readonly HeroYaml[]): Record<string, [string, number][]> {
  const t: Record<string, [string, number][]> = {};
  for (const k of kits)
    t[k.id] = (k.variants ?? []).map((v) => [v.id, DIFFICULTY_ORDER.indexOf(v.minDifficulty)]);
  return t;
}

const ROSTER_ORDER = ['mountain.yaml', 'river.yaml', 'wind.yaml', 'fire.yaml'];
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
  stageFiles: readonly string[] = encounters === ENCOUNTERS_DIR ? stageFileList() : [],
  progressionFile: string | null = encounters === ENCOUNTERS_DIR ? PROGRESSION_FILE : null,
  mountedFile: string | null = encounters === ENCOUNTERS_DIR ? MOUNTED_FILE : null,
  greenhouseFile: string | null = encounters === ENCOUNTERS_DIR ? GREENHOUSE_FILE : null,
): string {
  const load = (f: string, kind: 'hero' | 'enemy') =>
    loadHero(readFileSync(f, 'utf8'), basename(f), kind);
  const heroYaml = files.map((f) => load(f, 'hero'));
  const roster = heroYaml.map((h) => compileHero(h, 'hero') as { id: string });
  const heroes = JSON.stringify(roster, null, 2);
  // M19: every variant becomes its own kit right after its base (same actions and art).
  const baseEnemies = enemies.map((f) => load(f, 'enemy'));
  const enemyYaml = expandVariants(baseEnemies);
  const variants = JSON.stringify(variantTable(baseEnemies), null, 2);
  const kits = JSON.stringify(
    enemyYaml.map((h) => ({ ...(compileHero(h, 'enemy') as object), art: artOf(h) })),
    null,
    2,
  );
  const heroIds = roster.map((h) => h.id);
  const weaponYaml = weapons.map((f) => loadWeapon(readFileSync(f, 'utf8'), basename(f), heroIds));
  const arms = JSON.stringify(weaponYaml.map(compileWeapon), null, 2);
  // Boss phases may use the actions of the weapon the phase claims.
  const problems: string[] = [];
  for (const k of enemyYaml) {
    // M19: an armed profile spawns with its weapon; its attacks may use the weapon's actions.
    const armed = k.profile?.armed;
    if (armed) {
      const w = weaponYaml.find((x) => x.id === armed.weapon);
      if (!w) problems.push(`${k.id}: armed with unknown weapon "${armed.weapon}"`);
      const ids = new Set([...k.actions.map((a) => a.id), ...(w?.actions.map((a) => a.id) ?? [])]);
      for (const a of k.profile!.attacks)
        if (!ids.has(a.action)) problems.push(`${k.id}: attack "${a.action}" is unknown`);
    }
    for (const ph of k.profile?.boss?.phases ?? []) {
      const claim = ph.weapon ?? ph.armed;
      const w = claim ? weaponYaml.find((x) => x.id === claim) : undefined;
      if (claim && !w)
        problems.push(`${k.id}: phase "${ph.name}" claims unknown weapon "${claim}"`);
      const ids = new Set([...k.actions.map((a) => a.id), ...(w?.actions.map((a) => a.id) ?? [])]);
      for (const a of ph.attacks)
        if (!ids.has(a.action))
          problems.push(`${k.id}: phase "${ph.name}" attack "${a.action}" is unknown`);
      for (const s of [
        ...(ph.supports ?? []),
        ...(ph.eliteSupports ?? []),
        ...(ph.coopSupports?.kits ?? []),
      ])
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
  const stages: unknown[] = [];
  for (const f of stageFiles) {
    const out = loadStage(readFileSync(f, 'utf8'), kitIds, arenas.length, basename(f), heroIds);
    stages.push(out.stage);
    arenas.push(...out.arenas);
  }
  const progression = progressionFile
    ? loadProgression(readFileSync(progressionFile, 'utf8'), heroYaml, basename(progressionFile))
    : {
        bands: { low: 0, medium: 0, high: 0 },
        payout: null,
        mastery: null,
        store: [],
        achievements: [],
        academy: [],
      };
  const coop = coopFile
    ? compileCoop(loadCoop(readFileSync(coopFile, 'utf8'), heroYaml, basename(coopFile)))
    : { preBuffer: 0, handoffs: [], finishers: [], actions: [] };
  const mounted = mountedFile
    ? loadMounted(readFileSync(mountedFile, 'utf8'), heroIds, basename(mountedFile))
    : null;
  let greenhouse: unknown = null;
  if (greenhouseFile) {
    const out = loadGreenhouse(
      readFileSync(greenhouseFile, 'utf8'),
      weaponYaml.map((w) => w.id),
      kitIds,
      arenas.length,
      basename(greenhouseFile),
    );
    greenhouse = out.greenhouse;
    arenas.push(...out.arenas);
  }
  return `// GENERATED by packages/data/src/generate.ts from packages/data/heroes/*.yaml,
// packages/data/enemies/*.yaml, packages/data/weapons/*.yaml,
// packages/data/encounters/*.yaml, packages/data/stages/*.yaml, packages/data/coop/coop.yaml,
// packages/data/progression/progression.yaml, packages/data/mounted/mounted.yaml and
// packages/data/greenhouse/greenhouse.yaml.
// Do not edit by hand:
// change the YAML and run \`pnpm gen:heroes\`.
import type {
  ArenaDef,
  CoopDef,
  DifficultyDef,
  EnemyProfile,
  GreenhouseDef,
  HeroDef,
  MountedDef,
  ProgressionDef,
  StageDef,
  WeaponDef,
} from './types';

export const HERO_DATA: readonly HeroDef[] = ${heroes};

export const ENEMY_DATA: readonly HeroDef[] = ${kits};

/** AI profiles aligned with ENEMY_DATA (null: the training enemy has none). */
export const ENEMY_PROFILES: readonly (EnemyProfile | null)[] = ${profiles};

/** M19: base kit id -> its [variant kit id, minimum difficulty index] list. */
export const ENEMY_VARIANTS: Readonly<Record<string, readonly (readonly [string, number])[]>> =
  ${variants};

export const WEAPON_DATA: readonly WeaponDef[] = ${arms};

export const DIFFICULTY_DATA: readonly DifficultyDef[] = ${JSON.stringify(difficulty, null, 2)};

export const ARENA_DATA: readonly ArenaDef[] = ${JSON.stringify(arenas, null, 2)};

export const COOP_DATA: CoopDef = ${JSON.stringify(coop, null, 2)};

export const STAGE_DATA: readonly StageDef[] = ${JSON.stringify(stages, null, 2)};

export const PROGRESSION_DATA: ProgressionDef = ${JSON.stringify(progression, null, 2)};

export const MOUNTED_DATA: MountedDef | null = ${JSON.stringify(mounted, null, 2)};

export const GREENHOUSE_DATA: GreenhouseDef | null = ${JSON.stringify(greenhouse, null, 2)};
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(GENERATED_PATH, generate());
  console.log(`wrote ${GENERATED_PATH}`);
}
