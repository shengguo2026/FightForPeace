import { fx, fxMul } from '../src/math/fixed';
import { ON_FOOT } from '../src/movement/profile';
import { MoveState } from '../src/world/types';
import { encodeWorld } from '../src/world/world';
import { hero, idle, inp, press, repeat, run, tapDir, world } from './helpers';

const P = ON_FOOT;
const right = inp({ moveX: 1 });

/** Press D, release, press again `gap` frames after the first press. */
function doubleTap(dir: 'left' | 'right' | 'up' | 'down', gap: number, hold = tapDir(dir)) {
  const frames = [tapDir(dir)];
  for (let i = 1; i < gap; i += 1) frames.push(idle);
  frames.push(hold);
  return frames;
}

test('double-tapping D within the window dashes right', () => {
  const w = world();
  run(w, doubleTap('right', P.doubleTapFrames));
  expect(hero(w).state).toBe(MoveState.Dash);
  expect(hero(w).vx).toBe(P.dashX);
});

test('a second tap one frame too late does not dash', () => {
  const w = world();
  run(w, doubleTap('right', P.doubleTapFrames + 1));
  expect(hero(w).state).toBe(MoveState.Walk);
});

test('D, A, D quickly does not dash (Review Focus 1)', () => {
  const w = world();
  run(w, [tapDir('right'), idle, tapDir('left'), idle, tapDir('right')]);
  expect(hero(w).state).toBe(MoveState.Walk);
});

test('holding W and pressing D once does not dash', () => {
  const w = world();
  run(w, [tapDir('up'), inp({ moveZ: -1 }), inp({ moveZ: -1 }), tapDir('right', { moveZ: -1 })]);
  expect(hero(w).state).toBe(MoveState.Walk);
});

test('holding W and double-tapping D dashes up-right at normalized speed', () => {
  const w = world();
  const upRight = (p = {}) => inp({ moveX: 1, moveZ: -1, dirPressed: 8, ...p });
  run(w, [inp({ moveZ: -1 }), upRight(), inp({ moveZ: -1 }), upRight()]);
  expect(hero(w).state).toBe(MoveState.Dash);
  expect(hero(w).vx).toBe(fxMul(P.dashX, P.diagonal));
  expect(hero(w).vz).toBe(-fxMul(P.dashZ, P.diagonal));
});

test('double-tapping W dashes up (depth dash)', () => {
  const w = world();
  run(w, doubleTap('up', 3));
  expect(hero(w).state).toBe(MoveState.Dash);
  expect(hero(w).vz).toBe(-P.dashZ);
  expect(hero(w).vx).toBe(0);
});

test('the Dash action dashes in the held direction, or forward when neutral', () => {
  const held = world();
  run(held, [press('Dash', { moveZ: 1 })]);
  expect(hero(held).vz).toBe(P.dashZ);
  const neutral = world();
  run(neutral, [inp({ moveX: -1 }), press('Dash')]);
  expect(hero(neutral).vx).toBe(-P.dashX);
});

test('double-tap dash and Dash-action dash are the same dash (Review Focus 2)', () => {
  const a = world();
  run(a, [tapDir('right'), idle, tapDir('right'), ...repeat(right, 20)]);
  const b = world();
  run(b, [right, idle, press('Dash', { moveX: 1 }), ...repeat(right, 20)]);
  expect(hero(a).x).toBe(hero(b).x);
  expect(hero(a).state).toBe(hero(b).state);
});

test('a dash lasts dashFrames frames and covers dashFrames × dashX', () => {
  const w = world();
  const x0 = hero(w).x;
  run(w, [press('Dash', { moveX: 1 }), ...repeat(idle, P.dashFrames - 1)]);
  expect(hero(w).state).toBe(MoveState.Dash);
  expect(hero(w).x - x0).toBe(P.dashFrames * P.dashX);
  run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Idle);
});

test('no dash while airborne or during an attack', () => {
  const air = world();
  run(air, [press('Jump'), idle, press('Dash', { moveX: 1 })]);
  expect(hero(air).state).toBe(MoveState.Air);
  const attack = world();
  run(attack, [press('Attack'), press('Dash', { moveX: 1 })]);
  expect(hero(attack).state).toBe(MoveState.Attack);
});

test('dashing grants no invulnerability: the encoded state has no such field', () => {
  const w = world();
  run(w, [press('Dash', { moveX: 1 })]);
  expect(Object.keys(hero(w)).some((k) => /invul|intang/i.test(k))).toBe(false);
  expect(encodeWorld(w).length).toBe(encodeWorld(world()).length);
});

test('dash stops at the stage edge', () => {
  const w = world();
  run(w, [...repeat(inp({ moveX: -1 }), 200), press('Dash', { moveX: -1 })]);
  expect(hero(w).x).toBe(fx(0));
});
