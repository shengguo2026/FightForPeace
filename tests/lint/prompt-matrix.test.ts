import { describe, expect, test } from 'vitest';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  KeyLabelSource,
  LOCALES,
  keyboardP2,
  promptA11y,
  promptText,
  rebind,
  resolvePrompt,
  type Bindings,
  type Catalog,
  type LayoutName,
  type Locale,
  type PadFamily,
  type PromptInput,
  type PromptWords,
} from '../../packages/platform/src/index';
import { CATALOGS, baseCatalog } from '../../apps/game/src/text/i18n';

/**
 * M14 button-prompt matrix (review 06 §1.5, roadmap M14): every prompt token used in any
 * catalogue, in every language × keyboard layout × gamepad family × default and rebound
 * bindings × each keyboard player and the gamepad. Each resolves to something the player
 * can press, the rebinding shows, the label follows the layout, and the spoken text is in
 * the player's own language.
 */
const LAYOUTS: LayoutName[] = ['qwerty', 'qwertz', 'azerty'];
const FAMILIES: PadFamily[] = ['xbox', 'playstation', 'nintendo', 'generic'];

function catalogOf(locale: Locale): Catalog {
  return locale === 'en' ? baseCatalog() : { ...baseCatalog(), ...CATALOGS[locale] };
}

function wordsOf(locale: Locale): PromptWords {
  const c = catalogOf(locale);
  const w = (k: string) => c[`prompt.a11y.${k}`]!;
  return {
    key: w('key'),
    button: w('button'),
    face: w('face'),
    faces: { bottom: w('bottom'), right: w('right'), left: w('left'), top: w('top') },
    dpad: { up: w('dpadUp'), down: w('dpadDown'), left: w('dpadLeft'), right: w('dpadRight') },
    doubleTap: w('doubleTap'),
    unassigned: c['prompt.unassigned']!,
  };
}

/** Every distinct `{action:…}` / `{dir:…}` token in every catalogue. */
function tokens(): PromptInput[] {
  const seen = new Set<string>();
  for (const l of LOCALES)
    for (const s of Object.values(catalogOf(l)))
      for (const m of s.matchAll(/\{(action|dir):(\w+)\}/g)) seen.add(`${m[1]}:${m[2]}`);
  return [...seen].sort().map((t) => {
    const [kind, name] = t.split(':') as [string, string];
    return kind === 'action' ? ({ action: name } as PromptInput) : ({ dir: name } as PromptInput);
  });
}

const PLAYERS: { name: string; bindings: Bindings }[] = [
  { name: 'P1 keyboard', bindings: DEFAULT_KEYBOARD_P1 },
  { name: 'P2 numpad', bindings: keyboardP2('numpad') },
  { name: 'P2 laptop', bindings: keyboardP2('laptop') },
  { name: 'gamepad', bindings: DEFAULT_GAMEPAD },
];

function rebound(b: Bindings): Bindings {
  return b.device === 'gamepad'
    ? rebind(rebind(b, 'Attack', ['North']), 'Jump', ['RB'])
    : rebind(rebind(b, 'Attack', ['KeyK']), 'Jump', ['Space']);
}

const ALL = tokens();

test('the catalogues use prompt tokens (the matrix is not empty)', () => {
  expect(ALL.length).toBeGreaterThanOrEqual(10);
});

describe('every token resolves in every combination', () => {
  for (const locale of LOCALES)
    test(`${locale}: ${LAYOUTS.length} layouts × ${FAMILIES.length} families × rebinding × ${PLAYERS.length} players`, () => {
      const words = wordsOf(locale);
      const problems: string[] = [];
      let cells = 0;
      for (const layout of LAYOUTS)
        for (const family of FAMILIES)
          for (const player of PLAYERS)
            for (const variant of ['default', 'rebound'] as const)
              for (const facing of [1, -1] as const) {
                const labels = new KeyLabelSource();
                labels.setPickedLayout(layout);
                labels.setKeyNames(locale);
                const bindings = variant === 'default' ? player.bindings : rebound(player.bindings);
                const ctx = { bindings, labels, family, facing };
                for (const input of ALL) {
                  cells += 1;
                  const p = resolvePrompt(ctx, input);
                  const at = `${layout}/${family}/${player.name}/${variant}/${JSON.stringify(input)}`;
                  // Pause has no gamepad-free fallback problem; everything else must be pressable.
                  if (p.kind === 'unassigned') problems.push(`unassigned ${at}`);
                  if (promptText(p).trim() === '') problems.push(`empty ${at}`);
                  const spoken = promptA11y(p, words);
                  if (spoken.trim() === '' || /\{\w+\}/.test(spoken))
                    problems.push(`spoken "${spoken}" ${at}`);
                  if (locale !== 'en' && /\b(key|button|double-tap|D-pad)\b/.test(spoken))
                    problems.push(`English spoken "${spoken}" ${at}`);
                }
              }
      expect(problems.slice(0, 10)).toEqual([]);
      expect(cells).toBe(LAYOUTS.length * FAMILIES.length * PLAYERS.length * 2 * 2 * ALL.length);
    });
});

describe('what the player sees follows layout, family, rebinding and language', () => {
  const labels = (layout: LayoutName, locale: Locale = 'en') => {
    const l = new KeyLabelSource();
    l.setPickedLayout(layout);
    l.setKeyNames(locale);
    return l;
  };
  const show = (
    b: Bindings,
    input: PromptInput,
    layout: LayoutName,
    family: PadFamily = 'xbox',
    locale: Locale = 'en',
  ) =>
    promptText(
      resolvePrompt({ bindings: b, labels: labels(layout, locale), family, facing: 1 }, input),
    );

  test('Jump is the key printed Y on QWERTY and AZERTY, Z on QWERTZ (same physical key)', () => {
    expect(show(DEFAULT_KEYBOARD_P1, { action: 'Jump' }, 'qwerty')).toBe('Y');
    expect(show(DEFAULT_KEYBOARD_P1, { action: 'Jump' }, 'qwertz')).toBe('Z');
    expect(show(DEFAULT_KEYBOARD_P1, { action: 'Jump' }, 'azerty')).toBe('Y');
    expect(show(DEFAULT_KEYBOARD_P1, { dir: 'Up' }, 'azerty')).toBe('Z');
  });

  test('rebinding shows the new key, in the language of the key name', () => {
    const b = rebound(DEFAULT_KEYBOARD_P1);
    expect(show(b, { action: 'Attack' }, 'qwerty')).toBe('K');
    expect(show(b, { action: 'Jump' }, 'qwerty', 'xbox', 'en')).toBe('Space');
    expect(show(b, { action: 'Jump' }, 'qwertz', 'xbox', 'de')).toBe('Leertaste');
    expect(show(b, { action: 'Jump' }, 'qwerty', 'xbox', 'zh-CN')).toBe('空格');
  });

  test('the gamepad shows its own family glyph for the same button', () => {
    const south = (f: PadFamily) => show(DEFAULT_GAMEPAD, { action: 'Jump' }, 'qwerty', f);
    expect(new Set(FAMILIES.map(south)).size).toBe(4);
    expect(show(rebound(DEFAULT_GAMEPAD), { action: 'Jump' }, 'qwerty', 'playstation')).toBe('R1');
  });

  test('Dash falls back to a double tap of Forward, which turns with the facing', () => {
    const ctx = (facing: 1 | -1) => ({
      bindings: DEFAULT_KEYBOARD_P1,
      labels: labels('qwerty'),
      family: 'xbox' as const,
      facing,
    });
    expect(promptText(resolvePrompt(ctx(1), { action: 'Dash' }))).toBe('DD');
    expect(promptText(resolvePrompt(ctx(-1), { action: 'Dash' }))).toBe('AA');
    const words = wordsOf('de');
    expect(promptA11y(resolvePrompt(ctx(1), { action: 'Dash' }), words)).toBe('zweimal Taste D');
  });

  test('spoken prompts in each language', () => {
    const p = resolvePrompt(
      { bindings: DEFAULT_GAMEPAD, labels: labels('qwerty'), family: 'generic', facing: 1 },
      { action: 'Jump' },
    );
    expect(promptA11y(p, wordsOf('en'))).toBe('bottom face button');
    expect(promptA11y(p, wordsOf('de'))).toBe('unterer Aktionsknopf');
    expect(promptA11y(p, wordsOf('zh-CN'))).toBe('下侧功能键');
  });
});
