import { EnemyState, MountedSlot, RiderState } from '@ffp/sim';
import {
  AssetRegistry,
  FIREARM_ACTIONS,
  JACKAL_CUE,
  STAGE2_AMBIENCE,
  STAGE2_BEAT_MUSIC,
  STAGE2_CHAPTERS,
  STAGE2_ENDING,
  STAGE2_INTRO,
  STAGE2_MUSIC,
  STAGE2_ROOM_AREA,
  STAGE2_TITLE_LOOP,
  enemyMountCell,
  heroMountCell,
  pickVoice,
  resolveCinematic,
  stage2Lines,
  stage2MediaIds,
  voiceAsset,
} from '../src/index';

const reg = new AssetRegistry();

test('the six Stage 2 chapters play in order: four before the run, two after', () => {
  expect(STAGE2_INTRO.map((c) => c.id)).toEqual([
    'cine.stage2.interlude',
    'cine.stage2.roadside',
    'cine.stage2.guest',
    'cine.stage2.night',
  ]);
  expect(STAGE2_ENDING.map((c) => c.id)).toEqual(['cine.stage2.recovery', 'cine.stage2.coda']);
});

test('every Stage 2 clip is silent, has its still fallback, and is in the manifest', () => {
  for (const c of STAGE2_CHAPTERS)
    for (const s of c.shots) {
      if ('motif' in s) continue;
      expect(!!reg.url(s.still), s.still).toBe(true);
      if (s.clip) {
        const v = reg.video(s.clip);
        expect(v, s.clip).toBeDefined();
        expect(v!.video.audio).toBe(false);
        // The clip never runs shorter than the shot (the still holds otherwise).
        expect(v!.video.ms + 100).toBeGreaterThanOrEqual(s.ms);
      }
    }
  expect(!!reg.url(STAGE2_TITLE_LOOP.clip)).toBe(true);
  expect(!!reg.url(STAGE2_TITLE_LOOP.still)).toBe(true);
});

test('every Stage 2 media id resolves (ambience beds are synthesized until files arrive)', () => {
  const beds = new Set([
    ...Object.values(STAGE2_AMBIENCE),
    ...STAGE2_CHAPTERS.map((c) => c.id),
    ...STAGE2_MUSIC.map((c) => c.id),
  ]);
  for (const id of stage2MediaIds()) if (!beds.has(id)) expect(!!reg.url(id), id).toBe(true);
});

test('Community Recovery shows one closing line per Preservation grade', () => {
  for (let g = 0; g < 4; g += 1) {
    const shots = resolveCinematic(STAGE2_ENDING[0]!, {}, { preservation: g });
    const closing = shots.filter((s) => s.id.startsWith('shot.stage2.c04'));
    expect(closing).toHaveLength(1);
    const inserts = shots.filter((s) => /c0[13][fd]$/.test(s.id)).map((s) => s.id.slice(-1));
    expect(inserts).toEqual(g < 2 ? ['f', 'f'] : ['d', 'd']);
  }
});

test('every narration line has a stable id and a speaker', () => {
  const lines = stage2Lines();
  expect(lines.length).toBeGreaterThanOrEqual(40);
  for (const l of lines) {
    expect(l.text).toMatch(/^(s2\.line\.|epilogue\.stage2\.recovery\.)/);
    expect(l.speaker).toMatch(/^speaker\./);
  }
});

test('the score has seven cues and the Gilded Jackal its four states and stingers', () => {
  expect(STAGE2_MUSIC).toHaveLength(7);
  const jackal = STAGE2_MUSIC.find((c) => c.id === JACKAL_CUE)!;
  for (const s of ['mounted', 'armed', 'unbound', 'scorched', 'surrender'])
    expect(jackal.states[s], s).toBeDefined();
  expect(jackal.stingers?.length).toBeGreaterThanOrEqual(3);
  for (const c of STAGE2_MUSIC)
    for (const s of Object.values(c.states)) expect(!!reg.url(s.asset)).toBe(true);
});

test('every Stage 2 beat has music and every room and corridor an area with backdrop art', () => {
  for (const id of [
    'perimeter',
    'loading-yard',
    'aquaculture',
    'aeration-annex',
    'vestibule',
    'crop-channels',
    'seed-bay',
    'medicinal-wing',
    'prep-room',
    'filtration',
    'production-hall',
    'recovery-bay',
  ])
    expect(STAGE2_BEAT_MUSIC[id], id).toBeDefined();
  for (const area of new Set(Object.values(STAGE2_ROOM_AREA))) {
    expect(reg.layer(`bg.stage2.${area}.far`), area).toBeDefined();
    expect(STAGE2_AMBIENCE[area], area).toBeDefined();
  }
});

test('the voice is a file in the chosen language, then English, then the system voice, then none', () => {
  const files = new Set([voiceAsset('en', 's2.line.p01'), voiceAsset('de', 's2.line.p02')]);
  const has = (a: string) => files.has(a);
  expect(pickVoice('s2.line.p02', 'text', 'de', has, false)).toEqual({
    kind: 'file',
    asset: 'vo.de.s2.line.p02',
    locale: 'de',
  });
  expect(pickVoice('s2.line.p01', 'zh-CN', 'de', has, false)).toMatchObject({
    kind: 'file',
    locale: 'en',
  });
  expect(pickVoice('s2.line.p03', 'text', 'zh-CN', has, true)).toEqual({
    kind: 'tts',
    locale: 'zh-CN',
  });
  expect(pickVoice('s2.line.p03', 'text', 'zh-CN', has, false)).toEqual({ kind: 'none' });
  expect(pickVoice('s2.line.p01', 'off', 'en', has, true)).toEqual({ kind: 'none' });
});

test('mounted cells follow the rider: cruise, steer, actions, crash, downed', () => {
  const base = {
    state: RiderState.Ride,
    critical: false,
    slot: -1,
    actionAge: 0,
    actionLength: 0,
    steer: 0,
    braking: false,
    stateAge: 0,
  };
  expect(heroMountCell('wind', base)).toEqual({ sheet: 'hero.wind.sheet.mount-ride', cell: 0 });
  expect(heroMountCell('wind', { ...base, steer: -40 })?.cell).toBe(1);
  expect(heroMountCell('wind', { ...base, steer: 40 })?.cell).toBe(2);
  expect(heroMountCell('fire', { ...base, critical: true })?.sheet).toBe(
    'hero.fire.sheet.mount-stability',
  );
  const act = (slot: number) =>
    heroMountCell('wind', {
      ...base,
      state: RiderState.Action,
      slot,
      actionAge: 30,
      actionLength: 40,
    })!;
  expect(act(MountedSlot.Hop).sheet).toBe('hero.wind.sheet.mount-defense');
  expect(act(MountedSlot.Ultimate)).toEqual({ sheet: 'hero.wind.sheet.mount-ultimate', cell: 3 });
  expect(heroMountCell('wind', { ...base, state: RiderState.Done })).toBeNull();
  for (const h of ['wind', 'fire', 'mountain', 'river'])
    for (const k of ['ride', 'attack', 'defense', 'special', 'ultimate', 'stability'])
      expect(reg.sheet(`hero.${h}.sheet.mount-${k}`)?.sheet.cols).toBe(2);
  const rider = { boss: false, state: EnemyState.Strike, critical: false, attack: 1 };
  expect(enemyMountCell(rider)).toEqual({ sheet: 'enemy.rider.sheet.mount-attack', cell: 2 });
  expect(enemyMountCell({ ...rider, boss: true, state: EnemyState.Crash }).sheet).toBe(
    'enemy.marek.sheet.mounted-break',
  );
});

test('firearms are named for their warning and shot sounds', () => {
  expect(Object.keys(FIREARM_ACTIONS).sort()).toEqual([
    'jackal-burst',
    'sidearm-shot',
    'support-burst',
  ]);
});
