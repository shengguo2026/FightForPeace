/**
 * M28 Stage 3 media (Stage 3 spec §16, §22.6): the three story chapters as still sequences
 * (decision 2026-11-10: each scene is its approved start picture with a slow zoom and a
 * cross-fade to its end picture; only the F01 title loop is a clip), the seven-cue
 * **Mist and Resolve** score with Garran's three states and the capture ending, the six
 * event stingers and the Highland Bed, and the area backdrop of every arena and corridor.
 *
 * Chapters: *Silvermist* (H01–H05) before the briefing; *The Prepared Route* (T01–T03),
 * shown inside the stage at its three story moments as a picture-in-picture over the fight
 * (the fight never stops, so co-op and Wi-Fi stay in step); *Paths through the Mist*
 * (E01–E06) after the epilogue cards, where E03 shows the Secure or the Critical insert.
 *
 * Guardrail: the logical ids below are the Museum's index and never change.
 */
import type { CinematicDef, ShotDef, SubtitleCue } from './cinematic';
import type { MusicCueDef } from './music';

const one = (ms: number, text: string, speaker: string): SubtitleCue[] => [
  { at: 400, until: ms - 250, text, speaker },
];
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
const TOMAS = 'speaker.tomas';
const GARRAN = 'speaker.garran';
const REN = 'speaker.renxia';
const LUO = 'speaker.luofen';
const WIND = 'speaker.wind';
const MOUNTAIN = 'speaker.mountain';
const RIVER = 'speaker.river';

/** A still-sequence shot: `story.stage3.<code>` cross-fading to `story.stage3.<code>-end`. */
const scene = (code: string, ms: number, cues: SubtitleCue[], when?: ShotDef['when']): ShotDef => ({
  id: `shot.stage3.${code}`,
  still: `story.stage3.${code}`,
  end: `story.stage3.${code}-end`,
  ms,
  cues,
  ...(when ? { when } : {}),
});
/** A single picture (an insert: the Secure or Critical reunion, the invoice). */
const insert = (
  code: string,
  ms: number,
  cues: SubtitleCue[],
  when?: ShotDef['when'],
): ShotDef => ({
  id: `shot.stage3.${code}`,
  still: `story.stage3.${code}`,
  ms,
  cues,
  ...(when ? { when } : {}),
});

const l = (n: string) => `s3.line.${n}`;

/** Chapter 1 · Silvermist: the research update, the partnership, the ambush, the demand. */
export const S3_SILVERMIST: CinematicDef = {
  id: 'cine.stage3.silvermist',
  music: { cue: 'mus.stage3.silver-veins-in-morning-mist', state: 'intro' },
  shots: [
    scene('h01', 9000, two(9000, 4600, [l('h01a'), NARRATOR], [l('h01b'), REN])),
    scene('h02', 8000, two(8000, 4100, [l('h02a'), NARRATOR], [l('h02b'), ELDER])),
    scene('h03', 8000, two(8000, 4100, [l('h03a'), NARRATOR], [l('h03b'), NARRATOR])),
    scene('h04', 9000, two(9000, 4600, [l('h04a'), LUO], [l('h04b'), ELDER])),
    scene('h05', 8000, one(8000, l('h05'), ELDER)),
  ],
};

/**
 * Chapter 2 · The Prepared Route: three moments inside the stage (the open radio at the
 * Moonbell beds, the planning cabin above Ren Xia's enclosure, Tomas leaving by the quarry
 * service passage). The Museum plays them in a row.
 */
export const S3_PREPARED_ROUTE: CinematicDef = {
  id: 'cine.stage3.prepared-route',
  music: { cue: 'mus.stage3.the-empty-gathering-trail', state: 'explore' },
  shots: [
    scene('t01', 7000, two(7000, 3600, [l('t01a'), TOMAS], [l('t01b'), RIVER])),
    scene('t02', 7000, two(7000, 3600, [l('t02a'), TOMAS], [l('t02b'), REN])),
    scene('t03', 7000, one(7000, l('t03'), NARRATOR)),
  ],
};

/**
 * Chapter 3 · Paths through the Mist, chosen by the run (story state `rescueCritical`: how
 * many rescue groups ended Critical): Garran restrained, his private case, the reunion at
 * Qinglan with its Secure or Critical insert, the invoice beside the seals, Tomas at the
 * lowland shelter, the heroes riding home. The canonical outcome never changes (§4.5).
 */
export const S3_PATHS: CinematicDef = {
  id: 'cine.stage3.paths',
  music: { cue: 'mus.stage3.paths-through-the-mist', state: 'ending' },
  shots: [
    scene('e01', 8000, two(8000, 4100, [l('e01a'), GARRAN], [l('e01b'), WIND])),
    scene('e02', 8000, two(8000, 4100, [l('e02a'), MOUNTAIN], [l('e02b'), NARRATOR])),
    insert('invoice', 5000, one(5000, l('invoice'), NARRATOR)),
    scene('e03', 8000, one(8000, l('e03'), NARRATOR)),
    insert('e03-secure', 5000, one(5000, l('e03secure'), NARRATOR), [
      { key: 'rescueCritical', below: 1 },
    ]),
    insert('e03-critical', 5000, one(5000, l('e03critical'), NARRATOR), [
      { key: 'rescueCritical', atLeast: 1 },
    ]),
    scene('e04', 8000, two(8000, 4100, [l('e04a'), ELDER], [l('e04b'), MOUNTAIN])),
    scene('e05', 8000, two(8000, 4100, [l('e05a'), NARRATOR], [l('e05b'), TOMAS])),
    scene('e06', 9000, one(9000, l('e06'), ELDER)),
  ],
};

export const STAGE3_INTRO: readonly CinematicDef[] = [S3_SILVERMIST];
export const STAGE3_ENDING: readonly CinematicDef[] = [S3_PATHS];
/** All three chapters (Museum Cinema). */
export const STAGE3_CHAPTERS: readonly CinematicDef[] = [
  S3_SILVERMIST,
  S3_PREPARED_ROUTE,
  S3_PATHS,
];

/** The story moment flag of a beat (`story` / `storyClear` in stage3.yaml) → its shot. */
export const STAGE3_STORY_SHOTS: Readonly<Record<string, string>> = {
  radio: 'shot.stage3.t01',
  cabin: 'shot.stage3.t02',
  escape: 'shot.stage3.t03',
};

export const STAGE3_TITLE_LOOP = {
  clip: 'cine.stage3.title-loop',
  still: 'story.stage3.title-loop',
};

/** The briefing's still per line (the expedition map, then the hamlet at dawn). */
export const STAGE3_BRIEF_STILLS = [
  's3-brief-01',
  's3-brief-01',
  's3-brief-02',
  's3-brief-02',
  's3-brief-02',
];

const loop = (id: string, bars: number, bpm?: number) => ({
  asset: `mus.stage3.${id}`,
  bars,
  ...(bpm ? { bpm } : {}),
});
const once = (id: string, bars: number, bpm?: number) => ({ ...loop(id, bars, bpm), once: true });

/**
 * Stage 3 score: Mist and Resolve (tools/audio/build_stage3_score.py). Garran's cue has
 * Hookstaff Control, Clinch and Cast, Winch Pressure and the capture ending on 06A's
 * 120 BPM grid, with two-bar stingers between them. Bar counts and tempi are the built
 * loops'.
 */
export const STAGE3_MUSIC: readonly MusicCueDef[] = [
  {
    id: 'mus.stage3.silver-veins-in-morning-mist',
    title: 'music.stage3.1',
    bpm: 76,
    beatsPerBar: 4,
    states: {
      title: loop('silver-veins-in-morning-mist.title', 16),
      intro: once('silver-veins-in-morning-mist.intro', 47),
    },
  },
  {
    id: 'mus.stage3.the-empty-gathering-trail',
    title: 'music.stage3.2',
    bpm: 74,
    beatsPerBar: 4,
    states: { explore: loop('the-empty-gathering-trail.explore', 24) },
  },
  {
    id: 'mus.stage3.hooves-above-the-ravine',
    title: 'music.stage3.3',
    bpm: 125,
    beatsPerBar: 4,
    states: { ride: loop('hooves-above-the-ravine.ride', 32) },
  },
  {
    id: 'mus.stage3.quarry-of-echoes',
    title: 'music.stage3.4',
    bpm: 120,
    beatsPerBar: 4,
    states: { combat: loop('quarry-of-echoes.combat', 32) },
  },
  {
    id: 'mus.stage3.captives-in-the-high-camp',
    title: 'music.stage3.5',
    bpm: 120,
    beatsPerBar: 4,
    states: { danger: loop('captives-in-the-high-camp.danger', 32) },
  },
  {
    id: 'mus.stage3.chief-of-the-broken-ridge',
    title: 'music.stage3.6',
    bpm: 120,
    beatsPerBar: 4,
    states: {
      hookstaff: loop('chief-of-the-broken-ridge.hookstaff', 32),
      clinch: loop('chief-of-the-broken-ridge.clinch', 32),
      winch: loop('chief-of-the-broken-ridge.winch', 32),
      capture: once('chief-of-the-broken-ridge.capture', 30),
    },
    stingers: [
      { to: 'clinch', asset: 'mus.stage3.chief-of-the-broken-ridge.sting-clinch', bars: 2 },
      { to: 'winch', asset: 'mus.stage3.chief-of-the-broken-ridge.sting-winch', bars: 2 },
      { to: 'capture', asset: 'mus.stage3.chief-of-the-broken-ridge.sting-capture', bars: 2 },
    ],
  },
  {
    id: 'mus.stage3.paths-through-the-mist',
    title: 'music.stage3.7',
    bpm: 80,
    beatsPerBar: 4,
    states: {
      victory: once('paths-through-the-mist.victory', 8),
      ending: loop('paths-through-the-mist.ending', 16),
      coda: once('paths-through-the-mist.coda', 60),
    },
  },
  {
    id: 'mus.stage3.highland-bed',
    title: 'music.stage3.9',
    bpm: 76,
    beatsPerBar: 4,
    states: { bed: loop('highland-bed.bed', 16) },
  },
];
export const GARRAN_CUE = 'mus.stage3.chief-of-the-broken-ridge';

/** The six event stingers (presentation only): checkpoint, freed, sheltered, branch, evidence, horse. */
export const STAGE3_STINGERS = {
  checkpoint: 'mus.stage3.sting.checkpoint',
  freed: 'mus.stage3.sting.person-freed',
  sheltered: 'mus.stage3.sting.person-sheltered',
  branch: 'mus.stage3.sting.branch-complete',
  evidence: 'mus.stage3.sting.evidence-found',
  horse: 'mus.stage3.sting.horse-calmed',
} as const;

export interface Stage3BeatMusic {
  explore: { cue: string; state: string };
  combat: { cue: string; state: string };
  /** While a captive's hostile action is under way (Captives in the High Camp). */
  danger?: { cue: string; state: string };
}
const trail = { cue: 'mus.stage3.the-empty-gathering-trail', state: 'explore' };
const bed = { cue: 'mus.stage3.highland-bed', state: 'bed' };
const ride = { cue: 'mus.stage3.hooves-above-the-ravine', state: 'ride' };
const quarry = { cue: 'mus.stage3.quarry-of-echoes', state: 'combat' };
const camp = { cue: 'mus.stage3.captives-in-the-high-camp', state: 'danger' };

/** Beat id → music (the terrace is Garran's cue, chosen by his phase in the director). */
export const STAGE3_BEAT_MUSIC: Readonly<Record<string, Stage3BeatMusic>> = {
  'switchback-ride': { explore: ride, combat: ride },
  hoofprints: { explore: trail, combat: quarry },
  'rope-trail': { explore: trail, combat: quarry },
  'drying-racks': { explore: bed, combat: quarry },
  'signal-hut': { explore: bed, combat: quarry, danger: camp },
  'watch-path': { explore: trail, combat: quarry },
  'mist-beds': { explore: trail, combat: quarry, danger: camp },
  'two-voices': { explore: trail, combat: quarry, danger: camp },
  'loose-scaffold': { explore: trail, combat: quarry },
  'herbalist-shelter': { explore: bed, combat: quarry },
  'hammer-line': { explore: trail, combat: quarry },
  'cart-rails': { explore: trail, combat: quarry, danger: camp },
  'ridge-ride': { explore: ride, combat: ride },
  'outer-fence': { explore: camp, combat: quarry },
  'lantern-row': { explore: camp, combat: quarry },
  'ren-enclosure': { explore: camp, combat: camp },
};

/**
 * Area backdrop of every Stage 3 arena and corridor (environments/stage3, imported as
 * `bg.stage3.<area>.<layer>`); the M27 Lab rooms of the same places use them too.
 */
export const STAGE3_ROOM_AREA: Readonly<Record<string, string>> = {
  's3-switchback-ride': 'switchback',
  's3-ridge-pursuit': 'camp',
  's3-hoofprints': 'switchback',
  's3-rope-trail': 'switchback',
  's3-drying-racks': 'qinglan',
  's3-signal-hut': 'signalhut',
  's3-watch-path': 'qinglan',
  's3-mist-beds': 'basin',
  's3-two-voices': 'basin',
  's3-loose-scaffold': 'quarry',
  's3-herbalist-shelter': 'shelter',
  's3-hammer-line': 'quarry',
  's3-cart-rails': 'quarry',
  's3-outer-fence': 'camp',
  's3-lantern-row': 'camp',
  's3-ren-enclosure': 'camp',
  's3-terrace': 'terrace',
  'lab-m27-scaffold': 'quarry',
  'lab-m27-hammer-line': 'quarry',
  'lab-m27-cart-rails': 'quarry',
  'lab-m27-outer-fence': 'camp',
  'lab-m27-garran-hook': 'terrace',
  'lab-m27-garran-clinch': 'terrace',
  'lab-m27-garran-winch': 'terrace',
  'lab-m27-garran': 'terrace',
};

/**
 * Ambience per area (a layer under the music, spec §16: wind on the ridges, water in the
 * basin, the quarry's echo). No recordings are delivered yet: each id plays a synthesized
 * placeholder until a file with the same id is in the manifest.
 */
export const STAGE3_AMBIENCE: Readonly<Record<string, string>> = {
  switchback: 'amb.stage3.ravine-wind',
  qinglan: 'amb.stage3.hamlet',
  signalhut: 'amb.stage3.ravine-wind',
  basin: 'amb.stage3.basin-water',
  quarry: 'amb.stage3.quarry-echo',
  shelter: 'amb.stage3.hamlet',
  camp: 'amb.stage3.ridge-night',
  terrace: 'amb.stage3.ravine-wind',
};

/** Every narration and dialogue line of the three chapters (subtitles and transcripts). */
export function stage3Lines(): { text: string; speaker: string }[] {
  const out = new Map<string, string>();
  for (const c of STAGE3_CHAPTERS)
    for (const s of c.shots)
      if (!('motif' in s)) for (const q of s.cues) out.set(q.text, q.speaker ?? NARRATOR);
  return [...out].map(([text, speaker]) => ({ text, speaker }));
}

/** Every stable Stage 3 media id (the Museum index; changing one is a breaking change). */
export function stage3MediaIds(): string[] {
  const ids = new Set<string>();
  for (const c of STAGE3_CHAPTERS) {
    ids.add(c.id);
    for (const s of c.shots) {
      if ('motif' in s) continue;
      ids.add(s.still);
      if (s.end) ids.add(s.end);
    }
  }
  ids.add(STAGE3_TITLE_LOOP.clip);
  ids.add(STAGE3_TITLE_LOOP.still);
  for (const c of STAGE3_MUSIC) {
    ids.add(c.id);
    for (const s of Object.values(c.states)) ids.add(s.asset);
    for (const s of c.stingers ?? []) ids.add(s.asset);
  }
  for (const s of Object.values(STAGE3_STINGERS)) ids.add(s);
  for (const a of Object.values(STAGE3_AMBIENCE)) ids.add(a);
  return [...ids].sort();
}
