import { fx } from '../src/math/fixed';
import { MoveState } from '../src/world/types';
import {
  STATE_FORMAT,
  WALK_SPEED_X,
  WALK_SPEED_Z,
  createFighter,
  createWorld,
  encodeWorld,
  hashWorld,
  setFacingMode,
  step,
} from '../src/world/world';
import { hero, idle, inp } from './helpers';

const right = inp({ moveX: 1 });

test('createWorld places Player 1 on the floor band, dummies only when asked', () => {
  const w = createWorld(1);
  expect(w.frame).toBe(0);
  expect(w.bodies).toHaveLength(1);
  expect(w.bodies[0]).toMatchObject({ id: 1, team: 'hero', slot: 0, x: fx(400), z: fx(800) });
  expect(w.bounds).toEqual({ minX: 0, maxX: fx(1920), minZ: fx(620), maxZ: fx(1000) });
  const d = createWorld(1, { dummies: 2 });
  expect(d.bodies.map((b) => b.id)).toEqual([1, 101, 102]);
  expect(d.bodies[1]!.team).toBe('enemy');
});

test('walking right moves by the walk speed and advances the frame', () => {
  const w = createWorld(1);
  step(w, [right]);
  expect(hero(w).x).toBe(fx(400) + WALK_SPEED_X);
  expect(hero(w).z).toBe(fx(800));
  expect(hero(w).state).toBe(MoveState.Walk);
  expect(w.frame).toBe(1);
});

test('diagonals are normalized', () => {
  const d = createWorld(1);
  step(d, [inp({ moveX: 1, moveZ: -1 })]);
  expect(hero(d).x - fx(400)).toBe(Math.trunc((WALK_SPEED_X * 181) / 256));
  expect(fx(800) - hero(d).z).toBe(Math.trunc((WALK_SPEED_Z * 181) / 256));
});

test('facing follows horizontal input and is kept when only depth changes', () => {
  const w = createWorld(1);
  step(w, [inp({ moveX: -1 })]);
  expect(hero(w).facing).toBe(-1);
  step(w, [inp({ moveZ: 1 })]);
  expect(hero(w).facing).toBe(-1);
  step(w, [right]);
  expect(hero(w).facing).toBe(1);
});

test('bounds clamp on both axes', () => {
  const edge = createWorld(1);
  for (let i = 0; i < 2000; i += 1) step(edge, [inp({ moveX: -1, moveZ: 1 })]);
  expect(hero(edge).x).toBe(edge.bounds.minX);
  expect(hero(edge).z).toBe(edge.bounds.maxZ);
  for (let i = 0; i < 2000; i += 1) step(edge, [inp({ moveX: 1, moveZ: -1 })]);
  expect(hero(edge).x).toBe(edge.bounds.maxX);
  expect(hero(edge).z).toBe(edge.bounds.minZ);
});

test('a missing input slot counts as idle', () => {
  const w = createWorld(1);
  step(w, []);
  expect(hero(w).x).toBe(fx(400));
  expect(w.frame).toBe(1);
});

test('M0-shaped inputs without held or dirPressed still work', () => {
  const w = createWorld(1);
  step(w, [{ moveX: 1, moveZ: 0, pressed: 0 } as never]);
  expect(hero(w).x).toBe(fx(400) + WALK_SPEED_X);
});

test('Player 2 appears on the first frame with a slot-1 input', () => {
  const w = createWorld(1);
  step(w, [idle]);
  expect(w.bodies).toHaveLength(1);
  step(w, [idle, inp({ moveX: -1 })]);
  expect(hero(w, 1)).toMatchObject({ id: 2, slot: 1 });
  expect(hero(w, 1).facing).toBe(-1);
});

test('facing mode is per player and applies to a later spawn', () => {
  const w = createWorld(1);
  setFacingMode(w, 1, 'assisted');
  step(w, [idle, idle]);
  expect(hero(w, 0).facingMode).toBe('manual');
  expect(hero(w, 1).facingMode).toBe('assisted');
});

test('encoding starts with the state format version', () => {
  expect(STATE_FORMAT).toBe(4);
  expect(encodeWorld(createWorld(1))[0]).toBe(STATE_FORMAT);
});

test('same seed and inputs give the same hash; different input or seed does not', () => {
  const inputs = [right, right, inp({ moveZ: 1 }), idle];
  const run = (seed: number, frames: typeof inputs) => {
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
  const extra = createFighter(2, 'hero', 1, fx(500), fx(700));
  a.bodies.push({ ...extra, lastTap: [...extra.lastTap] });
  b.bodies.unshift({ ...extra, lastTap: [...extra.lastTap] });
  expect(hashWorld(a)).toBe(hashWorld(b));
});
