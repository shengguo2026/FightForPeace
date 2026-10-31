import type { FrameInput } from './world/types';
import { type WorldOptions, createWorld, hashWorld, step } from './world/world';

/** Version of the replay file layout. 2: FrameInput v2 (held, dirPressed) and world options. */
export const REPLAY_FORMAT = 2;

/**
 * Version of the gameplay rules. Bump whenever a change alters simulation results, and
 * re-record the golden replays in the same commit.
 */
export const RULES_VERSION = 'm2.1';

export interface ReplayLog {
  version: 2;
  rulesVersion: string;
  seed: number;
  /** Stage setup (dummies, facing modes, Lab switches). */
  options?: WorldOptions;
  /** frames[f][slot] = input of player `slot` on frame f; a slot appears when that player joins. */
  frames: FrameInput[][];
  /** hashWorld after the last frame. */
  expectedHash: number;
}

/** Runs a replay from a fresh world and returns the final world hash. */
export function runReplay(log: ReplayLog): number {
  if (log.version !== REPLAY_FORMAT) {
    throw new Error(
      `Replay format version ${log.version} is not supported (expected ${REPLAY_FORMAT})`,
    );
  }
  if (log.rulesVersion !== RULES_VERSION) {
    throw new Error(
      `Replay was recorded with rules version ${log.rulesVersion}, current rules version is ${RULES_VERSION}`,
    );
  }
  const world = createWorld(log.seed, log.options);
  for (const inputs of log.frames) step(world, inputs);
  return hashWorld(world);
}
