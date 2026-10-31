import type { FrameInput } from './world/types';
import { createWorld, hashWorld, step } from './world/world';

/** Version of the replay file layout. */
export const REPLAY_FORMAT = 1;

/**
 * Version of the gameplay rules. Bump whenever a change alters simulation results, and
 * re-record the golden replays in the same commit.
 */
export const RULES_VERSION = 'm0.1';

export interface ReplayLog {
  version: 1;
  rulesVersion: string;
  seed: number;
  /** frames[f][slot] = input of player `slot` on frame f. */
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
  const world = createWorld(log.seed);
  for (const inputs of log.frames) step(world, inputs);
  return hashWorld(world);
}
