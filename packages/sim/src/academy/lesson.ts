import { fx } from '../math/fixed';
import { recipeDone } from '../combat/recipes';
import { HEROES } from '../combat/roster';
import { routeAction } from '../combat/roster';
import type { LessonGoal, LessonPhaseDef } from '../combat/types';
import { DefEvent, MoveState, type World } from '../world/types';
import { heroOf } from '../world/world';

/**
 * M11 Academy lesson goals, read from the world state every simulation step (the lesson
 * never changes the simulation). One tracker per lesson phase.
 */
export interface LessonTracker {
  /** Goals met at least once in the current attempt (guided practice: in any order). */
  met: LessonGoal[];
  /** Completed attempts of the whole goal list (trial and mastery). */
  done: number;
  /** World frame the current attempt began. */
  since: number;
  /** Hero x when the attempt began (walk goal). */
  startX: number;
  lastDefFrame: number;
  /** Route length of the followed dummy already counted (special/ultimate/recipe goals). */
  seenRoute: number[];
}

/** A hero has to walk this far for the walk goal. */
export const WALK_GOAL = fx(300);

export function newTracker(world: World, slot = 0): LessonTracker {
  const h = heroOf(world, slot);
  return {
    met: [],
    done: 0,
    since: world.frame,
    startX: h?.x ?? 0,
    lastDefFrame: h?.defFrame ?? -1,
    seenRoute: world.bodies.map(() => 0),
  };
}

/** Goals that happened this step for the hero in `slot`. */
export function goalsNow(
  world: World,
  slot: number,
  t: LessonTracker,
  recipe: string | null,
): LessonGoal[] {
  const h = heroOf(world, slot);
  if (!h) return [];
  const out: LessonGoal[] = [];
  if (Math.abs(h.x - t.startX) >= WALK_GOAL) out.push('walk');
  if (h.state === MoveState.Air && h.y > 0) out.push('jump');
  if (h.state === MoveState.Dash) out.push('dash');
  if (h.defFrame !== t.lastDefFrame && h.defFrame >= 0) {
    t.lastDefFrame = h.defFrame;
    if (h.defEvent === DefEvent.Guard) out.push('guard');
    if (h.defEvent === DefEvent.Exact || h.defEvent === DefEvent.ExactBreak)
      out.push('exact', 'guard');
    if (h.defEvent === DefEvent.Counter) out.push('counter');
  }
  const kit = HEROES[h.hero];
  const r = recipe ? kit?.recipes.find((x) => x.id === recipe) : undefined;
  world.bodies.forEach((d, i) => {
    if (d.team === h.team) return;
    const route = d.ctx.route;
    if (!d.ctx.open) {
      t.seenRoute[i] = 0;
      return;
    }
    const from = t.seenRoute[i] ?? 0;
    for (let k = from; k < route.length; k += 1) {
      const code = route[k]!;
      if (Math.trunc(code / 64) !== h.hero) continue;
      const a = routeAction(code);
      if (a?.category === 'special') out.push('special');
      if (a?.category === 'ultimate') out.push('ultimate');
    }
    if (r && route.length > from && recipeDone(r, route, h.hero)) out.push('recipe');
    t.seenRoute[i] = route.length;
  });
  return out;
}

/** Guided practice: every goal met once, in any order. Returns true when complete. */
export function stepGuided(
  world: World,
  slot: number,
  t: LessonTracker,
  goals: readonly LessonGoal[],
  recipe: string | null,
): boolean {
  for (const g of goalsNow(world, slot, t, recipe)) if (!t.met.includes(g)) t.met.push(g);
  return goals.every((g) => t.met.includes(g));
}

export type PhaseResult = 'running' | 'complete' | 'timeout';

/**
 * Trial or mastery: the goal list `count` times; with a time limit, every attempt must be
 * finished within `frames` of its start (a timed-out attempt starts again, no penalty).
 */
export function stepPhase(
  world: World,
  slot: number,
  t: LessonTracker,
  phase: LessonPhaseDef,
  recipe: string | null,
): PhaseResult {
  for (const g of goalsNow(world, slot, t, recipe)) if (!t.met.includes(g)) t.met.push(g);
  if (phase.goals.every((g) => t.met.includes(g))) {
    t.done += 1;
    restart(world, slot, t);
    if (t.done >= phase.count) return 'complete';
  } else if (phase.frames > 0 && world.frame - t.since > phase.frames) {
    t.done = 0;
    restart(world, slot, t);
    return 'timeout';
  }
  return 'running';
}

function restart(world: World, slot: number, t: LessonTracker): void {
  const h = heroOf(world, slot);
  t.met = [];
  t.since = world.frame;
  t.startX = h?.x ?? t.startX;
}
