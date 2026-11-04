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
  | 'throw';
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
  | 'grabSpecial';
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
  actions: readonly ActionDef[];
  recipes: readonly RecipeDef[];
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
};
