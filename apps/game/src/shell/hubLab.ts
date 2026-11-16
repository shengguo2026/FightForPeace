import {
  STORY_TIMELINE,
  archiveRun,
  completeStage,
  contentIdOf,
  pinRun,
  recordClear,
  recordStoryChoice,
  type Profile,
} from '@ffp/platform';

/**
 * M26 Lab profiles (`?hublab=<preset>`): a temporary profile in memory (nothing is saved,
 * the player's own profiles are never touched) whose story progress and Run Archive show
 * every Hub state: locked entries with clues, Not installed packages, open Lab test
 * packages, a Legacy record and a pinned run.
 *
 *   fresh   nothing completed
 *   stage2  Stages 1 and 2 completed, sample runs in the Run Archive (the default)
 *   stage3  … and Stage 3 (a timeline stage beyond the built ones)
 *   stage6  … and Stages 4 to 6
 *   all     the campaign completed, both planned Chronicles authenticated, a personal choice
 */
export const HUB_LAB_PRESETS = ['fresh', 'stage2', 'stage3', 'stage6', 'all'] as const;
export type HubLabPreset = (typeof HUB_LAB_PRESETS)[number];

export function hubLabPreset(raw: string | null): HubLabPreset {
  return (HUB_LAB_PRESETS as readonly string[]).includes(raw ?? '')
    ? (raw as HubLabPreset)
    : 'stage2';
}

const LAST: Record<HubLabPreset, number> = { fresh: 0, stage2: 2, stage3: 3, stage6: 6, all: 8 };
const ORDER = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];

export function applyHubLab(
  p: Profile,
  preset: HubLabPreset,
  version: string,
  now = Date.now(),
): void {
  const upTo = LAST[preset];
  if (upTo === 0) return;
  const hour = 3_600_000;
  // Built stages complete through the campaign rules; later timeline stages are recorded.
  for (const stage of STORY_TIMELINE.slice(0, upTo)) {
    if (stage === 'stage1' || stage === 'stage2') completeStage(p, stage, null, now - 10 * hour);
    else if (!p.campaign.completed.includes(stage)) p.campaign.completed.push(stage);
  }
  const base = {
    packageVersion: 1,
    mode: 'story' as const,
    canon: 'canonical' as const,
    outcome: 'cleared' as const,
    gameVersion: version,
  };
  recordClear(
    p,
    contentIdOf('stage1'),
    { grade: 'A', timeFrames: 41_000, difficulty: 'medium', heroes: ['mountain'] },
    ORDER,
    now - 9 * hour,
  );
  archiveRun(
    p,
    {
      ...base,
      contentId: contentIdOf('stage1'),
      grade: 'A',
      points: 84,
      difficulty: 'medium',
      heroes: ['mountain'],
      players: 1,
      timeFrames: 41_000,
      labels: [],
    },
    now - 9 * hour,
  );
  archiveRun(
    p,
    {
      ...base,
      contentId: contentIdOf('stage1'),
      grade: 'B',
      points: 71,
      difficulty: 'hard',
      heroes: ['river'],
      players: 1,
      timeFrames: 52_000,
      labels: ['cheat-assisted'],
    },
    now - 8 * hour,
  );
  recordClear(
    p,
    contentIdOf('stage2'),
    { grade: 'B', timeFrames: 70_000, difficulty: 'easy', heroes: ['wind', 'fire'] },
    ORDER,
    now - 7 * hour,
  );
  const coop = archiveRun(
    p,
    {
      ...base,
      contentId: contentIdOf('stage2'),
      grade: 'B',
      points: 68,
      difficulty: 'easy',
      heroes: ['wind', 'fire'],
      players: 2,
      timeFrames: 70_000,
      labels: ['continued'],
    },
    now - 7 * hour,
  );
  pinRun(p, coop.id, true);
  // A run of the Lab case on its first package version: a Legacy record today (version 2).
  archiveRun(
    p,
    {
      ...base,
      contentId: 'curated.lab-captive-drill',
      packageVersion: 1,
      mode: 'curated',
      canon: 'side-story',
      grade: 'A',
      points: 85,
      difficulty: 'medium',
      heroes: ['mountain'],
      players: 1,
      timeFrames: 9_000,
      labels: [],
    },
    now - 6 * hour,
  );
  if (preset === 'all') {
    p.chronicles['chronicle.bell-before-dawn'] = now - 5 * hour;
    p.chronicles['chronicle.road-between'] = now - 4 * hour;
    recordStoryChoice(p, 'story.stage8.kael-reunion', 'meet_later');
  }
}
