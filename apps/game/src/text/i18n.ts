import { CALLOUT_WORDS, calloutKey } from './callouts';
import { signal } from '@preact/signals';
import { Translator, format, type Catalog, type Locale } from '@ffp/platform';
import {
  ARENAS,
  COOP,
  DIFFICULTIES,
  ENEMIES,
  CORRIDORS,
  HEROES,
  MOUNTED,
  GREENHOUSE,
  PROFILES,
  PROGRESSION,
  STAGES,
  WEAPONS,
} from '@ffp/sim';
import { EN } from './strings.en';
import { ZH_CN } from './strings.zh-CN';
import { DE } from './strings.de';

/**
 * M10 runtime localization. Interface text lives in strings.<locale>.ts under stable
 * keys; names that come from the data files (heroes, moves, enemies, arenas, stages) get
 * generated keys such as `hero.mountain.name` or `stage.stage1.beat.fields.objective`,
 * with the data's English as the base text.
 */
export type TextId = keyof typeof EN;

/** Generated keys for every player-facing name in the data files, with their English. */
export function dataCatalog(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of HEROES) {
    out[`hero.${h.id}.name`] = h.name;
    for (const a of h.actions) out[`hero.${h.id}.action.${a.id}`] = a.name;
    for (const r of h.recipes) out[`hero.${h.id}.recipe.${r.id}`] = r.name;
    // M21 Move Preview: showcase routes.
    for (const sc of h.showcases ?? []) out[`hero.${h.id}.showcase.${sc.id}`] = sc.name;
  }
  ENEMIES.forEach((e, i) => {
    out[`enemy.${e.id}.name`] = e.name;
    for (const a of e.actions) out[`enemy.${e.id}.action.${a.id}`] = a.name;
    PROFILES[i]?.boss?.phases.forEach((p, n) => (out[`enemy.${e.id}.phase.${n}`] = p.name));
  });
  for (const w of WEAPONS) out[`weapon.${w.id}.name`] = w.name;
  for (const a of ARENAS) if (!a.stage) out[`arena.${a.id}.name`] = a.name;
  for (const d of DIFFICULTIES) out[`difficulty.${d.id}`] = d.name;
  for (const f of COOP.finishers) out[`coop.finisher.${f.id}`] = f.name;
  for (const h of COOP.handoffs) if (h.route) out[`coop.route.${h.route.id}`] = h.route.name;
  for (const w of CALLOUT_WORDS) out[calloutKey(w)] = w;
  for (const s of STAGES) {
    out[`stage.${s.id}.name`] = s.name;
    for (const b of s.beats) {
      const k = `stage.${s.id}.beat.${b.id}`;
      out[`${k}.name`] = b.name;
      out[`${k}.objective`] = b.objective;
      if (b.clue) out[`${k}.clue`] = b.clue.text;
      if (b.evidence) out[`${k}.evidence`] = b.evidence.text;
      // M20: an optional branch's name and its Museum artifact.
      if (b.branch) {
        out[`stage.${s.id}.branch.${b.branch.id}`] = b.branch.name;
        out[`stage.${s.id}.branch.${b.branch.id}.artifact`] = b.branch.artifactName;
      }
    }
  }
  // M17 mounted names: each hero's mounted kit, the Road Rider, corridors and equipment.
  HEROES.forEach((h, i) => {
    for (const a of MOUNTED.heroes[i] ?? []) out[`mounted.${h.id}.${a.id}`] = a.name;
  });
  out[`rider.${MOUNTED.rider.id}.name`] = MOUNTED.rider.name;
  for (const a of MOUNTED.rider.actions) out[`rider.${a.id}`] = a.name;
  for (const c of CORRIDORS) {
    out[`corridor.${c.id}.name`] = c.name;
    out[`corridor.${c.id}.goal`] = c.goal;
    for (const e of c.equipment) out[`corridor.${c.id}.equipment.${e.id}`] = e.name;
  }
  // M18 greenhouse names: pantry items, containers, Ledger assets, grades and rooms.
  if (GREENHOUSE) {
    for (const p of GREENHOUSE.pantry) out[`gh.item.${p.id}`] = p.name;
    for (const c of GREENHOUSE.containers) out[`gh.container.${c.id}`] = c.name;
    for (const k of GREENHOUSE.ledger) out[`gh.asset.${k.id}`] = k.name;
    for (const g of GREENHOUSE.grades) out[`gh.grade.${g.id}`] = g.name;
    for (const r of GREENHOUSE.rooms) out[`gh.room.${r.id}`] = r.name;
  }
  // M11 progression names: store outfits and badges, achievements, Academy routes and lessons.
  for (const s of PROGRESSION.store) if (s.name) out[`${s.id}.name`] = s.name;
  for (const a of PROGRESSION.achievements) out[`${a.id}.name`] = a.name;
  for (const r of PROGRESSION.academy) {
    out[`${r.id}.name`] = r.name;
    for (const l of r.lessons) out[`${l.id}.name`] = l.name;
  }
  return out;
}

/** The full English base: interface strings plus the data names. */
export function baseCatalog(): Catalog {
  return { ...dataCatalog(), ...EN };
}

export const CATALOGS: Partial<Record<Locale, Catalog>> = { 'zh-CN': ZH_CN, de: DE };

const translator = new Translator(baseCatalog(), CATALOGS);

/** The current language; components that read it re-render when it changes. */
export const locale = signal<Locale>('en');

export function setLocale(l: Locale): void {
  translator.locale = l;
  locale.value = l;
  document.documentElement.lang = l === 'zh-CN' ? 'zh-Hans' : l;
}

/** Interface text by key, with `{name}` values filled ({action:…} tokens stay). */
export function t(key: TextId, values?: Record<string, string | number>): string {
  void locale.value;
  const s = translator.text(key);
  return values ? format(s, values) : s;
}

/** A data-driven name by generated key, falling back to the data's own English. */
export function dt(key: string, fallback: string): string {
  void locale.value;
  return translator.text(key, fallback);
}

/** A call-out word drawn over a fighter (EXACT, CLASH …). */
export const callout = (word: string) => dt(calloutKey(word), word);

/**
 * An arena's display name (M23). Lab arenas have their own key; a stage camera lock
 * (`stage2.beat.n`) takes its beat's name and a greenhouse room arena (`<room>-waves`) its
 * room's name, which are already translated (they used to fall back to English).
 */
export function arenaName(a: { id: string; name: string; stage: boolean }): string {
  if (!a.stage) return dt(`arena.${a.id}.name`, a.name);
  if (a.id.endsWith('-waves')) return dt(`gh.room.${a.id.slice(0, -'-waves'.length)}`, a.name);
  const [stage, beat] = a.id.split('.');
  return dt(`stage.${stage}.beat.${beat}.name`, a.name);
}

export const heroName = (id: string) =>
  dt(`hero.${id}.name`, HEROES.find((h) => h.id === id)?.name ?? id);

export const difficultyName = (id: string) =>
  dt(`difficulty.${id}`, DIFFICULTIES.find((d) => d.id === id)?.name ?? id);

export const stageName = (id: string) =>
  dt(`stage.${id}.name`, STAGES.find((s) => s.id === id)?.name ?? id);

/** Fallbacks and missing keys seen so far (shown in Settings > Language for testers). */
export function textDiagnostics(): readonly string[] {
  return translator.diagnostics;
}

const BASE = baseCatalog();

/** M13: text in a given language (a cinematic subtitle latched at its cue boundary). */
export function tIn(l: Locale, key: string): string {
  void locale.value;
  return (l !== 'en' ? CATALOGS[l]?.[key] : undefined) ?? BASE[key] ?? key;
}
