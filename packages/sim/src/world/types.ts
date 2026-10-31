import type { RngState } from '../math/rng';

export type Facing = 1 | -1;

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
  moveX: -1 | 0 | 1;
  /** -1 = up (towards the back of the stage), 1 = down (towards the front). */
  moveZ: -1 | 0 | 1;
  /** Bitmask of abstract actions newly pressed this frame. */
  pressed: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface World {
  frame: number;
  rng: RngState;
  bodies: Body[];
  bounds: Bounds;
}
