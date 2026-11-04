import { LOCALES, checkCatalogues } from '../../packages/platform/src/index';
import { CATALOGS, baseCatalog } from '../../apps/game/src/text/i18n';

/**
 * M10 release validation (Module 16): every language has every key of the English base
 * (interface text and the generated data names), no extra keys, no empty text, and the
 * same `{name}` and prompt tokens as English.
 */
test('the Chinese and German catalogues are complete and keep every token', () => {
  const base = baseCatalog();
  const required = LOCALES.filter((l) => l !== 'en');
  expect(checkCatalogues(base, CATALOGS, required)).toEqual([]);
});

test('Chinese uses the agreed names for the title and the heroes', () => {
  const zh = CATALOGS['zh-CN']!;
  expect(zh['title.logo']).toBe('和平之战');
  expect(zh['hero.mountain.name']).toBe('山神');
  expect(zh['hero.river.name']).toBe('河神');
  // German keeps the English hero names.
  expect(CATALOGS.de!['hero.mountain.name']).toBe(baseCatalog()['hero.mountain.name']);
  expect(CATALOGS.de!['hero.river.name']).toBe(baseCatalog()['hero.river.name']);
});
