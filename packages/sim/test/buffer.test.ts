import { ActionBit } from '../src/input/bits';
import { ON_FOOT } from '../src/movement/profile';
import { MoveState } from '../src/world/types';
import { setFacingMode } from '../src/world/world';
import { HEROES } from '../src/combat/roster';
import { hero, idle, inp, press, repeat, run, world } from './helpers';

const P = ON_FOOT;

// Special and Ultimate keep the M1 attack stub until M5; the buffer rules are tested on it.
test('Special starts an attack stub that roots the hero', () => {
  const w = world();
  const x0 = hero(w).x;
  run(w, [press('Special'), ...repeat(inp({ moveX: 1 }), 5)]);
  expect(hero(w).state).toBe(MoveState.Attack);
  expect(hero(w).attackKind).toBe(ActionBit.Special);
  expect(hero(w).x).toBe(x0);
});

test('the stub ends after attackFrames and the hero can walk again', () => {
  const w = world();
  run(w, [press('Special'), ...repeat(idle, P.attackFrames - 1)]);
  expect(hero(w).state).toBe(MoveState.Attack);
  run(w, [inp({ moveX: 1 })]);
  expect(hero(w).state).toBe(MoveState.Walk);
});

test('Jump then Special in the last 9 frames performs Special only (Review Focus 4)', () => {
  const w = world();
  run(w, [press('Special'), ...repeat(idle, P.attackFrames - 6), press('Jump'), press('Special')]);
  run(w, repeat(idle, 4));
  expect(hero(w).state).toBe(MoveState.Attack);
  expect(hero(w).y).toBe(0);
  run(w, repeat(idle, P.attackFrames + 2));
  expect(hero(w).state).toBe(MoveState.Idle); // no jump ever came out
});

test('a press exactly bufferFrames before the stub ends is kept', () => {
  const w = world();
  run(w, [press('Special'), ...repeat(idle, P.attackFrames - P.bufferFrames - 1), press('Jump')]);
  run(w, repeat(idle, P.bufferFrames - 1));
  expect(hero(w).state).toBe(MoveState.Attack);
  run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Air);
});

test('a press one frame earlier than the window is dropped', () => {
  const w = world();
  run(w, [press('Special'), ...repeat(idle, P.attackFrames - P.bufferFrames - 2), press('Jump')]);
  run(w, repeat(idle, P.bufferFrames + 1));
  expect(hero(w).state).toBe(MoveState.Idle);
});

test('movement during the stub is ignored, not buffered', () => {
  const w = world();
  run(w, [press('Special'), ...repeat(press('Dash', { moveX: 1 }), P.attackFrames - 1)]);
  run(w, [idle]);
  expect(hero(w).state).toBe(MoveState.Idle);
});

test('Guard is never buffered', () => {
  const w = world();
  run(w, [press('Attack'), ...repeat(idle, P.attackFrames - 3), press('Guard')]);
  expect(hero(w).bufAction).toBe(0);
});

test('Backward + Attack keeps facing and selects the Backward move (spec §5.3)', () => {
  const w = world();
  expect(hero(w).facing).toBe(1);
  run(w, [press('Attack', { moveX: -1 })]);
  expect(hero(w).facing).toBe(1);
  expect(HEROES[hero(w).hero]!.actions[hero(w).action]!.id).toBe('anchor-hook');
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
  // Stand between two dummies, right next to 101 (x 1100); 102 is at x 1300.
  const h = hero(w);
  h.x = 1180 * 256;
  h.z = 760 * 256;
  run(w, [press('Attack')]);
  expect(hero(w).targetId).toBe(101);
  expect(hero(w).facing).toBe(-1);
  run(w, repeat(idle, 7)); // Mason's Touch hits 101
  w.bodies.find((b) => b.id === 101)!.x = 1080 * 256;
  run(w, [press('Attack'), ...repeat(idle, 3)]);
  expect(HEROES[hero(w).hero]!.actions[hero(w).action]!.id).toBe('brace-elbow');
  expect(hero(w).facing).toBe(-1);
  expect(hero(w).targetId).toBe(101);
});

describe('low attack (Dash + Attack + Guard chord, or the bound action)', () => {
  const dashThen = (...frames: ReturnType<typeof inp>[]) => {
    const w = world();
    run(w, [press('Dash', { moveX: 1 }), idle, idle, ...frames]);
    return w;
  };

  test('Attack then Guard one frame later during a dash is a low attack', () => {
    const w = dashThen(press('Attack'), press('Guard'));
    expect(hero(w).state).toBe(MoveState.Attack);
    expect(hero(w).attackKind).toBe(ActionBit.LowAttack);
  });

  test('Guard then Attack within the chord window is a low attack', () => {
    const w = dashThen(press('Guard'), idle, press('Attack'));
    expect(hero(w).attackKind).toBe(ActionBit.LowAttack);
  });

  test('Attack and Guard on the same frame is a low attack', () => {
    const w = dashThen(inp({ pressed: ActionBit.Attack | ActionBit.Guard }));
    expect(hero(w).attackKind).toBe(ActionBit.LowAttack);
  });

  test('Guard too late stays an ordinary attack', () => {
    const w = dashThen(press('Attack'), idle, idle, idle, press('Guard'));
    expect(hero(w).attackKind).toBe(ActionBit.Attack);
  });

  test('without a dash, Attack + Guard is an ordinary attack', () => {
    const w = world();
    run(w, [press('Attack'), press('Guard')]);
    expect(hero(w).attackKind).toBe(ActionBit.Attack);
  });

  test('a bound Low Attack key works on its own', () => {
    const w = world();
    run(w, [press('LowAttack')]);
    expect(hero(w).attackKind).toBe(ActionBit.LowAttack);
  });
});
