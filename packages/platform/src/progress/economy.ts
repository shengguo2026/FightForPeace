import {
  DIFFICULTIES,
  HEROES,
  PROGRESSION,
  type AchievementDef,
  type LoadoutChange,
  type StageResults,
  type StoreItemDef,
} from '@ffp/sim';
import type { Profile } from '../save/schema';
import type { LessonState, ProgressRecord, StageRecord } from '../save/progress';

/**
 * M11 progression rules (spec §15.2–15.4, F&D §9): the Layered Result Payout, one-time
 * bonuses, Hero Mastery, achievements, Standard/Open records, the bounded store and the
 * Academy lesson states. Everything here is a pure change of a profile; the shell saves.
 */
const P = PROGRESSION;
const RANKS = ['C', 'B', 'A', 'S'] as const;
const DIFF_IDS = DIFFICULTIES.map((d) => d.id);
const LESSON_ORDER: readonly LessonState[] = ['available', 'practiced', 'certified', 'mastered'];
const LEDGER_CAP = 60;

export const STORE: readonly StoreItemDef[] = P.store;
export const ACHIEVEMENTS: readonly AchievementDef[] = P.achievements;
export const ACADEMY_ROUTES = P.academy;

/** The story content ID of a stage file id (`stage1` → `story.stage1.broken-water-pact`). */
export function contentIdOf(stage: string): string {
  return stage === 'stage1' ? 'story.stage1.broken-water-pact' : `story.${stage}`;
}

export interface PayoutLine {
  /** completion, difficulty, rank, firstClear, firstRank.S, allClues, achievement, mastery. */
  id: string;
  amount: number;
  /** Achievement id or hero id the line is for. */
  ref?: string;
  /** Shown but not paid (Cheat-Assisted run). */
  suppressed: boolean;
}

export interface RunReport {
  contentId: string;
  results: StageResults;
  /** 'solo' or 'coop'. */
  mode: 'solo' | 'coop';
  /** Heroes of the run, per player slot. */
  heroes: string[];
  /** The hero this profile's player used. */
  hero: string;
  /** Store ids of the catalogue moves equipped by every player of the run. */
  loadout: string[];
  gameVersion: string;
}

export interface Settlement {
  /** No rewards at all: a practice run from a later beat (Lab). */
  practice: boolean;
  cheatAssisted: boolean;
  lines: PayoutLine[];
  /** Credits actually paid. */
  total: number;
  /** Record category of the run, e.g. `standard.solo.medium`. */
  category: string;
  /** The run beat this category's best score. */
  newBest: boolean;
  achievements: string[];
  /** Hero Mastery points gained and the hero's level before and after. */
  mastery: { hero: string; gained: number; from: number; to: number };
  /** Techniques granted by reaching their Hero Mastery level. */
  granted: string[];
}

export function itemDef(id: string): StoreItemDef | undefined {
  return STORE.find((s) => s.id === id);
}

function pay(pr: ProgressRecord, kind: string, amount: number, ref: string, now: number): void {
  if (amount === 0) return;
  pr.credits = Math.max(0, pr.credits + amount);
  pr.ledger = [{ at: now, kind, amount, ref }, ...pr.ledger].slice(0, LEDGER_CAP);
}

/** Hero Mastery level for a point total (level 1 at 0 points). */
export function masteryLevel(points: number): number {
  return Math.min(P.mastery.maxLevel, 1 + Math.trunc(points / P.mastery.perLevel));
}

export function rankIndex(rank: string): number {
  return Math.max(0, RANKS.indexOf(rank as (typeof RANKS)[number]));
}

/** Record category: Standard or Open loadout, solo or co-op, difficulty. */
export function recordCategory(standard: boolean, mode: 'solo' | 'coop', difficulty: string): string {
  return `${standard ? 'standard' : 'open'}.${mode}.${difficulty}`;
}

/**
 * Validated results → the profile: records, Credits, Hero Mastery and achievements.
 * Practice runs get nothing; Cheat-Assisted runs keep only the separate highest
 * Cheat-Assisted difficulty and narrative Story achievements, without Credits.
 */
export function settleRun(p: Profile, report: RunReport, now = Date.now()): Settlement {
  const pr = p.progress;
  const r = report.results;
  const diff = DIFF_IDS[r.difficulty] ?? 'medium';
  const category = recordCategory(r.standard, report.mode, diff);
  const out: Settlement = {
    practice: r.startBeat > 0,
    cheatAssisted: r.cheatAssisted,
    lines: [],
    total: 0,
    category,
    newBest: false,
    achievements: [],
    mastery: { hero: report.hero, gained: 0, from: 0, to: 0 },
    granted: [],
  };
  const lvl = masteryLevel(pr.mastery[report.hero] ?? 0);
  out.mastery.from = lvl;
  out.mastery.to = lvl;
  if (out.practice) return out;
  const cid = report.contentId;
  const suppressed = r.cheatAssisted;
  const line = (id: string, amount: number, ref?: string) => {
    if (amount > 0) out.lines.push({ id, amount, ref, suppressed });
  };
  // Hero progress for achievements (only real clears count).
  if (!suppressed) {
    const list = pr.progress[`heroes:${cid}`] ?? [];
    if (!list.includes(report.hero)) pr.progress[`heroes:${cid}`] = [...list, report.hero];
  }
  // Base payout, repeatable: completion, difficulty, rank.
  line('completion', P.payout.completion);
  line('difficulty', P.payout.difficulty[r.difficulty] ?? 0);
  line('rank', P.payout.rank[r.overall as 'S'] ?? 0);
  // One-time bonuses (never claimed by a Cheat-Assisted run).
  const once = (key: string, id: string, amount: number) => {
    if (pr.claimed.includes(key)) return;
    line(id, amount);
    if (!suppressed) pr.claimed.push(key);
  };
  once(`firstClear:${cid}`, 'firstClear', P.payout.once.firstClear);
  for (const step of ['B', 'A', 'S'] as const)
    if (rankIndex(r.overall) >= rankIndex(step))
      once(`firstRank:${cid}:${step}`, `firstRank.${step}`, P.payout.once.firstRank[step]);
  if (r.cluesTotal > 0 && r.stats.clues + r.stats.evidence >= r.cluesTotal)
    once(`allClues:${cid}`, 'allClues', P.payout.once.allClues);
  if (suppressed) {
    // Noncompetitive record: highest Cheat-Assisted completion difficulty only.
    const prev = pr.cheatHighest[cid];
    if (!prev || DIFF_IDS.indexOf(diff) > DIFF_IDS.indexOf(prev)) pr.cheatHighest[cid] = diff;
  } else {
    out.newBest = updateRecord(pr, cid, category, report, now);
    // Hero Mastery: only the hero this player used.
    const gained = P.mastery.clear + P.mastery.perRank * rankIndex(r.overall);
    const before = pr.mastery[report.hero] ?? 0;
    pr.mastery[report.hero] = before + gained;
    out.mastery.gained = gained;
    out.mastery.to = masteryLevel(before + gained);
    for (let l = lvl + 1; l <= out.mastery.to; l += 1) {
      const key = `mastery:${report.hero}:${l}`;
      if (pr.claimed.includes(key)) continue;
      pr.claimed.push(key);
      line('mastery', P.payout.masteryLevel, report.hero);
    }
    out.granted = grantMasteryTechniques(pr, report.hero, out.mastery.to);
  }
  // Achievements earned by this run (Cheat-Assisted: narrative ones only, no Credits).
  for (const a of ACHIEVEMENTS) {
    if (pr.achievements[a.id] !== undefined) continue;
    if (suppressed && !a.narrative) continue;
    if (!achievementMet(p, a, report)) continue;
    pr.achievements[a.id] = now;
    out.achievements.push(a.id);
    line('achievement', a.credits, a.id);
  }
  out.lines.forEach((l) => (l.suppressed = suppressed));
  if (!suppressed) {
    out.total = out.lines.reduce((n, l) => n + l.amount, 0);
    for (const l of out.lines) pay(pr, l.id === 'achievement' ? 'achievement' : 'payout', l.amount, l.ref ?? l.id, now);
  }
  return out;
}

function updateRecord(pr: ProgressRecord, cid: string, category: string, report: RunReport, now: number): boolean {
  const r = report.results;
  const all = (pr.records[cid] ??= {});
  const old: StageRecord | undefined = all[category];
  const rec: StageRecord = old
    ? { ...old }
    : {
        bestScore: -1,
        bestRank: 'C',
        bestPoints: 0,
        fastestFrames: r.stats.frames,
        bestComboHits: 0,
        bestComboDamage: 0,
        leastDamageTaken: r.stats.damageTaken,
        clears: 0,
        heroes: [],
        loadout: [],
        version: report.gameVersion,
        at: now,
      };
  const better = r.score > rec.bestScore;
  rec.clears += 1;
  if (better) {
    rec.bestScore = r.score;
    rec.heroes = [...report.heroes];
    rec.loadout = [...report.loadout];
    rec.version = report.gameVersion;
    rec.at = now;
  }
  if (!old || rankIndex(r.overall) > rankIndex(rec.bestRank)) rec.bestRank = r.overall;
  rec.bestPoints = Math.max(rec.bestPoints, r.points);
  rec.fastestFrames = Math.min(rec.fastestFrames, r.stats.frames);
  rec.bestComboHits = Math.max(rec.bestComboHits, r.stats.bestHits);
  rec.bestComboDamage = Math.max(rec.bestComboDamage, r.stats.bestDamage);
  rec.leastDamageTaken = Math.min(rec.leastDamageTaken, r.stats.damageTaken);
  all[category] = rec;
  return better;
}

/** Techniques of `hero` whose Hero Mastery level is reached: owned without Credits. */
function grantMasteryTechniques(pr: ProgressRecord, hero: string, level: number): string[] {
  const out: string[] = [];
  for (const s of STORE)
    if (s.hero === hero && s.mastery > 0 && level >= s.mastery && !pr.owned.includes(s.id)) {
      pr.owned.push(s.id);
      out.push(s.id);
    }
  return out;
}

function lessonsAtLeast(pr: ProgressRecord, state: LessonState): number {
  const want = LESSON_ORDER.indexOf(state);
  return Object.values(pr.academy).filter((s) => LESSON_ORDER.indexOf(s) >= want).length;
}

/** Is an achievement's rule met (by this run, or by the profile for Academy rules)? */
export function achievementMet(p: Profile, a: AchievementDef, report: RunReport | null): boolean {
  const pr = p.progress;
  const rule = a.rule;
  if (rule.kind === 'academy') return lessonsAtLeast(pr, rule.state ?? 'certified') >= rule.count;
  if (!report || (rule.content && rule.content !== report.contentId)) return false;
  const r = report.results;
  if (r.startBeat > 0) return false;
  switch (rule.kind) {
    case 'clear':
      if (rule.rank && rankIndex(r.overall) < rankIndex(rule.rank)) return false;
      // A higher difficulty also completes a lower one.
      if (rule.difficulty && r.difficulty < DIFF_IDS.indexOf(rule.difficulty)) return false;
      return true;
    case 'heroes':
      return (pr.progress[`heroes:${report.contentId}`] ?? []).length >= rule.count;
    case 'stat': {
      if (rule.coop && report.mode !== 'coop') return false;
      if (rule.stat === 'bestHits') return r.stats.bestHits >= rule.min;
      if (rule.stat === 'revives') return r.stats.revives >= rule.min;
      if (rule.stat === 'allClues')
        return r.cluesTotal > 0 && r.stats.clues + r.stats.evidence >= r.cluesTotal;
      return false;
    }
    default:
      return false;
  }
}

/** Progress text values of an achievement (e.g. heroes 1/2), or null. */
export function achievementProgress(p: Profile, a: AchievementDef): { n: number; of: number } | null {
  if (a.rule.kind === 'heroes')
    return { n: (p.progress.progress[`heroes:${a.rule.content}`] ?? []).length, of: a.rule.count };
  if (a.rule.kind === 'academy')
    return { n: lessonsAtLeast(p.progress, a.rule.state ?? 'certified'), of: a.rule.count };
  return null;
}

// --- Academy ------------------------------------------------------------------------------

export interface AcademyAward {
  state: LessonState;
  credits: number;
  achievements: string[];
}

export function lessonState(p: Profile, lessonId: string): LessonState {
  return p.progress.academy[lessonId] ?? 'available';
}

/**
 * A lesson reached `state` (Practiced after guided work, Certified after the trial,
 * Mastered after the mastery goal). States only rise; certification and mastery pay their
 * Credits once. Cheat Practice never calls this.
 */
export function advanceLesson(p: Profile, lessonId: string, state: LessonState, now = Date.now()): AcademyAward {
  const pr = p.progress;
  const before = lessonState(p, lessonId);
  const out: AcademyAward = { state: before, credits: 0, achievements: [] };
  if (LESSON_ORDER.indexOf(state) <= LESSON_ORDER.indexOf(before)) return out;
  pr.academy[lessonId] = state;
  out.state = state;
  for (const s of ['certified', 'mastered'] as const) {
    if (LESSON_ORDER.indexOf(state) < LESSON_ORDER.indexOf(s)) continue;
    const key = `academy:${lessonId}:${s}`;
    if (pr.claimed.includes(key)) continue;
    pr.claimed.push(key);
    const amount = P.payout.academy[s];
    out.credits += amount;
    pay(pr, 'academy', amount, lessonId, now);
  }
  for (const a of ACHIEVEMENTS) {
    if (a.rule.kind !== 'academy' || pr.achievements[a.id] !== undefined) continue;
    if (!achievementMet(p, a, null)) continue;
    pr.achievements[a.id] = now;
    out.achievements.push(a.id);
    out.credits += a.credits;
    pay(pr, 'achievement', a.credits, a.id, now);
  }
  return out;
}

// --- store --------------------------------------------------------------------------------

export type StoreStatus = 'owned' | 'available' | 'locked' | 'hidden';

/** Revealed (visible) entries have met their reveal condition. */
export function revealed(p: Profile, item: StoreItemDef): boolean {
  if (!item.reveal) return true;
  return (p.missions[item.reveal]?.clears ?? 0) > 0 || p.progress.claimed.includes(`firstClear:${item.reveal}`);
}

/**
 * owned; available (revealed, prerequisite met: buyable when the Credits suffice);
 * locked (revealed, its prerequisite achievement is still open); hidden (not revealed).
 */
export function storeStatus(p: Profile, item: StoreItemDef): StoreStatus {
  if (p.progress.owned.includes(item.id)) return 'owned';
  if (!revealed(p, item)) return 'hidden';
  if (item.requires && p.progress.achievements[item.requires] === undefined) return 'locked';
  return 'available';
}

export type BuyResult = 'ok' | 'owned' | 'hidden' | 'locked' | 'credits' | 'guest' | 'unknown';

/** Buys an entry for its published price. Purchases are explicit and deterministic. */
export function buy(p: Profile, id: string, now = Date.now()): BuyResult {
  const item = itemDef(id);
  if (!item) return 'unknown';
  if (p.guest) return 'guest';
  const st = storeStatus(p, item);
  if (st !== 'available') return st;
  if (p.progress.credits < item.price) return 'credits';
  pay(p.progress, 'purchase', -item.price, id, now);
  p.progress.owned.push(id);
  return 'ok';
}

export function toggleGoal(p: Profile, id: string): void {
  const g = p.progress.goals;
  p.progress.goals = g.includes(id) ? g.filter((x) => x !== id) : [...g, id];
}

function equipment(p: Profile, hero: string) {
  return (p.progress.equipped[hero] ??= { outfit: null, techniques: [] });
}

/** Wears an owned outfit (or the default clothes with null). */
export function wearOutfit(p: Profile, hero: string, id: string | null): boolean {
  if (id !== null) {
    const item = itemDef(id);
    if (!item || item.kind !== 'outfit' || item.hero !== hero || !p.progress.owned.includes(id))
      return false;
  }
  equipment(p, hero).outfit = id;
  return true;
}

/**
 * Equips or removes an owned technique. It goes into its own input slot, replacing any
 * other equipped technique there (the default move returns when it is removed).
 */
export function setTechnique(p: Profile, hero: string, id: string, on: boolean): boolean {
  const item = itemDef(id);
  if (!item || item.group !== 'technique' || item.hero !== hero) return false;
  if (on && !p.progress.owned.includes(id)) return false;
  const eq = equipment(p, hero);
  const slot = techniqueSlot(item);
  eq.techniques = eq.techniques.filter((t) => {
    const other = itemDef(t);
    return t !== id && !(other && other.kind === item.kind && techniqueSlot(other) === slot);
  });
  if (on) eq.techniques.push(id);
  return true;
}

/** The input slot (Dir code) a catalogue technique goes into: its own input direction. */
export function techniqueSlot(item: StoreItemDef): number {
  const kit = HEROES.find((h) => h.id === item.hero);
  return kit?.actions.find((a) => a.id === item.action)?.dir ?? 0;
}

/** Loadout changes for the simulation from a hero's equipped techniques. */
export function loadoutChanges(p: Profile | null, hero: string): LoadoutChange[] {
  if (!p) return [];
  return (p.progress.equipped[hero]?.techniques ?? [])
    .map(itemDef)
    .filter((i): i is StoreItemDef => !!i && p.progress.owned.includes(i.id))
    .map((i) => ({ kind: i.kind as 'special' | 'ultimate', dir: techniqueSlot(i), action: i.action }));
}

/** Equipped catalogue techniques of a hero (store ids). */
export function equippedTechniques(p: Profile | null, hero: string): string[] {
  if (!p) return [];
  return (p.progress.equipped[hero]?.techniques ?? []).filter((t) => p.progress.owned.includes(t));
}

/** The tint colour of a hero's worn outfit, or null (default clothes). */
export function outfitTint(p: Profile | null, hero: string): string | null {
  const id = p?.progress.equipped[hero]?.outfit;
  if (!id || !p?.progress.owned.includes(id)) return null;
  return itemDef(id)?.tint ?? null;
}

export function setBadge(p: Profile, id: string | null): boolean {
  if (id !== null) {
    const item = itemDef(id);
    if (!item || item.kind !== 'badge' || !p.progress.owned.includes(id)) return false;
  }
  p.progress.badge = id;
  return true;
}

// --- My Combos ----------------------------------------------------------------------------

export const MY_COMBOS_CAP = 20;

let comboCounter = 0;

/** Saves a recorded recipe (abstract actions) under a name. False when the list is full. */
export function saveCombo(
  p: Profile,
  c: Omit<import('../save/progress').MyCombo, 'id' | 'createdAt'>,
  now = Date.now(),
): string | null {
  const list = p.progress.combos;
  if (list.length >= MY_COMBOS_CAP || c.steps.length === 0) return null;
  comboCounter = (comboCounter + 1) % 1296;
  const id = `c${now.toString(36)}${comboCounter.toString(36)}`;
  list.push({ ...c, name: c.name.slice(0, 40) || 'Combo', id, createdAt: now });
  return id;
}

export function renameCombo(p: Profile, id: string, name: string): void {
  const c = p.progress.combos.find((x) => x.id === id);
  if (c) c.name = name.slice(0, 40) || c.name;
}

export function deleteCombo(p: Profile, id: string): void {
  p.progress.combos = p.progress.combos.filter((x) => x.id !== id);
}
