import type { Bindings } from './actions';

/** Player 1 keyboard (left cluster). Physical codes, so QWERTZ `Z` (code KeyY) is Jump. */
export const DEFAULT_KEYBOARD_P1: Bindings = {
  device: 'keyboard',
  codes: {
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
  },
};

/**
 * Player 2 on a split keyboard with a numpad (confirmed 2026-10-29): mirrors P1's
 * `T Z U` / `G H J` as `Num 4 5 6` / `Num 1 2 3`. Physical codes work with Num Lock on or off.
 */
export const DEFAULT_KEYBOARD_P2_NUMPAD: Bindings = {
  device: 'keyboard',
  codes: {
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
    Dash: [],
    LowAttack: [],
    Pause: [],
  },
};

/**
 * Player 2 on a laptop without a numpad (proposed in the M1 plan): arrows to move,
 * `I O P` / `K L ;` mirror P1's `T Z U` / `G H J`, Team Attack on `.`. Shares no key with P1.
 */
export const DEFAULT_KEYBOARD_P2_LAPTOP: Bindings = {
  device: 'keyboard',
  codes: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    Attack: ['KeyI'],
    Jump: ['KeyO'],
    Special: ['KeyP'],
    Guard: ['KeyK'],
    Ultimate: ['KeyL'],
    Interact: ['Semicolon'],
    TeamAttack: ['Period'],
    Dash: [],
    LowAttack: [],
    Pause: [],
  },
};

/** Gamepad defaults (standard mapping, confirmed 2026-10-29). */
export const DEFAULT_GAMEPAD: Bindings = {
  device: 'gamepad',
  codes: {
    up: ['DpadUp'],
    down: ['DpadDown'],
    left: ['DpadLeft'],
    right: ['DpadRight'],
    Attack: ['West'],
    Jump: ['South'],
    Special: ['North'],
    Guard: ['RB'],
    Ultimate: ['RT'],
    Interact: ['East'],
    TeamAttack: ['LB'],
    Dash: ['LT'],
    LowAttack: [],
    Pause: ['Start'],
  },
};

export type KeyboardP2Preset = 'numpad' | 'laptop';

export function keyboardP2(preset: KeyboardP2Preset): Bindings {
  return preset === 'laptop' ? DEFAULT_KEYBOARD_P2_LAPTOP : DEFAULT_KEYBOARD_P2_NUMPAD;
}
