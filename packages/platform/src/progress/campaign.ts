import {
  BranchOutcome,
  PROGRESSION,
  type CampaignStageDef,
  type DossierEntryDef,
  type MuseumEntryDef,
  type StageResults,
  type UnlockDef,
} from '@ffp/sim';
import type { Profile } from '../save/schema';

/**
 * M21 campaign layer (roadmap Stage 2 decision 2), Village Museum and Archive, Sponsor
 * Dossier and formula research (Stage 2 spec §14.2, §14.4; F&D §9.1). Everything is data
 * in progression.yaml and keyed by stable IDs; these are pure changes of a profile.
 *
 * Unlock rules: `always` (whenever the stage's pages are shown), `open` (the stage is
 * open), `start` (a run of the stage began), `complete` (the stage was completed: a full
 * run, Cheat-Assisted included, F&D §9.1), `branch` (that branch completed in a finished
 * run). Pages of a stage that is not open are never shown (no spoilers).
 */
export const CAMPAIGN: readonly CampaignStageDef[] = PROGRESSION.campaign;
export const MUSEUM: readonly MuseumEntryDef[] = PROGRESSION.museum;
export const DOSSIER: readonly DossierEntryDef[] = PROGRESSION.dossier;
export const RESEARCH = PROGRESSION.research;
export const MUSEUM_SECTIONS = [
  'picture',
  'cinema',
  'music',
  'sound',
  'collection',
  'investigation',
] as const;
export type MuseumSection = (typeof MUSEUM_SECTIONS)[number];

export function campaignStage(stage: string): CampaignStageDef | undefined {
  return CAMPAIGN.find((c) => c.id === stage);
}

/** The story content ID of a stage file id (`stage2` → `story.stage2.prosperity-under-siege`). */
export function contentIdOf(stage: string): string {
  return campaignStage(stage)?.content ?? `story.${stage}`;
}

/** The stage id of a story content ID (null: not a campaign stage). */
export function stageOfContent(content: string): string | null {
  return CAMPAIGN.find((c) => c.content === content)?.id ?? null;
}

/** Was the stage completed at least once on this profile? */
export function stageCompleted(p: Profile, stage: string): boolean {
  if (p.campaign.completed.includes(stage)) return true;
  return (p.missions[contentIdOf(stage)]?.clears ?? 0) > 0;
}

/** Can the stage be picked (its prerequisite stage was completed once)? */
export function stageOpen(p: Profile, stage: string): boolean {
  const c = campaignStage(stage);
  if (!c) return false;
  return c.opens === null || stageCompleted(p, c.opens);
}

/** The campaign stages in Story Mode order with their open state. */
export function campaignList(p: Profile): { def: CampaignStageDef; open: boolean }[] {
  return CAMPAIGN.map((def) => ({ def, open: stageOpen(p, def.id) }));
}

/** The What's New cards still to show before this stage's first run (empty: none). */
export function whatsNewDue(p: Profile, stage: string): readonly string[] {
  const c = campaignStage(stage);
  if (!c || c.whatsNew.length === 0 || p.campaign.whatsNewSeen.includes(stage)) return [];
  return c.whatsNew;
}

export function markWhatsNewSeen(p: Profile, stage: string): void {
  if (!p.campaign.whatsNewSeen.includes(stage)) p.campaign.whatsNewSeen.push(stage);
}

type Event = 'open' | 'start' | 'complete';

function matches(u: UnlockDef, event: Event, branches: readonly string[]): boolean {
  if (u.kind === 'branch') return event === 'complete' && !!u.branch && branches.includes(u.branch);
  if (u.kind === 'complete') return event === 'complete';
  if (u.kind === 'start') return event === 'start' || event === 'complete';
  if (u.kind === 'open') return true;
  return false;
}

/** Unlocks every Museum, Dossier and research entry of `stage` this event earns. */
function unlockFor(
  p: Profile,
  stage: string,
  event: Event,
  branches: readonly string[],
  now: number,
): string[] {
  const out: string[] = [];
  const give = (store: Record<string, number>, id: string, u: UnlockDef) => {
    if (u.kind === 'always' || store[id] !== undefined || !matches(u, event, branches)) return;
    store[id] = now;
    out.push(id);
  };
  for (const m of MUSEUM) if (m.stage === stage) give(p.museum.unlocked, m.id, m.unlock);
  for (const d of DOSSIER) if (d.stage === stage) give(p.sponsorDossier.unlocked, d.id, d.unlock);
  for (const i of RESEARCH.inputs) if (i.stage === stage) give(p.research.inputs, i.id, i.unlock);
  if (event === 'complete')
    for (const m of RESEARCH.milestones)
      if (m.stage === stage && p.research.milestones[m.id] === undefined)
        p.research.milestones[m.id] = now;
  return out;
}

/** A run of the stage began (from the shell; Lab practice from a later beat does not count). */
export function noteStageStart(p: Profile, stage: string, now = Date.now()): string[] {
  if (!p.campaign.started.includes(stage)) p.campaign.started.push(stage);
  return unlockFor(p, stage, 'start', [], now);
}

/** Branch ids a finished run completed. */
export function completedBranches(results: StageResults): string[] {
  return results.branches.filter((b) => b.outcome === BranchOutcome.Completed).map((b) => b.id);
}

export interface Completion {
  /** The stage was completed for the first time on this profile. */
  first: boolean;
  /** Stages this completion opened. */
  opened: string[];
  /** Museum, Dossier and research entries unlocked. */
  unlocked: string[];
}

/**
 * A full run of the stage finished (Cheat-Assisted included: story progress and narrative
 * discoveries are kept, F&D §9.1). Records the completion, opens the next stages and
 * unlocks the Museum, Dossier and research entries it earned.
 */
export function completeStage(
  p: Profile,
  stage: string,
  results: StageResults | null,
  now = Date.now(),
): Completion {
  const wasOpen = CAMPAIGN.filter((c) => stageOpen(p, c.id)).map((c) => c.id);
  const first = !p.campaign.completed.includes(stage);
  if (first) p.campaign.completed.push(stage);
  if (!p.campaign.started.includes(stage)) p.campaign.started.push(stage);
  const branches = results ? completedBranches(results) : [];
  const unlocked = unlockFor(p, stage, 'complete', branches, now);
  const opened = CAMPAIGN.filter((c) => stageOpen(p, c.id) && !wasOpen.includes(c.id)).map(
    (c) => c.id,
  );
  for (const s of opened) unlocked.push(...unlockFor(p, s, 'open', [], now));
  return { first, opened, unlocked };
}

// --- Museum, Dossier and research views ---------------------------------------------------

export type EntryState = 'hidden' | 'locked' | 'unlocked';

function entryState(
  p: Profile,
  e: { id: string; stage: string; unlock: UnlockDef },
  store: Record<string, number>,
): EntryState {
  if (!stageOpen(p, e.stage)) return 'hidden';
  if (e.unlock.kind === 'always' || e.unlock.kind === 'open') return 'unlocked';
  return store[e.id] !== undefined ? 'unlocked' : 'locked';
}

export function museumState(p: Profile, e: MuseumEntryDef): EntryState {
  return entryState(p, e, p.museum.unlocked);
}

/** Entries of a section that are shown (their stage is open), locked ones included. */
export function museumSection(
  p: Profile,
  section: MuseumSection,
): { def: MuseumEntryDef; state: EntryState; viewed: boolean }[] {
  return MUSEUM.filter((m) => m.section === section)
    .map((def) => ({ def, state: museumState(p, def), viewed: p.museum.viewed.includes(def.id) }))
    .filter((x) => x.state !== 'hidden');
}

/** Unlocked entries the player has not opened yet (the village's "new" marker). */
export function museumNew(p: Profile): number {
  return MUSEUM.filter((m) => museumState(p, m) === 'unlocked' && !p.museum.viewed.includes(m.id))
    .length;
}

export function markViewed(p: Profile, id: string): void {
  if (!p.museum.viewed.includes(id)) p.museum.viewed.push(id);
}

/**
 * The Sponsor Dossier: every unlocked confirmed fact in order and the current theory (the
 * newest unlocked theory). Never empty slots or counts.
 */
export function dossierView(p: Profile): {
  facts: DossierEntryDef[];
  theory: DossierEntryDef | null;
} {
  const open = DOSSIER.filter((d) => entryState(p, d, p.sponsorDossier.unlocked) === 'unlocked');
  const theories = open.filter((d) => d.kind === 'theory');
  return { facts: open.filter((d) => d.kind === 'fact'), theory: theories.at(-1) ?? null };
}

/** Formula research: milestones (complete or not) and the recorded inputs, for open stages. */
export function researchView(p: Profile): {
  milestones: { id: string; complete: boolean }[];
  inputs: string[];
  shown: boolean;
} {
  const inputs = RESEARCH.inputs
    .filter((i) => entryState(p, i, p.research.inputs) === 'unlocked')
    .map((i) => i.id);
  const milestones = RESEARCH.milestones.map((m) => ({
    id: m.id,
    complete: p.research.milestones[m.id] !== undefined,
  }));
  // The research shows once its first stage is open (it is a Stage 2 thread).
  const first = RESEARCH.milestones.find((m) => m.stage)?.stage;
  return { milestones, inputs, shown: !first || stageOpen(p, first) };
}
