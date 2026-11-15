/**
 * M24 shared systems: the per-frame steps the world runs when `world.shared` exists.
 * `stepShared` runs with the hazards (before projectiles and hits); `sharedHits` runs with
 * the hazard contacts (after collision).
 */
import type { World } from '../world/types';
import { moverHits, stepMovers, stepPlatforms } from './scenery';
import { riderHits } from './riders';
import { stepFighterExt } from './fighters';
import { stepStations } from './robot';

export function stepShared(world: World): void {
  stepMovers(world);
  stepPlatforms(world);
  stepFighterExt(world);
  stepStations(world);
}

export function sharedHits(world: World): void {
  moverHits(world);
  riderHits(world);
}
