import type { StageResults } from '@ffp/sim';
import {
  ACHIEVEMENTS,
  STORE,
  STORY_STAGE1,
  advanceLesson,
  buy,
  canonicalJson,
  crc32,
  createProfile,
  decodeProfile,
  deleteCombo,
  itemDef,
  loadoutChanges,
  masteryLevel,
  outfitTint,
  recordClear,
  saveCombo,
  setTechnique,
  settleRun,
  storeStatus,
  wearOutfit,
  type Profile,
  type RunReport,
} from '../src/index';

function results(over: Partial<StageResults> = {}): StageResults {
  return {
    stage: 'stage1',
    difficulty: 1,
    startBeat: 0,
    grades: [],
    overall: 'B',
    points: 60,
    capped: null,
    score: 5000,
    stats: {
      frames: 600 * 60,
      defeated: 10,
      surrendered: 2,
      fled: 1,
      damageTaken: 300,
      food: 1,
      downs: 0,
      revives: 0,
      workersFreed: 2,
      clues: 1,
      evidence: 0,
      bestHits: 6,
      bestDamage: 200,
    },
    continuesUsed: 0,
    workersTotal: 2,
    cluesTotal: 2,
    standard: true,
    cheatAssisted: false,
    cheatCodes: [],
    cheatFirstBeat: -1,
    preservation: null,
    response: null,
    branches: [],
    capture: null,
    epilogue: [],
    ...over,
  };
}

function report(r: StageResults, over: Partial<RunReport> = {}): RunReport {
  return {
    contentId: STORY_STAGE1,
    results: r,
    mode: 'solo',
    heroes: ['mountain'],
    hero: 'mountain',
    loadout: [],
    gameVersion: '0.11.0',
    ...over,
  };
}

/** As the shell does: the mission record first, then the settlement. */
function clear(p: Profile, r: StageResults, over: Partial<RunReport> = {}) {
  if (!r.cheatAssisted && r.startBeat === 0)
    recordClear(
      p,
      STORY_STAGE1,
      { grade: r.overall, timeFrames: r.stats.frames, difficulty: 'medium', heroes: ['mountain'] },
      ['easy', 'medium', 'hard', 'extreme', 'ultimate'],
    );
  return settleRun(p, report(r, over), 1000);
}

describe('save version 2', () => {
  test('a version 1 profile migrates with an empty progress record', () => {
    const v1 = createProfile('Guo', 'en', 1) as unknown as Record<string, unknown>;
    delete v1.progress;
    (v1.cheats as Record<string, unknown>) = { registryVersion: 1, enabled: [] };
    const body = canonicalJson(v1);
    const text = JSON.stringify({
      format: 'ffp-profile',
      version: 1,
      savedAt: 1,
      checksum: crc32(body),
      data: JSON.parse(body),
    });
    const r = decodeProfile(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migrated).toBe(true);
    expect(r.profile.progress.credits).toBe(0);
    expect(r.profile.cheats.heroPrefs).toEqual({});
  });
});

describe('Layered Result Payout', () => {
  test('a first Medium clear with rank B: itemized lines, one-time bonuses, Mastery', () => {
    const p = createProfile('Guo', 'en', 1);
    const s = clear(p, results());
    const ids = s.lines.map((l) => l.id);
    expect(ids).toEqual(
      expect.arrayContaining(['completion', 'difficulty', 'rank', 'firstClear', 'firstRank.B']),
    );
    expect(ids).not.toContain('allClues');
    expect(s.total).toBe(
      300 +
        100 +
        100 +
        1000 +
        100 +
        s.lines.filter((l) => l.id === 'achievement').reduce((n, l) => n + l.amount, 0),
    );
    expect(p.progress.credits).toBe(s.total);
    expect(s.achievements).toContain('ach.stage1.river-flows');
    expect(s.mastery).toEqual({ hero: 'mountain', gained: 125, from: 1, to: 1 });
    expect(p.progress.records[STORY_STAGE1]!['standard.solo.medium']!.bestScore).toBe(5000);
    expect(p.progress.ledger.length).toBeGreaterThan(0);
  });

  test('a repeat clear pays completion, difficulty and rank again, never the one-time bonuses', () => {
    const p = createProfile('Guo', 'en', 1);
    clear(p, results());
    const before = p.progress.credits;
    const s = clear(p, results());
    expect(s.lines.map((l) => l.id)).toEqual(['completion', 'difficulty', 'rank']);
    expect(p.progress.credits - before).toBe(500);
  });

  test('a better rank later pays the new rank steps once', () => {
    const p = createProfile('Guo', 'en', 1);
    clear(p, results());
    const s = clear(p, results({ overall: 'S', points: 95, score: 9000 }));
    expect(s.lines.map((l) => l.id)).toEqual(
      expect.arrayContaining(['firstRank.A', 'firstRank.S']),
    );
    expect(s.lines.map((l) => l.id)).not.toContain('firstRank.B');
    expect(s.newBest).toBe(true);
    expect(s.achievements).toContain('ach.stage1.pact-restored');
  });

  test('every clue in one run pays the discovery bonus and the achievement', () => {
    const p = createProfile('Guo', 'en', 1);
    const r = results();
    r.stats.evidence = 1;
    const s = clear(p, r);
    expect(s.lines.map((l) => l.id)).toContain('allClues');
    expect(s.achievements).toContain('ach.stage1.every-clue');
  });

  test('a practice run from a later beat earns nothing', () => {
    const p = createProfile('Guo', 'en', 1);
    const s = clear(p, results({ startBeat: 4 }));
    expect(s.practice).toBe(true);
    expect(s.lines).toEqual([]);
    expect(p.progress.credits).toBe(0);
  });

  test('Cheat-Assisted: lines shown as unavailable, no Credits, records or Mastery; Story achievement kept', () => {
    const p = createProfile('Guo', 'en', 1);
    const s = clear(
      p,
      results({ cheatAssisted: true, cheatCodes: ['SOFTERBLOWS'], difficulty: 2, overall: 'S' }),
    );
    expect(s.cheatAssisted).toBe(true);
    expect(s.lines.length).toBeGreaterThan(0);
    expect(s.lines.every((l) => l.suppressed)).toBe(true);
    expect(s.total).toBe(0);
    expect(p.progress.credits).toBe(0);
    expect(p.progress.records[STORY_STAGE1]).toBeUndefined();
    expect(p.progress.mastery.mountain).toBeUndefined();
    expect(p.progress.cheatHighest[STORY_STAGE1]).toBe('hard');
    expect(s.achievements).toEqual(['ach.stage1.river-flows']);
    // The one-time bonuses are still there for a later legitimate clear.
    expect(clear(p, results()).lines.map((l) => l.id)).toContain('firstClear');
  });

  test('Standard and Open records stay separate', () => {
    const p = createProfile('Guo', 'en', 1);
    clear(p, results());
    clear(p, results({ standard: false, score: 99999 }));
    const rec = p.progress.records[STORY_STAGE1]!;
    expect(rec['standard.solo.medium']!.bestScore).toBe(5000);
    expect(rec['open.solo.medium']!.bestScore).toBe(99999);
  });

  test('co-op achievements need a co-op run', () => {
    const p = createProfile('Guo', 'en', 1);
    const r = results();
    r.stats.revives = 1;
    expect(clear(p, r).achievements).not.toContain('ach.stage1.hand-up');
    expect(clear(p, r, { mode: 'coop', heroes: ['mountain', 'river'] }).achievements).toContain(
      'ach.stage1.hand-up',
    );
  });

  test('both heroes clearing the stage completes Two Guardians', () => {
    const p = createProfile('Guo', 'en', 1);
    expect(clear(p, results()).achievements).not.toContain('ach.stage1.two-guardians');
    expect(clear(p, results(), { hero: 'river', heroes: ['river'] }).achievements).toContain(
      'ach.stage1.two-guardians',
    );
  });
});

describe('Hero Mastery', () => {
  test('levels every 300 points; levels pay once; level 3 grants the Special, level 5 the Ultimate', () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(299)).toBe(1);
    expect(masteryLevel(600)).toBe(3);
    expect(masteryLevel(1e9)).toBe(10);
    const p = createProfile('Guo', 'en', 1);
    let granted: string[] = [];
    for (let i = 0; i < 6; i += 1)
      granted = [...granted, ...clear(p, results({ overall: 'S' })).granted];
    expect(p.progress.mastery.mountain).toBe(6 * 175);
    expect(granted).toEqual(['store.technique.mountain.skybreak-column']);
    expect(p.progress.owned).toContain('store.technique.mountain.skybreak-column');
    for (let i = 0; i < 4; i += 1)
      granted = [...granted, ...clear(p, results({ overall: 'S' })).granted];
    expect(granted).toContain('store.technique.mountain.still-mountain');
    expect(p.progress.owned).not.toContain('store.technique.river.waterspout-rise');
  });
});

describe('the bounded store (D10)', () => {
  test('one Special, one directional Ultimate and one outfit per founder, two badges', () => {
    for (const hero of ['mountain', 'river']) {
      expect(STORE.filter((s) => s.hero === hero && s.kind === 'special')).toHaveLength(1);
      expect(STORE.filter((s) => s.hero === hero && s.kind === 'ultimate')).toHaveLength(1);
      expect(STORE.filter((s) => s.hero === hero && s.kind === 'outfit')).toHaveLength(1);
    }
    expect(STORE.filter((s) => s.kind === 'badge')).toHaveLength(2);
    expect(itemDef('store.technique.mountain.skybreak-column')!.price).toBe(800);
    expect(itemDef('store.technique.mountain.still-mountain')!.price).toBe(1500);
    expect(itemDef('store.collection.badge.village-lantern')!.price).toBe(300);
  });

  test('reveal, prerequisites, prices and ownership', () => {
    const p = createProfile('Guo', 'en', 1);
    const ult = 'store.technique.mountain.still-mountain';
    const sp = 'store.technique.mountain.skybreak-column';
    const badge2 = 'store.collection.badge.open-sluice';
    expect(storeStatus(p, itemDef(ult)!)).toBe('hidden');
    expect(storeStatus(p, itemDef(badge2)!)).toBe('locked');
    expect(buy(p, sp)).toBe('credits');
    clear(p, results());
    expect(storeStatus(p, itemDef(ult)!)).toBe('available');
    expect(storeStatus(p, itemDef(badge2)!)).toBe('available');
    const before = p.progress.credits;
    expect(buy(p, sp)).toBe('ok');
    expect(p.progress.credits).toBe(before - 800);
    expect(buy(p, sp)).toBe('owned');
    expect(p.progress.ledger[0]).toMatchObject({ kind: 'purchase', amount: -800, ref: sp });
  });

  test('a Guest cannot buy', () => {
    const p = createProfile('Guest', 'en', 1);
    p.guest = true;
    p.progress.credits = 5000;
    expect(buy(p, 'store.collection.badge.village-lantern')).toBe('guest');
  });

  test('owned techniques equip into their input slot; outfits tint', () => {
    const p = createProfile('Guo', 'en', 1);
    p.progress.credits = 5000;
    const sp = 'store.technique.mountain.skybreak-column';
    expect(setTechnique(p, 'mountain', sp, true)).toBe(false);
    buy(p, sp);
    expect(setTechnique(p, 'mountain', sp, true)).toBe(true);
    expect(loadoutChanges(p, 'mountain')).toEqual([
      { kind: 'special', dir: 3, action: 'skybreak-column' },
    ]);
    setTechnique(p, 'mountain', sp, false);
    expect(loadoutChanges(p, 'mountain')).toEqual([]);
    const coat = 'store.wardrobe.mountain.millwright';
    expect(wearOutfit(p, 'mountain', coat)).toBe(false);
    buy(p, coat);
    expect(wearOutfit(p, 'mountain', coat)).toBe(true);
    expect(outfitTint(p, 'mountain')).toBe(itemDef(coat)!.tint);
    expect(wearOutfit(p, 'river', coat)).toBe(false);
  });
});

describe('Academy states and My Combos', () => {
  test('states only rise; certification and mastery pay once; First Lesson', () => {
    const p = createProfile('Guo', 'en', 1);
    const id = 'academy.first-steps.move';
    expect(advanceLesson(p, id, 'practiced').credits).toBe(0);
    const a = advanceLesson(p, id, 'certified');
    expect(a.achievements).toEqual(['ach.academy.first-lesson']);
    expect(a.credits).toBe(
      100 + ACHIEVEMENTS.find((x) => x.id === 'ach.academy.first-lesson')!.credits,
    );
    expect(advanceLesson(p, id, 'practiced').state).toBe('certified');
    expect(advanceLesson(p, id, 'mastered').credits).toBe(150);
    expect(advanceLesson(p, id, 'mastered').credits).toBe(0);
  });

  test('My Combos save abstract actions, and delete', () => {
    const p = createProfile('Guo', 'en', 1);
    const id = saveCombo(p, {
      name: 'Mill opener',
      hero: 'mountain',
      steps: ['masons-touch', 'brace-elbow'],
      timing: [0, 12],
      hits: 2,
      damage: 90,
      cheats: [],
      needs: [],
    })!;
    expect(p.progress.combos[0]!.steps).toEqual(['masons-touch', 'brace-elbow']);
    deleteCombo(p, id);
    expect(p.progress.combos).toEqual([]);
  });
});
