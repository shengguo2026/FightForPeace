import { STAGE1_BEAT_MUSIC } from '@ffp/platform';
import { MoveState, RunPhase, STAGES, type World } from '@ffp/sim';
import type { Screen } from '../shell/shell';
import { activeCinematic } from './Cinematic';
import { audio } from './audio';

export interface MusicContext {
  screen: Screen;
  /** The screen settings were opened from (the game's music keeps playing over them). */
  settingsFrom: Screen;
  world: World;
  results: boolean;
  ending: boolean;
  paused: boolean;
}

/** Screens with no score of their own (the Lab and Academy drills stay quiet). */
const QUIET: ReadonlySet<Screen> = new Set(['lab', 'lesson', 'practice', 'boot']);

/**
 * M13: which cue and state of the Stage 1 score plays now. Menus play the title state;
 * cinematics play their own (or nothing, when the clips carry their own sound); in the
 * stage each beat has its cue, a camera lock switches to its combat state, the boss's
 * phases and surrender are the four states of Keeper of the Gate, and the results open
 * River Returned with the delivered victory stinger.
 */
export function musicFor(c: MusicContext): { cue: string; state: string } | null {
  const cine = activeCinematic.value;
  if (cine) return cine.video ? null : (cine.music ?? null);
  const screen = c.screen === 'settings' ? c.settingsFrom : c.screen;
  if (QUIET.has(screen)) return null;
  if (screen !== 'game') return { cue: 'mus.stage1.river-before-silence', state: 'title' };
  const run = c.world.run;
  if (!run) return null;
  if (c.results) return { cue: 'mus.stage1.river-returned', state: 'victory' };
  const beat = STAGES[run.stage]?.beats[run.beat];
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

/** Called every animation frame from the main loop. */
export function tickMusic(c: MusicContext, nowMs: number): void {
  const want = musicFor(c);
  audio.music(want?.cue ?? null, want?.state);
  // The pause menu holds the score quieter; it never stops it.
  audio.setHold(c.paused ? 0.4 : 1);
  audio.tick(nowMs);
}
