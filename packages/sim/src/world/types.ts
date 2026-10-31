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
}
