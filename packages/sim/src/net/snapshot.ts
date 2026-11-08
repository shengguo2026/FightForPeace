import { CHEATS, CHEAT_REGISTRY_VERSION } from '../cheats/cheats';
import {
  ARENA_DATA,
  COOP_DATA,
  DIFFICULTY_DATA,
  ENEMY_DATA,
  ENEMY_PROFILES,
  HERO_DATA,
  MOUNTED_DATA,
  STAGE_DATA,
  WEAPON_DATA,
} from '../combat/heroes.gen';
import { RULES_VERSION } from '../replay';
import { xxh32 } from '../state/hash';
import type { World } from '../world/types';
import { STATE_FORMAT, hashWorld } from '../world/world';

/**
 * M12 LAN co-op: a full world snapshot for resynchronisation (and, in M15, for rollback
 * and rejoin). The world is plain data (numbers, strings, booleans, arrays and objects),
 * so its JSON text is a complete copy; the snapshot carries the state format, the rules
 * version and the world hash, and restoring checks all three.
 */
export interface WorldSnapshot {
  format: number;
  rules: string;
  frame: number;
  hash: number;
  world: string;
}

export function snapshotWorld(world: World): WorldSnapshot {
  return {
    format: STATE_FORMAT,
    rules: RULES_VERSION,
    frame: world.frame,
    hash: hashWorld(world),
    world: JSON.stringify(world),
  };
}

/** Rebuilds the world of a snapshot; throws when it is from other rules or damaged. */
export function restoreWorld(s: WorldSnapshot): World {
  if (s.format !== STATE_FORMAT || s.rules !== RULES_VERSION)
    throw new Error(`snapshot of state format ${s.format}/${s.rules} is not supported`);
  const world = JSON.parse(s.world) as World;
  if (world.frame !== s.frame || hashWorld(world) !== s.hash)
    throw new Error('snapshot does not match its hash');
  return world;
}

/** xxHash of a value's JSON text (UTF-16 code units, two bytes each). */
function hashOf(value: unknown): number {
  const s = JSON.stringify(value);
  const bytes = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    bytes[2 * i] = c & 0xff;
    bytes[2 * i + 1] = c >>> 8;
  }
  return xxh32(bytes);
}

let rules: number | null = null;
/**
 * The deterministic-rules hash peers compare before readiness: the rules version, the
 * state format and every generated gameplay table (heroes, enemies, weapons, difficulty,
 * arenas, co-op and stages). Any data change that could alter a result changes it.
 */
export function rulesHash(): number {
  rules ??= hashOf([
    RULES_VERSION,
    STATE_FORMAT,
    HERO_DATA,
    ENEMY_DATA,
    ENEMY_PROFILES,
    WEAPON_DATA,
    DIFFICULTY_DATA,
    ARENA_DATA,
    COOP_DATA,
    STAGE_DATA,
    MOUNTED_DATA,
  ]);
  return rules;
}

/** The Elder's Secrets registry hash (codes, scopes and bits). */
export function cheatRegistryHash(): number {
  return hashOf([CHEAT_REGISTRY_VERSION, CHEATS.map((c) => [c.code, c.scope, c.bit])]);
}
