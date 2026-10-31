import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ActionBit } from '@ffp/sim';

/**
 * Review 06 §1.2 rule 1: player-facing text never contains a key or button name. Prompt
 * text uses {action:Name} and {dir:Name} tokens, drawn from the player's own bindings.
 */
const textDir = fileURLToPath(new URL('../../apps/game/src/text/', import.meta.url));

const FORBIDDEN = [
  /\bKey[A-Z]\b/, // physical codes
  /\bDigit\d\b/,
  /\bNumpad\d?\b/,
  /\bNum \d\b/,
  /\bArrow(Up|Down|Left|Right)\b/,
  /\[[A-Z0-9]\]/, // "[T]"
  /\b(press|hold|tap|drücke|halte)\s+[A-Z]\b/i, // "Press T"
  /\b(Space|Enter|Shift|Esc|Escape)\b/,
  /[✕○□△]/, // pad glyphs
  /\b(LB|RB|LT|RT|L1|R1|L2|R2|ZL|ZR)\b/,
];

const DIRS = ['Forward', 'Backward', 'Up', 'Down', 'Left', 'Right'];

/** The string literals of a text file (single, double and template quotes). */
function strings(source: string): string[] {
  return [...source.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`]*)`/g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? '',
  );
}

function check(s: string): string[] {
  const problems: string[] = [];
  const withoutTokens = s.replace(/\{[^}]*\}/g, '');
  for (const re of FORBIDDEN) if (re.test(withoutTokens)) problems.push(`${re} in "${s}"`);
  for (const m of s.matchAll(/\{(action|dir):(\w+)\}/g)) {
    const ok = m[1] === 'action' ? m[2]! in ActionBit : DIRS.includes(m[2]!);
    if (!ok) problems.push(`unknown token ${m[0]} in "${s}"`);
  }
  return problems;
}

test('the checker catches raw key names', () => {
  for (const bad of ['Press T to attack', 'KeyT', 'Numpad4', 'Jump [Z]', 'Hold Shift', 'Press ✕']) {
    expect(check(bad), bad).not.toEqual([]);
  }
  expect(check('Press {action:Attack} three times')).toEqual([]);
  expect(check('Move {dir:Forward} then {action:Jump}')).toEqual([]);
  expect(check('{action:Kick}')).not.toEqual([]);
});

test('player-facing text files contain no key or button names', () => {
  const files = readdirSync(textDir).filter((f) => f.endsWith('.ts'));
  expect(files.length).toBeGreaterThan(0);
  const problems = files.flatMap((f) =>
    strings(readFileSync(textDir + f, 'utf8'))
      .filter((s) => !s.startsWith('.') && !s.includes('/') && s.trim() !== '')
      .flatMap(check)
      .map((p) => `${f}: ${p}`),
  );
  expect(problems).toEqual([]);
});
