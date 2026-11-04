import { Translator, checkCatalogues, format, pickLocale, tokensOf } from '../src/index';

const EN = { hello: 'Hello {name}', press: 'Press {action:Attack}', bye: 'Bye' };

test('falls back to English and reports it once', () => {
  const t = new Translator(EN, { de: { hello: 'Hallo {name}' } });
  t.locale = 'de';
  expect(t.text('hello')).toBe('Hallo {name}');
  expect(t.text('bye')).toBe('Bye');
  expect(t.text('bye')).toBe('Bye');
  expect(t.diagnostics).toEqual(['de:bye']);
  expect(t.text('nope', 'Data name')).toBe('Data name');
  expect(t.diagnostics).toEqual(['de:bye', 'missing:nope']);
});

test('format fills values and keeps prompt tokens', () => {
  expect(format('P{n} press {action:Attack}', { n: 2 })).toBe('P2 press {action:Attack}');
});

test('catalogue checks find missing, extra, empty and token problems', () => {
  const problems = checkCatalogues(EN, {
    de: { hello: 'Hallo', press: 'Drücke {action:Attack}', extra: 'x' },
    'zh-CN': { hello: '你好 {name}', press: '按 {action:Attack}', bye: '' },
  });
  expect(problems).toEqual([
    { locale: 'zh-CN', key: 'bye', problem: 'empty' },
    { locale: 'de', key: 'hello', problem: 'tokens' },
    { locale: 'de', key: 'bye', problem: 'missing' },
    { locale: 'de', key: 'extra', problem: 'extra' },
  ]);
  expect(tokensOf('{b} x {a}')).toEqual(['{a}', '{b}']);
});

test('browser language tags pick a supported locale', () => {
  expect(pickLocale(['de-AT', 'en'])).toBe('de');
  expect(pickLocale(['zh-Hans-CN'])).toBe('zh-CN');
  expect(pickLocale(['fr-FR', 'en-GB'])).toBe('en');
  expect(pickLocale(['fr'])).toBe('en');
});
