import { Action } from '../src/input/actions';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DEFAULT_KEYBOARD_P2_NUMPAD,
} from '../src/input/defaults';
import { DeviceHub } from '../src/input/devices';
import { snap } from './gamepad.test';

const XBOX = 'Xbox Wireless Controller (Vendor: 045e)';
const PS = 'DualSense Wireless Controller (Vendor: 054c)';

function hub() {
  return new DeviceHub({
    keyboardP1: DEFAULT_KEYBOARD_P1,
    keyboardP2: DEFAULT_KEYBOARD_P2_NUMPAD,
    gamepad: DEFAULT_GAMEPAD,
  });
}

function frame(h: DeviceHub, pads: Parameters<DeviceHub['pollPads']>[0] = []) {
  h.pollPads(pads);
  h.poll();
  return h.sampleFrame();
}

test('Player 1 starts on the keyboard', () => {
  const h = hub();
  h.keyboardP1.keyDown('KeyT');
  const f = frame(h);
  expect(f).toHaveLength(1);
  expect(f[0]!.pressed).toBe(Action.Attack);
  expect(h.slots[0]!.device).toBe('kb:p1');
});

test('single-player follows the device used last, both ways', () => {
  const h = hub();
  frame(h, [snap({ id: XBOX })]);
  expect(h.slots[0]!.device).toBe('kb:p1'); // connecting alone does not switch
  const f = frame(h, [snap({ id: XBOX, press: ['South'] })]);
  expect(h.slots[0]!.device).toBe('pad:0');
  expect(f[0]!.pressed).toBe(Action.Jump);
  h.keyboardP1.keyDown('KeyD');
  frame(h, [snap({ id: XBOX })]);
  expect(h.slots[0]!.device).toBe('kb:p1');
});

test('Attack on the split keyboard joins Player 2 without attacking', () => {
  const h = hub();
  h.keyboardP2.keyDown('Numpad4');
  const f = frame(h);
  expect(h.slots[1]).toMatchObject({ joined: true, device: 'kb:p2' });
  expect(f).toHaveLength(2);
  expect(f[1]!.pressed).toBe(0);
});

test('Start on a pad Player 1 is not using joins Player 2', () => {
  const h = hub();
  frame(h, [snap({ id: XBOX, press: ['Start'] })]);
  expect(h.slots[1]).toMatchObject({ joined: true, device: 'pad:0' });
  expect(h.slots[0]!.device).toBe('kb:p1');
  expect(h.userPaused).toBe(false);
});

test('after Player 2 joins, a new pad never takes over anyone (Review Focus 6)', () => {
  const h = hub();
  h.keyboardP2.keyDown('Numpad4');
  frame(h);
  frame(h, [snap({ id: XBOX, press: ['South'] }), snap({ id: PS, index: 1, press: ['West'] })]);
  expect(h.slots.map((s) => s.device)).toEqual(['kb:p1', 'kb:p2']);
  h.keyboardP2.keyUp('Numpad4');
  h.keyboardP2.keyDown('ArrowLeft');
  expect(frame(h)[1]!.moveX).toBe(-1);
});

test('unplugging an assigned pad pauses until the same pad returns', () => {
  const h = hub();
  frame(h, [snap({ id: XBOX, press: ['Start'] })]); // P2 joins on the pad
  frame(h, [snap({ id: XBOX })]);
  frame(h, []); // unplugged
  expect(h.paused).toBe(true);
  expect(h.waitingSlots()).toEqual([1]);
  h.keyboardP1.keyDown('KeyD');
  frame(h, []);
  expect(h.paused).toBe(true); // other players' input does not resume
  frame(h, [snap({ id: XBOX, index: 2 })]); // same pad, new index
  expect(h.paused).toBe(false);
  expect(h.slots[1]!.device).toBe('pad:2');
});

test('a waiting player can take another device by pressing Attack on it', () => {
  const h = hub();
  frame(h, [snap({ id: XBOX, press: ['Start'] })]);
  frame(h, []);
  expect(h.paused).toBe(true);
  frame(h, [snap({ id: PS, index: 1, press: ['West'] })]);
  expect(h.paused).toBe(false);
  expect(h.slots[1]!.device).toBe('pad:1');
});

test('single-player on a pad: unplugging pauses, the keyboard Attack resumes', () => {
  const h = hub();
  frame(h, [snap({ id: XBOX, press: ['South'] })]);
  expect(h.slots[0]!.device).toBe('pad:0');
  frame(h, []);
  expect(h.paused).toBe(true);
  h.keyboardP1.keyDown('KeyT');
  frame(h, []);
  expect(h.paused).toBe(false);
  expect(h.slots[0]!.device).toBe('kb:p1');
});

test('Pause on an assigned device toggles the user pause and drops inputs meanwhile', () => {
  const h = hub();
  h.keyboardP1.keyDown('Escape');
  frame(h);
  expect(h.paused).toBe(true);
  h.keyboardP1.keyUp('Escape');
  h.keyboardP1.keyDown('KeyT');
  h.poll(); // paused: the game does not step, latches are dropped
  h.keyboardP1.keyDown('Escape');
  h.poll();
  expect(h.paused).toBe(false);
  expect(h.sampleFrame()[0]!.pressed & Action.Attack).toBe(0);
});
