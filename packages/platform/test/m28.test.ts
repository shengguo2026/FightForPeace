import {
  MoveState,
  claim,
  createWorld,
  heroOf,
  spawnItem,
  weaponIndex,
  type StageResults,
} from '@ffp/sim';
import {
  ACHIEVEMENTS,
  CAMPAIGN,
  MUSEUM,
  STAGE3_CHAPTERS,
  STAGE3_ENDING,
  STAGE3_MUSIC,
  STAGE3_TITLE_LOOP,
  STORE,
  achievementMet,
  NARRATION_WAIT_MS,
  buy,
  completeStage,
  contentIdOf,
  createProfile,
  dossierView,
  museumSection,
  narrationStep,
  openDossierPage,
  resolveCinematic,
  stage3MediaIds,
  stageOpen,
  stillMix,
  storeStatus,
  titleScreenFor,
  whatsNewDue,
  type Profile,
  type RunReport,
} from '../src/index';
import { AssetRegistry } from '../src/assets/registry';
import { SpritePicker } from '../src/assets/sprites';

const reg = new AssetRegistry();
const STAGE3 = 'story.stage3.herb-mountain';

function rescue(id: string, stateId: string, branch = false) {
  const state = ['secure', 'strained', 'critical'].indexOf(stateId);
  return { id, beat: 0, state, stateId, share: [100, 50, 0][state]!, branch };
}

function results(over: Partial<StageResults> = {}): StageResults {
  return {
    stage: 'stage3',
    difficulty: 1,
    startBeat: 0,
    grades: [],
    overall: 'A',
    points: 80,
    capped: null,
    score: 9000,
    stats: {
      frames: 1800 * 60,
      defeated: 40,
      surrendered: 4,
      fled: 2,
      damageTaken: 600,
      food: 3,
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
      clues: 3,
      evidence: 1,
      bestHits: 9,
      bestDamage: 300,
    },
    continuesUsed: 0,
    workersTotal: 0,
    cluesTotal: 3,
    standard: true,
    cheatAssisted: false,
    cheatCodes: [],
    cheatFirstBeat: -1,
    preservation: null,
    response: null,
    branches: [],
    capture: null,
    epilogue: [],
    journey: {
      rescues: ['gao-wen', 'tao-min', 'an-bo', 'ren-xia'].map((id) => rescue(id, 'secure')),
      record: 'documented',
      story: ['radio', 'cabin'],
      storyClear: ['escape'],
      breaks: 0,
      redirects: 2,
    },
    ...over,
  };
}

function report(r: StageResults): RunReport {
  return {
    contentId: STAGE3,
    results: r,
    mode: 'solo',
    heroes: ['mountain'],
    hero: 'mountain',
    loadout: [],
    gameVersion: '0.28.0',
  };
}

function atStage3(): Profile {
  const p = createProfile('Guo', 'en');
  completeStage(p, 'stage1', null, 1);
  completeStage(p, 'stage2', null, 2);
  return p;
}

const ach = (id: string) => ACHIEVEMENTS.find((a) => a.id === `ach.stage3.${id}`)!;

describe('M28 campaign', () => {
  test('Stage 3 opens after Stage 2, with its What’s New cards and title screen', () => {
    expect(CAMPAIGN.map((c) => c.id)).toEqual(['stage1', 'stage2', 'stage3']);
    expect(contentIdOf('stage3')).toBe(STAGE3);
    const p = createProfile('Guo', 'en');
    completeStage(p, 'stage1', null, 1);
    expect(stageOpen(p, 'stage3')).toBe(false);
    completeStage(p, 'stage2', null, 2);
    expect(stageOpen(p, 'stage3')).toBe(true);
    expect(whatsNewDue(p, 'stage3')).toEqual([
      'horses',
      'rescues',
      'record',
      'highland-weapons',
      'bandits',
      'garran',
    ]);
    completeStage(p, 'stage3', results(), 3);
    expect(titleScreenFor(p)).toMatchObject({
      clip: 'cine.stage3.title-loop',
      menuBg: 'menu-bg-s3',
    });
  });
});

describe('M28 achievements', () => {
  test('eight Stage 3 achievements with the §22.3 names', () => {
    expect(ACHIEVEMENTS.filter((a) => a.id.startsWith('ach.stage3.')).map((a) => a.name)).toEqual([
      'Mist Lifts',
      'Every Voice Home',
      'Signal Restored',
      'Shelter Remembered',
      'Both Paths Walked',
      'Steady on the Switchback',
      'Hook Unhooked',
      'Paper Trail',
    ]);
  });

  test('Every Voice Home needs all four main-route groups Secure', () => {
    const p = atStage3();
    expect(achievementMet(p, ach('every-voice-home'), report(results()))).toBe(true);
    const one = results();
    one.journey!.rescues[2] = rescue('an-bo', 'strained');
    expect(achievementMet(p, ach('every-voice-home'), report(one))).toBe(false);
    // The Signal Hut operator is not one of the four groups.
    const branch = results();
    branch.journey!.rescues.unshift(rescue('wei-shan', 'critical', true));
    expect(achievementMet(p, ach('every-voice-home'), report(branch))).toBe(true);
  });

  test('Steady on the Switchback: no Stability break on Normal or higher', () => {
    const p = atStage3();
    expect(achievementMet(p, ach('steady-on-the-switchback'), report(results()))).toBe(true);
    const broke = results();
    broke.journey!.breaks = 1;
    expect(achievementMet(p, ach('steady-on-the-switchback'), report(broke))).toBe(false);
    expect(
      achievementMet(p, ach('steady-on-the-switchback'), report(results({ difficulty: 0 }))),
    ).toBe(false);
  });

  test('Paper Trail: the invoice page opened after clearing Stage 3', () => {
    const p = atStage3();
    expect(openDossierPage(p, 'page.damaged-invoice', 5)).toEqual([]);
    const q = atStage3();
    completeStage(q, 'stage3', results(), 6);
    expect(dossierView(q).pages.map((d) => d.id)).toEqual(['page.damaged-invoice']);
    const credits = q.progress.credits;
    expect(openDossierPage(q, 'page.damaged-invoice', 7)).toEqual(['ach.stage3.paper-trail']);
    expect(q.progress.credits).toBeGreaterThan(credits);
    expect(openDossierPage(q, 'page.damaged-invoice', 8)).toEqual([]);
    expect(dossierView(q).theory?.id).toBe('theory.paid-route');
  });
});

describe('M28 Store, Museum and media', () => {
  test('eight Coming-soon outfits: shown after Stage 3 opens, never for sale', () => {
    const items = STORE.filter((s) => /mountain-rescue|highland-festival/.test(s.id));
    expect(items).toHaveLength(8);
    const early = createProfile('Guo', 'en');
    for (const s of items) expect(storeStatus(early, s)).toBe('hidden');
    const p = atStage3();
    p.progress.credits = 99999;
    for (const s of items) {
      expect(storeStatus(p, s)).toBe('soon');
      expect(buy(p, s.id)).toBe('soon');
    }
  });

  test('the Museum adds the folio, three artifacts, pictures, chapters and the score', () => {
    const s3 = MUSEUM.filter((m) => m.stage === 'stage3');
    expect(s3.filter((m) => m.section === 'collection').map((m) => m.asset)).toEqual([
      'silvermist-ecology-folio',
      'qinglan-rescue-bell',
      'gao-wen-trail-ledger',
      'broken-hookstaff',
    ]);
    expect(s3.filter((m) => m.section === 'music')).toHaveLength(7);
    const p = atStage3();
    completeStage(p, 'stage3', results({ branches: [] }), 9);
    const coll = museumSection(p, 'collection').filter((x) => x.def.stage === 'stage3');
    expect(coll.find((x) => x.def.asset === 'silvermist-ecology-folio')?.state).toBe('unlocked');
    expect(coll.find((x) => x.def.asset === 'qinglan-rescue-bell')?.state).not.toBe('unlocked');
  });

  test('the still sequences cross-fade in the middle of each shot', () => {
    const shot = STAGE3_CHAPTERS[0]!.shots[0]!;
    if ('motif' in shot) throw new Error('not a shot');
    expect(stillMix(shot, 0)).toEqual({ zoom: 1, end: 0 });
    expect(stillMix(shot, shot.ms / 2).end).toBeCloseTo(0.5);
    expect(stillMix(shot, shot.ms)).toEqual({ zoom: 1.06, end: 1 });
  });

  test('the ending shows the Secure or the Critical reunion insert', () => {
    const ids = (n: number) =>
      resolveCinematic(STAGE3_ENDING[0]!, {}, { rescueCritical: n }).map((s) => s.id);
    expect(ids(0)).toContain('shot.stage3.e03-secure');
    expect(ids(0)).not.toContain('shot.stage3.e03-critical');
    expect(ids(2)).toContain('shot.stage3.e03-critical');
  });

  test('every Stage 3 picture, clip and music file is in the manifest', () => {
    const synth = new Set([...STAGE3_CHAPTERS.map((c) => c.id), ...STAGE3_MUSIC.map((c) => c.id)]);
    for (const id of stage3MediaIds())
      if (!synth.has(id) && !id.startsWith('amb.')) expect(!!reg.url(id), id).toBe(true);
    expect(reg.video(STAGE3_TITLE_LOOP.clip)!.video.audio).toBe(false);
    for (const area of [
      'switchback',
      'qinglan',
      'basin',
      'quarry',
      'camp',
      'terrace',
      'signalhut',
      'shelter',
    ])
      for (const layer of ['far', 'mid', 'floor', 'fg'])
        expect(!!reg.url(`bg.stage3.${area}.${layer}`), `${area}.${layer}`).toBe(true);
    for (const id of ['gao-wen', 'tao-min', 'an-bo', 'ren-xia', 'wei-shan'])
      expect(reg.sheet(`npc.s3-${id}.sheet`), id).toBeDefined();
  });
});

describe('M28 playtest fixes', () => {
  test('a still picture waits for its line to be spoken to the end', () => {
    // Nobody speaking, or no line on screen: the clock runs.
    expect(narrationStep(16, 3000, 4450, false, 0)).toBe(16);
    expect(narrationStep(16, 3000, null, true, 0)).toBe(16);
    // Before the cue ends the clock runs; at its end it holds while the voice speaks.
    expect(narrationStep(16, 3000, 4450, true, 0)).toBe(16);
    expect(narrationStep(16, 4440, 4450, true, 0)).toBe(9);
    expect(narrationStep(16, 4449, 4450, true, 500)).toBe(0);
    // A stuck system voice never holds the picture for good.
    expect(narrationStep(16, 4449, 4450, true, NARRATION_WAIT_MS)).toBe(16);
  });

  test('carried Stage 3 food keeps the plain pose and is drawn in hand, not as the wheel', () => {
    const pick = new SpritePicker(reg);
    for (const food of ['trail-rice', 'vegetable-broth', 'seed-cake', 'camp-meal']) {
      const w = createWorld(1, { heroes: ['fire', 'river'] });
      const f = heroOf(w, 0)!;
      const plain = (state: MoveState, frame: number) => {
        f.state = state;
        return pick.fighter(f, frame)!.sheet;
      };
      const idle = plain(MoveState.Idle, 0);
      const walk = plain(MoveState.Walk, 10);
      claim(w, f, spawnItem(w, weaponIndex(food), f.x, f.z));
      expect(plain(MoveState.Idle, 0), food).toBe(idle);
      expect(plain(MoveState.Walk, 10), food).toBe(walk);
      expect(pick.fighter(f, 10)!.sheet, food).not.toMatch(/wheel/);
      expect(pick.heldProp(f), food).toMatchObject({ sheet: 'prop.s3-food' });
    }
  });
});
