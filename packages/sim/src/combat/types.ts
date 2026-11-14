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
  /** M16: only after a whiff punish (the hit caught the target in an attack's recovery). */
  onPunish: boolean;
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
   * M16 Contact-Confirmed Conversion: action index started after this action's active
   * frames when its first confirmed hit found an eligible target; `large` (or -1) for a
   * `large` enemy outside a vulnerable state; `unarmed` needs empty-handed targets.
   */
  convert: { to: number; large: number; unarmed: boolean } | null;
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
  /** M21 Move Preview showcases (heroes only; enemy kits have none). */
  showcases?: readonly ShowcaseDef[];
  /** M19 enemy kits: the art key its sheets use (a variant shares its base kit's art). */
  art?: string;
}

/** One step of a showcase route: which player slot acts and the accepted actions. */
export interface ShowcaseStep {
  /** 0 the hero, 1 the demonstration partner. */
  slot: number;
  /** A jump chase (pressed, never matched against hits). */
  jump: boolean;
  /** Team Attack: an invitation (the partner's team step confirms it). */
  team: boolean;
  /** Action indices (into that slot's kit) accepted for this step. */
  any: readonly number[];
}

/** M21 Move Preview showcase (roadmap decision 4): an authored freestyle route. */
export interface ShowcaseDef {
  id: string;
  name: string;
  /** Attack meter both heroes start with, in percent. */
  meter: number;
  /** The demonstration partner's hero id (null: solo). */
  partner: string | null;
  steps: readonly ShowcaseStep[];
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
  /** M18 firearms: Defense a hero pays for each shot (0 = none). */
  fire: { defenseCost: number };
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
  /** M16: the link needs a whiff punish (a hit on an attack's recovery). */
  NeedsPunish: 19,
  /** M18: not enough Defense for a firearm's shot. */
  NoDefense: 20,
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
  [Reject.NeedsPunish]: 'needs a whiff punish',
  [Reject.NoDefense]: 'not enough Defense to fire',
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
  /** M19: never from closer than this (fixed point; point-blank shots), 0 = no limit. */
  minRange: number;
  /** M19: 0 always, 1 only while holding a weapon, 2 only with empty hands. */
  when: number;
}

/** M19 Jackal Signalman calls. Numbers are encoded; never renumber. */
export const CallKind = { None: 0, Crossfang: 1, Guard: 2, Replace: 3 } as const;

/** M19: a visible, interruptible command (the Signalman's calls). */
export interface CommandDef {
  kind: number;
  /** The call action in the kit (its startup is the raised-arm telegraph). */
  action: string;
  threat: number;
  cooldown: number;
  minDifficulty: number;
  /** Frames the authorised formation lasts once the call is confirmed. */
  frames: number;
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
  // --- M19 Marek -----------------------------------------------------------------------
  /** A weapon put into the boss's hands as the phase starts ('' = none). */
  armed: string;
  /** The phase also ends once the boss no longer holds a loaded `armed` weapon. */
  untilDisarmed: boolean;
  /** Command action that brings the phase's supports once ('' = they arrive at the start). */
  summon: string;
  /** Low-Health objective behaviour (Scorched Claim), or null. */
  scorch: { below: number; action: string; look: number; cooldown: number } | null;
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
  /** M19: a Resolve break at or below this Health percent is a clean surrender (0 = off). */
  surrender: number;
  /** M19: capture presentation (both routes) instead of the Stage 1 kneel. */
  capture: boolean;
}

/** An enemy kit's AI: tactical role, movement, defense profile, morale and boss data. */
export interface EnemyProfile {
  role:
    | 'pressure'
    | 'defender'
    | 'flanker'
    | 'grappler'
    | 'ranged'
    | 'elite'
    | 'boss'
    | 'objective'
    | 'commander';
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
  // --- M19 Stage 2 roles -------------------------------------------------------------
  /** May pick up firearms and the grenade (M7 kits: yes; Stage 2 roles: no). */
  firearms: boolean;
  /** Morale breaks at this Health percent once isolated, disarmed or shaken (0 = breakAt). */
  shaken: number;
  /** Spawns holding this weapon with this many rounds per difficulty (Revolver Marauder). */
  armed: { weapon: string; ammo: readonly number[] } | null;
  /** Systems Saboteur: Control Breach threat and the frames between attempts. */
  objective: { threat: number; cooldown: number } | null;
  /** Lockstep Escort: threat reserved while escorting and the escort range (fixed point). */
  escort: { threat: number; range: number } | null;
  /** Jackal Signalman calls. */
  commands: readonly CommandDef[];
  /** 'dismount': arrives knocked down with protected recovery (a Road Rider on foot). */
  entry: 'walk' | 'dismount';
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
  /** M19: firearm aims (warned lines) that may be active together [solo, co-op]. */
  aims: readonly [number, number];
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
  /** M19: the finite reserve the Signalman's Replace the Line draws from (kit ids). */
  reserve: readonly string[];
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
  /** M20: a mounted pursuit beat (CORRIDORS id), or ''. */
  corridor: string;
  /** M20: a greenhouse room beat (ROOMS id), or ''. */
  room: string;
  /** M20: the route segment (1–4; 0 = none). */
  segment: number;
  /** M20: an optional branch beat: its goal and Museum artifact (null = on the spine). */
  branch: BranchDef | null;
}

/** M20: an optional branch: what completes it and the artifact it is remembered by. */
export interface BranchDef {
  id: string;
  name: string;
  artifact: string;
  artifactName: string;
  /** Every worker of the beat must be freed. */
  workers: boolean;
  /** The beat's clue (a record) must be found. */
  clue: boolean;
  /** These room assets (authored names) must end at `keep` or better. */
  assets: readonly string[];
  /** Worst allowed asset state (AssetState): 1 damaged, 2 critical. */
  keep: number;
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
  /**
   * M20 layered epilogue: cards shown before the results, in order. `by` picks a card's
   * variants from the run: '' always the same card, capture (resolve or forced),
   * categories (one insert per Ledger category recorded, by its condition), branches (one
   * per completed branch), preservation (by the stage's Preservation grade).
   */
  epilogue: readonly EpilogueCardDef[];
}

export interface EpilogueCardDef {
  id: string;
  by: '' | 'capture' | 'categories' | 'branches' | 'preservation';
}

export interface GradeCategoryDef {
  id: string;
  measure: 'workers' | 'clues' | 'continues' | 'time' | 'preservation' | 'response';
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
  /** M20 (0 when absent): a completed branch, the capture routes, per Preservation percent. */
  branch: number;
  resolve: number;
  forced: number;
  preservation: number;
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
  /** M16 authored pair route (Reciprocal Handoffs): sender and partner hero tags. */
  route: { id: string; name: string; pair: readonly string[] } | null;
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
  /** M16: a resisting boss may be the target (coordinated strikes as Resolve pressure). */
  bossStrike: boolean;
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
  /** M21: campaign stage id whose opening reveals the entry (null: none). */
  revealStage?: string | null;
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
    kind:
      | 'clear'
      | 'heroes'
      | 'stat'
      | 'academy'
      | 'preservation'
      | 'response'
      | 'stats'
      | 'capture'
      | 'branch'
      | 'branches';
    content: string | null;
    rank: string | null;
    difficulty: string | null;
    count: number;
    stat: RunStatName | null;
    min: number;
    coop: boolean;
    state: 'certified' | 'mastered' | null;
    /** M21: run counters that must all be within their bounds (kind stats). */
    all?: readonly { stat: RunStatName; min: number | null; max: number | null }[];
    /** M21: Preservation grade id (kind preservation). */
    grade?: string | null;
    /** M21: most mounted rewinds allowed (kind response). */
    rewinds?: number | null;
    /** M21 capture: route, how the gun was lost, least rounds then, Scorched Claim allowed. */
    route?: 'surrender' | 'forced' | null;
    gun?: 'disarmed' | 'broken' | 'emptied' | null;
    rounds?: number;
    scorch?: boolean;
    /** M21: branch id (kind branch). */
    branch?: string | null;
  };
}

/** Run counters an achievement may name (M11 and M21; `callsUnbroken` is derived). */
export type RunStatName =
  | 'bestHits'
  | 'revives'
  | 'allClues'
  | 'reciprocal'
  | 'accord'
  | 'calls'
  | 'callsBroken'
  | 'callsUnbroken'
  | 'breachesStopped'
  | 'breachesDone'
  | 'grenadeDamage';

export type LessonGoal =
  | 'walk'
  | 'jump'
  | 'dash'
  | 'recipe'
  | 'guard'
  | 'exact'
  | 'counter'
  | 'special'
  | 'ultimate'
  // M21 drill goals, read from the drill room's own records.
  | 'reciprocal'
  | 'teamFinisher'
  | 'pursuitControl'
  | 'pursuitSave'
  | 'firearmShot'
  | 'grenadeReturn'
  | 'disarm'
  | 'repair'
  | 'containerOpen'
  | 'callBreak'
  | 'breachStop';

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
  /** M21: the lesson's fixed hero (null: the hero chosen in the Academy). */
  hero?: string | null;
  /** M21 drill: a test room, corridor, or pair showcase with its partner (null: the yard). */
  drill?: { room: string | null; corridor: string | null; showcase: string | null } | null;
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
  /** M21 campaign layer: stages in Story Mode order. */
  campaign: readonly CampaignStageDef[];
  /** M21 Village Museum and Archive. */
  museum: readonly MuseumEntryDef[];
  dossier: readonly DossierEntryDef[];
  research: {
    milestones: readonly { id: string; stage: string | null }[];
    inputs: readonly { id: string; milestone: string; stage: string; unlock: UnlockDef }[];
  };
}

/** M21 unlock rule: always, start, complete, open, or branch (with its id). */
export interface UnlockDef {
  kind: 'always' | 'start' | 'complete' | 'open' | 'branch' | string;
  branch: string | null;
}

export interface CampaignStageDef {
  /** Stage file id (`stage2`). */
  id: string;
  /** Story content ID (`story.stage2.prosperity-under-siege`). */
  content: string;
  /** The stage that must be completed once first (null: open from the start). */
  opens: string | null;
  /** What's New briefing cards shown before the first run (text keys). */
  whatsNew: readonly string[];
  /**
   * The title screen this stage brings once it has been completed at least once (any
   * difficulty, Cheat-Assisted included): the village loop clip, its still and the menu
   * picture. The village shows the one of the latest completed stage, else the first stage's.
   */
  titleScreen: { clip: string; still: string; menuBg: string };
}

export interface MuseumEntryDef {
  id: string;
  section: 'picture' | 'cinema' | 'music' | 'sound' | 'collection' | string;
  stage: string;
  /** Shell art key, cinematic id, `cue:state`, sound id or artifact id. */
  asset: string;
  unlock: UnlockDef;
}

export interface DossierEntryDef {
  id: string;
  kind: 'fact' | 'theory' | string;
  stage: string;
  unlock: UnlockDef;
}

// --- M17 mounted system ------------------------------------------------------------------

/** Mounted action slots (shared by every hero). Numbers are data codes; never renumber. */
export const MountedSlot = {
  Neutral: 0,
  Directional: 1,
  Hop: 2,
  Lean: 3,
  Special: 4,
  Ultimate: 5,
} as const;

/** Where a mounted Special moves before its strike. */
export const Seek = { None: 0, Threat: 1, Partner: 2, Ahead: 3 } as const;

/** One hero's mounted action (fixed point for distances and speeds, frames at 60 Hz). */
export interface MountedActionDef {
  id: string;
  name: string;
  slot: number;
  startup: number;
  active: number;
  recovery: number;
  /** Alongside box (neutral, Special): |dx| ≤ reachX, |dz| ≤ reachZ. */
  reachX: number;
  reachZ: number;
  /** Directional kick: the neighbouring lane from `near` to `far` across the road. */
  near: number;
  far: number;
  damage: number;
  stability: number;
  /** Attack Bar gain on a hit (meter units). */
  meter: number;
  /** Steering penalty after a whiff (frames). */
  miss: number;
  /** Evasion window (action frames, inclusive; to < from = none). */
  evadeFrom: number;
  evadeTo: number;
  /** Lean: Stability restored when the window evades an attack. */
  restore: number;
  seek: number;
  /** Frames of partner protection (Escort, Ultimates). */
  guard: number;
  /** Forward speed added during the action. */
  boost: number;
  /** Ultimate: reach along the road. */
  radius: number;
}

export interface BikeDef {
  id: string;
  name: string;
  plates: string[];
  base: number;
  min: number;
  max: number;
  accel: number;
  brake: number;
  steer: number;
  laneDrift: number;
  assistDrift: number;
  stability: number;
  recover: { delay: number; every: number; amount: number };
  wobble: number;
  impact: { barrier: number; gate: number; push: number };
  crash: number;
  protect: number;
  rescue: { window: number; x: number; z: number; restore: number };
  tether: { soft: number; hard: number; slow: number; assist: number };
  hop: {
    frames: number;
    height: number;
    rampFrames: number;
    rampHeight: number;
    shift: number;
    shiftFrames: number;
  };
}

/** Road Rider action kinds. Numbers are data codes; never renumber. */
export const RiderKind = { Check: 0, Boot: 1, Cutoff: 2, Fade: 3, Brace: 4, Breakaway: 5 } as const;

export interface RiderActionDef {
  id: string;
  name: string;
  kind: number;
  windup: number;
  active: number;
  recovery: number;
  reachX: number;
  reachZ: number;
  damage: number;
  stability: number;
}

export interface RoadRiderDef {
  id: string;
  name: string;
  health: number;
  stability: number;
  recover: { delay: number; every: number; amount: number };
  warn: number;
  catchUp: number;
  steer: number;
  settle: number;
  crash: number;
  braceShare: number;
  breakaway: number;
  actions: RiderActionDef[];
}

export interface MountedDifficultyDef {
  /** Road Rider Stability in percent of the base value. */
  riderStability: number;
  /** Road Rider damage (Health and Stability) in percent. */
  damage: number;
  /** Extra telegraph frames (Easy). */
  windup: number;
  /** Committed mounted attacks at a time (never two on one hero). */
  committed: number;
  /** Every n-th hit on an approaching rider is braced (0 = never). */
  brace: number;
}

/** Obstacle kinds. Numbers are data codes; never renumber. */
export const ObstacleKind = { Barrier: 0, Gate: 1, Ramp: 2 } as const;

export interface CorridorDef {
  id: string;
  name: string;
  goal: string;
  start: number;
  finish: number;
  length: number;
  road: { at: number; top: number; bottom: number }[];
  obstacles: { at: number; z: number; kind: number; hw: number; hd: number }[];
  equipment: { id: string; name: string; at: number; side: number }[];
  checkpoints: number[];
  /** M19 Marek's mounted intercept: where he rides in, his Stability percent, his lane. */
  boss: { at: number; stability: number; lane: number } | null;
  waves: {
    at: number;
    /** Lowest difficulty index that has this wave. */
    min: number;
    /** Equipment index the wave's rider goes for (-1 = the heroes). */
    target: number;
    riders: { from: number; lane: number }[];
  }[];
}

export interface MountedDef {
  bike: BikeDef;
  rider: RoadRiderDef;
  /** Easy … Ultimate. */
  difficulty: MountedDifficultyDef[];
  /** Six actions per roster hero, in slot order (HERO_DATA order). */
  heroes: MountedActionDef[][];
  corridors: CorridorDef[];
}

// --- M18 greenhouse: Layered Pantry, containers, Preservation Ledger, grenade -------------

/** A Layered Pantry recovery item (Stage 2 spec §10). Defense out of 100, meter of 1000. */
export interface PantryDef {
  id: string;
  name: string;
  health: number;
  defense: number;
  meter: number;
  rare: boolean;
}

/** An ownership-aware container kind. Sizes are fixed point half widths and height. */
export interface ContainerKindDef {
  id: string;
  name: string;
  /** Hostile or damaged property: opened by strikes. Otherwise protected: Interact only. */
  hostile: boolean;
  /** Protected: frames of the opening. */
  open: number;
  /** Hostile: integrity strikes must empty. */
  integrity: number;
  hw: number;
  hd: number;
  h: number;
}

/** Ledger categories. Numbers are encoded; never renumber. */
export const LedgerCategory = {
  Workers: 0,
  Aquatic: 1,
  Crops: 2,
  Systems: 3,
  Supplies: 4,
} as const;

/** A Preservation Ledger asset kind (spec §6). Conditions are plain integers. */
export interface LedgerKindDef {
  id: string;
  name: string;
  category: number;
  condition: number;
  damaged: number;
  critical: number;
  weight: number;
  /** Essential systems stop at Safe fallback (repairable) instead of being Lost. */
  essential: boolean;
  /** Loses condition while no pump runs. */
  aquatic: boolean;
  /** A pump: aquatic assets drain while every pump is Critical or worse. */
  circulation: boolean;
  repairEvery: number;
  repairAmount: number;
  hw: number;
  hd: number;
  h: number;
  /** M19: a room control a Systems Saboteur may breach. */
  control: boolean;
}

export interface GreenhouseRoomDef {
  id: string;
  name: string;
  width: number;
  /** ARENAS index of the room's waves (hidden arena), or -1. */
  arena: number;
  assets: readonly { id: string; kind: number; x: number; z: number }[];
  containers: readonly {
    kind: number;
    x: number;
    z: number;
    /** Pantry index, or a weapon id (item -1). */
    contents: readonly { item: number; weapon: string }[];
  }[];
  pantry: readonly { item: number; x: number; z: number }[];
  shutter: { x: number; z: number; asset: number } | null;
  rack: {
    x: number;
    z: number;
    asset: number;
    loose: number;
    topple: number;
    fragment: string;
    fallW: number;
    fallD: number;
    fallDamage: number;
    seedlings: number;
    right: number;
  } | null;
  jet: {
    x: number;
    z: number;
    lanes: readonly { x0: number; x1: number; z0: number; z1: number }[];
    warn: number;
    active: number;
    cooldown: number;
    damage: number;
    push: number;
    restore: number;
  } | null;
  redirect: {
    x: number;
    z: number;
    solo: number;
    coop: number;
    restore: number;
    cooldown: number;
  } | null;
  restraint: {
    x: number;
    z: number;
    zx: number;
    zz: number;
    hw: number;
    hd: number;
    frames: number;
    large: number;
    cooldown: number;
  } | null;
  grenadier: { x: number; z: number } | null;
  /** M19: the room's one grenade belongs to its first Systems Saboteur. */
  saboteurGrenade: boolean;
  /** M19: the optional asset Marek's Scorched Claim goes for (asset index, -1 = none). */
  scorch: number;
  /** M19: story NPCs standing in the room (Tomas Rell). */
  npcs: readonly { id: string; x: number; z: number }[];
}

export interface GreenhouseDef {
  pantry: readonly PantryDef[];
  pantryReach: { x: number; z: number };
  containers: readonly ContainerKindDef[];
  ledger: readonly LedgerKindDef[];
  rules: {
    strike: number;
    impact: number;
    maxHit: number;
    guard: number;
    drain: { every: number; floor: number };
    stable: number;
    reach: { x: number; z: number };
  };
  /** Grade bands, highest first; the last band starts at 0. */
  grades: readonly { id: string; name: string; min: number }[];
  grenade: {
    weapon: string;
    remove: number;
    arm: number;
    aim: number;
    fuse: number;
    radius: number;
    damage: number;
    push: number;
    lift: number;
    integrity: number;
    ledger: number;
    every: number;
  };
  rooms: readonly GreenhouseRoomDef[];
}
