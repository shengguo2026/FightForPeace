import type { RngState } from '../math/rng';

export type Facing = 1 | -1;
export type Axis = -1 | 0 | 1;

/** A physical body on the belt stage. All values are fixed point (1/256 px). */
export interface Body {
  id: number;
  /** Horizontal position along the stage. */
  x: number;
  /** Stage depth: smaller is further back (towards the top of the screen). */
  z: number;
  /** Height above the floor (jumps, launches). */
  y: number;
  facing: Facing;
}

/** One player's input for one simulation frame. */
export interface FrameInput {
  moveX: Axis;
  /** -1 = up (towards the back of the stage), 1 = down (towards the front). */
  moveZ: Axis;
  /** Bitmask of actions (ActionBit) newly pressed since the previous frame. */
  pressed: number;
  /** Bitmask of actions (ActionBit) held down at this frame. */
  held: number;
  /** Bitmask of directions (DirBit) newly pressed since the previous frame. */
  dirPressed: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Team = 'hero' | 'enemy';
export type FacingMode = 'manual' | 'assisted';

/** Movement states. Numbers are part of the encoded state; never renumber. */
export const MoveState = {
  Idle: 0,
  Walk: 1,
  Dash: 2,
  Air: 3,
  Attack: 4,
  /** Reaction states (targets). */
  Hitstun: 5,
  Launched: 6,
  Down: 7,
  GetUp: 8,
  /** Landing recovery after an aerial attack. */
  Landing: 9,
} as const;
export type MoveState = (typeof MoveState)[keyof typeof MoveState];

/** A hero or enemy. Extends Body with velocity, state and per-fighter input memory. */
export interface Fighter extends Body {
  team: Team;
  /** Player slot for heroes (0, 1); -1 for enemies. */
  slot: number;
  vx: number;
  vz: number;
  vy: number;
  state: MoveState;
  /** Frames spent in the current state, counting from 0 on the first frame. */
  stateFrame: number;
  /** Direction of the current dash or of the jump takeoff (each -1, 0 or 1). */
  dirX: Axis;
  dirZ: Axis;
  facingMode: FacingMode;
  /** World frame of the last unconsumed press per direction (up, down, left, right). */
  lastTap: [number, number, number, number];
  /** Buffered offensive action (one ActionBit, 0 = none) and the frame it was pressed. */
  bufAction: number;
  bufFrame: number;
  /** Action of the current attack stub (ActionBit), 0 when not attacking. */
  attackKind: number;
  /** The current attack started out of a dash (the low-attack chord only works then). */
  attackFromDash: boolean;
  /** World frame of the last Guard press, for the Dash + Attack + Guard chord. */
  lastGuardFrame: number;
  /** Assisted Facing target kept during an attack chain (0 = none). */
  targetId: number;
  /** Consecutive frames this hero tried to move but was held by enemy collision. */
  pinFrames: number;
  /** Set by the anti-trap rule: enemies are soft for this hero until they stop overlapping. */
  passEnemies: boolean;

  // --- M2 combat ---------------------------------------------------------------------
  /** Roster index of the hero definition; -1 for dummies. */
  hero: number;
  /** Index of the running action in the hero's action table; -1 for none or a stub. */
  action: number;
  /** Most recently pressed cardinal direction (DirBit), for diagonal tie-breaks. */
  lastCardinal: number;
  /** Action frame of the first contact of the running action, -1 before any contact. */
  contactAt: number;
  /** Targets this action has hit, and the damage scale locked for each of them. */
  contactIds: number[];
  contactScales: number[];
  /** Active segment index for which hitIds are recorded, and the targets hit in it. */
  hitSeg: number;
  hitIds: number[];
  /** Actions used in the current string (bit per action index). */
  chainUsed: number;
  /** An aerial starter was used during this jump. */
  airUsed: boolean;
  /** The current dash came from the premium dash bridge. */
  bridged: boolean;
  /** Enemy collision is soft during this action (passThrough tag). */
  ghost: boolean;
  /** Attack meter, 0–100 %. */
  meter: number;
  /** Queued cancel: index of the link in the running action (-1 none) and its press frame. */
  reqLink: number;
  reqFrame: number;
  /** Last cancel verdict for the Lab: destination code, Reject code, world frame. */
  verdictTo: number;
  verdictReject: number;
  verdictFrame: number;
  /** Frames the current reaction or landing recovery lasts. */
  stun: number;
  /** A launched target lands on its feet (forced separation) instead of going down. */
  airRecover: boolean;
  /** Health (dummies: 1000). */
  health: number;
  maxHealth: number;
  /** Combo context owned by this fighter as a defender. */
  ctx: ComboContext;
}

/** Ground-route tag recorded by the last knockdown (shown in the Lab; used from M3). */
export const GroundTag = { None: 0, Opens: 1, Terminal: 2 } as const;

/**
 * Target-owned combo context. Opens on the first confirmed hit, closes when the target
 * is actionable again. Shared by every attacker hitting this target.
 */
export interface ComboContext {
  open: boolean;
  /** Offensive actions that connected (the opener is action 1). */
  actions: number;
  /** Individual hits (multi-hit moves count each hit). */
  hits: number;
  damage: number;
  /** Damage scale in percent for the next action. */
  scale: number;
  stunBudget: number;
  /** Stored for M3; not enforced in M2. */
  juggleBudget: number;
  /** Attack meter that can still be earned from this combo. */
  meterBudget: number;
  bridgeUsed: boolean;
  exhausted: boolean;
  groundTag: number;
  /** Damage dealt by the most recent hit, for the hit pop-up. */
  lastDamage: number;
}

export interface DummySettings {
  /** Treat every hit as a counter-hit (dummies do not attack yet). */
  counterHit: boolean;
  /** Restore full health whenever a combo context closes. */
  refill: boolean;
}

export interface World {
  frame: number;
  rng: RngState;
  bodies: Fighter[];
  bounds: Bounds;
  /** Lab switch: dummies walk towards the nearest hero. */
  dummiesChase: boolean;
  /** Facing mode chosen by each player slot (applies to the hero when it spawns). */
  playerFacing: FacingMode[];
  /** Roster index chosen by each player slot. */
  playerHero: number[];
  dummy: DummySettings;
  /** Lab switch: premium cancels cost nothing and the meter shows full. */
  infiniteMeter: boolean;
}
