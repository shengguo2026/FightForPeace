import { fx } from '../math/fixed';
import {
  BODY_HALF_D,
  BODY_HALF_W,
  DUMMY_SPEED_X,
  DUMMY_SPEED_Z,
  ON_FOOT,
} from '../movement/profile';
import { directed } from '../movement/controller';
import { type Axis, type Fighter, type FrameInput, MoveState, type World } from '../world/types';
import { applyActionMovement, startAction } from './actions';
import { HURT_HALF_D, HURT_HALF_W } from './hits';
import { kitOf, totalFrames } from './roster';
import type { ActionDef } from './types';
import { stepEnemyHold } from './grabs';

const NO_INPUT: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

/** Lab choices for the frames between attacks (F2 settings). */
export const TRAINER_INTERVALS = [40, 70, 100] as const;

/** Default training-enemy script: dummies stand still until the Lab arms them. */
export function defaultTrainer(): World['trainer'] {
  return { attackers: 0, pattern: -1, interval: 70, approach: true };
}

/** Does this dummy attack under the current Lab settings? */
export function trainerArmed(world: World, f: Fighter): boolean {
  const n = world.trainer.attackers;
  if (n <= 0 || f.team !== 'enemy' || !kitOf(f)) return false;
  if (n >= 2) return true;
  const first = world.bodies.find((b) => b.team === 'enemy');
  return first?.id === f.id;
}

/** The attack the dummy uses next: the chosen one, or the next one in the cycle. */
export function nextAttack(world: World, f: Fighter): number {
  const kit = kitOf(f);
  if (!kit) return -1;
  const p = world.trainer.pattern;
  if (p >= 0 && p < kit.actions.length) return p;
  return f.aiStep % kit.actions.length;
}

/**
 * One frame of an actionable training dummy. Disarmed: stands still, or walks towards the
 * nearest hero when the Lab's chase switch is on (M1 behaviour). Armed: walks into range
 * of the nearest standing hero, faces it, and attacks every `interval` frames while in
 * range. Fully deterministic: no randomness, ties go to the lower id.
 */
export function stepTrainer(world: World, f: Fighter): void {
  if (f.state === MoveState.Grabbing) {
    stepEnemyHold(world, f);
    return;
  }
  if (f.state === MoveState.Attack) {
    stepEnemyAction(f);
    return;
  }
  f.vx = 0;
  f.vz = 0;
  f.state = MoveState.Idle;
  const target = nearestHero(world, f);
  const armed = trainerArmed(world, f);
  if (!target || (!armed && !world.dummiesChase)) return;
  const dx = target.x - f.x;
  const dz = target.z - f.z;
  if (!armed) {
    const reachX = 2 * BODY_HALF_W + fx(8);
    const reachZ = 2 * BODY_HALF_D + fx(4);
    if (Math.abs(dx) <= reachX && Math.abs(dz) <= reachZ) return;
    walk(f, Math.abs(dx) > reachX ? sign(dx) : 0, Math.abs(dz) > fx(4) ? sign(dz) : 0);
    return;
  }
  const index = nextAttack(world, f);
  const a = kitOf(f)!.actions[index]!;
  if (dx !== 0) f.facing = dx > 0 ? 1 : -1;
  // Wait while the hero is down, protected or out of the fight: an attack could not connect.
  const busy =
    target.protectedRecovery ||
    target.state === MoveState.Down ||
    target.state === MoveState.Restrained ||
    target.state === MoveState.Grabbed ||
    (a.category === 'grab' && world.frame < target.regrabUntil);
  const { x: rx, z: rz } = reach(a);
  const inRange = Math.abs(dx) <= rx && Math.abs(dz) <= rz;
  if (!inRange || busy) {
    f.aiTimer = world.trainer.interval;
    if (!busy && world.trainer.approach) {
      const ideal = rx - fx(30);
      const sx: Axis = Math.abs(dx) > ideal ? sign(dx) : 0;
      const sz: Axis = Math.abs(dz) > rz - fx(4) ? sign(dz) : 0;
      walk(f, sx, sz);
    }
    return;
  }
  f.aiTimer -= 1;
  if (f.aiTimer > 0) return;
  f.aiTimer = world.trainer.interval;
  f.aiStep += 1;
  startAction(f, index);
  applyActionMovement(f, a, 1, NO_INPUT, ON_FOOT);
}

/**
 * How far from the dummy's centre an attack reaches a hero's centre (x) and depth (z). A
 * grab measures centre to centre (its reach), so the trainer closes in further for it.
 */
export function reach(a: ActionDef): { x: number; z: number } {
  if (a.category === 'grab') return { x: a.hitbox.x + a.hitbox.w - fx(10), z: a.hitbox.depth };
  return {
    x: a.hitbox.x + a.hitbox.w + HURT_HALF_W - fx(10),
    z: a.hitbox.depth + HURT_HALF_D,
  };
}

function stepEnemyAction(f: Fighter): void {
  const a = kitOf(f)?.actions[f.action];
  f.stateFrame += 1;
  const n = f.stateFrame + 1;
  if (!a || n > totalFrames(a)) {
    f.state = MoveState.Idle;
    f.stateFrame = 0;
    f.action = -1;
    f.attackKind = 0;
    f.vx = 0;
    f.vz = 0;
    return;
  }
  applyActionMovement(f, a, n, NO_INPUT, ON_FOOT);
}

function walk(f: Fighter, sx: Axis, sz: Axis): void {
  [f.vx, f.vz] = directed(sx, sz, DUMMY_SPEED_X, DUMMY_SPEED_Z, ON_FOOT.diagonal);
  if (sx !== 0) f.facing = sx;
  f.state = f.vx !== 0 || f.vz !== 0 ? MoveState.Walk : MoveState.Idle;
  f.x += f.vx;
  f.z += f.vz;
}

function nearestHero(world: World, f: Fighter): Fighter | null {
  let best: Fighter | null = null;
  let bestD = 0;
  for (const h of world.bodies) {
    if (h.team !== 'hero') continue;
    const d = (h.x - f.x) * (h.x - f.x) + (h.z - f.z) * (h.z - f.z);
    if (best === null || d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

function sign(v: number): Axis {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
