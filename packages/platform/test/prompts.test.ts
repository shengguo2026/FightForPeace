import { type Bindings, rebind } from '../src/input/actions';
import {
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DEFAULT_KEYBOARD_P2_NUMPAD,
} from '../src/input/defaults';
import { KeyLabelSource } from '../src/input/layout';
import { type PromptContext, promptText, resolvePrompt } from '../src/input/prompts';

function ctx(over: Partial<PromptContext> = {}): PromptContext {
  return {
    bindings: DEFAULT_KEYBOARD_P1,
    labels: new KeyLabelSource(),
    family: 'xbox',
    facing: 1,
    ...over,
  };
}
const text = (c: PromptContext, i: Parameters<typeof resolvePrompt>[1]) =>
  promptText(resolvePrompt(c, i));

test('Jump (KeyY) shows Z on QWERTZ and Y on QWERTY', () => {
  const labels = new KeyLabelSource();
  expect(text(ctx({ labels }), { action: 'Jump' })).toBe('Y');
  labels.setPickedLayout('qwertz');
  expect(text(ctx({ labels }), { action: 'Jump' })).toBe('Z');
});

test('an observed key press overrides the picked layout', () => {
  const labels = new KeyLabelSource();
  labels.setPickedLayout('qwerty');
  const v = labels.version;
  labels.observe('KeyY', 'z');
  expect(labels.version).toBeGreaterThan(v);
  expect(labels.label('KeyY')).toBe('Z');
  labels.observe('Numpad4', '4'); // numpad keys keep their names
  expect(labels.label('Numpad4')).toBe('Num 4');
});

test('a browser layout map overrides both', () => {
  const labels = new KeyLabelSource();
  labels.observe('KeyY', 'y');
  labels.setLayoutMap([['KeyY', 'z']]);
  expect(labels.label('KeyY')).toBe('Z');
});

test('AZERTY moves letters to their printed positions', () => {
  const labels = new KeyLabelSource();
  labels.setPickedLayout('azerty');
  expect(labels.label('KeyW')).toBe('Z');
  expect(labels.label('KeyA')).toBe('Q');
  expect(labels.label('KeyT')).toBe('T');
});

test('named keys', () => {
  const labels = new KeyLabelSource();
  expect(labels.label('ArrowLeft')).toBe('←');
  expect(labels.label('Space')).toBe('Space');
  expect(labels.label('Numpad0')).toBe('Num 0');
  expect(labels.label('Escape')).toBe('Esc');
});

test('Forward and Backward follow facing', () => {
  expect(text(ctx({ facing: 1 }), { dir: 'Forward' })).toBe('D');
  expect(text(ctx({ facing: -1 }), { dir: 'Forward' })).toBe('A');
  expect(text(ctx({ facing: -1 }), { dir: 'Backward' })).toBe('D');
  expect(text(ctx(), { dir: 'Up' })).toBe('W');
  expect(text(ctx({ facing: -1 }), { dir: 'Left' })).toBe('A');
  expect(text(ctx(), { dir: 'Right' })).toBe('D');
});

test('gamepad glyphs follow the family (same left button)', () => {
  const pad = (family: PromptContext['family']) =>
    resolvePrompt(ctx({ bindings: DEFAULT_GAMEPAD, family }), { action: 'Attack' });
  expect(pad('xbox')).toMatchObject({ kind: 'pad', label: 'X' });
  expect(pad('playstation')).toMatchObject({ kind: 'pad', label: '□' });
  expect(pad('nintendo')).toMatchObject({ kind: 'pad', label: 'Y' });
  expect(pad('generic')).toMatchObject({ kind: 'pad', a11y: 'left face button' });
  expect(text(ctx({ bindings: DEFAULT_GAMEPAD, family: 'playstation' }), { action: 'Jump' })).toBe(
    '✕',
  );
});

test('split-keyboard Player 2 sees numpad keys', () => {
  expect(text(ctx({ bindings: DEFAULT_KEYBOARD_P2_NUMPAD }), { action: 'Attack' })).toBe('Num 4');
  expect(text(ctx({ bindings: DEFAULT_KEYBOARD_P2_NUMPAD }), { dir: 'Forward' })).toBe('→');
});

test('rebinding Attack to K changes the prompt', () => {
  expect(
    text(ctx({ bindings: rebind(DEFAULT_KEYBOARD_P1, 'Attack', ['KeyK']) }), { action: 'Attack' }),
  ).toBe('K');
});

test('Dash falls back to double-tap Forward; a bound Dash shows its key', () => {
  const p = resolvePrompt(ctx({ facing: -1 }), { action: 'Dash' });
  expect(p).toMatchObject({ kind: 'gesture', gesture: 'doubleTap' });
  expect(promptText(p)).toBe('AA');
  expect(
    text(ctx({ bindings: rebind(DEFAULT_KEYBOARD_P1, 'Dash', ['ShiftLeft']) }), { action: 'Dash' }),
  ).toBe('Shift');
  expect(text(ctx({ bindings: DEFAULT_GAMEPAD }), { action: 'Dash' })).toBe('LT');
});

test('Low Attack falls back to the chord Dash + Attack + Guard', () => {
  const p = resolvePrompt(ctx(), { action: 'LowAttack' });
  expect(p.kind).toBe('chord');
  expect(promptText(p)).toBe('DD+T+G');
  const bound: Bindings = rebind(DEFAULT_KEYBOARD_P1, 'LowAttack', ['KeyR']);
  expect(text(ctx({ bindings: bound }), { action: 'LowAttack' })).toBe('R');
});

test('unbound actions are shown as Not assigned', () => {
  const b = rebind(DEFAULT_KEYBOARD_P1, 'Special', []);
  expect(resolvePrompt(ctx({ bindings: b }), { action: 'Special' })).toEqual({
    kind: 'unassigned',
    a11y: 'Not assigned',
  });
});
