import { fx } from '../src/math/fixed';
import type { FrameInput } from '../src/world/types';
import {
  STATE_FORMAT,
  WALK_SPEED_X,
  WALK_SPEED_Z,
  createWorld,
  encodeWorld,
  hashWorld,
  step,
} from '../src/world/world';

const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0 };
const right: FrameInput = { moveX: 1, moveZ: 0, pressed: 0 };

test('createWorld places one body on the floor band', () => {
  const w = createWorld(1);
  expect(w.frame).toBe(0);
  expect(w.bodies).toEqual([{ id: 1, x: fx(400), z: fx(800), y: 0, facing: 1 }]);
  expect(w.bounds).toEqual({ minX: 0, maxX: fx(1920), minZ: fx(620), maxZ: fx(1000) });
});

test('walking right moves by the walk speed and advances the frame', () => {
  const w = createWorld(1);
  step(w, [right]);
  expect(w.bodies[0]!.x).toBe(fx(400) + WALK_SPEED_X);
  expect(w.bodies[0]!.z).toBe(fx(800));
  expect(w.frame).toBe(1);
});

test('diagonals are normalized', () => {
  const d = createWorld(1);
  step(d, [{ moveX: 1, moveZ: -1, pressed: 0 }]);
  expect(d.bodies[0]!.x - fx(400)).toBe(Math.trunc((WALK_SPEED_X * 181) / 256));
  expect(fx(800) - d.bodies[0]!.z).toBe(Math.trunc((WALK_SPEED_Z * 181) / 256));
});

test('facing follows horizontal input and is kept when only depth changes', () => {
  const w = createWorld(1);
  step(w, [{ moveX: -1, moveZ: 0, pressed: 0 }]);
  expect(w.bodies[0]!.facing).toBe(-1);
  step(w, [{ moveX: 0, moveZ: 1, pressed: 0 }]);
  expect(w.bodies[0]!.facing).toBe(-1);
  step(w, [right]);
  expect(w.bodies[0]!.facing).toBe(1);
});

test('bounds clamp on both axes', () => {
  const edge = createWorld(1);
  for (let i = 0; i < 2000; i += 1) step(edge, [{ moveX: -1, moveZ: 1, pressed: 0 }]);
  expect(edge.bodies[0]!.x).toBe(edge.bounds.minX);
  expect(edge.bodies[0]!.z).toBe(edge.bounds.maxZ);
  for (let i = 0; i < 2000; i += 1) step(edge, [{ moveX: 1, moveZ: -1, pressed: 0 }]);
  expect(edge.bodies[0]!.x).toBe(edge.bounds.maxX);
  expect(edge.bodies[0]!.z).toBe(edge.bounds.minZ);
});

test('a missing input slot counts as idle', () => {
  const w = createWorld(1);
  step(w, []);
  expect(w.bodies[0]!.x).toBe(fx(400));
  expect(w.frame).toBe(1);
});

test('encoding starts with the state format version', () => {
  expect(STATE_FORMAT).toBe(1);
  expect(encodeWorld(createWorld(1))[0]).toBe(STATE_FORMAT);
});

test('same seed and inputs give the same hash; different input or seed does not', () => {
  const inputs: FrameInput[] = [right, right, { moveX: 0, moveZ: 1, pressed: 0 }, idle];
  const run = (seed: number, frames: FrameInput[]) => {
    const w = createWorld(seed);
    for (const f of frames) step(w, [f]);
    return hashWorld(w);
  };
  expect(run(1, inputs)).toBe(run(1, inputs));
  expect(run(1, inputs)).not.toBe(run(1, [...inputs.slice(0, 3), right]));
  expect(run(1, inputs)).not.toBe(run(2, inputs));
});

test('hash does not depend on body array order', () => {
  const a = createWorld(1);
  const b = createWorld(1);
  const extra = { id: 2, x: fx(500), z: fx(700), y: 0, facing: -1 as const };
  a.bodies.push({ ...extra });
  b.bodies.unshift({ ...extra });
  expect(hashWorld(a)).toBe(hashWorld(b));
});
