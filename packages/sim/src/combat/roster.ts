import { HERO_DATA } from './heroes.gen';
import { type ActionDef, Dir, type HeroDef, type InputContext } from './types';

/** The hero roster: a list of any length, in selection order (founders first). */
export const HEROES: readonly HeroDef[] = HERO_DATA;

export function heroIndex(id: string, roster: readonly HeroDef[] = HEROES): number {
  const i = roster.findIndex((h) => h.id === id);
  if (i === -1) throw new Error(`unknown hero "${id}"`);
  return i;
}

/** True when a data direction (which may be Vertical) matches an input direction. */
export function dirMatches(dataDir: number, input: number): boolean {
  return (
    dataDir === input || (dataDir === Dir.Vertical && (input === Dir.Up || input === Dir.Down))
  );
}

/**
 * The action a fresh press selects in a context. A direction without its own move in the
 * air falls back to the hero's air neutral move; other contexts have every slot filled
 * or fall back to their neutral slot.
 */
export function findAction(hero: HeroDef, context: InputContext, dir: number): number {
  const exact = hero.actions.findIndex((a) => a.context === context && dirMatches(a.dir, dir));
  if (exact !== -1) return exact;
  return hero.actions.findIndex((a) => a.context === context && a.dir === Dir.Neutral);
}

/** Total active frames including gaps between active segments. */
export function activeSpan(a: ActionDef): number {
  return a.active.reduce((s, n) => s + n, 0);
}

/** Frames of the whole action on the ground (aerials: until landing, then recovery). */
export function totalFrames(a: ActionDef): number {
  return a.startup + activeSpan(a) + a.recovery;
}

/**
 * Active segment index for action frame n (1-based), or -1. Segments alternate active and
 * gap entries: [3] is one segment; [6, 1, 5] is two segments with a one-frame gap.
 */
export function activeSegment(a: ActionDef, n: number): number {
  let t = n - a.startup;
  if (t <= 0) return -1;
  for (let i = 0; i < a.active.length; i += 1) {
    const len = a.active[i]!;
    if (t <= len) return i % 2 === 0 ? i / 2 : -1;
    t -= len;
  }
  return -1;
}

export function segmentCount(a: ActionDef): number {
  return Math.ceil(a.active.length / 2);
}

export type Phase = 'startup' | 'active' | 'recovery';

/** Phase and position inside it (1-based) for action frame n. */
export function phaseOf(a: ActionDef, n: number): { phase: Phase; at: number; of: number } {
  if (n <= a.startup) return { phase: 'startup', at: n, of: a.startup };
  const span = activeSpan(a);
  if (n <= a.startup + span) return { phase: 'active', at: n - a.startup, of: span };
  return { phase: 'recovery', at: n - a.startup - span, of: a.recovery };
}
