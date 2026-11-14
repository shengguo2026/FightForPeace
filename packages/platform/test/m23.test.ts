import type { StageResults } from '@ffp/sim';
import { describe, expect, test } from 'vitest';
import {
  MemoryBackend,
  ProfileStore,
  buy,
  completeStage,
  createProfile,
  dossierView,
  museumNew,
  researchView,
  settleRun,
  type Profile,
  type RunReport,
} from '../src/index';

/**
 * M23 (Stage 2 spec §17, §18): a Stage 2 completion awards its Credits, records, Museum,
 * Dossier, research and achievements once; a repeat, a resumed run and a re-entered
 * profile never award the one-time parts again; a backup carries all Stage 2 progress
 * through export and import (merge and replace).
 */
const STAGE2 = 'story.stage2.prosperity-under-siege';

function results(over: Partial<StageResults> = {}): StageResults {
  return {
    stage: 'stage2',
    difficulty: 1,
    startBeat: 0,
    grades: [],
    overall: 'B',
    points: 60,
    capped: null,
    score: 5000,
    stats: {
      frames: 1800 * 60,
      defeated: 30,
      surrendered: 3,
      fled: 2,
      damageTaken: 900,
      food: 2,
      downs: 1,
      revives: 0,
      reciprocal: 0,
      accord: 0,
      calls: 0,
      callsBroken: 0,
      breachesStopped: 1,
      breachesDone: 0,
      grenadeDamage: 0,
      workersFreed: 2,
      clues: 1,
      evidence: 1,
      bestHits: 8,
      bestDamage: 260,
    },
    continuesUsed: 1,
    workersTotal: 2,
    cluesTotal: 1,
    standard: true,
    cheatAssisted: false,
    cheatCodes: [],
    cheatFirstBeat: -1,
    preservation: null,
    response: null,
    branches: [
      { beat: 3, id: 'aeration', artifact: 'early-aerator-impeller', outcome: 1 },
      { beat: 8, id: 'medicinal', artifact: 'medicinal-cooperative-field-card', outcome: 1 },
    ],
    capture: null,
    epilogue: [],
    ...over,
  };
}

function report(r: StageResults): RunReport {
  return {
    contentId: STAGE2,
    results: r,
    mode: 'solo',
    heroes: ['wind'],
    hero: 'wind',
    loadout: [],
    gameVersion: '0.23.0',
  };
}

function stage2Profile(): Profile {
  const p = createProfile('Guo', 'de', 1);
  completeStage(p, 'stage1', null, 2);
  return p;
}

/** One finished Stage 2 run as the game records it: the campaign, then the settlement. */
function finish(p: Profile, r: StageResults, now: number) {
  return {
    completion: completeStage(p, 'stage2', r, now),
    settlement: settleRun(p, report(r), now),
  };
}

describe('Stage 2 rewards are awarded once', () => {
  test('a repeat clear unlocks nothing new and pays no one-time bonus again', () => {
    const p = stage2Profile();
    const first = finish(p, results(), 10);
    expect(first.completion.first).toBe(true);
    expect(first.completion.unlocked.length).toBeGreaterThan(0);
    expect(first.settlement.total).toBeGreaterThan(0);
    const museum = structuredClone(p.museum);
    const dossier = dossierView(p);
    const research = researchView(p);
    const achievements = [...Object.keys(p.progress.achievements)].sort();

    const again = finish(p, results(), 20);
    expect(again.completion.first).toBe(false);
    expect(again.completion.unlocked).toEqual([]);
    expect(again.settlement.achievements).toEqual([]);
    expect(again.settlement.lines.map((l) => l.id)).toEqual(['completion', 'difficulty', 'rank']);
    expect(p.museum).toEqual(museum);
    expect(dossierView(p)).toEqual(dossier);
    expect(researchView(p)).toEqual(research);
    expect(Object.keys(p.progress.achievements).sort()).toEqual(achievements);
    expect(p.campaign.completed.filter((s) => s === 'stage2')).toHaveLength(1);
  });

  test('a run resumed from a checkpoint counts as the same completion, once', () => {
    const p = stage2Profile();
    finish(p, results({ startBeat: 6 }), 10);
    expect(p.campaign.completed).toContain('stage2');
    const unlocked = Object.keys(p.museum.unlocked).length;
    finish(p, results({ startBeat: 12 }), 20);
    expect(Object.keys(p.museum.unlocked).length).toBe(unlocked);
  });

  test('a branch completed only on a later run unlocks just its own artifact', () => {
    const p = stage2Profile();
    finish(p, results({ branches: [] }), 10);
    const before = Object.keys(p.museum.unlocked);
    const later = finish(
      p,
      results({
        branches: [{ beat: 5, id: 'seed', artifact: 'first-harvest-seed-tin', outcome: 1 }],
      }),
      20,
    );
    expect(later.completion.unlocked).toEqual(['collection.first-harvest-seed-tin']);
    expect(Object.keys(p.museum.unlocked).length).toBe(before.length + 1);
  });

  test('a Cheat-Assisted clear keeps story progress but pays no Credits', () => {
    const p = stage2Profile();
    const credits = p.progress.credits;
    const s = finish(p, results({ cheatAssisted: true, cheatCodes: ['STEADYRIDE'] }), 10);
    expect(s.completion.first).toBe(true);
    expect(s.settlement.total).toBe(0);
    expect(p.progress.credits).toBe(credits);
  });
});

describe('backup and import keep Stage 2 progress', () => {
  async function exported() {
    let now = Date.UTC(2026, 10, 14);
    const store = new ProfileStore(new MemoryBackend(), '0.23.0', () => (now += 1000));
    const p = stage2Profile();
    finish(p, results(), 10);
    p.progress.credits += 5000;
    expect(buy(p, 'store.wardrobe.wind.greenhouse-response', 30)).toBe('ok');
    await store.save(p);
    return { p, file: await store.exportBackup() };
  }

  function stage2Parts(p: Profile) {
    return {
      completed: p.campaign.completed,
      museum: p.museum.unlocked,
      dossier: p.sponsorDossier,
      research: p.research,
      records: p.progress.records,
      achievements: p.progress.achievements,
      owned: p.progress.owned,
      credits: p.progress.credits,
    };
  }

  test('merge import adds the profile with every Stage 2 record', async () => {
    const { p, file } = await exported();
    const store = new ProfileStore(new MemoryBackend(), '0.23.0', () => Date.UTC(2026, 10, 15));
    const res = await store.applyImport(file, { mode: 'merge' });
    expect(res.added).toHaveLength(1);
    const back = (await store.load(res.added[0]!)).profile!;
    expect(stage2Parts(back)).toEqual(stage2Parts(p));
    expect(museumNew(back)).toBe(museumNew(p));
  });

  test('replace import over an older copy brings the Stage 2 progress back', async () => {
    const { p, file } = await exported();
    const store = new ProfileStore(new MemoryBackend(), '0.23.0', () => Date.UTC(2026, 10, 15));
    const old = stage2Profile();
    old.id = p.id;
    await store.save(old);
    await store.applyImport(file, { mode: 'replace', ids: [p.id] });
    const back = (await store.load(p.id)).profile!;
    expect(stage2Parts(back)).toEqual(stage2Parts(p));
    expect(back.campaign.completed).toContain('stage2');
  });
});
