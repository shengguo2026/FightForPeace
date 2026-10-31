import { ActionBit } from '../input/bits';
import type { Fighter } from '../world/types';

/** Within one frame, the action kept when several offensive buttons arrive together. */
const PRIORITY = [
  ActionBit.LowAttack,
  ActionBit.Attack,
  ActionBit.Special,
  ActionBit.Ultimate,
  ActionBit.Jump,
];

/**
 * One-slot offensive input buffer. Every offensive press replaces the slot (the newest
 * valid input wins); a press older than `window` frames is dropped. Movement, Guard and
 * other defensive input never go through here.
 */
export function bufferPress(f: Fighter, offensive: number, frame: number, window: number): void {
  if (offensive !== 0) {
    f.bufAction = PRIORITY.find((a) => (offensive & a) !== 0) ?? 0;
    f.bufFrame = frame;
  }
  if (f.bufAction !== 0 && frame - f.bufFrame > window) {
    f.bufAction = 0;
    f.bufFrame = 0;
  }
}

/** Removes and returns the buffered action if it is still inside the window, else 0. */
export function takeBuffered(f: Fighter, frame: number, window: number): number {
  const action = f.bufAction !== 0 && frame - f.bufFrame <= window ? f.bufAction : 0;
  f.bufAction = 0;
  f.bufFrame = 0;
  return action;
}
