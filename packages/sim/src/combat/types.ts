/**
 * Shapes of the generated hero data (see packages/data). All distances and speeds are
 * fixed point (1/256 px); all times are 60 Hz frames.
 */

export type ActionCategory =
  | 'standing'
  | 'aerial'
  | 'ground'
  | 'dash'
  | 'low'
  | 'counter'
  | 'special'
  | 'ultimate'
  /** Grab attempt (heroes) or a whole enemy grab with its hold. */
  | 'grab'
  /** Grab-route strike on the held target (extension, release strike, Special finisher). */
  | 'grabStrike'
  | 'throw'
  /** A held weapon's throw: releases the item on its first active frame. */
  | 'weaponThrow'
  /** A team-finisher part (M8): started only by a confirmed Team Attack invitation. */
  | 'team';
export type InputContext =
  | 'neutral'
  | 'chain'
  | 'air'
  | 'groundFocus'
  | 'dash'
  | 'dashLow'
  /** Started by a successful Directional Predictive Counter. */
  | 'counter'
  /** Picked by the training enemy's script, never by an input. */
  | 'script'
  /** Loadout moves: Special or Ultimate plus a direction (the loadout decides). */
  | 'special'
  | 'ultimate'
  /** Interact with empty hands. */
  | 'grab'
  /** While holding: Attack (extension), Attack after the extension, Interact, Special. */
  | 'grabExtension'
  | 'grabRelease'
  | 'grabThrow'
  | 'grabSpecial'
  /** Interact while holding a weapon. */
  | 'weaponThrow'
  /** Team finisher part (M8). */
  | 'team';
export type ReactionKind = 'stagger' | 'knockback' | 'launch' | 'knockdown' | 'trip';
export type CancelCategory =
  'chain' | 'air' | 'jumpChase' | 'dashBridge' | 'special' | 'ultimate' | 'grab';
export type LinkKind = 'action' | 'jump' | 'dash' | 'special' | 'ultimate' | 'grab';

/** Input direction codes. Numbers are part of the encoded state; never renumber. */
export const Dir = {
  Neutral: 0,
  Forward: 1,
  Backward: 2,
  Up: 3,
  Down: 4,
  /** Data only: matches Up or Down. */
  Vertical: 5,
} as const;
export type Dir = (typeof Dir)[keyof typeof Dir];

export interface HitboxDef {
  /** Start of the box in front of the attacker's centre (towards facing). */
  x: number;
  w: number;
  /** Bottom of the box above the attacker's feet. */
  y: number;
  h: number;
  /** Half the depth band (stage depth, ±). */
  depth: number;
}

export interface ReactionDef {
  kind: ReactionKind;
  hitstun: number;
  /** Initial push away from the attacker, per frame. */
  push: number;
  /** Upward speed for launches and knockdowns. */
  lift: number;
  /** Upward speed given to a target that is already airborne. */
  airPop: number;
  /** A counter-hit turns this hit into a trip (knockdown that opens a ground window). */
  counterTrip: boolean;
}

export interface MoveSample {
  /** Action frames, 1-based and inclusive. */
  from: number;
  to: number;
  /** Speed towards facing, or null to keep the current horizontal speed (aerials). */
  forward: number | null;
  /** Depth speed: negative is up-stage. With depthFromInput it is multiplied by the held depth direction. */
  depth: number;
  depthFromInput: boolean;
  /** Vertical speed set on the first frame of the sample, or null. */
  vy: number | null;
}

export interface LinkDef {
  kind: LinkKind;
  /** Destination action index for kind 'action', else -1. */
  to: number;
  /** Required direction (Dir). Vertical matches Up and Down. */
  dir: number;
  category: CancelCategory;
  onHit: boolean;
  onGuard: boolean;
  onWhiff: boolean;
  /** Premium cancel cost in attack-meter percent (0 = ordinary transition). */
  premium: number;
}

export interface ActionDef {
  id: string;
  name: string;
  category: ActionCategory;
  context: InputContext;
  dir: number;
  startup: number;
  /** Active segments: [active, gap, active, …]. */
  active: readonly number[];
  recovery: number;
  /** Aerial: recovery applies after landing. */
  landing: boolean;
  /** Guard reaction of a defender who normally guards this action. */
  blockstun: number;
  hitbox: HitboxDef;
  hurtbox: 'standing' | 'low';
  damage: number;
  reaction: ReactionDef;
  stunDecayCost: number;
  damageScaleCost: number;
  starterProration: number;
  juggleCost: number;
  /** Defense-meter percent a normal guard of this action costs. */
  guardCost: number;
  /** Attack meter gain in percent on a confirmed hit (F&D §6.6). */
  meterGain: number;
  /** Meter-gain budget points spent on the target's combo, once per action. */
  meterDecay: number;
  /** Loadout slots (Dir codes) a Special or Ultimate may occupy; empty for other actions. */
  slots: readonly number[];
  /** Owned (in the Lab) but not equipped by default. */
  catalogue: boolean;
  /** Action frames [from, to] that absorb strikes; [0, -1] = none. */
  armor: readonly [number, number];
  /** Action frames [from, to] strikes cannot hit; [0, -1] = none. */
  invulnerable: readonly [number, number];
  /** Action frames with the hurtbox shifted x (fixed point) backwards. */
  hurtShift: { from: number; to: number; x: number } | null;
  /** The first active frame launches a projectile with the hitbox as its box. */
  projectile: { speed: number; life: number } | null;
  /** Enemy grab: hold length, Grab Escape window, restraint length (0 = a throw). */
  grab: { hold: number; escapeFrom: number; escapeWindow: number; restraint: number } | null;
  /** Throws: damage of the thrown body on the enemy it hits. */
  bodyDamage: number;
  /** Clash strength (Clash code); 0 = never clashes. */
  clash: number;
  /** Tagged Impact Disarming: disarms a held weapon whose grip resistance it meets (0 = never). */
  disarmPower: number;
  /** Damage to breakable scenery, once per action. */
  breakPower: number;
  /** Hook: pull speed towards the attacker on hit (fixed point), 0 = an ordinary push. */
  pull: number;
  /** Rounds of the held weapon's ammunition this action spends (0 = none). */
  ammo: number;
  /** Hero Specials and Ultimates while armed: 'default' follows the weapon's hand count. */
  armed: 'default' | 'unchanged' | 'unavailable';
  moves: readonly MoveSample[];
  /**
   * Open tag set (opensGroundWindow, terminalKnockdown, passThrough, …) including the
   * defense profile: guardPressure, guardPiercing, unblockable, counterable, uncounterable,
   * deflectBreak.
   */
  tags: readonly string[];
  links: readonly LinkDef[];
  /** Logical asset ID of the pose. */
  pose: string;
}

export interface RecipeStep {
  /** A jump-chase hint between two attacks; never matched against hits. */
  jump: boolean;
  /** Action indices accepted for this step. */
  any: readonly number[];
}

/** An Academy representative recipe (spec §8.3): a route the Lab tracks while you play. */
export interface RecipeDef {
  id: string;
  name: string;
  family: 'foundation' | 'aerial' | 'ground';
  steps: readonly RecipeStep[];
  /** The recipe needs counter-hit dummies (counter-trip openers). */
  counterHit: boolean;
}

export interface HeroDef {
  id: string;
  name: string;
  /** Placeholder silhouette width in pixels (presentation only). */
  bodyWidth: number;
  /** Hero tags (M8): team finishers name their pairs by these. */
  tags: readonly string[];
  actions: readonly ActionDef[];
  recipes: readonly RecipeDef[];
}

/** Clash strength tiers. Numbers are part of the data; never renumber. */
export const Clash = { None: 0, Light: 1, Heavy: 2, Crushing: 3 } as const;

export type WeaponClass =
  'temporaryMelee' | 'recoverableThrown' | 'improvisedDebris' | 'firearm' | 'guardModifier';

/**
 * A weapon (spec §11.1, F&D §7.1): Authored Weapon-Lifecycle Profile plus its Weapon Core.
 * A melee weapon's core replaces the holder's Attack graph; every weapon has one throw.
 */
export interface WeaponDef {
  id: string;
  name: string;
  class: WeaponClass;
  hands: 1 | 2;
  debris: 'none' | 'light' | 'long' | 'heavy';
  /** The core replaces the holder's ordinary Attack graph. */
  melee: boolean;
  integrity: {
    max: number;
    worn: number;
    critical: number;
    hit: number;
    guard: number;
    clash: number;
    throw: number;
    deflect: number;
  };
  gripResistance: number;
  /** Finite rounds a fresh weapon carries (0 = none). */
  ammo: number;
  /** Pickup frames. */
  pickup: number;
  hazardDestructible: boolean;
  /** Share (percent) of a normal guard's Defense cost while held (100 = no change). */
  guardCostPercent: number;
  throw: {
    speed: number;
    lift: number;
    consumed: boolean;
    blockable: boolean;
    exactDeflectable: boolean;
    counterReturnable: boolean;
    strikeDeflectable: boolean;
    catchable: boolean;
  };
  /** Weapon Core actions, in the hero action schema. */
  actions: readonly ActionDef[];
  /** Hero-affinity overrides: each replaces the core action at index `replaces`. */
  affinity: readonly {
    hero: string;
    actions: readonly { replaces: number; action: ActionDef }[];
  }[];
}

/** Category-tuned cancel timing (frames): early buffer before contact, window after it. */
export const CANCEL_TIMING: Record<CancelCategory, { buffer: number; window: number }> = {
  chain: { buffer: 7, window: 14 },
  air: { buffer: 6, window: 12 },
  jumpChase: { buffer: 4, window: 16 },
  dashBridge: { buffer: 6, window: 12 },
  special: { buffer: 7, window: 10 },
  ultimate: { buffer: 7, window: 12 },
  grab: { buffer: 6, window: 12 },
};

/** Why a cancel request was turned down. Numbers are encoded; never renumber. */
export const Reject = {
  None: 0,
  Unlinked: 1,
  TooEarly: 2,
  TooLate: 3,
  NeedsHit: 4,
  AlreadyUsed: 5,
  NoMeter: 6,
  BridgeSpent: 7,
  StunExhausted: 8,
  NotYet: 9,
  QueueFull: 10,
  JuggleExhausted: 11,
  Protected: 12,
  GroundSpent: 13,
  /** The loadout slot for this direction is empty (never falls back). */
  EmptySlot: 14,
  /** No grabbable enemy in reach: grab whiff. */
  NoTarget: 15,
  /** Another hero grabbed the same target on the same frame. */
  Contested: 16,
  /** Both hands are on a two-handed weapon (Specials and Ultimates). */
  HandsFull: 17,
  /** The held weapon has no rounds left. */
  NoAmmo: 18,
} as const;
export type Reject = (typeof Reject)[keyof typeof Reject];

export const REJECT_TEXT: Record<number, string> = {
  [Reject.None]: '',
  [Reject.Unlinked]: 'not linked from this move',
  [Reject.TooEarly]: 'too early',
  [Reject.TooLate]: 'too late',
  [Reject.NeedsHit]: 'needs a hit',
  [Reject.AlreadyUsed]: 'already used in this string',
  [Reject.NoMeter]: 'not enough attack meter',
  [Reject.BridgeSpent]: 'dash bridge already used in this combo',
  [Reject.StunExhausted]: 'hit-stun budget exhausted',
  [Reject.NotYet]: 'not available yet',
  [Reject.QueueFull]: 'a valid follow-up is already queued',
  [Reject.JuggleExhausted]: 'juggle budget exhausted',
  [Reject.Protected]: 'target is in protected recovery',
  [Reject.GroundSpent]: 'ground route already used',
  [Reject.EmptySlot]: 'nothing equipped in that slot',
  [Reject.NoTarget]: 'nobody to grab in reach',
  [Reject.Contested]: 'the other hero grabbed first',
  [Reject.HandsFull]: 'both hands are on the weapon',
  [Reject.NoAmmo]: 'no rounds left: throw it instead',
};

// --- M7 enemies, difficulty and arenas ---------------------------------------------------

/** An attack an enemy AI may start, with its authored threat cost (spec Appendix D.1). */
export interface AiAttackDef {
  /** Action id in the enemy's (possibly armed) kit. */
  action: string;
  threat: number;
  /** Frames before the same attack may start again. */
  cooldown: number;
  /** Difficulty index (0 easy … 4 ultimate) from which it is available. */
  minDifficulty: number;
  /** Reach override (fixed point), 0 = the action's own reach. */
  range: number;
}

/** Tiered Capability Profile (F&D §8): the defensive subset an archetype receives. */
export interface AiDefenseDef {
  tier: 'basic' | 'specialist' | 'elite' | 'boss';
  /** Normal Block on `guardOf` out of every `guardEvery` chances (scaled by difficulty). */
  guardEvery: number;
  guardOf: number;
  exact: boolean;
  counter: boolean;
  breaker: boolean;
  /** Keeps a guard stance whenever a hero is near (Bridge Shield). */
  stance: boolean;
  guardHold: number;
  /** Share (percent) of a normal guard's Defense cost. */
  guardCost: number;
  /** Frames between advanced defenses (exact block, counter, breaker). */
  cooldown: number;
  evadeEvery: number;
  evadeOf: number;
  /** Evasive action id ('' = none). */
  evade: string;
}

export interface BossPhaseDef {
  name: string;
  /** Health percent at which this phase begins. */
  from: number;
  resolve: number;
  look: number;
  /** Weapon id the phase claims ('' = empty-handed). */
  weapon: string;
  counter: boolean;
  breaker: boolean;
  /** Enemy kit ids of the phase-authored support pair. */
  supports: readonly string[];
  /** The pair on Hard and above (spec D.2 roster direction: elite variants). */
  eliteSupports: readonly string[];
  /** Co-op only, from difficulty index `minDifficulty`: extra supports with this phase. */
  coopSupports: { minDifficulty: number; kits: readonly string[] } | null;
  /** Device kind the phase works ('' = none). */
  device: string;
  attacks: readonly AiAttackDef[];
}

export interface BossDef {
  /** Reactions while Resolve remains: after this many flinches a combo only deals damage. */
  flinchCap: number;
  /** Boss-specific combo budgets (stun and juggle) during Stagger Break. */
  budgets: { stun: number; juggle: number };
  stagger: { telegraph: number; duration: number; reentry: number };
  transition: { grace: number; carryCap: number; shift: number };
  /** Threat budget kept for the boss; supports share the rest. */
  share: number;
  phases: readonly BossPhaseDef[];
}

/** An enemy kit's AI: tactical role, movement, defense profile, morale and boss data. */
export interface EnemyProfile {
  role: 'pressure' | 'defender' | 'flanker' | 'grappler' | 'ranged' | 'elite' | 'boss';
  health: number;
  walkX: number;
  walkZ: number;
  perception: number;
  /** Waiting distance (fixed point) while it has no attack permission. */
  ring: number;
  defense: AiDefenseDef;
  /** Morale breaks at this health percent (0 = never). */
  breakAt: number;
  /** Weapon-seeking policy: 0 never, 1 opportunistic, 2 preferred. */
  weapons: number;
  group: { action: string; threat: number; partnerThreat: number; telegraph: number } | null;
  attacks: readonly AiAttackDef[];
  boss: BossDef | null;
}

/** Difficulty profile (spec Appendix D.2, D.5). Pairs are [solo, co-op]. */
export interface DifficultyDef {
  id: string;
  name: string;
  budget: readonly [number, number];
  cap: number;
  perception: number;
  attackers: readonly [number, number];
  projectiles: readonly [number, number];
  hardCC: number;
  groupCooldown: number;
  warning: number;
  guardScale: number;
  /** Percent of each enemy attack's authored cooldown (lower comes back sooner). */
  pace: number;
  /** Percent of each food pickup's authored Health restored. */
  recovery: number;
  /** An enemy that blocked a hit answers at once instead of holding its guard. */
  riposte: boolean;
}

export interface ArenaEnemyDef {
  kit: string;
  /** Pixels. */
  x: number;
  z: number;
  minDifficulty: number;
  coop: boolean;
}

export interface ArenaDef {
  id: string;
  name: string;
  area: string;
  backdrop: 'layers' | 'plate';
  /** Pixels. */
  width: number;
  heroX: number;
  minDifficulty: number;
  layout: string;
  weaponSpot: { x: number; z: number } | null;
  devices: readonly { kind: string; x: number; z: number; count: number }[];
  surge: { z0: number; z1: number; warn: number; active: number; damage: number } | null;
  waves: readonly { next: number; enemies: readonly ArenaEnemyDef[] }[];
  substitutions: readonly { from: string; to: string; minDifficulty: number; count: number }[];
  /** M9: a stage beat's arena (a camera lock or the quiet time between locks), not a Lab arena. */
  stage: boolean;
}

// --- M9 stage journey --------------------------------------------------------------------

/** A food pickup: Health it restores and the PROP-FOOD cell it is drawn with. */
export interface PickupDef {
  x: number;
  z: number;
  heal: number;
  look: number;
}

/** A camera lock: starts when the heroes' centre reaches `at`; holds the view at `view`. */
export interface LockDef {
  at: number;
  view: number;
  /** Arena (ARENAS index) that holds this lock's waves, devices and surge. */
  arena: number;
}

export interface BeatDef {
  id: string;
  name: string;
  area: string;
  backdrop: 'layers' | 'plate';
  width: number;
  heroX: number;
  layout: string;
  /** A checkpoint is taken when this beat begins. */
  checkpoint: boolean;
  objective: string;
  /** Arena (ARENAS index) of the beat between camera locks (no waves). */
  base: number;
  locks: readonly LockDef[];
  pickups: readonly PickupDef[];
  /** Coerced workers to free; look 0 = worker A, 1 = worker B. */
  workers: readonly { x: number; z: number; look: number }[];
  pen: { x: number; z: number } | null;
  /** The recovery cache: opens when every worker of the beat is safe. */
  cache: { x: number; z: number; pickups: readonly PickupDef[] } | null;
  clue: { x: number; z: number; text: string } | null;
  evidence: { x: number; z: number; text: string } | null;
  /** Beats that may follow (indices); two are a branch chosen by the exit lane; none ends. */
  next: readonly number[];
}

export interface StageRules {
  reviveFrames: number;
  revivePercent: number;
  rejoinPercent: number;
  continuePercent: number;
  reachX: number;
  reachZ: number;
  workerFrames: number;
  clueFrames: number;
  evidenceFrames: number;
  pickupReachX: number;
  pickupReachZ: number;
  defeatHold: number;
  transition: number;
  exitMargin: number;
}

/** A stage definition file (packages/data/stages): Stage 2 is a second file. */
export interface StageDef {
  id: string;
  name: string;
  /** Continues per difficulty index (easy … ultimate). */
  continues: readonly number[];
  rules: StageRules;
  /** Locked hero roster (hero ids); empty: every hero. */
  roster: readonly string[];
  /** Guest heroes who may also play this stage (hero ids). */
  guests: readonly string[];
  /** Medium clear-time thresholds in seconds for the Time grade (S, A, B). */
  timePar: readonly number[];
  /** M11: the data-defined 100-point grade. */
  grade: StageGradeDef;
  /** M11: the run score table. */
  score: StageScoreDef;
  beats: readonly BeatDef[];
}

export interface GradeCategoryDef {
  id: string;
  measure: 'workers' | 'clues' | 'continues' | 'time';
  weight: number;
  /** continues: points reach zero at this many continues used. */
  allowance: number;
}

export interface StageGradeDef {
  categories: readonly GradeCategoryDef[];
  /** Rank thresholds on the 100-point total: S, A, B (below B is C). */
  ranks: readonly number[];
  /** A category below `below` percent of its weight caps the rank at `rank`. */
  caps: readonly { category: string; below: number; rank: string }[];
}

export interface StageScoreDef {
  surrendered: number;
  defeated: number;
  fled: number;
  worker: number;
  clue: number;
  evidence: number;
  comboHit: number;
  timeBonus: number;
  continuePenalty: number;
  /** Percent per difficulty index. */
  difficulty: readonly number[];
}

// --- M8 same-device co-op ----------------------------------------------------------------

/** Target states a handoff or team finisher asks for. Numbers are encoded; never renumber. */
export const TargetState = { None: 0, Airborne: 1, Stagger: 2, Down: 3 } as const;

/** One handoff state: sender tag, the target state it needs, its window and receiver tags. */
export interface HandoffDef {
  tag: string;
  state: number;
  window: number;
  receivers: readonly string[];
}

/** An authored team finisher (Invite and Confirm with Equal Meter Contribution). */
export interface TeamFinisherDef {
  id: string;
  name: string;
  /** Hero tags of the supported pair (either order). */
  pair: readonly string[];
  /** TargetState codes the target may be in. */
  targets: readonly number[];
  /** Team-move action id each participant's kit provides. */
  move: string;
  rangeX: number;
  rangeZ: number;
  /** Authored reposition: distance of each hero from the target (fixed point). */
  place: number;
  /** Attack-meter percent each hero spends. */
  cost: number;
  /** Confirmation window (frames). */
  confirm: number;
  /** Damage-scale floor of the finisher (percent). */
  minScale: number;
}

/** A tagged co-op action: restraint release, partner interrupt or grab assist. */
export interface CoopActionDef {
  id: string;
  kind: 'release' | 'interrupt' | 'assist';
  /** Interrupt: the enemy grab tag a partner's strike breaks. Assist: the action tag. */
  tag: string;
  reachX: number;
  reachZ: number;
  recovery: number;
}

export interface CoopDef {
  preBuffer: number;
  handoffs: readonly HandoffDef[];
  finishers: readonly TeamFinisherDef[];
  actions: readonly CoopActionDef[];
}

// --- M11 progression (generated from packages/data/progression/progression.yaml) ---------

export type StoreGroup = 'wardrobe' | 'training' | 'technique' | 'collection';
export type StoreKind = 'special' | 'ultimate' | 'outfit' | 'badge';

export interface StoreItemDef {
  /** Stable content ID, e.g. `store.technique.mountain.skybreak-column`. */
  id: string;
  group: StoreGroup;
  hero: string | null;
  kind: StoreKind;
  /** Technique: the catalogue action id. */
  action: string | null;
  /** Outfit or badge: its English name (localized by key). */
  name: string | null;
  /** Outfit placeholder treatment: the colour the sprite is tinted with. */
  tint: string | null;
  price: number;
  band: 'low' | 'medium' | 'high';
  /** Content ID whose first clear reveals the entry (null: visible from first launch). */
  reveal: string | null;
  /** Achievement needed before the entry can be bought (null: none). */
  requires: string | null;
  /** Hero Mastery level that grants a technique without Credits (0: no such path). */
  mastery: number;
}

export type AchievementGroup =
  | 'story'
  | 'stageMastery'
  | 'heroMastery'
  | 'combatTechnique'
  | 'discovery'
  | 'coop'
  | 'academy'
  | 'difficulty';

export interface AchievementDef {
  id: string;
  group: AchievementGroup;
  name: string;
  credits: number;
  /** Tests story occurrence only: allowed in Cheat-Assisted runs (without Credits). */
  narrative: boolean;
  rule: {
    kind: 'clear' | 'heroes' | 'stat' | 'academy';
    content: string | null;
    rank: string | null;
    difficulty: string | null;
    count: number;
    stat: 'bestHits' | 'revives' | 'allClues' | null;
    min: number;
    coop: boolean;
    state: 'certified' | 'mastered' | null;
  };
}

export type LessonGoal =
  'walk' | 'jump' | 'dash' | 'recipe' | 'guard' | 'exact' | 'counter' | 'special' | 'ultimate';

export interface LessonPhaseDef {
  goals: readonly LessonGoal[];
  count: number;
  /** Time limit in frames (0: none). */
  frames: number;
}

export interface LessonDef {
  id: string;
  course: string;
  name: string;
  /** Recipe the Demonstration plays through the hero (null: a described demonstration). */
  demo: string | null;
  recipe: string | null;
  /** The training enemy attacks (defense lessons). */
  trainer: boolean;
  /** Attack meter the lesson starts with, in percent. */
  meter: number;
  guided: readonly LessonGoal[];
  trial: LessonPhaseDef;
  mastery: LessonPhaseDef;
}

export interface AcademyRouteDef {
  id: string;
  name: string;
  lessons: readonly LessonDef[];
}

export interface ProgressionDef {
  bands: { low: number; medium: number; high: number };
  payout: {
    completion: number;
    difficulty: readonly number[];
    rank: Record<'C' | 'B' | 'A' | 'S', number>;
    once: { firstClear: number; firstRank: Record<'B' | 'A' | 'S', number>; allClues: number };
    academy: { certified: number; mastered: number };
    masteryLevel: number;
  };
  mastery: { clear: number; perRank: number; perLevel: number; maxLevel: number };
  store: readonly StoreItemDef[];
  achievements: readonly AchievementDef[];
  academy: readonly AcademyRouteDef[];
}
