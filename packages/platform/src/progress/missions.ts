import {
  ARENAS,
  ENEMIES,
  HEROES,
  MISSIONS,
  PROFILES,
  STAGES,
  type MissionPackageDef,
  type StoryChoiceDef,
} from '@ffp/sim';
import type { Profile, RunArchiveEntry, RunCanon, RunLabel, RunMode } from '../save/schema';
import { recordClear } from '../save/schema';
import { CAMPAIGN, stageCompleted } from './campaign';

/**
 * M26 Mission Hub (expanded game modes spec §5, §7, §9.2): content packages with stable IDs,
 * eligibility rules, Chronicle authentication, the Run Archive and the story choice record.
 * Everything is data in missions.yaml; these are pure reads and changes of a profile (the
 * shell saves).
 *
 * Eligibility is content access, never mastery (spec §5.4.3): a gate is a story stage
 * completed (Cheat-Assisted included) or a Chronicle authenticated; never a score, rank,
 * difficulty, Credits or another optional package.
 */
export const MISSION_PACKAGES: readonly MissionPackageDef[] = MISSIONS.packages;
export const STORY_TIMELINE: readonly string[] = MISSIONS.timeline;
export const STORY_CHOICES: readonly StoryChoiceDef[] = MISSIONS.storyChoices;
export const MISSION_FAMILIES = ['chronicle', 'remix', 'curated', 'operation'] as const;
export type MissionFamilyId = (typeof MISSION_FAMILIES)[number];

/** A package's state on the Hub. */
export type MissionState = 'locked' | 'notInstalled' | 'open';

export function missionPackage(id: string): MissionPackageDef | undefined {
  return MISSION_PACKAGES.find((m) => m.id === id);
}

/** Position on the story timeline (sort key): the stage it follows, then its place. */
export function timelineKey(m: MissionPackageDef): number {
  return STORY_TIMELINE.indexOf(m.after) * 100 + m.place;
}

/**
 * The packages one Hub destination shows, in timeline order. Lab test packages show only
 * in the M26 Lab profiles (`lab`).
 */
export function hubEntries(family: string, lab: boolean): MissionPackageDef[] {
  return MISSION_PACKAGES.filter((m) => m.family === family && (lab || !m.lab)).sort(
    (a, b) => timelineKey(a) - timelineKey(b),
  );
}

/** Is a story stage completed on this profile (a timeline stage beyond the campaign too)? */
export function storyCompleted(p: Profile, stage: string): boolean {
  return CAMPAIGN.some((c) => c.id === stage)
    ? stageCompleted(p, stage)
    : p.campaign.completed.includes(stage);
}

export function chronicleAuthenticated(p: Profile, id: string): boolean {
  return p.chronicles[id] !== undefined;
}

/** Is the package's gate met (its story stage completed, or its Chronicle authenticated)? */
export function gateMet(p: Profile, m: MissionPackageDef): boolean {
  if (m.gate.chronicle) return chronicleAuthenticated(p, m.gate.chronicle);
  return m.gate.stage ? storyCompleted(p, m.gate.stage) : true;
}

/**
 * Locked until its gate is met (the Hub shows only its spoiler-safe clue); then open when
 * its content is in this build, else Not installed. A late install opens at once when the
 * gate is already met.
 */
export function missionState(p: Profile, m: MissionPackageDef): MissionState {
  if (!gateMet(p, m)) return 'locked';
  return m.status === 'available' ? 'open' : 'notInstalled';
}

/** Playable roster ids (unique heroes, spec §3.2). */
const ROSTER = HEROES.map((h) => h.id);

/**
 * Who may play the package with `players` players: `fixed` lists the historically correct
 * participants per seat (no choice); `eligible` the heroes the players choose from (each
 * hero once). Characters that are not playable yet never appear in `eligible`.
 */
export function missionHeroes(
  m: MissionPackageDef,
  players: number,
): { fixed: string[] | null; eligible: string[] } {
  const r = m.heroes;
  if (r.rule === 'fixed') {
    const fixed = r.list.slice(0, players);
    return { fixed, eligible: fixed.filter((h) => ROSTER.includes(h)) };
  }
  if (r.rule === 'pool') return { fixed: null, eligible: r.list.filter((h) => ROSTER.includes(h)) };
  return { fixed: null, eligible: [...ROSTER] };
}

/** Why the package cannot be launched with `players` players (null: it can). */
export function launchBlock(
  p: Profile,
  m: MissionPackageDef,
  players: number,
): 'locked' | 'notInstalled' | 'players' | 'heroes' | null {
  const s = missionState(p, m);
  if (s !== 'open') return s;
  if (!m.players.includes(players)) return 'players';
  const h = missionHeroes(m, players);
  if (
    h.fixed ? h.fixed.length < players || h.eligible.length < players : h.eligible.length < players
  )
    return 'heroes';
  return null;
}

/** A Remix opened by this Chronicle (and every other package it gates). */
export function gatedBy(chronicle: string): MissionPackageDef[] {
  return MISSION_PACKAGES.filter((m) => m.gate.chronicle === chronicle);
}

/** Does the profile hold a record of an older version of this package (a Legacy record)? */
export function hasLegacy(p: Profile, m: MissionPackageDef): boolean {
  return p.runArchive.some((r) => r.contentId === m.id && r.packageVersion < m.version);
}

/** Is a Run Archive entry from an older package version than the current one? */
export function isLegacy(r: RunArchiveEntry): boolean {
  const m = missionPackage(r.contentId);
  return !!m && r.packageVersion < m.version;
}

// --- Random Operations board (spec §5.5.1: Spoiler-Safe Validated Content Pool) ---------

export interface OperationPool {
  /** Story stages whose content entered the pool (cleared ones, in story order). */
  stages: string[];
  /** Bounded authored combat spaces of those stages (stage camera locks with waves). */
  arenas: number;
  /** Enemy families of those arenas (Story bosses excluded). */
  enemies: string[];
  /** Heroes eligible for generated operations. */
  heroes: string[];
}

/**
 * The content a generated operation may draw from: only cleared Story content enters;
 * Story bosses stay out (spec §5.5.1). The generator itself arrives with M41.
 */
export function operationPool(p: Profile): OperationPool {
  const stages = STORY_TIMELINE.filter((s) => storyCompleted(p, s));
  const isBoss = (kit: string) => {
    const i = ENEMIES.findIndex((k) => k.id === kit);
    return i >= 0 && !!PROFILES[i]?.boss;
  };
  // A stage's combat spaces: its camera locks and the wave arenas of its rooms; a Story
  // boss's space stays out.
  const ofStage = (s: string) => {
    const rooms = new Set(
      (STAGES.find((x) => x.id === s)?.beats ?? []).flatMap((b) =>
        b.room ? [`${b.room}-waves`] : [],
      ),
    );
    return ARENAS.filter(
      (a) =>
        a.stage &&
        a.waves.length > 0 &&
        (a.id.startsWith(`${s}.`) || rooms.has(a.id)) &&
        !a.waves.some((w) => w.enemies.some((e) => isBoss(e.kit))),
    );
  };
  const arenas = stages.flatMap(ofStage);
  const kits = new Set<string>();
  for (const a of arenas)
    for (const w of a.waves) for (const e of w.enemies) if (!isBoss(e.kit)) kits.add(e.kit);
  return { stages, arenas: arenas.length, enemies: [...kits].sort(), heroes: [...ROSTER] };
}

// --- Run Archive (spec §7) --------------------------------------------------------------

/** Unpinned entries kept; older unpinned ones compact away, pinned ones never do. */
export const ARCHIVE_KEEP = 100;

export interface ArchiveReport {
  contentId: string;
  packageVersion: number;
  mode: RunMode;
  canon: RunCanon;
  outcome: 'cleared' | 'failed';
  grade: string | null;
  points: number | null;
  difficulty: string;
  heroes: string[];
  players: number;
  timeFrames: number | null;
  labels: RunLabel[];
  gameVersion: string;
}

/** Writes a finished run to the Run Archive (newest first) and returns its entry. */
export function archiveRun(p: Profile, r: ArchiveReport, now = Date.now()): RunArchiveEntry {
  let id = `r${now.toString(36)}`;
  for (let n = 1; p.runArchive.some((e) => e.id === id); n += 1) id = `r${now.toString(36)}-${n}`;
  const entry: RunArchiveEntry = {
    id,
    ...r,
    heroes: [...r.heroes],
    labels: [...r.labels],
    endedAt: now,
    pinned: false,
  };
  p.runArchive = compactArchive([entry, ...p.runArchive]);
  return entry;
}

/** Keeps every pinned entry and the newest ARCHIVE_KEEP unpinned ones, in order. */
export function compactArchive(list: RunArchiveEntry[]): RunArchiveEntry[] {
  let unpinned = 0;
  return list.filter((e) => e.pinned || (unpinned += 1) <= ARCHIVE_KEEP);
}

export function pinRun(p: Profile, id: string, pinned: boolean): void {
  const e = p.runArchive.find((x) => x.id === id);
  if (e) e.pinned = pinned;
  if (!pinned) p.runArchive = compactArchive(p.runArchive);
}

/** Archive entries of a mode (all: every mode), newest first. */
export function archiveOf(p: Profile, mode: RunMode | 'all'): RunArchiveEntry[] {
  return p.runArchive.filter((e) => mode === 'all' || e.mode === mode);
}

/** What replaying an archived run starts, or why it cannot be replayed now. */
export type ReplayTarget =
  | { kind: 'story'; stage: string; difficulty: string; heroes: string[]; players: number }
  | { kind: 'mission'; id: string; difficulty: string; heroes: string[]; players: number }
  | { kind: 'blocked'; reason: 'locked' | 'notInstalled' | 'players' | 'heroes' | 'unknown' };

/**
 * Replay from the Archive: the same content, difficulty, player count and heroes again,
 * as a new run under the current version (a Legacy entry plays the current package).
 */
export function replayTarget(p: Profile, e: RunArchiveEntry, lab = true): ReplayTarget {
  const base = { difficulty: e.difficulty, heroes: [...e.heroes], players: e.players };
  if (e.mode === 'story') {
    const c = CAMPAIGN.find((x) => x.content === e.contentId);
    if (!c) return { kind: 'blocked', reason: 'notInstalled' };
    const open = c.opens === null || stageCompleted(p, c.opens);
    return open ? { kind: 'story', stage: c.id, ...base } : { kind: 'blocked', reason: 'locked' };
  }
  const m = missionPackage(e.contentId);
  if (!m || (m.lab && !lab)) return { kind: 'blocked', reason: 'unknown' };
  const block = launchBlock(p, m, e.players);
  if (block) return { kind: 'blocked', reason: block };
  const difficulty = m.difficulties.includes(e.difficulty) ? e.difficulty : m.difficulties[0]!;
  return { kind: 'mission', id: m.id, ...base, difficulty };
}

// --- mission results --------------------------------------------------------------------

export interface MissionOutcome {
  entry: RunArchiveEntry;
  /** A Chronicle's first completion authenticated its record (spec §5.2). */
  authenticated: boolean;
  /** Packages that this completion opened (the Chronicle's Remix). */
  opened: string[];
}

/**
 * A Mission Mode run finished. Every run enters the Run Archive with its labels; a clean
 * clear updates the package's mission record (Remix keeps its own content ID, so it never
 * replaces the canonical participants' record); a Chronicle's first completion
 * (Cheat-Assisted included: content access is narrative) authenticates it and opens its
 * Remix at once, with no purchase, score, rank or difficulty requirement.
 */
export function recordMissionRun(
  p: Profile,
  m: MissionPackageDef,
  r: Omit<ArchiveReport, 'contentId' | 'packageVersion' | 'mode' | 'canon'>,
  difficultyOrder: readonly string[],
  now = Date.now(),
): MissionOutcome {
  const entry = archiveRun(
    p,
    {
      ...r,
      contentId: m.id,
      packageVersion: m.version,
      mode: m.family as RunMode,
      canon: m.canon as RunCanon,
    },
    now,
  );
  const cleared = r.outcome === 'cleared';
  if (cleared && !r.labels.includes('cheat-assisted'))
    recordClear(
      p,
      m.id,
      {
        grade: r.grade,
        timeFrames: r.timeFrames ?? 0,
        difficulty: r.difficulty,
        heroes: r.heroes,
      },
      difficultyOrder,
      now,
    );
  let authenticated = false;
  const opened: string[] = [];
  if (cleared && m.family === 'chronicle' && !chronicleAuthenticated(p, m.id)) {
    p.chronicles[m.id] = now;
    authenticated = true;
    for (const g of gatedBy(m.id)) opened.push(g.id);
  }
  return { entry, authenticated, opened };
}

// --- story choice record (campaign review G6, spec §9.2 Personal Paths) -----------------

export function storyChoice(id: string): StoryChoiceDef | undefined {
  return STORY_CHOICES.find((c) => c.id === id);
}

/**
 * Records a personal story choice by its stable ID (the latest choice stands). Unknown ids
 * or options are refused; a choice never changes the canonical campaign.
 */
export function recordStoryChoice(p: Profile, id: string, option: string): boolean {
  const c = storyChoice(id);
  if (!c || !c.options.includes(option)) return false;
  p.storyChoices[id] = option;
  return true;
}

/** Personal Paths: the recorded choices with their definitions, in story order. */
export function personalPaths(p: Profile): { def: StoryChoiceDef; option: string }[] {
  return STORY_CHOICES.filter((c) => p.storyChoices[c.id] !== undefined)
    .sort((a, b) => STORY_TIMELINE.indexOf(a.stage) - STORY_TIMELINE.indexOf(b.stage))
    .map((def) => ({ def, option: p.storyChoices[def.id]! }));
}
