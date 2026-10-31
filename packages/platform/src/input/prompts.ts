import type { ActionName, BindableInput, Bindings, Direction } from './actions';
import type { PadFamily } from './gamepad';
import { KeyLabelSource } from './layout';

/** What a prompt can ask for: an abstract action, or a direction relative to facing. */
export type PromptInput = { action: ActionName } | { dir: StageDirection | Direction };

/** Directions as text tokens use them: Forward/Backward follow facing, the rest are fixed. */
export type StageDirection = 'Forward' | 'Backward' | 'Up' | 'Down' | 'Left' | 'Right';

export type Prompt =
  | { kind: 'key'; code: string; label: string; a11y: string }
  | { kind: 'pad'; family: PadFamily; button: string; label: string; a11y: string }
  | { kind: 'chord'; parts: Prompt[]; a11y: string }
  | { kind: 'gesture'; gesture: 'doubleTap'; part: Prompt; a11y: string }
  | { kind: 'unassigned'; a11y: string };

export interface PromptContext {
  bindings: Bindings;
  labels: KeyLabelSource;
  /** Glyph family for gamepads: detected, or the player's "button prompt style". */
  family: PadFamily;
  /** The hero's facing, so Forward / Backward resolve to the right key. */
  facing: 1 | -1;
}

type GlyphSet = Partial<Record<string, string>>;

const FACE_NAMES: Record<string, string> = {
  South: 'bottom',
  East: 'right',
  West: 'left',
  North: 'top',
};

const GLYPHS: Record<PadFamily, GlyphSet> = {
  xbox: {
    South: 'A',
    East: 'B',
    West: 'X',
    North: 'Y',
    LB: 'LB',
    RB: 'RB',
    LT: 'LT',
    RT: 'RT',
    Start: 'Menu',
    Back: 'View',
  },
  playstation: {
    South: '✕',
    East: '○',
    West: '□',
    North: '△',
    LB: 'L1',
    RB: 'R1',
    LT: 'L2',
    RT: 'R2',
    Start: 'Options',
    Back: 'Create',
  },
  // Nintendo pads put B at the bottom and Y on the left: same positions, other letters.
  nintendo: {
    South: 'B',
    East: 'A',
    West: 'Y',
    North: 'X',
    LB: 'L',
    RB: 'R',
    LT: 'ZL',
    RT: 'ZR',
    Start: '+',
    Back: '−',
  },
  generic: {
    South: '●↓',
    East: '●→',
    West: '●←',
    North: '●↑',
    LB: 'L1',
    RB: 'R1',
    LT: 'L2',
    RT: 'R2',
    Start: 'Start',
    Back: 'Select',
  },
};

const DPAD: Record<string, string> = {
  DpadUp: '✚↑',
  DpadDown: '✚↓',
  DpadLeft: '✚←',
  DpadRight: '✚→',
};

const ACTION_A11Y: Record<ActionName, string> = {
  Attack: 'Attack',
  Jump: 'Jump',
  Special: 'Special',
  Guard: 'Guard',
  Ultimate: 'Ultimate',
  Interact: 'Grab',
  TeamAttack: 'Team Attack',
  Dash: 'Dash',
  LowAttack: 'Low Attack',
  Pause: 'Pause',
};

/** The glyph for one gamepad position in a family. */
export function padGlyph(family: PadFamily, button: string): { label: string; a11y: string } {
  const dpad = DPAD[button];
  if (dpad) return { label: dpad, a11y: `D-pad ${button.slice(4).toLowerCase()}` };
  const label = GLYPHS[family][button] ?? button;
  const face = FACE_NAMES[button];
  const a11y = family === 'generic' && face ? `${face} face button` : `${label} button`;
  return { label, a11y };
}

function codePrompt(ctx: PromptContext, code: string): Prompt {
  if (ctx.bindings.device === 'gamepad') {
    const g = padGlyph(ctx.family, code);
    return { kind: 'pad', family: ctx.family, button: code, ...g };
  }
  const label = ctx.labels.label(code);
  return { kind: 'key', code, label, a11y: `${label} key` };
}

function bound(ctx: PromptContext, input: BindableInput): Prompt | null {
  const code = ctx.bindings.codes[input]?.[0];
  return code === undefined ? null : codePrompt(ctx, code);
}

function directionOf(ctx: PromptContext, dir: StageDirection | Direction): Direction {
  switch (dir) {
    case 'Forward':
      return ctx.facing === 1 ? 'right' : 'left';
    case 'Backward':
      return ctx.facing === 1 ? 'left' : 'right';
    case 'Up':
      return 'up';
    case 'Down':
      return 'down';
    case 'Left':
      return 'left';
    case 'Right':
      return 'right';
    default:
      return dir;
  }
}

const UNASSIGNED: Prompt = { kind: 'unassigned', a11y: 'Not assigned' };

/**
 * Resolves an abstract action or direction to what this player has to press right now
 * (review 06 §1.2). Optional actions fall back to their default gestures: Dash to a
 * double tap of Forward, Low Attack to the chord Dash + Attack + Guard. Anything else
 * without a binding is shown as "Not assigned", never hidden.
 */
export function resolvePrompt(ctx: PromptContext, input: PromptInput): Prompt {
  if ('dir' in input) return bound(ctx, directionOf(ctx, input.dir)) ?? UNASSIGNED;
  const direct = bound(ctx, input.action);
  if (direct) return direct;
  if (input.action === 'Dash') {
    const fwd = bound(ctx, directionOf(ctx, 'Forward'));
    if (!fwd) return UNASSIGNED;
    return { kind: 'gesture', gesture: 'doubleTap', part: fwd, a11y: `double-tap ${fwd.a11y}` };
  }
  if (input.action === 'LowAttack') {
    const parts = [
      resolvePrompt(ctx, { action: 'Dash' }),
      resolvePrompt(ctx, { action: 'Attack' }),
      resolvePrompt(ctx, { action: 'Guard' }),
    ];
    if (parts.some((p) => p.kind === 'unassigned')) return UNASSIGNED;
    return { kind: 'chord', parts, a11y: parts.map((p) => p.a11y).join(' + ') };
  }
  return UNASSIGNED;
}

/** Plain-text form of a prompt, for logs, tests and tooltips. */
export function promptText(p: Prompt): string {
  switch (p.kind) {
    case 'key':
    case 'pad':
      return p.label;
    case 'chord':
      return p.parts.map(promptText).join('+');
    case 'gesture':
      return `${promptText(p.part)}${promptText(p.part)}`;
    case 'unassigned':
      return 'Not assigned';
  }
}

export { ACTION_A11Y };

const defaultLabels = new KeyLabelSource();

/**
 * The on-screen label for an input's binding with US-QWERTY labels. Kept from M0 for
 * simple callers; new UI uses resolvePrompt with the player's KeyLabelSource.
 */
export function describeBinding(b: Bindings, input: BindableInput): string {
  const p = bound({ bindings: b, labels: defaultLabels, family: 'generic', facing: 1 }, input);
  return p ? promptText(p) : 'Not assigned';
}
