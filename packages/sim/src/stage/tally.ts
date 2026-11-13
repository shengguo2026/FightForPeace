import type { World } from '../world/types';

/** M21: adds to a run counter (nothing outside a stage run: Lab rooms, arenas). */
export function tally(
  world: World,
  key:
    | 'reciprocal'
    | 'accord'
    | 'calls'
    | 'callsBroken'
    | 'breachesStopped'
    | 'breachesDone'
    | 'grenadeDamage',
  n = 1,
): void {
  if (world.run && n > 0) world.run.stats[key] += n;
}
