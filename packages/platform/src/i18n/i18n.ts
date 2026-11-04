/**
 * M10 localization (spec §4): player-facing text is looked up by stable keys. English is
 * the base catalogue; a missing translation falls back to English and records one
 * diagnostic per key, and `checkCatalogues` is the release validation that treats a
 * missing required translation as an error.
 */
export type Locale = 'en' | 'zh-CN' | 'de';
export const LOCALES: readonly Locale[] = ['en', 'zh-CN', 'de'];

/** Each language's own name, shown in the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  de: 'Deutsch',
};

export type Catalog = Readonly<Record<string, string>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** The best supported locale for browser language tags such as `de-AT` or `zh-Hans-CN`. */
export function pickLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const t = tag.toLowerCase();
    if (t.startsWith('zh')) return 'zh-CN';
    if (t.startsWith('de')) return 'de';
    if (t.startsWith('en')) return 'en';
  }
  return 'en';
}

export class Translator {
  locale: Locale = 'en';
  /** Keys that fell back to English (or were missing everywhere), once each. */
  readonly diagnostics: string[] = [];
  private readonly reported = new Set<string>();

  constructor(
    private readonly base: Catalog,
    private readonly catalogs: Partial<Record<Locale, Catalog>>,
  ) {}

  has(key: string): boolean {
    return key in this.base;
  }

  /**
   * The text for `key` in the current locale. `fallback` is used (and reported) when the
   * key is in no catalogue, e.g. data-driven names whose English lives in the data files.
   */
  text(key: string, fallback?: string): string {
    if (this.locale !== 'en') {
      const own = this.catalogs[this.locale]?.[key];
      if (own !== undefined) return own;
    }
    const en = this.base[key];
    if (en !== undefined) {
      if (this.locale !== 'en') this.report(`${this.locale}:${key}`);
      return en;
    }
    this.report(`missing:${key}`);
    return fallback ?? key;
  }

  private report(id: string): void {
    if (this.reported.has(id)) return;
    this.reported.add(id);
    this.diagnostics.push(id);
  }
}

/** Fills `{name}` values; `{action:…}` and `{dir:…}` prompt tokens are left in place. */
export function format(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in values ? String(values[name]) : m,
  );
}

/** The `{…}` tokens of a string, sorted, so translations can be checked against English. */
export function tokensOf(s: string): string[] {
  return [...s.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort();
}

export interface CatalogProblem {
  locale: Locale;
  key: string;
  problem: 'missing' | 'extra' | 'tokens' | 'empty';
}

/**
 * Release validation: every base key is translated, no translation has a key the base
 * lacks, none is empty, and each keeps exactly the base string's tokens.
 */
export function checkCatalogues(
  base: Catalog,
  catalogs: Partial<Record<Locale, Catalog>>,
  required: readonly Locale[] = LOCALES.filter((l) => l !== 'en'),
): CatalogProblem[] {
  const problems: CatalogProblem[] = [];
  for (const locale of required) {
    const cat = catalogs[locale] ?? {};
    for (const key of Object.keys(base)) {
      const own = cat[key];
      if (own === undefined) problems.push({ locale, key, problem: 'missing' });
      else if (own.trim() === '' && base[key]!.trim() !== '')
        problems.push({ locale, key, problem: 'empty' });
      else if (tokensOf(own).join() !== tokensOf(base[key]!).join())
        problems.push({ locale, key, problem: 'tokens' });
    }
    for (const key of Object.keys(cat))
      if (!(key in base)) problems.push({ locale, key, problem: 'extra' });
  }
  return problems;
}
