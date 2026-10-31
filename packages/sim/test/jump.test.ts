import { ON_FOOT } from '../src/movement/profile';
import { MoveState } from '../src/world/types';
import { hero, idle, inp, press, repeat, run, world } from './helpers';

const P = ON_FOOT;

function flight(first: ReturnType<typeof inp>, during: ReturnType<typeof inp>) {
  const w = world();
  const x0 = hero(w).x;
  run(w, [first]);
  let frames = 1;
  let minVx = hero(w).vx;
  let maxVx = hero(w).vx;
  while (hero(w).state === MoveState.Air && frames < 200) {
    run(w, [during]);
    frames += 1;
    minVx = Math.min(minVx, hero(w).vx);
    maxVx = Math.max(maxVx, hero(w).vx);
  }
  return { w, dx: hero(w).x - x0, frames, minVx, maxVx };
}

test('neutral jump goes up and lands on the takeoff spot', () => {
  const w = world();
  run(w, [press('Jump')]);
  expect(hero(w).state).toBe(MoveState.Air);
  expect(hero(w).y).toBeGreaterThan(0);
  const r = flight(press('Jump'), idle);
  expect(r.dx).toBe(0);
  expect(r.frames).toBeGreaterThan(25);
  expect(r.frames).toBeLessThan(40);
  expect(hero(r.w).y).toBe(0);
});

test('the jump apex is about 136 px', () => {
  const w = world();
  run(w, [press('Jump')]);
  let apex = 0;
  for (let i = 0; i < 40; i += 1) {
    apex = Math.max(apex, hero(w).y);
    run(w, [idle]);
  }
  expect(apex).toBe(136 * 256);
});

test('a directional jump carries walk speed', () => {
  const r = flight(press('Jump', { moveX: 1 }), idle);
  expect(r.dx).toBe(r.frames * P.walkX);
});

test('air correction never exceeds walk speed', () => {
  const r = flight(press('Jump', { moveX: 1 }), inp({ moveX: 1 }));
  expect(r.maxVx).toBe(P.walkX);
});

test('holding back cannot reverse a right jump (Review Focus 3)', () => {
  const neutral = flight(press('Jump'), idle);
  const back = flight(press('Jump', { moveX: 1 }), inp({ moveX: -1 }));
  expect(back.dx).toBeGreaterThan(neutral.dx);
  expect(back.minVx).toBeGreaterThanOrEqual(-P.airReverseX);
  expect(back.minVx).toBeLessThan(0); // it does brake through zero, a little
});

test('a neutral jump can drift only a little', () => {
  const r = flight(press('Jump'), inp({ moveX: 1 }));
  expect(r.maxVx).toBe(P.airNeutralX);
});

test('facing does not flip in the air', () => {
  const w = world();
  run(w, [press('Jump', { moveX: 1 }), ...repeat(inp({ moveX: -1 }), 10)]);
  expect(hero(w).facing).toBe(1);
});

test('jumping out of a dash keeps the dash direction', () => {
  const w = world();
  run(w, [press('Dash', { moveZ: -1 }), idle, press('Jump')]);
  expect(hero(w).state).toBe(MoveState.Air);
  expect(hero(w).vz).toBe(-P.walkZ);
  expect(hero(w).vx).toBe(0);
});

test('Jump pressed just before landing jumps again on landing (buffered)', () => {
  const w = world();
  run(w, [press('Jump')]);
  while (hero(w).y > 4 * 256 * 4) run(w, [idle]);
  run(w, [press('Jump')]);
  for (let i = 0; i < 5 && hero(w).vy < P.jumpVy - P.gravity; i += 1) run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Air);
  expect(hero(w).vy).toBeGreaterThan(0);
});
