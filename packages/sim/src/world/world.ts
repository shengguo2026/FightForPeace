import { fx, fxMul } from '../math/fixed';
import { createRngState } from '../math/rng';
import { ByteWriter } from '../state/encode';
import { xxh32 } from '../state/hash';
import type { Body, FrameInput, World } from './types';

/** Version of the byte layout written by encodeWorld. Bump on any layout change. */
export const STATE_FORMAT = 1;

/** Candidate walking speeds (fixed point per frame): 3 px/frame across, 2 px/frame in depth. */
export const WALK_SPEED_X = 768;
export const WALK_SPEED_Z = 512;

/** 1/√2 in fixed point (181/256 ≈ 0.707), used to normalize diagonal movement. */
const DIAGONAL = 181;

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0 };

export function createWorld(seed: number): World {
  return {
    frame: 0,
    rng: createRngState(seed),
    bodies: [{ id: 1, x: fx(400), z: fx(800), y: 0, facing: 1 }],
    bounds: { minX: fx(0), maxX: fx(1920), minZ: fx(620), maxZ: fx(1000) },
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Advances the world by one 1/60 s frame. `inputs[i]` drives player slot i, which
 * controls the body with id i + 1. A missing slot counts as idle.
 */
export function step(world: World, inputs: readonly FrameInput[]): void {
  const { bounds } = world;
  for (const body of world.bodies) {
    const input = inputs[body.id - 1] ?? IDLE;
    let dx = input.moveX * WALK_SPEED_X;
    let dz = input.moveZ * WALK_SPEED_Z;
    if (dx !== 0 && dz !== 0) {
      dx = fxMul(dx, DIAGONAL);
      dz = fxMul(dz, DIAGONAL);
    }
    body.x = clamp(body.x + dx, bounds.minX, bounds.maxX);
    body.z = clamp(body.z + dz, bounds.minZ, bounds.maxZ);
    if (input.moveX !== 0) body.facing = input.moveX;
  }
  world.frame += 1;
}

/**
 * Canonical encoding: format version, frame, RNG words, bounds, then every body in
 * ascending id order.
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
  const bodies: Body[] = [...world.bodies].sort((a, b) => a.id - b.id);
  w.u32(bodies.length);
  for (const b of bodies) {
    w.u32(b.id);
    w.i32(b.x);
    w.i32(b.z);
    w.i32(b.y);
    w.u8(b.facing === 1 ? 1 : 0);
  }
  return w.bytes();
}

export function hashWorld(world: World): number {
  return xxh32(encodeWorld(world));
}
