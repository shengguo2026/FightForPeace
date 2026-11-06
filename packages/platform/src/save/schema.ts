import type { Bindings, BindableInput } from '../input/actions';
import { ACTION_NAMES, DIRECTIONS } from '../input/actions';
import type { LayoutName } from '../input/layout';
import { isLocale, type Locale } from '../i18n/i18n';
import { emptyProgress, normalizeProgress, type ProgressRecord } from './progress';

/**
 * Profile schema (spec §15.1). Version 1 (M10); version 2 (M11) adds `progress` and the
 * cheat preference fields. Every change to this shape bumps
 * SAVE_VERSION and adds a migration in migrate.ts; old saves are migrated on load and the
 * original is kept until the migrated copy is written.
 *
 * Guardrails (roadmap M10): the story choice record (first entry Kael's reunion,
 * campaign review G6), mission records keyed by content ID (`story.stageN.<name>`,
 * `curated.<name>`, `chronicle.<name>`), a Run Archive slot, and reserved Museum, Sponsor
 * Dossier and research-milestone records.
 */
export const SAVE_VERSION = 2;

export type PromptStyle = 'auto' | 'xbox' | 'playstation' | 'nintendo' | 'generic';
export type FacingPreference = 'manual' | 'assisted';

export interface ProfileSettings {
  /** Gameplay (Profile scope). */
  facing: FacingPreference;
  /** Controls (Profile scope). */
  promptStyle: PromptStyle;
  layout: LayoutName | null;
  /** Accessibility: presentation only, never the simulation (Profile scope). */
  hudScale: number;
  highContrast: boolean;
  reducedFlashing: boolean;
  reducedShake: boolean;
  readableFont: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  subtitleBackground: boolean;
  speakerLabels: boolean;
  /** Audio levels, 0–100 (Profile scope). */
  volumeMaster: number;
  volumeMusic: number;
  volumeEffects: number;
  volumeVoice: number;
  /** M13: ambience and interface sounds, 0–100 (Profile scope). */
  volumeAmbience: number;
  volumeInterface: number;
  /** M13: cinematics as video clips, or as their still artwork with the same subtitles. */
  cinematics: 'video' | 'stills';
  /** M13: cosmetic sparks and particles (impact cores, telegraphs and cues always stay). */
  particles: 'full' | 'reduced' | 'off';
}

export const DEFAULT_SETTINGS: ProfileSettings = {
  facing: 'manual',
  promptStyle: 'auto',
  layout: null,
  hudScale: 100,
  highContrast: false,
  reducedFlashing: false,
  reducedShake: false,
  readableFont: false,
  subtitleSize: 'medium',
  subtitleBackground: true,
  speakerLabels: true,
  volumeMaster: 80,
  volumeMusic: 70,
  volumeEffects: 80,
  volumeVoice: 80,
  volumeAmbience: 80,
  volumeInterface: 80,
  cinematics: 'video',
  particles: 'full',
};

/** A saved Continue point: the last checkpoint the profile reached in a stage. */
export interface CheckpointRecord {
  stage: string;
  difficulty: string;
  beat: number;
  heroes: string[];
  players: number;
  savedAt: number;
  /** M11: the run's cheats (canonical codes) and its Cheat-Assisted mark, or null. */
  cheats?: CheckpointCheats | null;
  /** M11: Standard (default) or Open run: the store ids of equipped techniques per slot. */
  loadout?: string[][];
}

export interface CheckpointCheats {
  hero: string[][];
  session: string[];
  marked: boolean;
  firstBeat: number;
}

/** Per content ID (e.g. `story.stage1.broken-water-pact`). */
export interface MissionRecord {
  clears: number;
  bestGrade: string | null;
  bestTimeFrames: number | null;
  highestDifficulty: string | null;
  lastPlayedAt: number;
}

export interface RunArchiveEntry {
  contentId: string;
  endedAt: number;
  grade: string | null;
  difficulty: string;
  heroes: string[];
}

export interface Profile {
  id: string;
  name: string;
  /** Temporary Guests are never written. */
  guest: boolean;
  createdAt: number;
  updatedAt: number;
  locale: Locale;
  settings: ProfileSettings;
  /** Remapped controls per device type; missing means the defaults. */
  bindings: { keyboard?: Bindings; keyboardP2?: Bindings; gamepad?: Bindings };
  /** The heroes picked last, per player slot. */
  lastHeroes: string[];
  checkpoint: CheckpointRecord | null;
  missions: Record<string, MissionRecord>;
  /** Story decisions by stable ID, e.g. `story.stage3.kael-reunion` → `meet_now`. */
  storyChoices: Record<string, string>;
  runArchive: RunArchiveEntry[];
  /** Reserved for later milestones (Stage 2 Museum, Sponsor Dossier, research). */
  museum: Record<string, unknown>;
  sponsorDossier: Record<string, unknown>;
  research: Record<string, unknown>;
  /**
   * Versioned cheat-registry state (Elder's Secrets, M11): reusable hero-scoped
   * preferences per hero id (canonical codes). A new run starts without them unless the
   * player chooses to reuse them.
   */
  cheats: { registryVersion: number; enabled: string[]; heroPrefs: Record<string, string[]> };
  /** M11: Credits, store, Hero Mastery, achievements, records, Academy, My Combos. */
  progress: ProgressRecord;
}

/** Saved on the device, not in a profile: which profile was last used, first-launch done. */
export interface DeviceRecord {
  version: number;
  setupDone: boolean;
  lastProfile: string | null;
  locale: Locale;
  uiScale: number;
}

export const DEFAULT_DEVICE: DeviceRecord = {
  version: SAVE_VERSION,
  setupDone: false,
  lastProfile: null,
  locale: 'en',
  uiScale: 100,
};

export const STORY_STAGE1 = 'story.stage1.broken-water-pact';

let counter = 0;
/** A profile id that is unique on this device (time plus a counter plus randomness). */
export function newProfileId(now = Date.now()): string {
  counter = (counter + 1) % 1296;
  const rnd = Math.floor(Math.random() * 46656).toString(36);
  return `p${now.toString(36)}${counter.toString(36)}${rnd}`;
}

export function createProfile(name: string, locale: Locale, now = Date.now()): Profile {
  return {
    id: newProfileId(now),
    name,
    guest: false,
    createdAt: now,
    updatedAt: now,
    locale,
    settings: { ...DEFAULT_SETTINGS },
    bindings: {},
    lastHeroes: ['mountain', 'river'],
    checkpoint: null,
    missions: {},
    storyChoices: {},
    runArchive: [],
    museum: {},
    sponsorDossier: {},
    research: {},
    cheats: { registryVersion: 1, enabled: [], heroPrefs: {} },
    progress: emptyProgress(),
  };
}

export function createGuest(locale: Locale, now = Date.now()): Profile {
  return { ...createProfile('Guest', locale, now), id: 'guest', guest: true };
}

// --- validation -------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const pick = <T extends string>(v: unknown, options: readonly T[], d: T): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : d;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function normalizeSettings(raw: unknown): ProfileSettings {
  const r = isObj(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const vol = (k: keyof ProfileSettings) => clamp(Math.round(num(r[k], d[k] as number)), 0, 100);
  return {
    facing: pick(r.facing, ['manual', 'assisted'] as const, d.facing),
    promptStyle: pick(
      r.promptStyle,
      ['auto', 'xbox', 'playstation', 'nintendo', 'generic'] as const,
      d.promptStyle,
    ),
    layout: r.layout === null ? null : pick(r.layout, ['qwerty', 'qwertz', 'azerty'] as const, 'qwerty'),
    hudScale: clamp(Math.round(num(r.hudScale, d.hudScale)), 75, 150),
    highContrast: bool(r.highContrast, d.highContrast),
    reducedFlashing: bool(r.reducedFlashing, d.reducedFlashing),
    reducedShake: bool(r.reducedShake, d.reducedShake),
    readableFont: bool(r.readableFont, d.readableFont),
    subtitleSize: pick(r.subtitleSize, ['small', 'medium', 'large'] as const, d.subtitleSize),
    subtitleBackground: bool(r.subtitleBackground, d.subtitleBackground),
    speakerLabels: bool(r.speakerLabels, d.speakerLabels),
    volumeMaster: vol('volumeMaster'),
    volumeMusic: vol('volumeMusic'),
    volumeEffects: vol('volumeEffects'),
    volumeVoice: vol('volumeVoice'),
    volumeAmbience: vol('volumeAmbience'),
    volumeInterface: vol('volumeInterface'),
    cinematics: pick(r.cinematics, ['video', 'stills'] as const, d.cinematics),
    particles: pick(r.particles, ['full', 'reduced', 'off'] as const, d.particles),
  };
}

const INPUTS: readonly BindableInput[] = [...DIRECTIONS, ...ACTION_NAMES];

/** A binding set from a save, or undefined when it is not a complete, valid set. */
export function normalizeBindings(raw: unknown): Bindings | undefined {
  if (!isObj(raw) || (raw.device !== 'keyboard' && raw.device !== 'gamepad')) return undefined;
  if (!isObj(raw.codes)) return undefined;
  const codes = {} as Record<BindableInput, string[]>;
  for (const input of INPUTS) {
    const list = raw.codes[input];
    if (!Array.isArray(list) || !list.every((c) => typeof c === 'string')) return undefined;
    codes[input] = [...(list as string[])];
  }
  return { device: raw.device, codes };
}

function record<T>(raw: unknown, each: (v: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const val = each(v);
    if (val !== undefined) out[k] = val;
  }
  return out;
}

/**
 * Checks a current-version profile and fills fields a newer minor build may have added
 * with defaults. Throws when the profile is not usable (no id or name).
 */
export function normalizeProfile(raw: unknown): Profile {
  if (!isObj(raw)) throw new Error('profile is not an object');
  if (typeof raw.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(raw.id))
    throw new Error('profile id is invalid');
  if (typeof raw.name !== 'string') throw new Error('profile name is missing');
  const b = isObj(raw.bindings) ? raw.bindings : {};
  const cp = isObj(raw.checkpoint) ? raw.checkpoint : null;
  const cheats = isObj(raw.cheats) ? raw.cheats : {};
  return {
    id: raw.id,
    name: raw.name.slice(0, 40),
    guest: false,
    createdAt: num(raw.createdAt, 0),
    updatedAt: num(raw.updatedAt, 0),
    locale: isLocale(raw.locale) ? raw.locale : 'en',
    settings: normalizeSettings(raw.settings),
    bindings: {
      keyboard: normalizeBindings(b.keyboard),
      keyboardP2: normalizeBindings(b.keyboardP2),
      gamepad: normalizeBindings(b.gamepad),
    },
    lastHeroes: Array.isArray(raw.lastHeroes)
      ? raw.lastHeroes.filter((h): h is string => typeof h === 'string').slice(0, 4)
      : ['mountain', 'river'],
    checkpoint:
      cp && typeof cp.stage === 'string'
        ? {
            stage: cp.stage,
            difficulty: str(cp.difficulty, 'medium'),
            beat: Math.max(0, Math.round(num(cp.beat, 0))),
            heroes: Array.isArray(cp.heroes)
              ? cp.heroes.filter((h): h is string => typeof h === 'string')
              : [],
            players: clamp(Math.round(num(cp.players, 1)), 1, 2),
            savedAt: num(cp.savedAt, 0),
            cheats: isObj(cp.cheats)
              ? {
                  hero: Array.isArray(cp.cheats.hero)
                    ? cp.cheats.hero
                        .slice(0, 2)
                        .map((l) =>
                          Array.isArray(l) ? l.filter((c): c is string => typeof c === 'string') : [],
                        )
                    : [],
                  session: Array.isArray(cp.cheats.session)
                    ? cp.cheats.session.filter((c): c is string => typeof c === 'string')
                    : [],
                  marked: bool(cp.cheats.marked, false),
                  firstBeat: Math.round(num(cp.cheats.firstBeat, -1)),
                }
              : null,
            loadout: Array.isArray(cp.loadout)
              ? cp.loadout
                  .slice(0, 2)
                  .map((l) => (Array.isArray(l) ? l.filter((c): c is string => typeof c === 'string') : []))
              : [],
          }
        : null,
    missions: record(raw.missions, (v) =>
      isObj(v)
        ? {
            clears: Math.max(0, Math.round(num(v.clears, 0))),
            bestGrade: typeof v.bestGrade === 'string' ? v.bestGrade : null,
            bestTimeFrames: typeof v.bestTimeFrames === 'number' ? v.bestTimeFrames : null,
            highestDifficulty:
              typeof v.highestDifficulty === 'string' ? v.highestDifficulty : null,
            lastPlayedAt: num(v.lastPlayedAt, 0),
          }
        : undefined,
    ),
    storyChoices: record(raw.storyChoices, (v) => (typeof v === 'string' ? v : undefined)),
    runArchive: Array.isArray(raw.runArchive)
      ? raw.runArchive.filter(isObj).map((e) => ({
          contentId: str(e.contentId, ''),
          endedAt: num(e.endedAt, 0),
          grade: typeof e.grade === 'string' ? e.grade : null,
          difficulty: str(e.difficulty, 'medium'),
          heroes: Array.isArray(e.heroes)
            ? e.heroes.filter((h): h is string => typeof h === 'string')
            : [],
        }))
      : [],
    museum: isObj(raw.museum) ? raw.museum : {},
    sponsorDossier: isObj(raw.sponsorDossier) ? raw.sponsorDossier : {},
    research: isObj(raw.research) ? raw.research : {},
    cheats: {
      registryVersion: Math.max(1, Math.round(num(cheats.registryVersion, 1))),
      enabled: Array.isArray(cheats.enabled)
        ? cheats.enabled.filter((c): c is string => typeof c === 'string')
        : [],
      heroPrefs: record(cheats.heroPrefs, (v) =>
        Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string').slice(0, 12) : undefined,
      ),
    },
    progress: normalizeProgress(raw.progress),
  };
}

export function normalizeDevice(raw: unknown): DeviceRecord {
  const r = isObj(raw) ? raw : {};
  return {
    version: SAVE_VERSION,
    setupDone: bool(r.setupDone, false),
    lastProfile: typeof r.lastProfile === 'string' ? r.lastProfile : null,
    locale: isLocale(r.locale) ? r.locale : 'en',
    uiScale: clamp(Math.round(num(r.uiScale, 100)), 75, 150),
  };
}

/** Records a stage result in the profile's mission record (grade order S > A > B > C). */
export function recordClear(
  p: Profile,
  contentId: string,
  r: { grade: string | null; timeFrames: number; difficulty: string; heroes: string[] },
  difficultyOrder: readonly string[],
  now = Date.now(),
): void {
  const order = ['C', 'B', 'A', 'S'];
  const m = p.missions[contentId] ?? {
    clears: 0,
    bestGrade: null,
    bestTimeFrames: null,
    highestDifficulty: null,
    lastPlayedAt: now,
  };
  m.clears += 1;
  if (r.grade && (m.bestGrade === null || order.indexOf(r.grade) > order.indexOf(m.bestGrade)))
    m.bestGrade = r.grade;
  if (m.bestTimeFrames === null || r.timeFrames < m.bestTimeFrames) m.bestTimeFrames = r.timeFrames;
  if (
    m.highestDifficulty === null ||
    difficultyOrder.indexOf(r.difficulty) > difficultyOrder.indexOf(m.highestDifficulty)
  )
    m.highestDifficulty = r.difficulty;
  m.lastPlayedAt = now;
  p.missions[contentId] = m;
  p.runArchive = [
    { contentId, endedAt: now, grade: r.grade, difficulty: r.difficulty, heroes: r.heroes },
    ...p.runArchive,
  ].slice(0, 20);
}

