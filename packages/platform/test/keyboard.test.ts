import { Action, type Bindings } from '../src/input/actions';
import { DEFAULT_KEYBOARD_P1 } from '../src/input/defaults';
import { describeBinding } from '../src/input/prompts';
import { DirBit } from '@ffp/sim';
import { KeyboardState } from '../src/input/keyboard';

test('default bindings use physical codes from the spec', () => {
  expect(DEFAULT_KEYBOARD_P1.device).toBe('keyboard');
  expect(DEFAULT_KEYBOARD_P1.codes).toEqual({
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    Attack: ['KeyT'],
    Jump: ['KeyY'],
    Special: ['KeyU'],
    Guard: ['KeyG'],
    Ultimate: ['KeyH'],
    Interact: ['KeyJ'],
    TeamAttack: ['KeyB'],
    Dash: [],
    LowAttack: [],
    Pause: ['Escape'],
  });
});

test('A and D held together: the most recent wins, release hands back', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyA');
  k.keyDown('KeyD');
  expect(k.sample().moveX).toBe(1);
  k.keyUp('KeyD');
  expect(k.sample().moveX).toBe(-1);
  k.keyDown('KeyD');
  k.keyUp('KeyA');
  expect(k.sample().moveX).toBe(1);
  k.keyUp('KeyD');
  expect(k.sample().moveX).toBe(0);
});

test('W and S work the same way on the depth axis', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyW');
  expect(k.sample().moveZ).toBe(-1); // up = towards the back of the stage
  k.keyDown('KeyS');
  expect(k.sample().moveZ).toBe(1);
  k.keyUp('KeyS');
  expect(k.sample().moveZ).toBe(-1);
});

test('blur releases everything so no key stays stuck', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyA');
  k.keyDown('KeyW');
  k.keyDown('KeyT');
  k.blur();
  expect(k.sample()).toEqual({ moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 });
  // A key still physically held after refocus is picked up on its next real press.
  k.keyDown('KeyA');
  expect(k.sample().moveX).toBe(-1);
});

test('physical codes: German printed Z sends KeyY and jumps', () => {
  const g = new KeyboardState(DEFAULT_KEYBOARD_P1);
  g.keyDown('KeyY');
  expect(g.sample().pressed & Action.Jump).toBeTruthy();
  expect(g.sample().pressed).toBe(0); // edge-triggered
  g.keyDown('KeyY'); // auto-repeat while held
  expect(g.sample().pressed).toBe(0);
  g.keyUp('KeyY');
  g.keyDown('KeyY');
  expect(g.sample().pressed & Action.Jump).toBeTruthy();
});

test('a tap shorter than one frame is not lost', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyT');
  k.keyUp('KeyT');
  expect(k.sample().pressed).toBe(Action.Attack);
});

test('several actions in one frame combine into the bitmask', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyT');
  k.keyDown('KeyG');
  expect(k.sample().pressed).toBe(Action.Attack | Action.Guard);
});

test('unbound codes are ignored', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyQ');
  k.keyDown('F1');
  expect(k.sample()).toEqual({ moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 });
});

test('bindings are data: rebinding changes what a key does and its label', () => {
  const custom: Bindings = {
    ...DEFAULT_KEYBOARD_P1,
    codes: { ...DEFAULT_KEYBOARD_P1.codes, Attack: ['KeyK'] },
  };
  const c = new KeyboardState(custom);
  c.keyDown('KeyT');
  expect(c.sample().pressed & Action.Attack).toBe(0); // old default no longer attacks
  c.keyDown('KeyK');
  expect(c.sample().pressed & Action.Attack).toBeTruthy();
  expect(describeBinding(custom, 'Attack')).toBe('K');
  expect(describeBinding(DEFAULT_KEYBOARD_P1, 'Attack')).toBe('T');
});

test('several codes may trigger one input', () => {
  const both: Bindings = {
    ...DEFAULT_KEYBOARD_P1,
    codes: { ...DEFAULT_KEYBOARD_P1.codes, left: ['KeyA', 'ArrowLeft'] },
  };
  const k = new KeyboardState(both);
  k.keyDown('KeyA');
  k.keyDown('ArrowLeft');
  k.keyUp('KeyA');
  expect(k.sample().moveX).toBe(-1); // still held through ArrowLeft
  k.keyUp('ArrowLeft');
  expect(k.sample().moveX).toBe(0);
});

test('describeBinding labels common codes and unbound inputs', () => {
  const b: Bindings = {
    device: 'keyboard',
    codes: {
      ...DEFAULT_KEYBOARD_P1.codes,
      up: ['ArrowUp'],
      down: ['Numpad5'],
      left: ['Digit4'],
      right: ['Space'],
      Jump: [],
    },
  };
  expect(describeBinding(b, 'up')).toBe('↑');
  expect(describeBinding(b, 'down')).toBe('Num 5');
  expect(describeBinding(b, 'left')).toBe('4');
  expect(describeBinding(b, 'right')).toBe('Space');
  expect(describeBinding(b, 'Jump')).toBe('Not assigned');
});

test('a direction tap shorter than one frame still reports a direction press', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyD');
  k.keyUp('KeyD');
  const s = k.sample();
  expect(s.moveX).toBe(0);
  expect(s.dirPressed).toBe(DirBit.right);
  expect(k.sample().dirPressed).toBe(0);
});

test('held actions are reported on every sample until released', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyG');
  expect(k.sample().held).toBe(Action.Guard);
  expect(k.sample().held).toBe(Action.Guard);
  k.keyUp('KeyG');
  expect(k.sample().held).toBe(0);
});

test('setBindings rebinds at once and releases held keys', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyD');
  k.setBindings({
    ...DEFAULT_KEYBOARD_P1,
    codes: { ...DEFAULT_KEYBOARD_P1.codes, Attack: ['KeyK'] },
  });
  expect(k.sample().moveX).toBe(0);
  k.keyDown('KeyK');
  expect(k.sample().pressed).toBe(Action.Attack);
});

test('takeEvents has its own latch for device logic', () => {
  const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
  k.keyDown('KeyT');
  expect(k.takeEvents()).toEqual({ pressed: Action.Attack, active: true });
  expect(k.takeEvents()).toEqual({ pressed: 0, active: false });
  expect(k.sample().pressed).toBe(Action.Attack);
});
