import {
  BODY_HALF_D,
  BODY_HALF_W,
  ENEMY_YIELD_QUARTERS,
  PIN_FRAMES,
  SOFT_PUSH,
} from '../movement/profile';
import { type Fighter, MoveState, type World } from '../world/types';

const FULL_W = 2 * BODY_HALF_W;
const FULL_D = 2 * BODY_HALF_D;

/** Position of every fighter before this frame's movement, keyed by id. */
export type PositionLog = Map<number, { x: number; z: number }>;

/**
 * Floor-plane collision for all grounded fighters, in ascending id order so the result
 * never depends on array order.
 * - Allies (and enemies among themselves) are soft: they separate by at most SOFT_PUSH per
 *   frame each, so walking or dashing through is always possible.
 * - Heroes and enemies are solid: the overlap is removed along the shallower axis, which
 *   makes a hero slide along an enemy; the enemy takes a quarter of the push, so crowds
 *   can be shoved and never form a fixed wall.
 * - Anti-trap: a hero who keeps trying to move but is held by enemies for PIN_FRAMES
 *   frames may pass through enemies until no enemy overlaps any more.
 */
export function collide(world: World, before: PositionLog): void {
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  const touchingEnemy = new Set<number>();
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      resolvePair(bodies[i]!, bodies[j]!, touchingEnemy);
    }
  }
  const { bounds } = world;
  for (const f of bodies) {
    f.x = clamp(f.x, bounds.minX, bounds.maxX);
    f.z = clamp(f.z, bounds.minZ, bounds.maxZ);
  }
  for (const f of bodies) {
    if (f.team !== 'hero') continue;
    updatePin(f, before.get(f.id), touchingEnemy.has(f.id));
  }
}

function resolvePair(a: Fighter, b: Fighter, touchingEnemy: Set<number>): void {
  if (a.y > 0 || b.y > 0) return; // airborne fighters pass over
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const px = FULL_W - Math.abs(dx);
  const pz = FULL_D - Math.abs(dz);
  if (px <= 0 || pz <= 0) return;
  // Separate along the axis with the smaller overlap relative to the footprint size.
  const alongX = px * BODY_HALF_D <= pz * BODY_HALF_W;
  const pen = alongX ? px : pz;
  const d = alongX ? dx : dz;
  const s = d > 0 ? 1 : d < 0 ? -1 : 1; // equal positions: lower id goes back
  if (a.team === b.team) {
    const push = Math.min(Math.ceil(pen / 2), SOFT_PUSH);
    move(a, alongX, -s * push);
    move(b, alongX, s * push);
    return;
  }
  const hero = a.team === 'hero' ? a : b;
  touchingEnemy.add(hero.id);
  if (hero.passEnemies) return;
  const enemyShare = Math.trunc((pen * ENEMY_YIELD_QUARTERS) / 4);
  const heroShare = pen - enemyShare;
  const heroSign = hero === a ? -s : s;
  const enemy = hero === a ? b : a;
  move(hero, alongX, heroSign * heroShare);
  move(enemy, alongX, -heroSign * enemyShare);
}

function move(f: Fighter, alongX: boolean, amount: number): void {
  if (alongX) f.x += amount;
  else f.z += amount;
}

function updatePin(
  f: Fighter,
  start: { x: number; z: number } | undefined,
  touching: boolean,
): void {
  if (!touching) {
    f.pinFrames = 0;
    f.passEnemies = false;
    return;
  }
  const trying =
    (f.state === MoveState.Walk || f.state === MoveState.Dash) && (f.vx !== 0 || f.vz !== 0);
  if (!trying || !start) {
    f.pinFrames = 0;
    return;
  }
  const intended = Math.abs(f.vx) + Math.abs(f.vz);
  const actual = Math.abs(f.x - start.x) + Math.abs(f.z - start.z);
  f.pinFrames = actual * 4 < intended ? f.pinFrames + 1 : 0;
  if (f.pinFrames >= PIN_FRAMES) f.passEnemies = true;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
