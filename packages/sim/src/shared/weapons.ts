/**
 * M24 heavy weapons, blast throwables and carried provisions (E9, E13).
 * - `restrict`: a held heavy weapon refuses jumps and grabs and slows walking.
 * - `heat`: each shot adds heat; at the limit the weapon locks until it has cooled to 0.
 * - `blast`: a thrown blast item lands, shows its area for `fuse` frames, then knocks back,
 *   briefly stuns and costs Defense. No friendly fire; never noncombatants or protected states.
 * - `provision`: a carried food item is eaten on demand (Interact + Up) instead of on touch;
 *   in a stage run it is eaten by walking over it (M28, `walkOverFood`).
 */
import { type Fighter, type Item, ItemState, MoveState, type World } from '../world/types';
import { Reject, type WeaponDef } from '../combat/types';
import { WEAPONS } from '../combat/armory';
import { enter } from '../combat/reactions';
import { METER } from '../combat/meter';
import { dealDamage, nonCombatant } from '../combat/damage';
import { SharedEvent, ensureShared, extOf, sharedLog } from './state';
import { untargetable } from './fighters';
import { mounted, riderImpact } from './riders';

function held(world: World, f: Fighter): { item: Item; def: WeaponDef } | null {
  if (f.item === 0) return null;
  const item = world.items.find((i) => i.id === f.item);
  const def = item ? WEAPONS[item.def] : undefined;
  return item && def ? { item, def } : null;
}

/** The held weapon refuses jumping. */
export function jumpRestricted(world: World, f: Fighter): boolean {
  return held(world, f)?.def.restrict.jump ?? false;
}

/** Walking speed percent while holding the current weapon (100 = unchanged). */
export function heldSpeed(world: World, f: Fighter): number {
  return held(world, f)?.def.restrict.speed ?? 100;
}

/**
 * Gate for a starting action while holding `def`: a restricted grab is refused; a heat-limited
 * shot is refused while locked, and otherwise adds its heat (the limit locks the weapon).
 */
export function heavyGate(
  world: World,
  f: Fighter,
  def: WeaponDef,
  category: string,
  ammo: number,
): number {
  if (def.restrict.grab && (category === 'grab' || category === 'team')) return Reject.Restricted;
  if (!def.heat || ammo <= 0) return Reject.None;
  const e = extOf(world, f);
  if (e.heatLock > 0) return Reject.Overheated;
  e.heat += def.heat.per;
  if (e.heat >= def.heat.max) {
    e.heat = def.heat.max;
    e.heatLock = 1;
    sharedLog(world, SharedEvent.HeatLock, f.id);
  }
  return Reject.None;
}

/** A thrown blast item touched down: it rests (not takeable) and its fuse runs. */
export function armBlast(world: World, item: Item, def: WeaponDef): void {
  ensureShared(world);
  item.fuseAt = world.frame + (def.blast?.fuse ?? 0);
}

/** The fuse ran out: the blast resolves and the item is used up. */
export function detonate(world: World, item: Item): void {
  const def = WEAPONS[item.def];
  const b = def?.blast;
  item.state = ItemState.Gone;
  if (!b) return;
  const thrower = world.bodies.find((f) => f.id === (item.owner || item.lastHolder));
  const team = thrower?.team ?? 'hero';
  sharedLog(world, SharedEvent.Blast, item.id, thrower?.id ?? 0);
  for (const t of [...world.bodies].sort((p, q) => p.id - q.id)) {
    if (t.team === team || t.ko || nonCombatant(t) || untargetable(t)) continue;
    if (t.protectedRecovery || t.cinematic) continue;
    if (Math.abs(t.x - item.x) > b.hw || Math.abs(t.z - item.z) > b.hd) continue;
    if (mounted(t)) {
      riderImpact(world, t, b.damage, item.x);
      continue;
    }
    dealDamage(world, t, b.damage);
    if (!world.infiniteDefense || t.team !== 'hero') t.defense = Math.max(0, t.defense - b.defense);
    t.action = -1;
    t.attackKind = 0;
    enter(t, MoveState.Hitstun, b.stun);
    t.vx = (t.x >= item.x ? 1 : -1) * b.push;
  }
}

/**
 * Eats the held provision: Health, Defense and Attack meter rise by its amounts (capped);
 * the hero is busy for its eating frames. Returns false when the held item is no provision.
 */
export function eatProvision(world: World, f: Fighter): boolean {
  const h = held(world, f);
  const p = h?.def.provision;
  if (!h || !p) return false;
  feed(f, p);
  h.item.state = ItemState.Gone;
  h.item.holder = 0;
  f.item = 0;
  f.wkit = -1;
  enter(f, MoveState.Pickup, p.eat);
  f.action = -1;
  f.vx = 0;
  f.vz = 0;
  sharedLog(world, SharedEvent.Eat, f.id, h.item.def);
  return true;
}

type Provision = NonNullable<WeaponDef['provision']>;

function feed(f: Fighter, p: Provision): void {
  f.health = Math.min(f.maxHealth, f.health + p.health);
  f.defense = Math.min(100, f.defense + p.defense);
  f.meter = Math.min(METER.max, f.meter + p.meter * METER.unit);
}

/** Would eating `p` raise anything of `f`'s? (Stage 1 and 2 food waits for a hurt hero too.) */
function wants(f: Fighter, p: Provision): boolean {
  return (
    (p.health > 0 && f.health < f.maxHealth) ||
    (p.defense > 0 && f.defense < 100) ||
    (p.meter > 0 && f.meter < METER.max)
  );
}

/**
 * Stage 3 food in a stage run is eaten by walking over it, as the Stage 1 and 2 food is
 * (Guo 2026-11-25): a standing hero in pickup reach who would gain from it eats it at once,
 * without the Interact key and without stopping. Returns how many were eaten.
 */
export function walkOverFood(world: World, reachX: number, reachZ: number): number {
  let eaten = 0;
  for (const item of world.items) {
    if (item.state !== ItemState.Ground || item.fuseAt !== undefined) continue;
    const p = WEAPONS[item.def]?.provision;
    if (!p) continue;
    let best: Fighter | null = null;
    let bestD = 0;
    for (const f of world.bodies) {
      if (f.team !== 'hero' || f.health <= 0 || f.y > 0 || !wants(f, p)) continue;
      const dx = Math.abs(item.x - f.x);
      const dz = Math.abs(item.z - f.z);
      if (dx > reachX || dz > reachZ) continue;
      if (item.reserveFor !== 0 && item.reserveFor !== f.id && world.frame < item.reserveUntil)
        continue;
      // Nearest first; the lower id breaks a tie (never input order).
      if (best === null || dx + dz < bestD || (dx + dz === bestD && f.id < best.id)) {
        best = f;
        bestD = dx + dz;
      }
    }
    if (!best) continue;
    feed(best, p);
    item.state = ItemState.Gone;
    item.holder = 0;
    sharedLog(world, SharedEvent.Eat, best.id, item.def);
    eaten += 1;
  }
  return eaten;
}
