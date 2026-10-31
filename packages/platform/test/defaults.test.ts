import { ACTION_NAMES, type Bindings, DIRECTIONS } from '../src/input/actions';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DEFAULT_KEYBOARD_P2_LAPTOP,
  DEFAULT_KEYBOARD_P2_NUMPAD,
} from '../src/input/defaults';

const all = (b: Bindings) => [...DIRECTIONS, ...ACTION_NAMES].flatMap((i) => b.codes[i]);

test('split-keyboard Player 2 matches the 2026-10-29 decision', () => {
  expect(DEFAULT_KEYBOARD_P2_NUMPAD.codes).toMatchObject({
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    Attack: ['Numpad4'],
    Jump: ['Numpad5'],
    Special: ['Numpad6'],
    Guard: ['Numpad1'],
    Ultimate: ['Numpad2'],
    Interact: ['Numpad3'],
    TeamAttack: ['Numpad0'],
  });
});

test('gamepad defaults match the 2026-10-29 decision', () => {
  expect(DEFAULT_GAMEPAD.device).toBe('gamepad');
  expect(DEFAULT_GAMEPAD.codes).toMatchObject({
    Attack: ['West'],
    Jump: ['South'],
    Special: ['North'],
    Interact: ['East'],
    Guard: ['RB'],
    Ultimate: ['RT'],
    TeamAttack: ['LB'],
    Dash: ['LT'],
    Pause: ['Start'],
  });
});

test('laptop preset mirrors T Z U / G H J on I O P / K L ;', () => {
  expect(DEFAULT_KEYBOARD_P2_LAPTOP.codes).toMatchObject({
    Attack: ['KeyI'],
    Jump: ['KeyO'],
    Special: ['KeyP'],
    Guard: ['KeyK'],
    Ultimate: ['KeyL'],
    Interact: ['Semicolon'],
    TeamAttack: ['Period'],
  });
});

test.each([
  ['P1', DEFAULT_KEYBOARD_P1],
  ['P2 numpad', DEFAULT_KEYBOARD_P2_NUMPAD],
  ['P2 laptop', DEFAULT_KEYBOARD_P2_LAPTOP],
  ['gamepad', DEFAULT_GAMEPAD],
])('%s: no code is bound to two inputs', (_name, b) => {
  const codes = all(b);
  expect(new Set(codes).size).toBe(codes.length);
});

test.each([
  ['numpad', DEFAULT_KEYBOARD_P2_NUMPAD],
  ['laptop', DEFAULT_KEYBOARD_P2_LAPTOP],
])('P1 and the %s P2 preset share no key', (_name, p2) => {
  const p1 = new Set(all(DEFAULT_KEYBOARD_P1));
  expect(all(p2).filter((c) => p1.has(c))).toEqual([]);
});
