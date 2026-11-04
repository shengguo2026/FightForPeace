import { fx } from '../math/fixed';
import { type Fighter, type World, WeaponEvent } from '../world/types';
import { heldDef, isWeaponAction, logWeapon, payIntegrity } from './held';
import { type Box, activeHitbox, runningAction } from './hits';
import { recoil } from './reactions';
import { activeSegment } from './roster';

/**
 * Tagged Clash Strength (F&D §7.1): two opposing active hitboxes that both carry a clash
 * strength meet before the hit pass. Equal strength: both recoil. Otherwise the stronger
 * action continues and the weaker recoils. Each pair of action instances clashes once, and
 * weapons on both sides pay their clash integrity cost.
 */

export const CLASH = {
  /** Recoil frames of a clash loser (both, on equal strength). */
  recoil: 16,
  recoilPush: fx(3),
} as const;

function meet(a: Box, b: Box): boolean {
  return (
    a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && Math.abs(a.z - b.z) <= a.depth + b.depth
  );
}

function spend(f: Fighter, id: number): void {
  const a = runningAction(f)!;
  const seg = activeSegment(a, f.stateFrame + 1);
  if (seg !== f.hitSeg) {
    f.hitSeg = seg;
    f.hitIds = [];
  }
  if (!f.hitIds.includes(id)) f.hitIds.push(id);
}

function pay(world: World, f: Fighter): void {
  if (!isWeaponAction(f)) return;
  const def = heldDef(world, f);
  if (def) payIntegrity(world, f, def.integrity.clash);
}

function knockBack(f: Fighter, other: Fighter): void {
  const away = f.x === other.x ? -f.facing : f.x > other.x ? 1 : -1;
  recoil(f, CLASH.recoil, away * CLASH.recoilPush);
}

export function resolveClashes(world: World): void {
  const bodies = [...world.bodies].sort((a, b) => a.id - b.id);
  for (let i = 0; i < bodies.length; i += 1) {
    const p = bodies[i]!;
    const pa = runningAction(p);
    if (!pa || pa.clash === 0) continue;
    for (let j = i + 1; j < bodies.length; j += 1) {
      const q = bodies[j]!;
      if (q.team === p.team || runningAction(p) !== pa) continue;
      const qa = runningAction(q);
      if (!qa || qa.clash === 0) continue;
      if (p.clashWith === q.id || q.clashWith === p.id) continue;
      const pb = activeHitbox(p);
      const qb = activeHitbox(q);
      if (!pb || !qb || !meet(pb, qb)) continue;
      p.clashWith = q.id;
      q.clashWith = p.id;
      // A clash spends each hitbox on the other; neither strikes the clashing body this segment.
      spend(p, q.id);
      spend(q, p.id);
      pay(world, p);
      pay(world, q);
      logWeapon(world, p, WeaponEvent.Clash, pa.clash * 4 + qa.clash);
      logWeapon(world, q, WeaponEvent.Clash, qa.clash * 4 + pa.clash);
      if (pa.clash <= qa.clash) knockBack(p, q);
      if (qa.clash <= pa.clash) knockBack(q, p);
    }
  }
}
