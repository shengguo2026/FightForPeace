/** Abstract actions, as bits of FrameInput.pressed. */
export enum Action {
  Attack = 1,
  Jump = 2,
  Special = 4,
  Guard = 8,
  Ultimate = 16,
  Interact = 32,
  TeamAttack = 64,
}

export type ActionName = keyof typeof Action;
export type Direction = 'up' | 'down' | 'left' | 'right';
export type BindableInput = Direction | ActionName;

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];
export const ACTION_NAMES: readonly ActionName[] = [
  'Attack',
  'Jump',
  'Special',
  'Guard',
  'Ultimate',
  'Interact',
  'TeamAttack',
];

/**
 * A binding set is plain data: a device kind plus the physical codes for each input.
 * Several codes may trigger one input. M1 adds `'gamepad'` with the same shape.
 */
export interface Bindings {
  device: 'keyboard';
  codes: Record<BindableInput, string[]>;
}

/** Player 1 keyboard defaults (physical `KeyboardEvent.code` values, layout independent). */
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
  },
};

const NAMED_CODES: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Enter: 'Enter',
  ShiftLeft: 'Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Right Ctrl',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
};

function labelForCode(code: string): string {
  const named = NAMED_CODES[code];
  if (named) return named;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

/**
 * The on-screen label for an input's binding. Every key label in the UI goes through
 * this function. M0 returns the US-QWERTY label of the first code; M1 replaces it with
 * the layout-aware prompt resolver (review 06 §1) without changing callers.
 */
export function describeBinding(b: Bindings, input: BindableInput): string {
  const first = b.codes[input][0];
  return first === undefined ? 'Not assigned' : labelForCode(first);
}
