import {
  GARRAN_CUE,
  JACKAL_CUE,
  STAGE1_BEAT_MUSIC,
  STAGE2_AMBIENCE,
  STAGE2_BEAT_MUSIC,
  STAGE2_ROOM_AREA,
  STAGE3_AMBIENCE,
  STAGE3_BEAT_MUSIC,
  STAGE3_ROOM_AREA,
} from '@ffp/platform';
import {
  ARENAS,
  AssetState,
  ChannelPhase,
  CORRIDORS,
  MoveState,
  ROOMS,
  RunPhase,
  STAGES,
  type World,
} from '@ffp/sim';
import type { Screen } from '../shell/shell';
import { activeCinematic } from './Cinematic';
import { audio } from './audio';
import { museumListen } from '../shell/screens/Museum';

export interface MusicContext {
  screen: Screen;
  /** The screen settings were opened from (the game's music keeps playing over them). */
  settingsFrom: Screen;
  world: World;
  results: boolean;
  ending: boolean;
  paused: boolean;
  /** The village music: the title screen of the latest completed stage (Guo, 14 Nov). */
  title: { cue: string; state: string };
}

/** Screens with no score of their own (the Lab and Academy drills stay quiet). */
const QUIET: ReadonlySet<Screen> = new Set(['lab', 'lesson', 'practice', 'preview', 'boot']);

/** M22: the Stage 2 area of the room or corridor the world is in (null: none). */
export function stage2Area(world: World): string | null {
  const room = world.greenhouse ? ROOMS[world.greenhouse.room]?.id : undefined;
  const corridor = world.pursuit ? CORRIDORS[world.pursuit.corridor]?.id : undefined;
  const id = room ?? corridor;
  return id ? (STAGE2_ROOM_AREA[id] ?? null) : null;
}

/**
 * M22: Stage 2's Prosperity Under Siege. The intercept is the Gilded Jackal's mounted
 * state; in the dispatch yard Marek's armed phase, Predator Unbound, Scorched Claim and
 * the surrender are its four other states (authored stingers between them); elsewhere
 * each beat has an explore cue, a combat cue and, while a Ledger asset is Critical,
 * Protect the Living System.
 */
function stage2Music(c: MusicContext, beatId: string): { cue: string; state: string } | null {
  const w = c.world;
  const run = w.run!;
  if (c.results) return { cue: 'mus.stage2.what-we-protected', state: 'victory' };
  if (beatId === 'intercept') return { cue: JACKAL_CUE, state: 'mounted' };
  const boss = w.encounter?.boss;
  if (beatId === 'dispatch-yard' && boss) {
    const body = w.bodies.find((b) => b.id === boss.id);
    if (boss.capture > 0 || body?.state === MoveState.Surrender || run.phase === RunPhase.Complete)
      return { cue: JACKAL_CUE, state: 'surrender' };
    if (boss.scorch > 0) return { cue: JACKAL_CUE, state: 'scorched' };
    return { cue: JACKAL_CUE, state: boss.phase >= 1 ? 'unbound' : 'armed' };
  }
  const m = STAGE2_BEAT_MUSIC[beatId];
  if (!m) return null;
  const fighting = run.phase === RunPhase.Locked || w.pursuit !== null;
  if (!fighting) return m.explore;
  const danger = w.greenhouse?.assets.some((a) => a.state === AssetState.Critical) ?? false;
  return danger && m.danger ? m.danger : m.combat;
}

/** M28: the Stage 3 area of the arena or horse corridor the world is in (null: none). */
export function stage3Area(world: World): string | null {
  const arena = world.encounter ? ARENAS[world.encounter.arena]?.id : undefined;
  const corridor = world.pursuit ? CORRIDORS[world.pursuit.corridor]?.id : undefined;
  const id = corridor ?? arena;
  return id ? (STAGE3_ROOM_AREA[id] ?? null) : null;
}

/**
 * M28: Stage 3's Mist and Resolve. On the terrace Garran's cue follows his phase
 * (Hookstaff Control, Clinch and Cast, Winch Pressure) and his capture; the horse corridors
 * ride Hooves above the Ravine; elsewhere each beat has an explore and a combat cue, and
 * Captives in the High Camp while a hostile action is under way against someone.
 */
function stage3Music(c: MusicContext, beatId: string): { cue: string; state: string } | null {
  const w = c.world;
  const run = w.run!;
  if (c.results) return { cue: 'mus.stage3.paths-through-the-mist', state: 'victory' };
  const boss = w.encounter?.boss;
  if (beatId === 'terrace') {
    if (!boss || boss.capture > 0 || run.phase === RunPhase.Complete)
      return boss ? { cue: GARRAN_CUE, state: 'capture' } : null;
    return { cue: GARRAN_CUE, state: ['hookstaff', 'clinch', 'winch'][boss.phase] ?? 'winch' };
  }
  const m = STAGE3_BEAT_MUSIC[beatId];
  if (!m) return null;
  const fighting = run.phase === RunPhase.Locked || w.pursuit !== null;
  if (!fighting) return m.explore;
  const danger = w.objectives?.channels.some((x) => x.phase === ChannelPhase.Working) ?? false;
  return danger && m.danger ? m.danger : m.combat;
}

/**
 * M13: which cue and state of the Stage 1 score plays now. Menus play the title state;
 * cinematics play their own (or nothing, when the clips carry their own sound); in the
 * stage each beat has its cue, a camera lock switches to its combat state, the boss's
 * phases and surrender are the four states of Keeper of the Gate, and the results open
 * River Returned with the delivered victory stinger. M22: Stage 2 runs play its score.
 */
export function musicFor(c: MusicContext): { cue: string; state: string } | null {
  const cine = activeCinematic.value;
  if (cine) return cine.video ? null : (cine.music ?? null);
  const screen = c.screen === 'settings' ? c.settingsFrom : c.screen;
  if (QUIET.has(screen)) return null;
  // M21: the Museum's Music page plays the chosen cue and state.
  if (screen === 'museum' && museumListen.value) return museumListen.value;
  if (screen !== 'game') return c.title;
  const run = c.world.run;
  if (!run) return null;
  const beat = STAGES[run.stage]?.beats[run.beat];
  if (STAGES[run.stage]?.id === 'stage2') return beat ? stage2Music(c, beat.id) : null;
  if (STAGES[run.stage]?.id === 'stage3') return beat ? stage3Music(c, beat.id) : null;
  if (c.results) return { cue: 'mus.stage1.river-returned', state: 'victory' };
  const m = beat ? STAGE1_BEAT_MUSIC[beat.id] : undefined;
  if (!m) return null;
  const boss = c.world.encounter?.boss;
  if (boss && beat?.id === 'sluice') {
    const body = c.world.bodies.find((b) => b.id === boss.id);
    if (body?.state === MoveState.Surrender || run.phase === RunPhase.Complete)
      return { cue: m.cue, state: 'surrender' };
    return { cue: m.cue, state: `phase${Math.min(3, boss.phase + 1)}` };
  }
  return { cue: m.cue, state: run.phase === RunPhase.Locked ? m.combat : m.explore };
}

/** M22: the ambience bed now: the Stage 2 area's in a run or a Lab room, else none. */
export function ambienceFor(c: MusicContext): string | null {
  if (activeCinematic.value || c.results) return null;
  const screen = c.screen === 'settings' ? c.settingsFrom : c.screen;
  if (screen !== 'game' && screen !== 'lab') return null;
  const area = stage2Area(c.world);
  if (area) return STAGE2_AMBIENCE[area] ?? null;
  const s3 = stage3Area(c.world);
  return s3 ? (STAGE3_AMBIENCE[s3] ?? null) : null;
}

/** Called every animation frame from the main loop. */
export function tickMusic(c: MusicContext, nowMs: number): void {
  const want = musicFor(c);
  audio.music(want?.cue ?? null, want?.state);
  audio.ambience(ambienceFor(c));
  // The pause menu holds the score quieter; it never stops it.
  audio.setHold(c.paused ? 0.4 : 1);
  audio.tick(nowMs);
}
