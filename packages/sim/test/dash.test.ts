import { fx, fxMul } from '../src/math/fixed';
import { ON_FOOT } from '../src/movement/profile';
import { dashVelocity } from '../src/movement/controller';
import { canHit } from '../src/combat/hits';
import { kitOf } from '../src/combat/roster';
import { MoveState } from '../src/world/types';
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

test('a dash lasts dashFrames frames: full speed first, then easing out', () => {
  const w = world();
  const x0 = hero(w).x;
  run(w, [press('Dash', { moveX: 1 }), ...repeat(idle, P.dashFrames - 1)]);
  expect(hero(w).state).toBe(MoveState.Dash);
  let expected = 0;
  for (let f = 0; f < P.dashFrames; f += 1)
    expected += dashVelocity({ ...hero(w), stateFrame: f, dirX: 1, dirZ: 0 }, P)[0];
  expect(hero(w).x - x0).toBe(expected);
  run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Idle);
});

test('dash and run (2026-11-18): about 197 px across and 127 px in depth', () => {
  const across = world();
  const x0 = hero(across).x;
  run(across, [press('Dash', { moveX: 1 }), ...repeat(idle, P.dashFrames)]);
  expect((hero(across).x - x0) / 256).toBeGreaterThanOrEqual(190);
  const depth = world();
  const z0 = hero(depth).z;
  run(depth, [press('Dash', { moveZ: 1 }), ...repeat(idle, P.dashFrames)]);
  expect((hero(depth).z - z0) / 256).toBeGreaterThanOrEqual(120);
});

test('the next dash waits for the dash recovery', () => {
  const w = world();
  run(w, [press('Dash', { moveX: 1 }), ...repeat(idle, P.dashFrames)]);
  expect(hero(w).state).toBe(MoveState.Idle);
  run(w, [press('Dash', { moveX: 1 })]);
  expect(hero(w).state).not.toBe(MoveState.Dash);
  run(w, [...repeat(idle, P.dashRecovery - 2), press('Dash', { moveX: 1 })]);
  expect(hero(w).state).toBe(MoveState.Dash);
});

/** A training dummy standing 200 px to the right of the hero, in the same lane. */
function facingFoe() {
  const w = world({ dummies: 1 });
  const foe = w.bodies[1]!;
  foe.x = hero(w).x + fx(200);
  foe.z = hero(w).z;
  return { w, foe };
}

function evades(w: ReturnType<typeof world>, foe: ReturnType<typeof world>['bodies'][number]) {
  const a = kitOf(foe)!.actions[0]!;
  return !canHit(foe, a, hero(w));
}

test('a dash away from the nearest enemy is a backstep: facing kept, evade frames 3 to 8', () => {
  const { w, foe } = facingFoe();
  run(w, doubleTap('left', 4));
  expect(hero(w).state).toBe(MoveState.Dash);
  expect(hero(w).facing).toBe(1);
  expect(hero(w).dashEvade).toBe(true);
  const seen: boolean[] = [evades(w, foe)];
  for (let i = 1; i < P.dashFrames; i += 1) {
    run(w, [idle]);
    seen.push(evades(w, foe));
  }
  const expected = seen.map((_, f) => f >= P.evadeFrom && f <= P.evadeTo);
  expect(seen).toEqual(expected);
  expect(seen.filter(Boolean)).toHaveLength(6);
});

test('a forward dash never evades (F&D Module 1, amended 2026-11-18)', () => {
  const { w, foe } = facingFoe();
  run(w, [press('Dash', { moveX: 1 }), idle, idle, idle]);
  expect(hero(w).state).toBe(MoveState.Dash);
  expect(hero(w).dashEvade).toBe(false);
  expect(evades(w, foe)).toBe(false);
});

test('a depth sidestep evades; a dash away with no enemy near turns the hero', () => {
  const { w, foe } = facingFoe();
  run(w, [...doubleTap('up', 4), idle, idle, idle]);
  expect(hero(w).dashEvade).toBe(true);
  expect(evades(w, foe)).toBe(true);
  const alone = world();
  run(alone, doubleTap('left', 4));
  expect(hero(alone).facing).toBe(-1);
  expect(hero(alone).dashEvade).toBe(false);
});

test('double tap and hold: the dash becomes a run at twice the walking speed', () => {
  const w = world();
  const hold = inp({ moveX: 1 });
  run(w, [...doubleTap('right', 4), ...repeat(hold, P.dashFrames + 2)]);
  expect(hero(w).state).toBe(MoveState.Walk);
  const x0 = hero(w).x;
  run(w, repeat(hold, 10));
  expect(hero(w).x - x0).toBe(10 * P.runX);
  expect(P.runX).toBe(2 * P.walkX);
  // Steering in depth keeps the run; releasing the direction ends it.
  run(w, repeat(inp({ moveX: 1, moveZ: 1 }), 3));
  expect(hero(w).vx).toBe(fxMul(P.runX, P.diagonal));
  run(w, [idle, hold]);
  expect(hero(w).vx).toBe(P.walkX);
});

test('a dash released before it ends is no run', () => {
  const w = world();
  run(w, [...doubleTap('right', 4, tapDir('right')), ...repeat(idle, P.dashFrames)]);
  run(w, repeat(inp({ moveX: 1 }), 3));
  expect(hero(w).vx).toBe(P.walkX);
});

test('attacking out of a run is the dash attack; jumping keeps the running speed', () => {
  const hold = inp({ moveX: 1 });
  const attack = world();
  run(attack, [...doubleTap('right', 4), ...repeat(hold, P.dashFrames + 4)]);
  run(attack, [press('Attack', { moveX: 1 })]);
  expect(hero(attack).attackFromDash).toBe(true);
  const jump = world();
  run(jump, [...doubleTap('right', 4), ...repeat(hold, P.dashFrames + 4)]);
  run(jump, [press('Jump', { moveX: 1 })]);
  expect(hero(jump).state).toBe(MoveState.Air);
  expect(hero(jump).vx).toBe(P.runX);
});

test('no dash while airborne or during an attack', () => {
  const air = world();
  run(air, [press('Jump'), idle, press('Dash', { moveX: 1 })]);
  expect(hero(air).state).toBe(MoveState.Air);
  const attack = world();
  run(attack, [press('Attack'), press('Dash', { moveX: 1 })]);
  expect(hero(attack).state).toBe(MoveState.Attack);
});

test('dash stops at the stage edge', () => {
  const w = world();
  run(w, [...repeat(inp({ moveX: -1 }), 200), press('Dash', { moveX: -1 })]);
  expect(hero(w).x).toBe(fx(0));
});
