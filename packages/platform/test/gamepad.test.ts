import { DirBit } from '@ffp/sim';
import { Action, PAD_BUTTONS } from '../src/input/actions';
import { DEFAULT_GAMEPAD } from '../src/input/defaults';
import { GamepadState, type PadSnapshot, padFamily, stickDirection } from '../src/input/gamepad';

export function snap(over: Partial<PadSnapshot> & { press?: string[] } = {}): PadSnapshot {
  const buttons = PAD_BUTTONS.map((b) => over.press?.includes(b) ?? false);
  return {
    id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
    index: 0,
    connected: true,
    mapping: 'standard',
    buttons,
    axes: [0, 0, 0, 0],
    ...over,
  };
}

test('stick inside the dead zone is neutral', () => {
  expect(stickDirection(0.2, 0.2)).toEqual([0, 0]);
  expect(stickDirection(0.29, 0)).toEqual([0, 0]);
  expect(stickDirection(0.31, 0)).toEqual([1, 0]);
});

test('stick uses 8 sectors of 45°', () => {
  expect(stickDirection(1, 0)).toEqual([1, 0]);
  expect(stickDirection(0.7, 0.7)).toEqual([1, 1]);
  expect(stickDirection(0, -1)).toEqual([0, -1]); // up = back of the stage
  expect(stickDirection(-0.7, -0.7)).toEqual([-1, -1]);
  // 20° below horizontal is still "right"; 25° is "down-right".
  expect(stickDirection(Math.cos(0.349), Math.sin(0.349))).toEqual([1, 0]);
  expect(stickDirection(Math.cos(0.436), Math.sin(0.436))).toEqual([1, 1]);
});

test('pad family from device names', () => {
  expect(padFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
  expect(padFamily('045e-02ea-Microsoft X-Box One S pad')).toBe('xbox');
  expect(
    padFamily('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'),
  ).toBe('playstation');
  expect(padFamily('054c-09cc-Wireless Controller')).toBe('playstation');
  expect(padFamily('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)')).toBe(
    'nintendo',
  );
  expect(padFamily('USB Gamepad (Vendor: 0079 Product: 0011)')).toBe('generic');
});

test('d-pad and stick give the same movement and direction presses', () => {
  const a = new GamepadState(DEFAULT_GAMEPAD, snap());
  a.update(snap({ press: ['DpadRight'] }));
  const b = new GamepadState(DEFAULT_GAMEPAD, snap());
  b.update(snap({ axes: [0.9, 0, 0, 0] }));
  expect(a.sample()).toEqual(b.sample());
});

test('stick flicks produce direction presses for double-tap dashes', () => {
  const p = new GamepadState(DEFAULT_GAMEPAD, snap());
  p.update(snap({ axes: [1, 0, 0, 0] }));
  expect(p.sample().dirPressed).toBe(DirBit.right);
  p.update(snap({ axes: [1, 0, 0, 0] }));
  expect(p.sample().dirPressed).toBe(0);
  p.update(snap());
  p.update(snap({ axes: [1, 0, 0, 0] }));
  expect(p.sample().dirPressed).toBe(DirBit.right);
});

test('buttons are edge-triggered presses and held masks', () => {
  const p = new GamepadState(DEFAULT_GAMEPAD, snap());
  p.update(snap({ press: ['South', 'RB'] }));
  const s = p.sample();
  expect(s.pressed).toBe(Action.Jump | Action.Guard);
  expect(s.held).toBe(Action.Jump | Action.Guard);
  p.update(snap({ press: ['South', 'RB'] }));
  expect(p.sample()).toMatchObject({ pressed: 0, held: Action.Jump | Action.Guard });
});

test('a press and release between two samples is not lost', () => {
  const p = new GamepadState(DEFAULT_GAMEPAD, snap());
  p.update(snap({ press: ['West'] }));
  p.update(snap());
  expect(p.sample().pressed).toBe(Action.Attack);
});

test('LT is the optional Dash button', () => {
  const p = new GamepadState(DEFAULT_GAMEPAD, snap());
  p.update(snap({ press: ['LT'] }));
  expect(p.sample().pressed).toBe(Action.Dash);
});
