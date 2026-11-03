import type { Fighter, Projectile, World } from '../world/types';
import { applyHit, canHit, hurtbox, runningAction, type HitSource } from './hits';
import { routeAction, routeCode } from './roster';

/**
 * Projectiles (Current Crescent): an action with `projectile` data launches one on its
 * first active frame, using its hitbox as the projectile's box. One per owner: a new one
 * replaces the old safely (no hit). A projectile hits one enemy once, then disappears.
 */
export function stepProjectiles(world: World): void {
  for (const f of world.bodies) {
    const a = runningAction(f);
    if (!a?.projectile || f.stateFrame + 1 !== a.startup + 1) continue;
    const hb = a.hitbox;
    const p: Projectile = {
      owner: f.id,
      code: routeCode(f.team, f.hero, f.action),
      x: f.x + f.facing * (hb.x + Math.trunc(hb.w / 2)),
      z: f.z,
      y: f.y + hb.y,
      vx: f.facing * a.projectile.speed,
      life: a.projectile.life,
      hw: Math.trunc(hb.w / 2),
      h: hb.h,
      depth: hb.depth,
    };
    world.projectiles = world.projectiles.filter((q) => q.owner !== f.id);
    world.projectiles.push(p);
    world.projectiles.sort((x, y) => x.owner - y.owner);
  }
  const { minX, maxX } = world.bounds;
  for (const p of world.projectiles) {
    p.x += p.vx;
    p.life -= 1;
  }
  world.projectiles = world.projectiles.filter((p) => p.life > 0 && p.x >= minX && p.x <= maxX);
}

/** Projectile hits, after the fighters' own strikes: targets in ascending id order. */
export function hitProjectiles(world: World, bodies: readonly Fighter[]): void {
  const spent = new Set<number>();
  for (const p of world.projectiles) {
    const owner = bodies.find((b) => b.id === p.owner);
    const a = routeAction(p.code);
    if (!owner || !a) {
      spent.add(p.owner);
      continue;
    }
    for (const t of bodies) {
      if (!canHit(owner, a, t)) continue;
      const hb = hurtbox(t);
      const inside =
        p.x - p.hw < hb.x1 &&
        hb.x0 < p.x + p.hw &&
        p.y < hb.y1 &&
        hb.y0 < p.y + p.h &&
        Math.abs(p.z - hb.z) <= p.depth + hb.depth;
      if (!inside) continue;
      const src: HitSource = {
        owner,
        x: p.x - p.vx,
        facing: p.vx >= 0 ? 1 : -1,
        vx: 0,
        contactIds: [],
        contactScales: [],
        code: p.code,
      };
      applyHit(world, src, a, 0, t);
      spent.add(p.owner);
      break;
    }
  }
  if (spent.size > 0) world.projectiles = world.projectiles.filter((p) => !spent.has(p.owner));
}
