/**
 * Player-facing English text for M1. Strings never contain a key or button name:
 * `{action:Attack}` and `{dir:Forward}` tokens are drawn by <InputPrompt> from the
 * player's current bindings and device. tests/lint/prompt-text.test.ts enforces this.
 */
export const TEXT = {
  hintMove: 'Move {dir:Up}{dir:Left}{dir:Down}{dir:Right}',
  hintDash: 'Dash {action:Dash}',
  hintJump: 'Jump {action:Jump}',
  hintAttack: 'Attack {action:Attack}',
  hintLowAttack: 'Low attack {action:LowAttack}',
  hintAirAttack: 'Air attack {action:Jump} then {action:Attack}',
  hintGuard: 'Guard {action:Guard}',
  hintCounter: 'Counter {dir:Forward}+{action:Guard} just before contact',
  hintBreaker: 'Combo Breaker {action:Guard}+{action:Ultimate} while being hit',
  joinKeyboard: 'Player 2: press {action:Attack} on the split keyboard to join',
  paused: 'Paused. Press {action:Pause} to continue.',
  controllerLost: 'Player {player} lost their controller.',
  controllerReconnect:
    'Reconnect it, or press the Attack button on another controller or keyboard to continue with that one.',
} as const;

export type TextKey = keyof typeof TEXT;

/** Move-list input notation per input context and direction code (Dir: 0 neutral … 5 up/down). */
const DIR_PREFIX = [
  '',
  '{dir:Forward}+',
  '{dir:Backward}+',
  '{dir:Up}+',
  '{dir:Down}+',
  '{dir:Up}/{dir:Down}+',
];

export function moveInputText(context: string, dir: number): string {
  const d = DIR_PREFIX[dir] ?? '';
  switch (context) {
    case 'neutral':
      return `${d}{action:Attack}`;
    case 'chain':
      return 'repeat {action:Attack}';
    case 'air':
      return `in the air: ${d}{action:Attack}`;
    case 'dash':
      return 'dashing: {action:Attack}';
    case 'dashLow':
      return 'dashing: {action:Attack}+{action:Guard}, or {action:LowAttack}';
    case 'groundFocus':
      return `near a downed target: ${d}{action:Attack}`;
    case 'counter':
      return 'toward the attacker: {dir:Forward}+{action:Guard} just before contact';
    default:
      return '';
  }
}

/** Move-list notation for a cancel link to something other than an attack. */
export const LINK_TEXT = {
  jump: '{action:Jump}',
  dash: '{action:Dash} or {dir:Forward}{dir:Forward}',
  special: 'Special {action:Special}',
  ultimate: 'Ultimate {action:Ultimate}',
} as const;

/**
 * Defense timing readouts (Lab F8), by DefEvent code. `{o}` is the timing offset in
 * frames, `{a}` the incoming attack, `{w}` the window.
 */
export const DEFENSE_TEXT: Record<number, string> = {
  1: 'Guarded {a} (guard held)',
  2: 'Exact Block ✓ {a}: pressed {o} f before contact (window {w} f)',
  3: 'Exact Block ✓ {a}: sequence broken, pressed {o} f before contact (window {w} f)',
  4: 'GUARD CRUSH by {a}: Defense exhausted',
  5: 'Counter ✓ {a}: pressed {o} f before contact (window {w} f)',
  6: 'Counter ✗ no contact inside the {w} f window: vulnerable recovery',
  7: 'Counter ✗ {a} came from outside the counter direction',
  8: 'Guarded {a}: pressed {o} f before contact, too early for Exact Block (window {w} f)',
  9: 'Too late: Guard pressed {o} f after the contact (no correction after contact)',
  10: '{a} pierces a held guard: Exact Block it',
  11: '{a} is unblockable: move away',
  12: '{a} came from outside the guard arc',
  13: 'Combo Breaker ✓ 75 % Defense spent',
  14: 'Combo Breaker ✗ {reason}',
  15: 'Counter ✗ {a} cannot be countered',
  16: 'Hit by {a}',
  17: 'Guarded {a}: pressed {o} f before contact, but inside the precision cooldown',
};

export const BREAKER_DENIED: Record<number, string> = {
  1: 'needs 75 % Defense',
  2: 'only while being hit, juggled or in a ground window',
  3: 'already used in this combo',
};

/** Defense-response profile of an attack, in words (telegraph labels; never colour alone). */
export function profileText(tags: readonly string[]): string {
  const parts: string[] = [];
  if (tags.includes('unblockable')) parts.push('UNBLOCKABLE');
  else if (tags.includes('guardPiercing')) parts.push('PIERCES GUARD');
  else if (tags.includes('guardPressure')) parts.push('GUARD PRESSURE');
  if (tags.includes('counterable') && !tags.includes('uncounterable')) parts.push('counterable');
  return parts.join(' · ');
}

export type TextPart =
  { kind: 'text'; text: string } | { kind: 'action'; name: string } | { kind: 'dir'; name: string };

/** Splits a string into plain text and prompt tokens; `{player}` style values are filled in. */
export function parseText(s: string, values: Record<string, string | number> = {}): TextPart[] {
  const parts: TextPart[] = [];
  const re = /\{(action|dir):(\w+)\}|\{(\w+)\}/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index > last) parts.push({ kind: 'text', text: s.slice(last, m.index) });
    if (m[1] === 'action') parts.push({ kind: 'action', name: m[2]! });
    else if (m[1] === 'dir') parts.push({ kind: 'dir', name: m[2]! });
    else parts.push({ kind: 'text', text: String(values[m[3]!] ?? m[0]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ kind: 'text', text: s.slice(last) });
  return parts;
}
