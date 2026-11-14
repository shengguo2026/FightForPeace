/**
 * M22 Stage 2 media (spec §16, story line §14): the Selective Motion Package's six
 * chapters, the seven-cue **Prosperity Under Siege** score with the Gilded Jackal's four
 * music states and authored stingers, the area backdrops of every room and corridor, the
 * ambience beds, and the narration lines.
 *
 * Every chapter is silent source footage: the clips were imported without their Flow
 * soundtrack, so music, ambience, narration (voice files or the temporary system voice)
 * and the localized subtitles are runtime layers. Every clip has its approved start frame
 * as the still fallback, so the same chapter plays with stills only at the same pace.
 *
 * Guardrail (as for Stage 1): the logical ids below are the Museum's index and never
 * change; delivered files replace placeholders through the asset manifest.
 */
import type { CinematicDef, ShotDef, SubtitleCue } from './cinematic';
import type { MusicCueDef } from './music';

/** One line over a whole shot. */
const one = (ms: number, text: string, speaker: string): SubtitleCue[] => [
  { at: 400, until: ms - 250, text, speaker },
];
/** Two lines splitting a shot (the second starts at `split` ms). */
const two = (
  ms: number,
  split: number,
  a: [text: string, speaker: string],
  b: [text: string, speaker: string],
): SubtitleCue[] => [
  { at: 400, until: split - 150, text: a[0], speaker: a[1] },
  { at: split, until: ms - 250, text: b[0], speaker: b[1] },
];

const ELDER = 'speaker.elder';
const NARRATOR = 'speaker.narrator';
const WIND = 'speaker.wind';
const FIRE = 'speaker.fire';
const TOMAS = 'speaker.tomas';

/** A clip shot: `cine.stage2.<code>` over its start frame `story.stage2.<code>`. */
const clip = (code: string, ms: number, cues: SubtitleCue[], when?: ShotDef['when']): ShotDef => ({
  id: `shot.stage2.${code}`,
  clip: `cine.stage2.${code}`,
  still: `story.stage2.${code}`,
  ms,
  cues,
  ...(when ? { when } : {}),
});
/** A still insert (no clip): a performance variant or a close-up. */
const insert = (
  code: string,
  ms: number,
  cues: SubtitleCue[],
  when?: ShotDef['when'],
): ShotDef => ({
  id: `shot.stage2.${code}`,
  still: `story.stage2.${code}`,
  ms,
  cues,
  ...(when ? { when } : {}),
});

const l = (n: string) => `s2.line.${n}`;

/** Chapter 1 · Prosperity Interlude: three years of building, narrated by the elder. */
export const S2_INTERLUDE: CinematicDef = {
  id: 'cine.stage2.interlude',
  music: { cue: 'mus.stage2.water-became-a-future', state: 'interlude' },
  shots: [
    clip('p01', 8000, one(8000, l('p01'), ELDER)),
    clip('p02', 8000, one(8000, l('p02'), ELDER)),
    clip('p03', 7917, one(7917, l('p03'), ELDER)),
    clip('p04', 3500, one(3500, l('p04'), ELDER)),
    clip('p05', 7917, one(7917, l('p05'), ELDER)),
    clip('p06', 8000, one(8000, l('p06'), ELDER)),
    clip('p07', 5000, one(5000, l('p07'), ELDER)),
    clip('p08', 8000, one(8000, l('p08'), ELDER)),
    clip('p09', 8000, one(8000, l('p09'), ELDER)),
    clip('p10', 8000, one(8000, l('p10'), ELDER)),
    clip('p11', 8000, one(8000, l('p11'), ELDER)),
    clip('p12', 8000, one(8000, l('p12'), ELDER)),
  ],
};

/** Chapter 2 · Roadside Deception: the patrol, the staged pursuit, the rescue, the clinic. */
export const S2_ROADSIDE: CinematicDef = {
  id: 'cine.stage2.roadside',
  music: { cue: 'mus.stage2.roadside-vigil', state: 'vigil' },
  shots: [
    clip('r01', 8000, two(8000, 4000, [l('r01a'), FIRE], [l('r01b'), WIND])),
    clip('r02', 6500, two(6500, 3300, [l('r02a'), TOMAS], [l('r02b'), WIND])),
    clip('r03', 8000, two(8000, 4200, [l('r03a'), NARRATOR], [l('r03b'), FIRE])),
    clip('r04', 8000, one(8000, l('r04'), ELDER)),
  ],
};

/** Chapter 3 · Guest Under Observation: the offer, the tours, the questions, the watch. */
export const S2_GUEST: CinematicDef = {
  id: 'cine.stage2.guest',
  music: { cue: 'mus.stage2.roadside-vigil', state: 'suspicion' },
  shots: [
    clip('g01', 8000, two(8000, 4300, [l('g01a'), TOMAS], [l('g01b'), ELDER])),
    clip('g02', 8000, two(8000, 3600, [l('g02a'), NARRATOR], [l('g02b'), TOMAS])),
    clip('g03', 7917, two(7917, 4200, [l('g03a'), TOMAS], [l('g03b'), ELDER])),
    clip('g04', 8000, one(8000, l('g04'), ELDER)),
  ],
};

/** Chapter 4 · The Night Signal: the lantern, the trap, the raiders at the glasshouses. */
export const S2_NIGHT: CinematicDef = {
  id: 'cine.stage2.night',
  music: { cue: 'mus.stage2.roadside-vigil', state: 'suspicion' },
  shots: [
    clip('n01', 8000, one(8000, l('n01'), NARRATOR)),
    clip('n02', 7917, two(7917, 3900, [l('n02a'), WIND], [l('n02b'), TOMAS])),
    clip('n03', 7917, one(7917, l('n03'), ELDER)),
  ],
};

/**
 * Chapter 5 · Community Recovery, chosen by the run (story state `preservation`: the
 * Preservation grade, 0 Flourishing … 3 Recovered): the clips always play; the inserts
 * show the aquaculture hall and the harvest flourishing (Flourishing, Secure) or damaged
 * but recoverable (Strained, Recovered), and the closing line names the grade. The
 * canonical outcome never changes (spec §4.4).
 */
export const S2_RECOVERY: CinematicDef = {
  id: 'cine.stage2.recovery',
  music: { cue: 'mus.stage2.what-we-protected', state: 'ending' },
  shots: [
    clip('c01', 7917, one(7917, l('c01'), NARRATOR)),
    insert('c01f', 4000, one(4000, l('c01f'), NARRATOR), [{ key: 'preservation', below: 2 }]),
    insert('c01d', 4000, one(4000, l('c01d'), NARRATOR), [{ key: 'preservation', atLeast: 2 }]),
    clip('c02', 7917, one(7917, l('c02'), NARRATOR)),
    clip('c03', 7917, one(7917, l('c03'), NARRATOR)),
    insert('c03f', 4000, one(4000, l('c03f'), NARRATOR), [{ key: 'preservation', below: 2 }]),
    insert('c03d', 4000, one(4000, l('c03d'), NARRATOR), [{ key: 'preservation', atLeast: 2 }]),
    ...(['flourishing', 'secure', 'strained', 'recovered'] as const).map((g, i) =>
      clip('c04', 7917, one(7917, `epilogue.stage2.recovery.${g}`, NARRATOR), [
        { key: 'preservation', is: i },
      ]),
    ),
  ].map((s) => (s.id === 'shot.stage2.c04' ? { ...s, id: `${s.id}.${gradeOf(s)}` } : s)),
};

function gradeOf(s: ShotDef): string {
  return s.cues[0]!.text.split('.').pop()!;
}

/** Chapter 6 · Justice and Mystery Coda: formula, custody, expulsion, seal, the depot. */
export const S2_CODA: CinematicDef = {
  id: 'cine.stage2.coda',
  music: { cue: 'mus.stage2.what-we-protected', state: 'coda' },
  shots: [
    clip('j01', 7917, two(7917, 3900, [l('j01a'), NARRATOR], [l('j01b'), ELDER])),
    insert('docs', 4500, one(4500, l('docs'), NARRATOR)),
    clip('j02', 7917, one(7917, l('j02'), NARRATOR)),
    clip('j03', 7917, one(7917, l('j03'), NARRATOR)),
    clip('j04', 7917, one(7917, l('j04'), ELDER)),
    insert('seal', 4500, one(4500, l('seal'), ELDER)),
    clip('j05', 5500, one(5500, l('j05'), NARRATOR)),
  ],
};

/** The chapters before a Stage 2 run, in order (each skippable on its own). */
export const STAGE2_INTRO: readonly CinematicDef[] = [
  S2_INTERLUDE,
  S2_ROADSIDE,
  S2_GUEST,
  S2_NIGHT,
];
/** The chapters after the in-engine epilogue and before the results. */
export const STAGE2_ENDING: readonly CinematicDef[] = [S2_RECOVERY, S2_CODA];
/** All six chapters (Museum Cinema). */
export const STAGE2_CHAPTERS: readonly CinematicDef[] = [...STAGE2_INTRO, ...STAGE2_ENDING];

/** The Stage 2 title loop behind the village menu once Stage 2 is open (muted). */
export const STAGE2_TITLE_LOOP = {
  clip: 'cine.stage2.title-loop',
  still: 'story.stage2.title-loop',
};

/** The briefing's still per line (the civil-protection room, then the perimeter at night). */
export const STAGE2_BRIEF_STILLS = [
  's2-brief-01',
  's2-brief-01',
  's2-brief-02',
  's2-brief-02',
  's2-brief-02',
];

const loop = (id: string, bars: number, bpm?: number) => ({
  asset: `mus.stage2.${id}`,
  bars,
  ...(bpm ? { bpm } : {}),
});
const once = (id: string, bars: number, bpm?: number) => ({ ...loop(id, bars, bpm), once: true });

/**
 * Stage 2 score: Prosperity Under Siege. Loops are whole bars of the delivered cues
 * (tools/audio/build_stage2_score.py); the Gilded Jackal is one cue whose four states come
 * from 06A–06D, with authored stingers cut from 06B, 06C and 06D on its 129 BPM grid.
 */
export const STAGE2_MUSIC: readonly MusicCueDef[] = [
  {
    id: 'mus.stage2.water-became-a-future',
    title: 'music.stage2.1',
    bpm: 90,
    beatsPerBar: 4,
    states: { interlude: once('water-became-a-future.interlude', 64) },
  },
  {
    id: 'mus.stage2.roadside-vigil',
    title: 'music.stage2.2',
    bpm: 80,
    beatsPerBar: 4,
    states: {
      vigil: loop('roadside-vigil.vigil', 24),
      suspicion: loop('roadside-vigil.suspicion', 24),
    },
  },
  {
    id: 'mus.stage2.glass-and-green',
    title: 'music.stage2.3',
    bpm: 92,
    beatsPerBar: 4,
    states: { explore: loop('glass-and-green.explore', 32) },
  },
  {
    id: 'mus.stage2.alarm-through-the-channels',
    title: 'music.stage2.4',
    bpm: 96,
    beatsPerBar: 4,
    states: {
      combat: loop('alarm-through-the-channels.combat', 48),
      elite: loop('alarm-through-the-channels.elite', 32),
    },
  },
  {
    id: 'mus.stage2.protect-the-living-system',
    title: 'music.stage2.5',
    bpm: 118,
    beatsPerBar: 4,
    states: { danger: loop('protect-the-living-system.danger', 32) },
  },
  {
    id: 'mus.stage2.gilded-jackal',
    title: 'music.stage2.6',
    bpm: 129.2,
    beatsPerBar: 4,
    states: {
      mounted: loop('gilded-jackal.mounted', 32, 124),
      armed: loop('gilded-jackal.armed', 32, 120),
      unbound: loop('gilded-jackal.unbound', 32, 128.4),
      scorched: loop('gilded-jackal.scorched', 32, 129.4),
      surrender: once('gilded-jackal.surrender', 20),
    },
    stingers: [
      { to: 'armed', asset: 'mus.stage2.gilded-jackal.sting-armed', bars: 2 },
      { to: 'unbound', asset: 'mus.stage2.gilded-jackal.sting-unbound', bars: 2 },
      { to: 'scorched', asset: 'mus.stage2.gilded-jackal.sting-scorched', bars: 2 },
      { to: 'surrender', asset: 'mus.stage2.gilded-jackal.sting-surrender', bars: 2 },
    ],
  },
  {
    id: 'mus.stage2.what-we-protected',
    title: 'music.stage2.7',
    bpm: 80,
    beatsPerBar: 4,
    states: {
      victory: once('what-we-protected.victory', 8),
      ending: loop('what-we-protected.ending', 16),
      coda: once('what-we-protected.coda', 38),
    },
  },
];

/** What plays in a Stage 2 beat: outside fights, in fights, and while a Ledger asset is in danger. */
export interface BeatMusic {
  explore: { cue: string; state: string };
  combat: { cue: string; state: string };
  danger?: { cue: string; state: string };
}
const glass = { cue: 'mus.stage2.glass-and-green', state: 'explore' };
const alarm = { cue: 'mus.stage2.alarm-through-the-channels', state: 'combat' };
const elite = { cue: 'mus.stage2.alarm-through-the-channels', state: 'elite' };
const protect = { cue: 'mus.stage2.protect-the-living-system', state: 'danger' };
const vigil = { cue: 'mus.stage2.roadside-vigil', state: 'suspicion' };

/** Beat id → music (Stage 2 beats; the boss and the intercept are the Gilded Jackal's). */
export const STAGE2_BEAT_MUSIC: Readonly<Record<string, BeatMusic>> = {
  perimeter: { explore: alarm, combat: alarm },
  'loading-yard': { explore: alarm, combat: alarm, danger: protect },
  aquaculture: { explore: glass, combat: alarm, danger: protect },
  'aeration-annex': { explore: glass, combat: alarm, danger: protect },
  vestibule: { explore: vigil, combat: alarm },
  'crop-channels': { explore: glass, combat: alarm, danger: protect },
  'seed-bay': { explore: glass, combat: alarm, danger: protect },
  'medicinal-wing': { explore: glass, combat: alarm, danger: protect },
  'prep-room': { explore: glass, combat: alarm, danger: protect },
  filtration: { explore: glass, combat: elite, danger: protect },
  'production-hall': { explore: glass, combat: elite, danger: protect },
  'recovery-bay': { explore: vigil, combat: alarm },
};
export const JACKAL_CUE = 'mus.stage2.gilded-jackal';

/**
 * Area backdrop of every Stage 2 room and corridor (environments/stage2, imported as
 * `bg.stage2.<area>.<layer>`). Lab rooms of the same id use the same backdrop.
 */
export const STAGE2_ROOM_AREA: Readonly<Record<string, string>> = {
  'perimeter-pursuit': 'road',
  'marek-intercept': 'road',
  'beat-loading-yard': 'yard',
  's2-aquaculture-hall': 'aqua',
  's2-aeration-annex': 'annex',
  's2-hygiene-vestibule': 'vestibule',
  's2-crop-channels': 'crops',
  's2-seed-reserve-bay': 'seedbay',
  's2-medicinal-wing': 'medicinal',
  's2-medicinal-prep-room': 'preproom',
  'beat-filtration': 'filtration',
  's2-production-hall': 'hall',
  's2-recovery-bay': 'hall',
  'boss-marek': 'dispatch',
  'greenhouse-test-room': 'crops',
};

/**
 * Ambience beds per area (a separate layer under music: water circulation, pumps,
 * aeration, ventilation, night exteriors, spec §16). No ambience files are delivered yet:
 * each id plays a synthesized placeholder until a file with the same id is in the manifest.
 */
export const STAGE2_AMBIENCE: Readonly<Record<string, string>> = {
  road: 'amb.stage2.night-road',
  yard: 'amb.stage2.night-yard',
  aqua: 'amb.stage2.aeration',
  annex: 'amb.stage2.aeration',
  vestibule: 'amb.stage2.ventilation',
  crops: 'amb.stage2.irrigation',
  seedbay: 'amb.stage2.ventilation',
  medicinal: 'amb.stage2.irrigation',
  preproom: 'amb.stage2.ventilation',
  filtration: 'amb.stage2.pumps',
  hall: 'amb.stage2.pumps',
  dispatch: 'amb.stage2.night-yard',
};

/** Every narration and dialogue line of the six chapters (subtitles, transcripts, voice). */
export function stage2Lines(): { text: string; speaker: string }[] {
  const out = new Map<string, string>();
  for (const c of STAGE2_CHAPTERS)
    for (const s of c.shots)
      if (!('motif' in s)) for (const q of s.cues) out.set(q.text, q.speaker ?? NARRATOR);
  return [...out].map(([text, speaker]) => ({ text, speaker }));
}

/** Every stable Stage 2 media id (the Museum index; changing one is a breaking change). */
export function stage2MediaIds(): string[] {
  const ids = new Set<string>();
  for (const c of STAGE2_CHAPTERS) {
    ids.add(c.id);
    for (const s of c.shots) {
      if ('motif' in s) continue;
      if (s.clip) ids.add(s.clip);
      ids.add(s.still);
    }
  }
  ids.add(STAGE2_TITLE_LOOP.clip);
  ids.add(STAGE2_TITLE_LOOP.still);
  for (const c of STAGE2_MUSIC) {
    ids.add(c.id);
    for (const s of Object.values(c.states)) ids.add(s.asset);
    for (const s of c.stingers ?? []) ids.add(s.asset);
  }
  for (const a of Object.values(STAGE2_AMBIENCE)) ids.add(a);
  return [...ids].sort();
}
