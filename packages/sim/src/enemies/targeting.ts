import { type Fighter, MoveState, type World } from '../world/types';
import { difficultyOf, livingHeroes, profileOf } from './data';
import { usage } from './director';
import { isBoss } from './boss';

/**
 * Role-Aware Target Scoring with Commitment (F&D §8). Each enemy scores the valid heroes
 * at a fixed interval (staggered by id) using distance, its tactical role, the current
 * pressure distribution, recent interactions and its weapon; a hero at the pressure cap is
 * strongly penalized, never forbidden. The pick is kept for a commitment period and never
 * switches during a committed attack unless the target becomes invalid. Lower is better;
 * ties go to the lower hero id.
 */
export const TARGETING = {
  /** Frames between scoring passes. */
  interval: 15,
  /** Minimum commitment after a switch. */
  commit: 90,
  capPenalty: 3000,
  pressureWeight: 6,
  /** Bonus for the hero who hit this enemy recently (no forced retaliation). */
  recentBonus: 150,
  recentFrames: 120,
  /** Hysteresis for the current target. */
  keepBonus: 100,
  flankPenalty: 250,
  lanePenalty: 4,
} as const;

/** Is this hero a valid target (in the fight and inside the arena)? */
export function validTarget(world: World, h: Fighter): boolean {
  return h.team === 'hero' && !h.ko && h.state !== MoveState.Defeated;
}

/** Integer score (lower is better) of hero `h` for enemy `e`. */
export function scoreTarget(world: World, e: Fighter, h: Fighter): number {
  const prof = profileOf(e);
  const px = Math.abs(Math.trunc((h.x - e.x) / 256));
  const pz = Math.abs(Math.trunc((h.z - e.z) / 256));
  let score = px + 2 * pz;
  const cap = difficultyOf(world).cap;
  const pressure = usage(world).pressure.get(h.id) ?? 0;
  const own = e.threatTarget === h.id ? e.threat : 0;
  if (pressure - own >= cap) score += TARGETING.capPenalty;
  score += (pressure - own) * TARGETING.pressureWeight;
  switch (prof?.role) {
    case 'ranged':
      // Clear lanes: depth alignment matters more than distance.
      score = Math.abs(px - Math.trunc(prof.ring / 256)) + pz * TARGETING.lanePenalty;
      break;
    case 'flanker': {
      // Open approach angles: a hero whose far side is already covered is less attractive.
      const side = e.x < h.x ? -1 : 1;
      const covered = world.bodies.some(
        (o) => o.team === 'enemy' && o.id !== e.id && !o.ko && (o.x < h.x ? -1 : 1) !== side,
      );
      if (!covered) score += TARGETING.flankPenalty;
      break;
    }
    default:
      break;
  }
  if (e.lastHitBy === h.id && world.frame - e.lastHitFrame < TARGETING.recentFrames)
    score -= TARGETING.recentBonus;
  if (e.targetId === h.id) score -= TARGETING.keepBonus;
  if (isBoss(world, e)) score -= 0;
  return score;
}

/** Updates the enemy's target (targetId) on its scoring frame. */
export function updateTarget(world: World, e: Fighter): Fighter | null {
  const current = world.bodies.find((b) => b.id === e.targetId);
  const valid = current && validTarget(world, current) ? current : null;
  const busy = e.state === MoveState.Attack || e.state === MoveState.Grabbing || e.threat > 0;
  const due = (world.frame + e.id) % TARGETING.interval === 0;
  if (valid && (busy || world.frame < e.commitUntil || !due)) return valid;
  let best: Fighter | null = null;
  let bestScore = 0;
  for (const h of livingHeroes(world).sort((a, b) => a.id - b.id)) {
    const s = scoreTarget(world, e, h);
    if (best === null || s < bestScore) {
      best = h;
      bestScore = s;
    }
  }
  if (best && best.id !== e.targetId) {
    e.targetId = best.id;
    e.commitUntil = world.frame + TARGETING.commit;
  }
  return best;
}
