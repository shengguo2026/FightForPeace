import { MISSIONS } from '@ffp/sim';
import {
  ARCHIVE_KEEP,
  MIGRATIONS,
  SAVE_VERSION,
  archiveOf,
  archiveRun,
  completeStage,
  contentIdOf,
  createProfile,
  decodeProfile,
  encodeProfile,
  gateMet,
  hasLegacy,
  hubEntries,
  isLegacy,
  launchBlock,
  migrate,
  missionHeroes,
  missionPackage,
  missionState,
  normalizeProfile,
  operationPool,
  personalPaths,
  pinRun,
  recordMissionRun,
  recordStoryChoice,
  replayTarget,
  type ArchiveReport,
  type Profile,
} from '../src/index';

const ORDER = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];

function report(over: Partial<ArchiveReport> = {}): ArchiveReport {
  return {
    contentId: contentIdOf('stage1'),
    packageVersion: 1,
    mode: 'story',
    canon: 'canonical',
    outcome: 'cleared',
    grade: 'A',
    points: 82,
    difficulty: 'medium',
    heroes: ['mountain'],
    players: 1,
    timeFrames: 30_000,
    labels: [],
    gameVersion: '0.26.0',
    ...over,
  };
}

const pkg = (id: string) => {
  const m = missionPackage(id);
  if (!m) throw new Error(id);
  return m;
};

function withStages(...stages: string[]): Profile {
  const p = createProfile('A', 'en', 1000);
  for (const s of stages)
    if (s === 'stage1' || s === 'stage2') completeStage(p, s, null, 1000);
    else p.campaign.completed.push(s);
  return p;
}

test('every package has a stable family-prefixed ID, a version and text-free data', () => {
  const ids = MISSIONS.packages.map((m) => m.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const m of MISSIONS.packages) {
    expect(m.id.startsWith(`${m.family}.`)).toBe(true);
    expect(m.version).toBeGreaterThanOrEqual(1);
  }
  // The four Curated Missions of spec §5.4.3 with their story gates.
  expect(
    MISSIONS.packages
      .filter((m) => m.family === 'curated' && !m.lab)
      .map((m) => [m.id, m.gate.stage]),
  ).toEqual([
    ['curated.storm-over-qinglan', 'stage3'],
    ['curated.no-escape-at-reedwater', 'stage3'],
    ['curated.medicine-road', 'stage5'],
    ['curated.vanishing-survey', 'stage6'],
  ]);
  expect(MISSIONS.timeline.slice(0, 2)).toEqual(['stage1', 'stage2']);
});

test('the Hub lists each destination in timeline order; Lab packages only in Lab profiles', () => {
  const curated = hubEntries('curated', false).map((m) => m.id);
  expect(curated).toEqual([
    'curated.storm-over-qinglan',
    'curated.no-escape-at-reedwater',
    'curated.medicine-road',
    'curated.vanishing-survey',
  ]);
  const lab = hubEntries('curated', true).map((m) => m.id);
  expect(lab).toContain('curated.lab-captive-drill');
  expect(lab.indexOf('curated.lab-captive-drill')).toBeLessThan(
    lab.indexOf('curated.storm-over-qinglan'),
  );
  expect(hubEntries('operation', false).map((m) => m.id)).toEqual([
    'operation.defeat',
    'operation.safeguard',
  ]);
});

test('story gates: locked before, Not installed after for planned content, open when available', () => {
  const fresh = withStages();
  const storm = pkg('curated.storm-over-qinglan');
  const drill = pkg('curated.lab-captive-drill');
  expect(missionState(fresh, storm)).toBe('locked');
  expect(missionState(fresh, drill)).toBe('locked');
  expect(missionState(fresh, pkg('operation.defeat'))).toBe('locked');
  const s2 = withStages('stage1', 'stage2');
  expect(missionState(s2, drill)).toBe('open');
  expect(missionState(s2, pkg('operation.defeat'))).toBe('notInstalled');
  expect(missionState(s2, storm)).toBe('locked');
  // Stage 3 is beyond the built stages: its completion record opens the gate.
  const s3 = withStages('stage1', 'stage2', 'stage3');
  expect(missionState(s3, storm)).toBe('notInstalled');
  expect(missionState(s3, pkg('curated.no-escape-at-reedwater'))).toBe('notInstalled');
  expect(missionState(s3, pkg('curated.medicine-road'))).toBe('locked');
  expect(missionState(s3, pkg('curated.lab-sealed-case'))).toBe('open');
});

test('gates never ask for score, rank, difficulty or another optional package', () => {
  const p = withStages('stage1', 'stage2', 'stage3');
  // No mission record, no Credits, no other case: still open (Reedwater without Qinglan).
  expect(p.progress.credits).toBe(0);
  expect(gateMet(p, pkg('curated.no-escape-at-reedwater'))).toBe(true);
  // Cheat-Assisted completion counts: completeStage records it either way.
  const c = createProfile('C', 'en');
  completeStage(c, 'stage1', null);
  expect(gateMet(c, pkg('chronicle.lab-founders-record'))).toBe(true);
});

test('hero eligibility: fixed participants, a pool, any unique hero', () => {
  const chron = pkg('chronicle.lab-founders-record');
  expect(missionHeroes(chron, 1)).toEqual({ fixed: ['mountain'], eligible: ['mountain'] });
  expect(missionHeroes(chron, 2)).toEqual({
    fixed: ['mountain', 'river'],
    eligible: ['mountain', 'river'],
  });
  expect(missionHeroes(pkg('remix.lab-founders-record'), 2).eligible).toEqual([
    'mountain',
    'river',
    'wind',
    'fire',
  ]);
  // Characters who are not playable yet never become choices.
  const bell = pkg('chronicle.bell-before-dawn');
  expect(missionHeroes(bell, 2)).toEqual({
    fixed: ['young-sheng-guo', 'liang-zhen'],
    eligible: [],
  });
  const p = withStages('stage1', 'stage2', 'stage3');
  expect(launchBlock(p, pkg('curated.lab-sealed-case'), 2)).toBe('players');
  expect(launchBlock(p, pkg('curated.lab-sealed-case'), 1)).toBeNull();
  expect(launchBlock(p, pkg('curated.storm-over-qinglan'), 1)).toBe('notInstalled');
});

test("a Chronicle's first clear authenticates it and opens its Remix; Remix records stay apart", () => {
  const p = withStages('stage1');
  const chron = pkg('chronicle.lab-founders-record');
  const remix = pkg('remix.lab-founders-record');
  expect(missionState(p, remix)).toBe('locked');
  // A failed run is archived but authenticates nothing.
  const failed = recordMissionRun(
    p,
    chron,
    { ...report(), outcome: 'failed', grade: null, points: null },
    ORDER,
    2000,
  );
  expect(failed.authenticated).toBe(false);
  expect(p.runArchive[0]).toMatchObject({
    contentId: chron.id,
    mode: 'chronicle',
    outcome: 'failed',
  });
  // Cheat-Assisted completion authenticates (content access) but keeps no clear record.
  const o = recordMissionRun(p, chron, { ...report(), labels: ['cheat-assisted'] }, ORDER, 3000);
  expect(o).toMatchObject({ authenticated: true, opened: ['remix.lab-founders-record'] });
  expect(p.chronicles[chron.id]).toBe(3000);
  expect(p.missions[chron.id]).toBeUndefined();
  expect(missionState(p, remix)).toBe('open');
  // A second clear authenticates nothing new.
  expect(recordMissionRun(p, chron, report(), ORDER, 4000).authenticated).toBe(false);
  expect(p.missions[chron.id]?.clears).toBe(1);
  recordMissionRun(p, remix, { ...report(), heroes: ['fire'], grade: 'S' }, ORDER, 5000);
  expect(p.missions[remix.id]).toMatchObject({ clears: 1, bestGrade: 'S' });
  expect(p.missions[chron.id]).toMatchObject({ clears: 1, bestGrade: 'A' });
  expect(p.runArchive[0]).toMatchObject({ mode: 'remix', canon: 'remix' });
});

test('the Run Archive keeps every pinned run and the newest unpinned ones', () => {
  const p = createProfile('A', 'en');
  const first = archiveRun(p, report(), 1);
  pinRun(p, first.id, true);
  for (let i = 0; i < ARCHIVE_KEEP + 10; i += 1) archiveRun(p, report(), 10 + i);
  expect(p.runArchive.length).toBe(ARCHIVE_KEEP + 1);
  expect(p.runArchive.at(-1)!.id).toBe(first.id);
  expect(new Set(p.runArchive.map((e) => e.id)).size).toBe(p.runArchive.length);
  pinRun(p, first.id, false);
  expect(p.runArchive.length).toBe(ARCHIVE_KEEP);
  expect(p.runArchive.some((e) => e.id === first.id)).toBe(false);
  // Same millisecond, distinct ids.
  const a = archiveRun(p, report(), 99_999);
  const b = archiveRun(p, report(), 99_999);
  expect(a.id).not.toBe(b.id);
  expect(archiveOf(p, 'curated')).toEqual([]);
});

test('replay from the Archive: story and mission targets, blocked ones say why', () => {
  const p = withStages('stage1', 'stage2');
  const story = archiveRun(
    p,
    report({ contentId: contentIdOf('stage2'), heroes: ['wind', 'fire'], players: 2 }),
  );
  expect(replayTarget(p, story)).toEqual({
    kind: 'story',
    stage: 'stage2',
    difficulty: 'medium',
    heroes: ['wind', 'fire'],
    players: 2,
  });
  const fresh = withStages();
  expect(replayTarget(fresh, story)).toEqual({ kind: 'blocked', reason: 'locked' });
  const drill = archiveRun(
    p,
    report({
      contentId: 'curated.lab-captive-drill',
      packageVersion: 1,
      mode: 'curated',
      canon: 'side-story',
      difficulty: 'ultimate',
    }),
  );
  // A Legacy entry replays the current version; a difficulty it no longer offers falls back.
  expect(isLegacy(drill)).toBe(true);
  expect(hasLegacy(p, pkg('curated.lab-captive-drill'))).toBe(true);
  expect(replayTarget(p, drill)).toMatchObject({
    kind: 'mission',
    id: 'curated.lab-captive-drill',
    difficulty: 'easy',
  });
  // Outside the Lab profiles a Lab package is unknown.
  expect(replayTarget(p, drill, false)).toEqual({ kind: 'blocked', reason: 'unknown' });
});

test('Random Operations pool: only cleared story content, no Story bosses', () => {
  expect(operationPool(withStages()).stages).toEqual([]);
  expect(operationPool(withStages()).arenas).toBe(0);
  const one = operationPool(withStages('stage1'));
  const two = operationPool(withStages('stage1', 'stage2'));
  expect(one.stages).toEqual(['stage1']);
  expect(one.arenas).toBeGreaterThan(0);
  expect(two.arenas).toBeGreaterThan(one.arenas);
  expect(two.enemies).not.toContain('marek');
  expect(one.enemies).not.toContain('commander');
  expect(two.enemies.length).toBeGreaterThan(one.enemies.length);
  expect(one.heroes).toEqual(['mountain', 'river', 'wind', 'fire']);
});

test('story choice record: stable ids and options only; Personal Paths in story order', () => {
  const p = createProfile('A', 'en');
  expect(recordStoryChoice(p, 'story.stage8.kael-reunion', 'shrug')).toBe(false);
  expect(recordStoryChoice(p, 'story.stage9.unknown', 'meet_now')).toBe(false);
  expect(personalPaths(p)).toEqual([]);
  expect(recordStoryChoice(p, 'story.stage8.kael-reunion', 'meet_now')).toBe(true);
  expect(recordStoryChoice(p, 'story.stage8.kael-reunion', 'not_yet')).toBe(true);
  expect(personalPaths(p).map((x) => [x.def.id, x.option])).toEqual([
    ['story.stage8.kael-reunion', 'not_yet'],
  ]);
});

test('save version 4: old archive entries are migrated, new fields round-trip', () => {
  expect(SAVE_VERSION).toBe(4);
  expect(MIGRATIONS[3]).toBeDefined();
  const v3 = {
    ...createProfile('Old', 'en', 1000),
    runArchive: [
      {
        contentId: contentIdOf('stage1'),
        endedAt: 5000,
        grade: 'B',
        difficulty: 'hard',
        heroes: ['river'],
      },
    ],
  } as Record<string, unknown>;
  delete v3.chronicles;
  const migrated = normalizeProfile(migrate(v3, 3));
  expect(migrated.chronicles).toEqual({});
  expect(migrated.runArchive).toEqual([
    {
      id: 'r3uw-0',
      contentId: contentIdOf('stage1'),
      packageVersion: 1,
      mode: 'story',
      canon: 'canonical',
      endedAt: 5000,
      outcome: 'cleared',
      grade: 'B',
      points: null,
      difficulty: 'hard',
      heroes: ['river'],
      players: 1,
      timeFrames: null,
      labels: [],
      gameVersion: '',
      pinned: false,
    },
  ]);
  const p = withStages('stage1');
  recordMissionRun(p, pkg('chronicle.lab-founders-record'), report(), ORDER, 7000);
  pinRun(p, p.runArchive[0]!.id, true);
  recordStoryChoice(p, 'story.stage8.kael-reunion', 'meet_later');
  const r = decodeProfile(encodeProfile(p, 8000));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.profile.runArchive).toEqual(p.runArchive);
  expect(r.profile.chronicles).toEqual(p.chronicles);
  expect(r.profile.storyChoices).toEqual({ 'story.stage8.kael-reunion': 'meet_later' });
});
