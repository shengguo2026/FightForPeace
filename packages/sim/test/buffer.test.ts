import { ActionBit } from '../src/input/bits';
import { ON_FOOT } from '../src/movement/profile';
import { MoveState } from '../src/world/types';
import { setFacingMode } from '../src/world/world';
import { hero, idle, inp, press, repeat, run, world } from './helpers';

const P = ON_FOOT;

test('Attack starts an attack stub that roots the hero', () => {
  const w = world();
  const x0 = hero(w).x;
  run(w, [press('Attack'), ...repeat(inp({ moveX: 1 }), 5)]);
  expect(hero(w).state).toBe(MoveState.Attack);
  expect(hero(w).attackKind).toBe(ActionBit.Attack);
  expect(hero(w).x).toBe(x0);
});

test('the stub ends after attackFrames and the hero can walk again', () => {
  const w = world();
  run(w, [press('Attack'), ...repeat(idle, P.attackFrames - 1)]);
  expect(hero(w).state).toBe(MoveState.Attack);
  run(w, [inp({ moveX: 1 })]);
  expect(hero(w).state).toBe(MoveState.Walk);
});

test('Jump then Attack in the last 9 frames performs Attack only (Review Focus 4)', () => {
  const w = world();
  run(w, [press('Attack'), ...repeat(idle, P.attackFrames - 6), press('Jump'), press('Attack')]);
  // The first stub ends within the next frames; the buffered Attack follows immediately.
  run(w, repeat(idle, 4));
  expect(hero(w).state).toBe(MoveState.Attack);
  expect(hero(w).y).toBe(0);
  run(w, repeat(idle, P.attackFrames + 2));
  expect(hero(w).state).toBe(MoveState.Idle); // no jump ever came out
});

test('a press exactly bufferFrames before the stub ends is kept', () => {
  const w = world();
  // Stub starts at frame 0 (stateFrame 0) and is actionable again at frame attackFrames.
  run(w, [press('Attack'), ...repeat(idle, P.attackFrames - P.bufferFrames - 1), press('Jump')]);
  run(w, repeat(idle, P.bufferFrames - 1));
  expect(hero(w).state).toBe(MoveState.Attack);
  run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Air);
});

test('a press one frame earlier than the window is dropped', () => {
  const w = world();
  run(w, [press('Attack'), ...repeat(idle, P.attackFrames - P.bufferFrames - 2), press('Jump')]);
  run(w, repeat(idle, P.bufferFrames + 1));
  expect(hero(w).state).toBe(MoveState.Idle);
});

test('movement during the stub is ignored, not buffered', () => {
  const w = world();
  run(w, [press('Attack'), ...repeat(press('Dash', { moveX: 1 }), P.attackFrames - 1)]);
  run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Idle);
});

test('Guard is never buffered', () => {
  const w = world();
  run(w, [press('Attack'), ...repeat(idle, P.attackFrames - 3), press('Guard')]);
  expect(hero(w).bufAction).toBe(0);
});

test('Manual Facing: Attack with Left held turns left first', () => {
  const w = world();
  expect(hero(w).facing).toBe(1);
  run(w, [press('Attack', { moveX: -1 })]);
  expect(hero(w).facing).toBe(-1);
});

test('Manual Facing: a neutral Attack keeps facing even with a dummy behind', () => {
  const w = world({ dummies: 1 });
  run(w, repeat(inp({ moveX: 1 }), 150)); // walk past the dummy at x 1100
  run(w, [press('Attack')]);
  expect(hero(w).facing).toBe(1);
});

function assistedPastDummy() {
  const w = world({ dummies: 1, facing: ['assisted'] });
  setFacingMode(w, 0, 'assisted');
  // Walk to x ≈ 1300 (past the dummy at 1100, above it in depth), facing right.
  run(w, repeat(inp({ moveZ: -1 }), 40));
  run(w, repeat(inp({ moveX: 1 }), 300));
  run(w, repeat(inp({ moveX: -1 }), 1));
  run(w, repeat(inp({ moveX: 1 }), 1));
  return w;
}

test('Assisted Facing: a neutral Attack turns towards the nearest dummy', () => {
  const w = assistedPastDummy();
  expect(hero(w).facing).toBe(1);
  run(w, [press('Attack')]);
  expect(hero(w).facing).toBe(-1);
  expect(hero(w).targetId).toBe(101);
});

test('Assisted Facing: an explicit Right overrides the target', () => {
  const w = assistedPastDummy();
  run(w, [press('Attack', { moveX: 1 })]);
  expect(hero(w).facing).toBe(1);
  expect(hero(w).targetId).toBe(0);
});

test('Assisted Facing keeps its target during a chain', () => {
  const w = world({ dummies: 2, facing: ['assisted'] });
  // Stand between two dummies: 101 at x 1100, 102 at x 1300.
  const h = hero(w);
  h.x = 1180 * 256;
  h.z = 820 * 256;
  run(w, [press('Attack')]);
  expect(hero(w).targetId).toBe(101);
  w.bodies.find((b) => b.id === 101)!.x = 1000 * 256; // target steps away, 102 is now nearer
  run(w, [...repeat(idle, P.attackFrames - 3), press('Attack'), idle, idle]);
  expect(hero(w).state).toBe(MoveState.Attack);
  expect(hero(w).stateFrame).toBeLessThan(3);
  expect(hero(w).targetId).toBe(101);
});
