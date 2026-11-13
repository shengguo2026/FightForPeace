import { CATALOGS, baseCatalog } from '../../apps/game/src/text/i18n';

/**
 * M14 localization QA: text that is probably still untranslated. A Chinese string without
 * a single Chinese character, or a German string identical to a multi-word English one,
 * is reported unless it is a name or a code that stays the same in every language.
 */
const base = baseCatalog();

/** Keys whose text is the same in every language (names, codes, units, version strings). */
const SAME_EVERYWHERE = [
  /^hero\.\w+\.name$/, // German keeps the founders' English names (decision log)
  /^music\./, // cue titles stay English until the score is localized
  /^system\.via\./,
  /^cheat\.code\./,
  /^title\./,
  /^(enemy\.marek|m19\.tomas)\.name$/, // M19: people's names (Marek Vane, Tomas Rell)
  /^speaker\.(wind|fire|tomas)$/, // M22: the same names as speakers
  /^museum\.picture\.portrait-tomas\.name$/,
  /^m22\.voice\.(en|zh-CN|de)$/, // M22: each voice language is named in its own language
];

/** Words that may stand alone in Chinese or German text (names of formats and products). */
const NEUTRAL =
  /^[\s\d%:·.,()+\-–/×]*(WebGL|WebM|MP4|Canvas 2D|Wi-Fi|LAN|Chrome|Edge|Firefox|Safari|Lab|OK|S|A|B|C|D)?[\s\d%:·.,()+\-–/×]*$/;

const exempt = (key: string) => SAME_EVERYWHERE.some((re) => re.test(key));
const tokenless = (s: string) => s.replace(/\{[^}]*\}/g, '').trim();
const words = (s: string) =>
  tokenless(s)
    .split(/\s+/)
    .filter((w) => /[A-Za-z]{2,}/.test(w)).length;

test('no Chinese text is left in English', () => {
  const zh = CATALOGS['zh-CN']!;
  const suspects = Object.entries(zh).filter(([key, s]) => {
    const en = base[key];
    if (!en || exempt(key)) return false;
    const t = tokenless(s);
    return t !== '' && !/[㐀-鿿]/.test(t) && !NEUTRAL.test(t) && words(en) >= 1;
  });
  expect(suspects.map(([k, s]) => `${k}: ${s}`)).toEqual([]);
});

test('no German text is a copy of a multi-word English text', () => {
  const de = CATALOGS.de!;
  const suspects = Object.entries(de).filter(([key, s]) => {
    const en = base[key];
    return !!en && !exempt(key) && s === en && words(en) >= 2 && !NEUTRAL.test(tokenless(s));
  });
  expect(suspects.map(([k, s]) => `${k}: ${s}`)).toEqual([]);
});
