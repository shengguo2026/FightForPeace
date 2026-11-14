import { GunLost, type StageResults } from '@ffp/sim';
import {
  ACHIEVEMENTS,
  CAMPAIGN,
  MIGRATIONS,
  MUSEUM,
  PROVISIONAL_STAGE2,
  SAVE_VERSION,
  STORE,
  STORY_STAGE1,
  buy,
  campaignList,
  completeStage,
  contentIdOf,
  createProfile,
  dossierView,
  markViewed,
  markWhatsNewSeen,
  migrate,
  museumNew,
  museumSection,
  noteStageStart,
  researchView,
  settleRun,
  stageOpen,
  storeStatus,
  titleScreenFor,
  runCompletesStage,
  whatsNewDue,
  type Profile,
  type RunReport,
} from '../src/index';

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
      frames: 900 * 60,
      defeated: 10,
      surrendered: 2,
      fled: 1,
      damageTaken: 300,
      food: 1,
      downs: 0,
      revives: 0,
      reciprocal: 0,
      accord: 0,
      calls: 0,
      callsBroken: 0,
      breachesStopped: 0,
      breachesDone: 0,
      grenadeDamage: 0,
      workersFreed: 0,
      clues: 0,
      evidence: 0,
      bestHits: 6,
      bestDamage: 200,
    },
    continuesUsed: 0,
    workersTotal: 0,
    cluesTotal: 0,
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

function stats(over: Partial<StageResults['stats']>): StageResults['stats'] {
  return { ...results().stats, ...over };
}

function report(r: StageResults, over: Partial<RunReport> = {}): RunReport {
  return {
    contentId: STAGE2,
    results: r,
    mode: 'solo',
    heroes: ['wind'],
    hero: 'wind',
    loadout: [],
    gameVersion: '0.21.0',
    ...over,
  };
}

function cleared(): Profile {
  const p = createProfile('Guo', 'en');
  completeStage(p, 'stage1', null, 1);
  return p;
}

/** Achievements a run earns on a profile that has none of the Stage 2 ones yet. */
const earned = (p: Profile, r: StageResults, over: Partial<RunReport> = {}) =>
  settleRun(structuredClone(p), report(r, over), 10).achievements;

describe('the campaign layer', () => {
  test('stage content IDs and order come from the data', () => {
    expect(CAMPAIGN.map((c) => c.id)).toEqual(['stage1', 'stage2']);
    expect(contentIdOf('stage1')).toBe(STORY_STAGE1);
    expect(contentIdOf('stage2')).toBe(STAGE2);
  });

  test('Stage 2 is locked until Stage 1 was completed once (Cheat-Assisted counts)', () => {
    const p = createProfile('Guo', 'en');
    expect(campaignList(p).map((c) => c.open)).toEqual([true, false]);
    const c = completeStage(p, 'stage1', results({ stage: 'stage1', cheatAssisted: true }), 5);
    expect(c.first).toBe(true);
    expect(c.opened).toEqual(['stage2']);
    expect(stageOpen(p, 'stage2')).toBe(true);
    // A second completion opens nothing new.
    expect(completeStage(p, 'stage1', null, 6)).toMatchObject({ first: false, opened: [] });
  });

  test('the title screen is the latest completed stage (opening Stage 2 is not enough)', () => {
    expect(titleScreenFor(null).clip).toBe('cine.stage1.title-loop');
    const p = createProfile('Guo', 'en');
    expect(titleScreenFor(p)).toMatchObject({ clip: 'cine.stage1.title-loop', menuBg: 'menu-bg' });
    completeStage(p, 'stage1', results({ stage: 'stage1' }), 5);
    expect(stageOpen(p, 'stage2')).toBe(true);
    expect(titleScreenFor(p).clip).toBe('cine.stage1.title-loop');
    // A Cheat-Assisted clear at any difficulty counts.
    completeStage(p, 'stage2', results({ cheatAssisted: true, difficulty: 0 }), 6);
    expect(titleScreenFor(p)).toEqual({
      clip: 'cine.stage2.title-loop',
      still: 'story.stage2.title-loop',
      menuBg: 'menu-bg-s2',
    });
  });

  test('a run resumed from a checkpoint completes the stage; Lab practice does not', () => {
    expect(runCompletesStage(0, false)).toBe(true);
    expect(runCompletesStage(3, true)).toBe(true);
    expect(runCompletesStage(3, false)).toBe(false);
  });

  test("What's New is due once per profile before the first Stage 2 run", () => {
    const p = cleared();
    expect(whatsNewDue(p, 'stage1')).toEqual([]);
    expect(whatsNewDue(p, 'stage2')).toContain('twins');
    markWhatsNewSeen(p, 'stage2');
    expect(whatsNewDue(p, 'stage2')).toEqual([]);
  });
});

describe('save version 3', () => {
  test('a slice profile that cleared Stage 1 migrates with Stage 2 open', () => {
    expect(SAVE_VERSION).toBe(3);
    const v2 = createProfile('Old', 'en') as unknown as Record<string, unknown>;
    delete v2.campaign;
    v2.museum = {};
    v2.sponsorDossier = {};
    v2.research = {};
    v2.updatedAt = 1234;
    v2.missions = {
      [STORY_STAGE1]: {
        clears: 2,
        bestGrade: 'A',
        bestTimeFrames: 1,
        bestDifficulty: 'medium',
        heroes: [],
      },
      [PROVISIONAL_STAGE2]: {
        clears: 0,
        bestGrade: null,
        bestTimeFrames: null,
        bestDifficulty: null,
        heroes: [],
      },
    };
    const progress = v2.progress as { claimed: string[] };
    progress.claimed = ['first:story.stage2', `first:${STORY_STAGE1}`];
    const p = migrate(v2, 2) as Profile;
    expect(p.campaign.completed).toEqual(['stage1']);
    expect(stageOpen(p, 'stage2')).toBe(true);
    expect(p.missions[STAGE2]).toBeDefined();
    expect(p.missions[PROVISIONAL_STAGE2]).toBeUndefined();
    expect(p.progress.claimed).toContain(`first:${STAGE2}`);
    // Stage 1's completion earned its Museum entries and Dossier facts, dated at the update.
    expect(p.museum.unlocked['collection.brass-gears']).toBe(1234);
    expect(p.sponsorDossier.unlocked['fact.brass-gears']).toBe(1234);
    // The original data is untouched (migrations work on a copy).
    expect(v2.campaign).toBeUndefined();
  });

  test('a version 1 profile migrates through every step', () => {
    expect(MIGRATIONS[1]).toBeDefined();
    const v1 = { id: 'p1', name: 'One', locale: 'en', createdAt: 0, updatedAt: 0 };
    const p = migrate(v1, 1) as Profile;
    expect(p.campaign).toEqual({ completed: [], started: [], whatsNewSeen: [] });
    expect(stageOpen(p, 'stage2')).toBe(false);
  });
});

describe('Museum, Dossier and research', () => {
  test('pages of a stage that is not open are not shown; locked entries are undiscovered', () => {
    const p = createProfile('Guo', 'en');
    const coll = museumSection(p, 'collection');
    expect(coll.map((x) => x.def.stage)).not.toContain('stage2');
    expect(coll.find((x) => x.def.id === 'collection.brass-gears')?.state).toBe('locked');
    expect(
      museumSection(p, 'picture').find((x) => x.def.id === 'picture.keyart-title')?.state,
    ).toBe('unlocked');
  });

  test('starting and completing Stage 1 unlock its entries; viewing clears the new mark', () => {
    const p = createProfile('Guo', 'en');
    const started = noteStageStart(p, 'stage1', 2);
    expect(started).toContain('cinema.stage1.intro');
    expect(started).not.toContain('cinema.stage1.ending');
    const c = completeStage(p, 'stage1', null, 3);
    expect(c.unlocked).toContain('cinema.stage1.ending');
    expect(c.unlocked).toContain('fact.brass-gears');
    const before = museumNew(p);
    markViewed(p, 'cinema.stage1.ending');
    expect(museumNew(p)).toBe(before - 1);
    expect(dossierView(p).facts.map((f) => f.id)).toEqual(['fact.brass-gears']);
    expect(dossierView(p).theory?.id).toBe('theory.outside-hand');
  });

  test('branch artifacts unlock only for completed branches; Stage 2 completes research 1', () => {
    const p = cleared();
    expect(researchView(p).shown).toBe(true);
    expect(researchView(p).milestones[0]).toEqual({ id: 'quarantine-provenance', complete: false });
    const r = results({
      cheatAssisted: true,
      branches: [
        { beat: 2, id: 'aeration', artifact: 'early-aerator-impeller', outcome: 1 },
        { beat: 4, id: 'seed', artifact: 'first-harvest-seed-tin', outcome: 2 },
        { beat: 6, id: 'medicinal', artifact: 'medicinal-cooperative-field-card', outcome: 1 },
      ],
    });
    const c = completeStage(p, 'stage2', r, 9);
    expect(c.unlocked).toContain('collection.early-aerator-impeller');
    expect(c.unlocked).not.toContain('collection.first-harvest-seed-tin');
    expect(c.unlocked).toContain('collection.medicinal-cooperative-field-card');
    expect(c.unlocked).toContain('collection.sealed-weapon-crate');
    const rv = researchView(p);
    expect(rv.milestones[0]!.complete).toBe(true);
    expect(rv.milestones.slice(1).every((m) => !m.complete)).toBe(true);
    expect(rv.inputs).toEqual(['formula-handover', 'provenance-ledger']);
    // The newest theory replaces the older one; facts accumulate.
    const d = dossierView(p);
    expect(d.theory?.id).toBe('theory.one-supplier');
    expect(d.facts.map((f) => f.id)).toEqual([
      'fact.brass-gears',
      'fact.crate-seal',
      'fact.order-code',
    ]);
  });

  test('every Museum entry has a known section and a stage of the campaign', () => {
    for (const m of MUSEUM) expect(CAMPAIGN.some((c) => c.id === m.stage)).toBe(true);
    expect(new Set(MUSEUM.map((m) => m.id)).size).toBe(MUSEUM.length);
  });
});

describe('Stage 2 store', () => {
  test('the Stage 2 outfits are revealed when Stage 2 opens and can be bought', () => {
    const outfits = STORE.filter((s) => s.revealStage === 'stage2' && s.kind === 'outfit');
    expect(outfits).toHaveLength(8);
    const p = createProfile('Guo', 'en');
    expect(outfits.every((o) => storeStatus(p, o) === 'hidden')).toBe(true);
    completeStage(p, 'stage1', null, 1);
    expect(outfits.every((o) => storeStatus(p, o) === 'available')).toBe(true);
    p.progress.credits = 10_000;
    expect(buy(p, outfits[0]!.id)).toBe('ok');
    expect(storeStatus(p, outfits[0]!)).toBe('owned');
  });

  test('the twins each have two catalogue Specials and one directional Ultimate', () => {
    for (const hero of ['wind', 'fire']) {
      const t = STORE.filter((s) => s.group === 'technique' && s.hero === hero);
      expect(t.filter((s) => s.kind === 'special')).toHaveLength(2);
      expect(t.filter((s) => s.kind === 'ultimate')).toHaveLength(1);
      expect(t.every((s) => s.mastery >= 3)).toBe(true);
    }
  });
});

describe('the twelve Stage 2 achievements', () => {
  test('there are twelve, and only the clear is narrative', () => {
    const s2 = ACHIEVEMENTS.filter((a) => a.id.startsWith('ach.stage2.'));
    expect(s2).toHaveLength(12);
    expect(s2.filter((a) => a.narrative).map((a) => a.id)).toEqual([
      'ach.stage2.peace-in-the-glasshouse',
    ]);
  });

  test('Peace in the Glasshouse is earned in Cheat-Assisted play, the others are not', () => {
    const p = cleared();
    const got = earned(
      p,
      results({
        cheatAssisted: true,
        standard: false,
        branches: [{ beat: 2, id: 'seed', artifact: 'x', outcome: 1 }],
      }),
    );
    expect(got).toContain('ach.stage2.peace-in-the-glasshouse');
    expect(got).not.toContain('ach.stage2.seeds-for-tomorrow');
  });

  test('Preservation and Response grades', () => {
    const p = cleared();
    const pres = (grade: string) => ({ percent: 95, grade, assets: [], categories: [] });
    expect(earned(p, results({ preservation: pres('secure') }))).not.toContain(
      'ach.stage2.every-system-breathing',
    );
    expect(earned(p, results({ preservation: pres('flourishing') }))).toContain(
      'ach.stage2.every-system-breathing',
    );
    const resp = (grade: string, rewinds: number) => ({
      percent: 95,
      grade,
      rewinds,
      mastery: false,
    });
    expect(earned(p, results({ response: resp('S', 1) }))).not.toContain(
      'ach.stage2.first-to-the-alarm',
    );
    expect(earned(p, results({ response: resp('S', 0) }))).toContain(
      'ach.stage2.first-to-the-alarm',
    );
  });

  test('Guardians in Accord needs co-op, a Reciprocal Handoff and the Accord', () => {
    const p = cleared();
    const r = results({ stats: stats({ reciprocal: 1, accord: 1 }) });
    expect(earned(p, r)).not.toContain('ach.stage2.guardians-in-accord');
    expect(earned(p, r, { mode: 'coop', heroes: ['wind', 'fire'] })).toContain(
      'ach.stage2.guardians-in-accord',
    );
  });

  test('Breach Denied: a stopped breach, none completed, no grenade damage', () => {
    const p = cleared();
    const id = 'ach.stage2.breach-denied';
    expect(
      earned(p, results({ stats: stats({ breachesStopped: 1, grenadeDamage: 5 }) })),
    ).not.toContain(id);
    expect(
      earned(p, results({ stats: stats({ breachesStopped: 1, breachesDone: 1 }) })),
    ).not.toContain(id);
    expect(earned(p, results({ stats: stats({ breachesStopped: 2 }) }))).toContain(id);
  });

  test("Marek's capture: Seize the Moment and Strength Without Vengeance", () => {
    const p = cleared();
    const cap = (over: Partial<NonNullable<StageResults['capture']>>) => ({
      route: 1,
      gunLost: GunLost.None,
      gunAmmo: 0,
      scorch: 0,
      scorchStops: 0,
      intercept: 0,
      ...over,
    });
    expect(
      earned(p, results({ capture: cap({ gunLost: GunLost.Disarmed, gunAmmo: 0 }) })),
    ).not.toContain('ach.stage2.seize-the-moment');
    expect(
      earned(p, results({ capture: cap({ gunLost: GunLost.Disarmed, gunAmmo: 3 }) })),
    ).toContain('ach.stage2.seize-the-moment');
    expect(earned(p, results({ capture: cap({ route: 2 }) }))).not.toContain(
      'ach.stage2.strength-without-vengeance',
    );
    expect(earned(p, results({ capture: cap({ scorch: 3 }) }))).not.toContain(
      'ach.stage2.strength-without-vengeance',
    );
    expect(earned(p, results({ capture: cap({}) }))).toContain(
      'ach.stage2.strength-without-vengeance',
    );
  });

  test('Silence the Signal: every call broken on Extreme', () => {
    const p = cleared();
    const id = 'ach.stage2.silence-the-signal';
    const s = stats({ calls: 3, callsBroken: 3 });
    expect(earned(p, results({ stats: s }))).not.toContain(id);
    expect(
      earned(p, results({ difficulty: 3, stats: stats({ calls: 3, callsBroken: 2 }) })),
    ).not.toContain(id);
    expect(earned(p, results({ difficulty: 3, stats: s }))).toContain(id);
  });

  test('the branch achievements and Guardian of Every Wing', () => {
    const p = cleared();
    const b = (id: string, outcome: number) => ({ beat: 1, id, artifact: id, outcome });
    const got = earned(
      p,
      results({ branches: [b('aeration', 1), b('seed', 1), b('medicinal', 2)] }),
    );
    expect(got).toContain('ach.stage2.breath-beneath-the-water');
    expect(got).toContain('ach.stage2.seeds-for-tomorrow');
    expect(got).not.toContain('ach.stage2.knowledge-has-many-roots');
    expect(got).not.toContain('ach.stage2.guardian-of-every-wing');
    const all = earned(
      p,
      results({ branches: [b('aeration', 1), b('seed', 1), b('medicinal', 1)] }),
    );
    expect(all).toContain('ach.stage2.guardian-of-every-wing');
  });
});
