import { fx } from '../math/fixed';
import { type Fighter, MoveState } from '../world/types';

/** Candidate Ground-Opportunity Focus range (F&D §6.2): in front of the hero, near its depth. */
export const GROUND_FOCUS = { rangeX: fx(180), rangeZ: fx(32) } as const;

/** A downed target whose ground window is open and whose route can still be used. */
export function groundMarked(t: Fighter): boolean {
  return (
    t.state === MoveState.Down &&
    t.groundWindow > 0 &&
    !t.protectedRecovery &&
    t.ctx.open &&
    !t.ctx.groundFinUsed
  );
}

/**
 * Ground-Opportunity Focus: the marked target a grounded hero is close to and facing, or
 * null. Nearest wins, then the lower id. Moving out of range or facing away releases it.
 */
export function groundFocus(bodies: readonly Fighter[], f: Fighter): Fighter | null {
  if (f.y > 0 || f.state === MoveState.Air) return null;
  let best: Fighter | null = null;
  let bestD = 0;
  for (const t of bodies) {
    if (t.team === f.team || !groundMarked(t)) continue;
    const dx = t.x - f.x;
    const dz = t.z - f.z;
    if (dx !== 0 && (dx > 0 ? 1 : -1) !== f.facing) continue;
    if (Math.abs(dx) > GROUND_FOCUS.rangeX || Math.abs(dz) > GROUND_FOCUS.rangeZ) continue;
    const d = dx * dx + dz * dz;
    if (best === null || d < bestD || (d === bestD && t.id < best.id)) {
      best = t;
      bestD = d;
    }
  }
  return best;
}
