import { HEROES } from '../src/combat/roster';
import { fx } from '../src/math/fixed';
import type { FrameInput, Fighter, World } from '../src/world/types';
import { createWorld, step, type WorldOptions } from '../src/world/world';
import { hero, idle } from './helpers';

/** One scripted press: wait until `when` holds, then send `input` for one frame. */
export interface Cue {
  when: (w: World) => boolean;
  input: FrameInput;
}

/** Runs cues in order (each waits at most `limit` frames), then idles `tail` frames. */
export function perform(w: World, cues: Cue[], tail = 90, limit = 120): number {
  let done = 0;
  for (const cue of cues) {
    let waited = 0;
    while (!cue.when(w)) {
      step(w, [idle]);
      if ((waited += 1) > limit) return done;
    }
    step(w, [cue.input]);
    done += 1;
  }
  for (let i = 0; i < tail; i += 1) step(w, [idle]);
  return done;
}

export const dummyOf = (w: World, id = 101): Fighter => w.bodies.find((b) => b.id === id)!;

/** Hero 1 stands `gap` px left of dummy 101 at the same depth, facing right. */
export function duel(heroId: string, options: WorldOptions = {}, gap = 80): World {
  const w = createWorld(1, { dummies: 1, heroes: [heroId, 'river'], ...options });
  const h = hero(w);
  const d = dummyOf(w);
  h.x = d.x - fx(gap);
  h.z = d.z;
  return w;
}

/** Id of the action the hero is running, or null. */
export function running(w: World, slot = 0): string | null {
  const h = hero(w, slot);
  return h.action >= 0 ? (HEROES[h.hero]!.actions[h.action]!.id ?? null) : null;
}

/** The hero's running action has made contact. */
export const contacted = (w: World, id: string) => running(w) === id && hero(w).contactAt >= 0;

/** Action ids of a context route. */
export function routeIds(route: readonly number[]): string[] {
  return route.map((c) => HEROES[Math.trunc(c / 64)]!.actions[c % 64]!.id);
}
