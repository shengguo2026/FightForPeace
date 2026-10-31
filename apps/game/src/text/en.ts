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
  joinKeyboard: 'Player 2: press {action:Attack} on the split keyboard to join',
  paused: 'Paused. Press {action:Pause} to continue.',
  controllerLost: 'Player {player} lost their controller.',
  controllerReconnect:
    'Reconnect it, or press the Attack button on another controller or keyboard to continue with that one.',
} as const;

export type TextKey = keyof typeof TEXT;

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
