import { fx } from '../math/fixed';
import { createRngState } from '../math/rng';
import { ByteWriter } from '../state/encode';
import { xxh32 } from '../state/hash';
import { collide, type PositionLog } from '../collision/collide';
import { NO_TAP, directed, stepHero } from '../movement/controller';
import {
  BODY_HALF_D,
  BODY_HALF_W,
  DUMMY_SPEED_X,
  DUMMY_SPEED_Z,
  ON_FOOT,
} from '../movement/profile';
import {
  type Axis,
  type FacingMode,
  type Fighter,
  type FrameInput,
  MoveState,
  type Team,
  type World,
} from './types';

/** Version of the byte layout written by encodeWorld. Bump on any layout change. */
export const STATE_FORMAT = 3;

/** Walking speeds (fixed point per frame), kept as exports for existing callers. */
export const WALK_SPEED_X = ON_FOOT.walkX;
export const WALK_SPEED_Z = ON_FOOT.walkZ;

export const MAX_PLAYERS = 2;
export const DUMMY_ID_BASE = 101;

const HERO_SPAWN: readonly { x: number; z: number }[] = [
  { x: fx(400), z: fx(800) },
  { x: fx(520), z: fx(900) },
];
const DUMMY_SPAWN: readonly { x: number; z: number }[] = [
  { x: fx(1100), z: fx(760) },
  { x: fx(1300), z: fx(890) },
  { x: fx(1500), z: fx(700) },
  { x: fx(1600), z: fx(950) },
];

export const IDLE_INPUT: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

export interface WorldOptions {
  /** Training dummies placed on the stage (0–4). */
  dummies?: number;
  /** Facing mode per player slot; Manual is the default. */
  facing?: readonly FacingMode[];
  dummiesChase?: boolean;
}

export function createFighter(
  id: number,
  team: Team,
  slot: number,
  x: number,
  z: number,
  facingMode: FacingMode = 'manual',
): Fighter {
  return {
    id,
    team,
    slot,
    x,
    z,
    y: 0,
    facing: team === 'hero' ? 1 : -1,
    vx: 0,
    vz: 0,
    vy: 0,
    state: MoveState.Idle,
    stateFrame: 0,
    dirX: 0,
    dirZ: 0,
    facingMode,
    lastTap: [NO_TAP, NO_TAP, NO_TAP, NO_TAP],
    bufAction: 0,
    bufFrame: 0,
    attackKind: 0,
    attackFromDash: false,
    lastGuardFrame: NO_TAP,
    targetId: 0,
    pinFrames: 0,
    passEnemies: false,
  };
}

/**
 * Creates a world with Player 1's hero. Player 2's hero appears on the first frame that
 * has an input for slot 1, so joining is part of the replayable input stream.
 */
export function createWorld(seed: number, options: WorldOptions = {}): World {
  const facing = options.facing ?? [];
  const p1 = HERO_SPAWN[0]!;
  const bodies: Fighter[] = [createFighter(1, 'hero', 0, p1.x, p1.z, facing[0] ?? 'manual')];
  const dummies = Math.min(options.dummies ?? 0, DUMMY_SPAWN.length);
  for (let i = 0; i < dummies; i += 1) {
    const s = DUMMY_SPAWN[i]!;
    bodies.push(createFighter(DUMMY_ID_BASE + i, 'enemy', -1, s.x, s.z));
  }
  const world: World = {
    frame: 0,
    rng: createRngState(seed),
    bodies,
    bounds: { minX: fx(0), maxX: fx(1920), minZ: fx(620), maxZ: fx(1000) },
    dummiesChase: options.dummiesChase ?? false,
    playerFacing: [facing[0] ?? 'manual', facing[1] ?? 'manual'],
  };
  world.bodies.sort((a, b) => a.id - b.id);
  return world;
}

/** Changes a player's facing mode (Lab or settings), for the hero and any later spawn. */
export function setFacingMode(world: World, slot: number, mode: FacingMode): void {
  world.playerFacing[slot] = mode;
  const hero = heroOf(world, slot);
  if (hero) hero.facingMode = mode;
}

export function heroOf(world: World, slot: number): Fighter | undefined {
  return world.bodies.find((b) => b.team === 'hero' && b.slot === slot);
}

function spawnHero(world: World, slot: number): void {
  const s = HERO_SPAWN[slot]!;
  const facing = world.playerFacing[slot] ?? 'manual';
  world.bodies.push(createFighter(slot + 1, 'hero', slot, s.x, s.z, facing));
  world.bodies.sort((a, b) => a.id - b.id);
}

/**
 * Advances the world by one 1/60 s frame. `inputs[i]` drives player slot i. A missing
 * slot counts as idle; a slot without a hero gets one when its input first appears.
 */
export function step(world: World, inputs: readonly (FrameInput | undefined)[]): void {
  for (let slot = 0; slot < Math.min(inputs.length, MAX_PLAYERS); slot += 1) {
    if (inputs[slot] && !heroOf(world, slot)) spawnHero(world, slot);
  }
  const before: PositionLog = new Map();
  for (const f of world.bodies) before.set(f.id, { x: f.x, z: f.z });
  // Heroes (low ids) move first, then enemies, always in id order.
  for (const f of [...world.bodies].sort((a, b) => a.id - b.id)) {
    if (f.team === 'hero') stepHero(world, f, normalize(inputs[f.slot]), ON_FOOT);
    else stepDummy(world, f);
  }
  collide(world, before);
  world.frame += 1;
}

/** Accepts M0-shaped inputs (without held/dirPressed) so old callers keep working. */
function normalize(input: Partial<FrameInput> | undefined): FrameInput {
  if (!input) return IDLE_INPUT;
  return {
    moveX: input.moveX ?? 0,
    moveZ: input.moveZ ?? 0,
    pressed: input.pressed ?? 0,
    held: input.held ?? 0,
    dirPressed: input.dirPressed ?? 0,
  };
}

/** Training dummy: stands still, or walks towards the nearest hero when chasing. */
function stepDummy(world: World, f: Fighter): void {
  f.vx = 0;
  f.vz = 0;
  f.state = MoveState.Idle;
  if (!world.dummiesChase) return;
  let target: Fighter | null = null;
  let best = 0;
  for (const h of world.bodies) {
    if (h.team !== 'hero') continue;
    const d = (h.x - f.x) * (h.x - f.x) + (h.z - f.z) * (h.z - f.z);
    if (target === null || d < best) {
      target = h;
      best = d;
    }
  }
  if (!target) return;
  const dx = target.x - f.x;
  const dz = target.z - f.z;
  const reachX = 2 * BODY_HALF_W + fx(8);
  const reachZ = 2 * BODY_HALF_D + fx(4);
  if (Math.abs(dx) <= reachX && Math.abs(dz) <= reachZ) return;
  const sx: Axis = Math.abs(dx) > reachX ? (dx > 0 ? 1 : -1) : 0;
  const sz: Axis = Math.abs(dz) > fx(4) ? (dz > 0 ? 1 : -1) : 0;
  [f.vx, f.vz] = directed(sx, sz, DUMMY_SPEED_X, DUMMY_SPEED_Z, ON_FOOT.diagonal);
  if (sx !== 0) f.facing = sx;
  f.state = f.vx !== 0 || f.vz !== 0 ? MoveState.Walk : MoveState.Idle;
  f.x += f.vx;
  f.z += f.vz;
}

const TEAM_CODE: Record<Team, number> = { hero: 0, enemy: 1 };
const FACING_MODE_CODE: Record<FacingMode, number> = { manual: 0, assisted: 1 };

/**
 * Canonical encoding: format version, frame, RNG words, bounds, Lab switches, then every
 * fighter in ascending id order with all of its state.
 */
export function encodeWorld(world: World): Uint8Array {
  const w = new ByteWriter();
  w.u8(STATE_FORMAT);
  w.u32(world.frame);
  for (const word of world.rng) w.u32(word);
  w.i32(world.bounds.minX);
  w.i32(world.bounds.maxX);
  w.i32(world.bounds.minZ);
  w.i32(world.bounds.maxZ);
  w.u8(world.dummiesChase ? 1 : 0);
  w.u32(world.playerFacing.length);
  for (const m of world.playerFacing) w.u8(FACING_MODE_CODE[m]);
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  w.u32(bodies.length);
  for (const b of bodies) {
    w.u32(b.id);
    w.u8(TEAM_CODE[b.team]);
    w.i32(b.slot);
    w.i32(b.x);
    w.i32(b.z);
    w.i32(b.y);
    w.u8(b.facing === 1 ? 1 : 0);
    w.i32(b.vx);
    w.i32(b.vz);
    w.i32(b.vy);
    w.u8(b.state);
    w.u32(b.stateFrame);
    w.i32(b.dirX);
    w.i32(b.dirZ);
    w.u8(FACING_MODE_CODE[b.facingMode]);
    for (const t of b.lastTap) w.i32(t);
    w.u32(b.bufAction);
    w.u32(b.bufFrame);
    w.u32(b.attackKind);
    w.u8(b.attackFromDash ? 1 : 0);
    w.i32(b.lastGuardFrame);
    w.u32(b.targetId);
    w.u32(b.pinFrames);
    w.u8(b.passEnemies ? 1 : 0);
  }
  return w.bytes();
}

export function hashWorld(world: World): number {
  return xxh32(encodeWorld(world));
}
