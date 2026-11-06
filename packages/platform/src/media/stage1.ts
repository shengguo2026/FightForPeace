/**
 * M13 Stage 1 media: the intro and ending cinematics, the shared motif shots, and the
 * seven-cue **Water Held Back** score (docs/production/campaign_music_direction.md).
 *
 * Guardrail (roadmap M13): every Stage 1 picture, clip and music cue keeps the stable
 * logical id below, because the Stage 2 Museum indexes Stage 1 media. Delivered files
 * replace placeholders through the asset manifest; the ids never change.
 */
import type { CinematicDef, ShotDef, SubtitleCue } from './cinematic';
import type { MusicCueDef } from './music';

const line = (ms: number, text: string, speaker = 'speaker.narrator'): SubtitleCue[] => [
  { at: 500, until: ms - 250, text, speaker },
];

/** Shared motif shots (village, sponsor; the Wayfarer motif joins in Stage 4). */
export const MOTIFS: Readonly<Record<string, ShotDef>> = {
  'village.peace': {
    id: 'motif.village.peace',
    clip: 'cine.stage1.intro.01',
    still: 'story.stage1.intro.01',
    ms: 8000,
    cues: line(8000, 'intro.1'),
  },
  'sponsor.evidence': {
    id: 'motif.sponsor.evidence',
    clip: 'cine.stage1.end.03',
    still: 'story.stage1.end.03',
    ms: 6000,
    cues: line(6000, 'ending.3'),
  },
};

export const STAGE1_INTRO: CinematicDef = {
  id: 'cine.stage1.intro',
  music: { cue: 'mus.stage1.river-before-silence', state: 'intro' },
  shots: [
    { motif: 'village.peace' },
    {
      id: 'shot.stage1.intro.02',
      clip: 'cine.stage1.intro.02',
      still: 'story.stage1.intro.02',
      ms: 6500,
      cues: line(6500, 'intro.2'),
    },
    {
      id: 'shot.stage1.intro.03',
      clip: 'cine.stage1.intro.03',
      still: 'story.stage1.intro.03',
      ms: 8000,
      cues: line(8000, 'intro.3'),
    },
    {
      id: 'shot.stage1.intro.04',
      clip: 'cine.stage1.intro.04',
      still: 'story.stage1.intro.04',
      ms: 8000,
      cues: line(8000, 'intro.4'),
    },
    {
      id: 'shot.stage1.intro.05',
      clip: 'cine.stage1.intro.05',
      still: 'story.stage1.intro.05',
      ms: 8000,
      cues: line(8000, 'intro.5'),
    },
    {
      id: 'shot.stage1.intro.06',
      clip: 'cine.stage1.intro.06',
      still: 'story.stage1.intro.06',
      ms: 8000,
      cues: line(8000, 'intro.6'),
    },
  ],
};

/**
 * The ending, chosen by state (condition inserts): the celebration line depends on
 * whether every worker was freed, and a clue line follows when every clue was found.
 * State keys: `workersFreed`, `workersTotal`, `clues`, `cluesTotal`.
 */
export const STAGE1_ENDING: CinematicDef = {
  id: 'cine.stage1.ending',
  music: { cue: 'mus.stage1.river-returned', state: 'ending' },
  shots: [
    {
      id: 'shot.stage1.end.01',
      clip: 'cine.stage1.end.01',
      still: 'story.stage1.end.01',
      ms: 8000,
      cues: line(8000, 'ending.1'),
    },
    {
      id: 'shot.stage1.end.02.all',
      clip: 'cine.stage1.end.02',
      still: 'story.stage1.end.02',
      ms: 8000,
      cues: line(8000, 'ending.2.all'),
      when: [{ key: 'workersFreed', sameAs: 'workersTotal' }],
    },
    {
      id: 'shot.stage1.end.02.some',
      clip: 'cine.stage1.end.02',
      still: 'story.stage1.end.02',
      ms: 8000,
      cues: line(8000, 'ending.2.some'),
      when: [{ key: 'workersFreed', notSameAs: 'workersTotal' }],
    },
    {
      motif: 'sponsor.evidence',
      cues: [
        { at: 400, until: 2900, text: 'ending.3', speaker: 'speaker.elder' },
        { at: 3000, until: 5800, text: 'ending.3b', speaker: 'speaker.elder' },
      ],
      when: [{ key: 'clues', sameAs: 'cluesTotal' }],
    },
    { motif: 'sponsor.evidence', when: [{ key: 'clues', notSameAs: 'cluesTotal' }] },
  ],
};

/** The title-screen loop behind the village menu (muted, decorative). */
export const STAGE1_TITLE_LOOP = {
  clip: 'cine.stage1.title-loop',
  still: 'story.stage1.title-loop',
};

const loop = (id: string, bars = 8) => ({ asset: `mus.stage1.${id}`, bars });

/** Stage 1 score: Water Held Back (seven cues; the boss cue has four states). */
export const STAGE1_MUSIC: readonly MusicCueDef[] = [
  {
    id: 'mus.stage1.river-before-silence',
    title: 'music.stage1.1',
    bpm: 72,
    beatsPerBar: 4,
    states: {
      title: loop('river-before-silence.title'),
      intro: loop('river-before-silence.intro'),
    },
  },
  {
    id: 'mus.stage1.fields-without-water',
    title: 'music.stage1.2',
    bpm: 84,
    beatsPerBar: 4,
    states: {
      explore: loop('fields-without-water.explore'),
      combat: loop('fields-without-water.combat'),
    },
  },
  {
    id: 'mus.stage1.bridge-under-watch',
    title: 'music.stage1.3',
    bpm: 96,
    beatsPerBar: 4,
    states: {
      explore: loop('bridge-under-watch.explore'),
      combat: loop('bridge-under-watch.combat'),
      danger: loop('bridge-under-watch.danger'),
    },
  },
  {
    id: 'mus.stage1.mill-in-motion',
    title: 'music.stage1.4',
    bpm: 92,
    beatsPerBar: 4,
    states: { explore: loop('mill-in-motion.explore'), combat: loop('mill-in-motion.combat') },
  },
  {
    id: 'mus.stage1.through-the-dry-canal',
    title: 'music.stage1.5',
    bpm: 104,
    beatsPerBar: 4,
    states: {
      explore: loop('through-the-dry-canal.explore'),
      combat: loop('through-the-dry-canal.combat'),
      danger: loop('through-the-dry-canal.danger'),
    },
  },
  {
    id: 'mus.stage1.keeper-of-the-gate',
    title: 'music.stage1.6',
    bpm: 112,
    beatsPerBar: 4,
    states: {
      phase1: loop('keeper-of-the-gate.phase1'),
      phase2: loop('keeper-of-the-gate.phase2'),
      phase3: loop('keeper-of-the-gate.phase3'),
      surrender: { asset: 'mus.stage1.keeper-of-the-gate.surrender', bars: 4, once: true },
    },
    stingers: [
      { to: 'phase2', asset: 'mus.stage1.keeper-of-the-gate.sting-phase', bars: 1 },
      { to: 'phase3', asset: 'mus.stage1.keeper-of-the-gate.sting-phase', bars: 1 },
      { to: 'surrender', asset: 'mus.stage1.keeper-of-the-gate.sting-end', bars: 2 },
    ],
  },
  {
    id: 'mus.stage1.river-returned',
    title: 'music.stage1.7',
    bpm: 76,
    beatsPerBar: 4,
    states: {
      // Delivered: MUS-STINGER-VICTORY (19 s), played once.
      victory: { asset: 'mus.stage1.river-returned.victory', bars: 6, once: true },
      ending: loop('river-returned.ending'),
    },
  },
];

/** The music cue for each Stage 1 beat, and the state used outside and inside fights. */
export const STAGE1_BEAT_MUSIC: Readonly<
  Record<string, { cue: string; explore: string; combat: string }>
> = {
  fields: { cue: 'mus.stage1.fields-without-water', explore: 'explore', combat: 'combat' },
  bridge: { cue: 'mus.stage1.bridge-under-watch', explore: 'explore', combat: 'combat' },
  rescue: { cue: 'mus.stage1.bridge-under-watch', explore: 'explore', combat: 'danger' },
  mill: { cue: 'mus.stage1.mill-in-motion', explore: 'explore', combat: 'combat' },
  investigation: { cue: 'mus.stage1.mill-in-motion', explore: 'explore', combat: 'combat' },
  canal: { cue: 'mus.stage1.through-the-dry-canal', explore: 'explore', combat: 'combat' },
  courtyard: { cue: 'mus.stage1.through-the-dry-canal', explore: 'combat', combat: 'danger' },
  sluice: { cue: 'mus.stage1.keeper-of-the-gate', explore: 'phase1', combat: 'phase1' },
};

/** Every stable Stage 1 media id (the Museum index; changing one is a breaking change). */
export function stage1MediaIds(): string[] {
  const ids = new Set<string>();
  for (const c of [STAGE1_INTRO, STAGE1_ENDING])
    for (const s of c.shots) {
      if ('motif' in s) {
        const m = MOTIFS[s.motif]!;
        if (m.clip) ids.add(m.clip);
        ids.add(m.still);
      } else {
        if (s.clip) ids.add(s.clip);
        ids.add(s.still);
      }
    }
  ids.add(STAGE1_TITLE_LOOP.clip);
  ids.add(STAGE1_TITLE_LOOP.still);
  for (const c of STAGE1_MUSIC) {
    ids.add(c.id);
    for (const s of Object.values(c.states)) ids.add(s.asset);
    for (const s of c.stingers ?? []) ids.add(s.asset);
  }
  return [...ids].sort();
}
