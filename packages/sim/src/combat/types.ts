/**
 * Shapes of the generated hero data (see packages/data). All distances and speeds are
 * fixed point (1/256 px); all times are 60 Hz frames.
 */

export type ActionCategory = 'standing' | 'aerial' | 'ground' | 'dash' | 'low';
export type InputContext = 'neutral' | 'chain' | 'air' | 'groundFocus' | 'dash' | 'dashLow';
export type ReactionKind = 'stagger' | 'knockback' | 'launch' | 'knockdown' | 'trip';
export type CancelCategory = 'chain' | 'air' | 'jumpChase' | 'dashBridge' | 'special' | 'ultimate';
export type LinkKind = 'action' | 'jump' | 'dash' | 'special' | 'ultimate';

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
  hitbox: HitboxDef;
  hurtbox: 'standing' | 'low';
  damage: number;
  reaction: ReactionDef;
  stunDecayCost: number;
  damageScaleCost: number;
  starterProration: number;
  juggleCost: number;
  meterGain: number;
  moves: readonly MoveSample[];
  /** Open tag set (opensGroundWindow, terminalKnockdown, passThrough, guardPressure, …). */
  tags: readonly string[];
  links: readonly LinkDef[];
  /** Logical asset ID of the pose. */
  pose: string;
}

export interface HeroDef {
  id: string;
  name: string;
  /** Placeholder silhouette width in pixels (presentation only). */
  bodyWidth: number;
  actions: readonly ActionDef[];
}

/** Category-tuned cancel timing (frames): early buffer before contact, window after it. */
export const CANCEL_TIMING: Record<CancelCategory, { buffer: number; window: number }> = {
  chain: { buffer: 7, window: 14 },
  air: { buffer: 6, window: 12 },
  jumpChase: { buffer: 4, window: 16 },
  dashBridge: { buffer: 6, window: 12 },
  special: { buffer: 7, window: 10 },
  ultimate: { buffer: 7, window: 12 },
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
  [Reject.NotYet]: 'arrives in M5',
  [Reject.QueueFull]: 'a valid follow-up is already queued',
};
