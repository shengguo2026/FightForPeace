import { ENEMY_DATA, HERO_DATA } from './heroes.gen';
import { armedKit } from './armory';
import { type ActionDef, Dir, type HeroDef, type InputContext } from './types';

/** The hero roster: a list of any length, in selection order (founders first). */
export const HEROES: readonly HeroDef[] = HERO_DATA;
/** Enemy kits (M4: the training enemy). */
export const ENEMIES: readonly HeroDef[] = ENEMY_DATA;
/** Kit index of the training enemy used by Lab dummies. */
export const TRAINER_KIT = 0;
/** Route codes of enemy actions start at this kit code (heroes use their roster index). */
export const ENEMY_ROUTE_BASE = 32;
/** Armed kits (M6): hero kit code 1024 + kit × 16 + weapon, enemy kit code 2048 + …. */
export const ARMED_HERO_BASE = 1024;
export const ARMED_ENEMY_BASE = 2048;

/** The fighter's own kit: its hero definition, or its enemy kit. */
export function baseKit(f: { team: string; hero: number }): HeroDef | undefined {
  if (f.hero < 0) return undefined;
  return f.team === 'hero' ? HEROES[f.hero] : ENEMIES[f.hero];
}

/**
 * The action kit of a fighter: its own kit, or while it wields a weapon (`wkit`) the
 * armed kit built from it and the weapon's core.
 */
export function kitOf(f: { team: string; hero: number; wkit?: number }): HeroDef | undefined {
  const base = baseKit(f);
  if (!base || f.wkit === undefined || f.wkit < 0) return base;
  return armedKit(base, `${f.team}/${f.hero}`, f.wkit);
}

/** Route-log code of an action that connected: kit code × 64 + action index. */
export function routeCode(team: string, kit: number, action: number, wkit = -1): number {
  if (wkit >= 0)
    return ((team === 'hero' ? ARMED_HERO_BASE : ARMED_ENEMY_BASE) + kit * 16 + wkit) * 64 + action;
  return (team === 'hero' ? kit : ENEMY_ROUTE_BASE + kit) * 64 + action;
}

/** Route code of a fighter's action (its running action by default). */
export function routeCodeOf(
  f: { team: string; hero: number; action: number; wkit: number },
  action = f.action,
): number {
  return routeCode(f.team, f.hero, action, f.wkit);
}

/** The action a route-log code names, if any. */
export function routeAction(code: number): ActionDef | undefined {
  const k = Math.trunc(code / 64);
  const i = code % 64;
  if (k >= ARMED_HERO_BASE) {
    const enemy = k >= ARMED_ENEMY_BASE;
    const rel = k - (enemy ? ARMED_ENEMY_BASE : ARMED_HERO_BASE);
    const team = enemy ? 'enemy' : 'hero';
    return kitOf({ team, hero: rel >> 4, wkit: rel & 15 })?.actions[i];
  }
  const kit = k >= ENEMY_ROUTE_BASE ? ENEMIES[k - ENEMY_ROUTE_BASE] : HEROES[k];
  return kit?.actions[i];
}

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

/** M11 progression data: store, payout, Hero Mastery, achievements, the Academy route. */
export { PROGRESSION_DATA as PROGRESSION } from './heroes.gen';
