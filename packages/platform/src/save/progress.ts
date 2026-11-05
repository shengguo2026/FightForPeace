/**
 * M11 progression records of a profile (save version 2): the Credit wallet and its
 * ledger, one-time bonuses already paid, store ownership and equipment, Hero Mastery,
 * achievements, Standard/Open stage records, Academy lesson states and My Combos. Every
 * field is profile-owned; Guests are never written.
 */

export interface LedgerEntry {
  at: number;
  /** payout, purchase, achievement, academy or mastery. */
  kind: string;
  amount: number;
  /** What it was for: a content ID or a payout line id. */
  ref: string;
}

/** Best results of one record category (`standard.solo.medium`, …) of a stage. */
export interface StageRecord {
  bestScore: number;
  bestRank: string;
  bestPoints: number;
  fastestFrames: number;
  bestComboHits: number;
  bestComboDamage: number;
  leastDamageTaken: number;
  clears: number;
  /** Heroes, loadout (store item ids of equipped catalogue moves) and game version of the best score. */
  heroes: string[];
  loadout: string[];
  version: string;
  at: number;
}

export type LessonState = 'available' | 'practiced' | 'certified' | 'mastered';

/** A recipe a player recorded in Free Practice: abstract actions, never keys. */
export interface MyCombo {
  id: string;
  name: string;
  hero: string;
  /** Action ids of the hero's kit in order; `jump` for a jump chase between two attacks. */
  steps: string[];
  /** Frames between consecutive presses (input timing), same length as steps. */
  timing: number[];
  hits: number;
  damage: number;
  /** Canonical cheat codes active while it was recorded (empty: ordinary rules). */
  cheats: string[];
  /** Store item ids of the catalogue moves it needs (to practise it in a stage). */
  needs: string[];
  createdAt: number;
}

export interface HeroEquipment {
  /** Owned outfit store id, or null for the default clothes. */
  outfit: string | null;
  /** Owned technique store ids equipped in their input slots. */
  techniques: string[];
}

export interface ProgressRecord {
  credits: number;
  /** The most recent wallet changes, newest first (at most 60). */
  ledger: LedgerEntry[];
  /** Keys of one-time bonuses already paid (first clear, first rank, …). */
  claimed: string[];
  /** Store item ids the profile owns. */
  owned: string[];
  /** Store item ids the player marked as goals. */
  goals: string[];
  equipped: Record<string, HeroEquipment>;
  /** Shown next to the profile name (an owned badge id) or null. */
  badge: string | null;
  /** Hero Mastery points per hero id (never spent). */
  mastery: Record<string, number>;
  /** Earned achievements by id: when. */
  achievements: Record<string, number>;
  /** Achievement progress (e.g. the heroes that cleared a stage). */
  progress: Record<string, string[]>;
  /** Stage records per content ID and category. */
  records: Record<string, Record<string, StageRecord>>;
  /** Highest Cheat-Assisted completion difficulty per content ID (noncompetitive). */
  cheatHighest: Record<string, string>;
  /** Academy lesson states by lesson id (missing: available). */
  academy: Record<string, LessonState>;
  combos: MyCombo[];
}

export function emptyProgress(): ProgressRecord {
  return {
    credits: 0,
    ledger: [],
    claimed: [],
    owned: [],
    goals: [],
    equipped: {},
    badge: null,
    mastery: {},
    achievements: {},
    progress: {},
    records: {},
    cheatHighest: {},
    academy: {},
    combos: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const int = (v: unknown, d = 0) => Math.max(0, Math.round(num(v, d)));
const strs = (v: unknown, max = 200): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : [];
const LESSON: readonly LessonState[] = ['available', 'practiced', 'certified', 'mastered'];

function map<T>(raw: unknown, each: (v: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const x = each(v);
    if (x !== undefined) out[k] = x;
  }
  return out;
}

function record(v: unknown): StageRecord | undefined {
  if (!isObj(v)) return undefined;
  return {
    bestScore: int(v.bestScore),
    bestRank: typeof v.bestRank === 'string' ? v.bestRank : 'C',
    bestPoints: int(v.bestPoints),
    fastestFrames: int(v.fastestFrames),
    bestComboHits: int(v.bestComboHits),
    bestComboDamage: int(v.bestComboDamage),
    leastDamageTaken: int(v.leastDamageTaken),
    clears: int(v.clears),
    heroes: strs(v.heroes, 4),
    loadout: strs(v.loadout, 20),
    version: typeof v.version === 'string' ? v.version : '',
    at: num(v.at, 0),
  };
}

function combo(v: unknown): MyCombo | undefined {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.hero !== 'string') return undefined;
  const steps = strs(v.steps, 32);
  const timing = Array.isArray(v.timing) ? v.timing.map((x) => int(x)).slice(0, 32) : [];
  return {
    id: v.id,
    name: typeof v.name === 'string' ? v.name.slice(0, 40) : 'Combo',
    hero: v.hero,
    steps,
    timing: steps.map((_, i) => timing[i] ?? 0),
    hits: int(v.hits),
    damage: int(v.damage),
    cheats: strs(v.cheats, 12),
    needs: strs(v.needs, 8),
    createdAt: num(v.createdAt, 0),
  };
}

/** A save's progress record with missing or invalid fields set to their defaults. */
export function normalizeProgress(raw: unknown): ProgressRecord {
  const r = isObj(raw) ? raw : {};
  return {
    credits: int(r.credits),
    ledger: Array.isArray(r.ledger)
      ? r.ledger
          .filter(isObj)
          .map((e) => ({
            at: num(e.at, 0),
            kind: typeof e.kind === 'string' ? e.kind : 'payout',
            amount: Math.round(num(e.amount, 0)),
            ref: typeof e.ref === 'string' ? e.ref : '',
          }))
          .slice(0, 60)
      : [],
    claimed: strs(r.claimed, 500),
    owned: strs(r.owned),
    goals: strs(r.goals),
    equipped: map(r.equipped, (v) =>
      isObj(v)
        ? {
            outfit: typeof v.outfit === 'string' ? v.outfit : null,
            techniques: strs(v.techniques, 10),
          }
        : undefined,
    ),
    badge: typeof r.badge === 'string' ? r.badge : null,
    mastery: map(r.mastery, (v) => (typeof v === 'number' ? int(v) : undefined)),
    achievements: map(r.achievements, (v) => (typeof v === 'number' ? v : undefined)),
    progress: map(r.progress, (v) => (Array.isArray(v) ? strs(v, 50) : undefined)),
    records: map(r.records, (v) => (isObj(v) ? map(v, record) : undefined)),
    cheatHighest: map(r.cheatHighest, (v) => (typeof v === 'string' ? v : undefined)),
    academy: map(r.academy, (v) =>
      typeof v === 'string' && (LESSON as readonly string[]).includes(v) ? (v as LessonState) : undefined,
    ),
    combos: Array.isArray(r.combos)
      ? r.combos.map(combo).filter((c): c is MyCombo => !!c).slice(0, 20)
      : [],
  };
}
