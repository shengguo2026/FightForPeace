import { ActionBit, type ActionName } from '@ffp/sim';

/** Abstract actions, as bits of FrameInput.pressed / held. Shared with the simulation. */
export const Action = ActionBit;
export type { ActionName };

export type Direction = 'up' | 'down' | 'left' | 'right';
export type BindableInput = Direction | ActionName;
export type DeviceKind = 'keyboard' | 'gamepad';

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];
export const ACTION_NAMES: readonly ActionName[] = [
  'Attack',
  'Jump',
  'Special',
  'Guard',
  'Ultimate',
  'Interact',
  'TeamAttack',
  'Dash',
  'LowAttack',
  'Pause',
];

/**
 * A binding set is plain data: a device kind plus the codes for each input. Keyboard
 * codes are physical `KeyboardEvent.code` values; gamepad codes are standard-mapping
 * positions (see PAD_BUTTONS). Several codes may trigger one input; an empty list means
 * "not assigned".
 */
export interface Bindings {
  device: DeviceKind;
  codes: Record<BindableInput, string[]>;
}

/** Standard-mapping gamepad positions, in W3C button index order. */
export const PAD_BUTTONS = [
  'South',
  'East',
  'West',
  'North',
  'LB',
  'RB',
  'LT',
  'RT',
  'Back',
  'Start',
  'LS',
  'RS',
  'DpadUp',
  'DpadDown',
  'DpadLeft',
  'DpadRight',
  'Home',
] as const;
export type PadButton = (typeof PAD_BUTTONS)[number];

/** Returns a copy with one input rebound to the given codes. */
export function rebind(b: Bindings, input: BindableInput, codes: string[]): Bindings {
  return { device: b.device, codes: { ...b.codes, [input]: [...codes] } };
}
