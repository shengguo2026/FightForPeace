import { fx } from '../math/fixed';
import {
  DefEvent,
  EnvEvent,
  type Fighter,
  Flight,
  type FrameInput,
  type Item,
  ItemState,
  MoveState,
  type World,
  WeaponEvent,
} from '../world/types';
import { WEAPONS } from './armory';
import { selectAction, startAction } from './actions';
import {
  DEFENSE,
  type DefenseSnapshot,
  addDefense,
  inArc,
  logDefense,
  normalGuard,
} from './defense';
import { addBreakPower, correctedRest, hazardAt, solidAt, validRest } from './environment';
import {
  ITEM,
  claim,
  heldDef,
  heldItem,
  isWeaponAction,
  letGo,
  logWeapon,
  payIntegrity,
} from './held';
import { type Box, type HitSource, applyHit, canHit, hurtbox, runningAction } from './hits';
import { NO_FRAME, enter } from './reactions';
import { routeAction, routeCodeOf } from './roster';
import { type ActionDef, Dir } from './types';
import { BreakState, HazardPhase } from '../world/types';

/**
 * Weapon lifecycle (spec §11.1, F&D §7.1): explicit pickup with deterministic
 * arbitration, throws with Tagged Projectile-Response Profiles, Tagged Impact Disarming,
 * Natural Landing with Deterministic Safety Correction, Short Reclaim Priority and the
 * Dramatic but Mechanically Safe Break.
 */

const DEFLECT_SPEED = fx(2);
const DEFLECT_LIFT = fx(5);
const DROP_LIFT = fx(6);
const DROP_SPEED = fx(3);

interface PickupRequest {
  fighter: Fighter;
  item: Item;
}

/** Same-frame pickup requests, resolved after every fighter has stepped (never persisted). */
const requests = new WeakMap<World, PickupRequest[]>();

/** Can `f` take this resting item now (neutral, or reserved for `f`)? */
export function pickupEligible(world: World, f: Fighter, item: Item): boolean {
  if (item.state !== ItemState.Ground) return false;
  return item.reserveFor === 0 || item.reserveFor === f.id || world.frame >= item.reserveUntil;
}

/** The resting item nearest to `f` inside the pickup reach that `f` may take, if any. */
export function itemInReach(world: World, f: Fighter): Item | null {
  let best: Item | null = null;
  let bestD = 0;
  for (const item of world.items) {
    if (!pickupEligible(world, f, item)) continue;
    const dx = item.x - f.x;
    const dz = item.z - f.z;
    if (Math.abs(dx) > ITEM.reachX || Math.abs(dz) > ITEM.reachZ) continue;
    const d = Math.abs(dx) + Math.abs(dz);
    if (best === null || d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

/**
 * Interact with empty hands next to a resting weapon: a pickup request. The fighter
 * starts the pickup at once; same-frame competitors are resolved afterwards and the
 * loser returns to neutral without any ownership transfer. Returns false when nothing
 * in reach may be taken.
 */
export function requestPickup(world: World, f: Fighter): boolean {
  const item = itemInReach(world, f);
  if (!item) return false;
  const list = requests.get(world) ?? [];
  list.push({ fighter: f, item });
  requests.set(world, list);
  enter(f, MoveState.Pickup, WEAPONS[item.def]!.pickup);
  f.action = -1;
  f.vx = 0;
  f.vz = 0;
  if (item.x !== f.x) f.facing = item.x > f.x ? 1 : -1;
  return true;
}

/**
 * Deterministic pickup arbitration (F&D §7.1): eligibility (the reserved former holder
 * first), then distance, then depth alignment, then a frame-parity tie-break. Player
 * number and packet order never decide.
 */
export function resolvePickups(world: World): void {
  const list = requests.get(world);
  if (!list || list.length === 0) return;
  requests.set(world, []);
  const byItem = new Map<number, PickupRequest[]>();
  for (const r of list) byItem.set(r.item.id, [...(byItem.get(r.item.id) ?? []), r]);
  for (const id of [...byItem.keys()].sort((a, b) => a - b)) {
    const group = byItem.get(id)!;
    const item = group[0]!.item;
    const score = (r: PickupRequest) => {
      const f = r.fighter;
      const reserved = item.reserveFor === f.id && world.frame < item.reserveUntil ? 0 : 1;
      return [reserved, Math.abs(item.x - f.x) + Math.abs(item.z - f.z), Math.abs(item.z - f.z)];
    };
    const parity = world.frame % 2 === 0 ? 1 : -1;
    group.sort((p, q) => {
      const a = score(p);
      const b = score(q);
      for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i]! - b[i]!;
      return parity * (p.fighter.id - q.fighter.id);
    });
    const [win, ...lose] = group;
    const reclaim = item.reserveFor === win!.fighter.id && world.frame < item.reserveUntil;
    claim(world, win!.fighter, item);
    logWeapon(world, win!.fighter, reclaim ? WeaponEvent.Reclaim : WeaponEvent.Pickup, item.id);
    for (const r of lose) {
      enter(r.fighter, MoveState.Idle, 0);
      logWeapon(world, r.fighter, WeaponEvent.Contested, item.id);
    }
  }
}

/** One frame of a pickup: the item is already in hand; the fighter is busy until it ends. */
export function stepPickup(f: Fighter): boolean {
  f.stateFrame += 1;
  if (f.stateFrame < f.stun) return true;
  enter(f, MoveState.Idle, 0);
  return false;
}

/**
 * Interact while holding: `Down` discards the weapon at the fighter's feet; otherwise the
 * weapon's throw, forward or in the pressed horizontal direction.
 */
export function weaponInteract(world: World, f: Fighter, input: FrameInput): void {
  const item = heldItem(world, f);
  if (!item) return;
  if (input.moveZ > 0 && input.moveX === 0) {
    letGo(f, item);
    item.flight = Flight.Drop;
    item.x = f.x;
    item.z = f.z;
    item.y = fx(60);
    item.vx = f.facing * fx(1);
    item.vy = fx(2);
    logWeapon(world, f, WeaponEvent.Discard, item.id);
    return;
  }
  if (input.moveX !== 0) f.facing = input.moveX;
  const index = selectAction(f, 'weaponThrow', Dir.Neutral);
  if (index >= 0) startAction(f, index);
}

function itemBox(item: Item, a: ActionDef): Box {
  const hw = Math.trunc(a.hitbox.w / 2);
  return {
    x0: item.x - hw,
    x1: item.x + hw,
    y0: item.y,
    y1: item.y + a.hitbox.h,
    z: item.z,
    depth: a.hitbox.depth,
  };
}

function boxesMeet(a: Box, b: Box): boolean {
  return (
    a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && Math.abs(a.z - b.z) <= a.depth + b.depth
  );
}

function byId(world: World, id: number): Fighter | undefined {
  return world.bodies.find((b) => b.id === id);
}

/** Breaks an item (event `weaponBreak`); its fragments are cosmetic. */
function breakItem(world: World, item: Item, detail: number): void {
  const holder = byId(world, item.holder || item.lastHolder);
  if (item.holder) {
    const f = byId(world, item.holder);
    if (f) {
      f.item = 0;
      f.breakPending = false;
      if (!(f.state === MoveState.Attack && isWeaponAction(f))) f.wkit = -1;
    }
  }
  item.state = ItemState.Gone;
  item.holder = 0;
  logWeapon(world, holder, WeaponEvent.Break, detail);
}

/** Releases the held weapon as a thrown attack on the throw action's first active frame. */
function release(world: World, f: Fighter, item: Item, a: ActionDef): void {
  const def = WEAPONS[item.def]!;
  letGo(f, item);
  item.flight = Flight.Throw;
  item.owner = f.id;
  item.code = routeCodeOf(f);
  item.x = f.x + f.facing * fx(40);
  item.z = f.z;
  item.y = f.y + a.hitbox.y;
  item.vx = f.facing * def.throw.speed;
  item.vy = def.throw.lift;
  // A recoverable weapon pays its throw cost now; if that empties it, it breaks only
  // after this throw's collision or landing has resolved.
  item.integrity = Math.max(0, item.integrity - def.integrity.throw);
  item.breakOnImpact = item.integrity === 0;
  logWeapon(world, f, WeaponEvent.Throw, item.id);
}

/** Rests an item where it is: a pickup again, reserved for its holder after a disarm. */
function rest(world: World, item: Item): void {
  item.state = ItemState.Ground;
  item.y = 0;
  item.vx = 0;
  item.vy = 0;
  item.flight = Flight.Drop;
  item.owner = 0;
  item.hitIds = [];
  if (item.disarmed) {
    // The 45-frame reclaim window starts only once the weapon rests.
    item.reserveFor = item.lastHolder;
    item.reserveUntil = world.frame + ITEM.reclaim;
  } else {
    item.reserveFor = 0;
    item.reserveUntil = 0;
  }
  item.disarmed = false;
}

/**
 * Touchdown: a throw that emptied integrity breaks here; light debris is consumed; a
 * destructive active hazard may destroy a destructible weapon. Otherwise the natural
 * position is kept when legal, or the first legal correction (or the anchor) is chosen.
 */
function land(world: World, item: Item): void {
  const def = WEAPONS[item.def]!;
  item.y = 0;
  item.vy = 0;
  if (item.breakOnImpact) return breakItem(world, item, 1);
  if (def.throw.consumed && item.flight !== Flight.Drop) return breakItem(world, item, 1);
  const zone = hazardAt(world, { x: item.x, z: item.z, hw: ITEM.halfW, hd: ITEM.halfD });
  if (zone && zone.phase === HazardPhase.Active && def.hazardDestructible)
    return breakItem(world, item, 2);
  if (validRest(world, item.x, item.z)) return rest(world, item);
  const c = correctedRest(world, item.x, item.z);
  item.state = ItemState.Settling;
  item.settleLeft = ITEM.settle;
  item.settleX = c ? c.x : item.anchorX;
  item.settleZ = c ? c.z : item.anchorZ;
  item.vx = 0;
  const log = world.environment.log;
  world.environment.log = {
    ...log,
    kind: EnvEvent.Corrected,
    frame: world.frame,
    target: item.id,
    prop: 0,
    force: 0,
    damage: 0,
    detail: c ? 0 : 1,
  };
}

/** Flying items bounce off stage edges and solid scenery (damaging flights stop damaging). */
function bounceOff(world: World, item: Item): void {
  const { minX, maxX } = world.bounds;
  let hit = false;
  if (item.x < minX || item.x > maxX) {
    item.x = item.x < minX ? minX : maxX;
    hit = true;
  }
  const solid = solidAt(world, { x: item.x, z: item.z, hw: ITEM.halfW, hd: ITEM.halfD }, item.y);
  if (solid) {
    const damaging = item.flight === Flight.Throw || item.flight === Flight.Returned;
    const board = world.environment.breakables.find((b) => b === solid);
    if (damaging && board && board.state !== BreakState.Broken) {
      const a = routeAction(item.code);
      addBreakPower(world, board.id, a?.breakPower ?? 0, item.id);
    }
    item.x -= item.vx;
    hit = true;
  }
  if (!hit) return;
  item.vx = -Math.trunc(item.vx / 4);
  if (item.flight === Flight.Throw || item.flight === Flight.Returned) {
    item.flight = Flight.Drop;
    if (item.breakOnImpact) breakItem(world, item, 1);
  }
}

/**
 * Item pass, after every fighter stepped: pickups, held items following their holders,
 * throw releases, flight, landing, settling, reclaim expiry, and deferred breaks.
 */
export function stepItems(world: World): void {
  resolvePickups(world);
  for (const f of [...world.bodies].sort((a, b) => a.id - b.id)) {
    const item = heldItem(world, f);
    const a = runningAction(f);
    if (item && a?.category === 'weaponThrow' && f.stateFrame + 1 === a.startup + 1)
      release(world, f, item, a);
    // The emptying action has resolved: the weapon breaks now, never mid-attack.
    if (f.breakPending && !(f.state === MoveState.Attack && isWeaponAction(f))) {
      const held = heldItem(world, f);
      if (held) breakItem(world, held, 0);
      f.breakPending = false;
    }
    if (f.item === 0 && f.wkit >= 0 && !(f.state === MoveState.Attack && isWeaponAction(f)))
      f.wkit = -1;
  }
  for (const item of world.items) {
    switch (item.state) {
      case ItemState.Held: {
        const h = byId(world, item.holder);
        if (!h || h.item !== item.id) {
          // Safety: an orphaned item drops where it is.
          item.state = ItemState.Flying;
          item.flight = Flight.Drop;
          item.holder = 0;
          break;
        }
        item.x = h.x;
        item.z = h.z;
        item.y = h.y + ITEM.carryY;
        break;
      }
      case ItemState.Flying:
        item.x += item.vx;
        item.y += item.vy;
        item.vy -= ITEM.gravity;
        bounceOff(world, item);
        if (item.state === ItemState.Flying && item.y <= 0) land(world, item);
        break;
      case ItemState.Settling:
        item.x += Math.trunc((item.settleX - item.x) / item.settleLeft);
        item.z += Math.trunc((item.settleZ - item.z) / item.settleLeft);
        item.settleLeft -= 1;
        if (item.settleLeft <= 0) {
          item.x = item.settleX;
          item.z = item.settleZ;
          rest(world, item);
        }
        break;
      case ItemState.Ground:
        if (item.reserveFor !== 0) {
          const owner = byId(world, item.reserveFor);
          // The reservation ends at once if the former holder is gone or defeated.
          if (!owner || owner.health <= 0 || world.frame >= item.reserveUntil) {
            item.reserveFor = 0;
            item.reserveUntil = 0;
          }
        }
        break;
      default:
        break;
    }
  }
  world.items = world.items.filter((i) => i.state !== ItemState.Gone);
}

/**
 * Tagged Impact Disarming: the hit's disarmPower meets the held weapon's grip resistance.
 * Depletion beats disarm: an empty weapon breaks instead of dropping. The weapon flies
 * clear of the holder and is reserved for it once it rests.
 */
export function tryDisarm(world: World, att: Fighter, a: ActionDef, t: Fighter): void {
  if (a.disarmPower <= 0) return;
  const item = heldItem(world, t);
  const def = heldDef(world, t);
  if (!item || !def || a.disarmPower < def.gripResistance) return;
  if (item.integrity === 0) {
    breakItem(world, item, 0);
    return;
  }
  const dir = t.x === att.x ? att.facing : t.x > att.x ? 1 : -1;
  letGo(t, item);
  t.wkit = -1;
  item.flight = Flight.Drop;
  item.disarmed = true;
  item.lastHolder = t.id;
  item.x = t.x;
  item.z = t.z;
  item.y = t.y + ITEM.carryY;
  item.vx = dir * DROP_SPEED;
  item.vy = DROP_LIFT;
  logWeapon(world, t, WeaponEvent.Disarmed, item.id);
  logWeapon(world, att, WeaponEvent.Disarm, item.id);
}

/** Integrity paid by a weapon action's contact (hit or guarded; whiffs pay nothing). */
export function payContact(world: World, att: Fighter, guarded: boolean): void {
  if (!isWeaponAction(att)) return;
  const def = heldDef(world, att);
  if (def) payIntegrity(world, att, guarded ? def.integrity.guard : def.integrity.hit);
}

/** An attack tagged projectileDeflect strikes enemy thrown weapons aside. */
export function strikeItems(world: World, att: Fighter, a: ActionDef, box: Box): void {
  if (!a.tags.includes('projectileDeflect')) return;
  for (const item of world.items) {
    if (item.state !== ItemState.Flying) continue;
    if (item.flight !== Flight.Throw && item.flight !== Flight.Returned) continue;
    const owner = byId(world, item.owner);
    const ta = routeAction(item.code);
    if (!owner || owner.team === att.team || !ta || !WEAPONS[item.def]!.throw.strikeDeflectable)
      continue;
    if (!boxesMeet(box, itemBox(item, ta))) continue;
    item.flight = Flight.Deflected;
    item.owner = 0;
    item.vx = att.facing * DEFLECT_SPEED;
    item.vy = DEFLECT_LIFT;
    const def = heldDef(world, att);
    if (def && isWeaponAction(att)) payIntegrity(world, att, def.integrity.deflect);
    logWeapon(world, att, WeaponEvent.StruckAside, item.id);
  }
}

/**
 * Thrown-weapon hits, after strikes and projectiles: each damaging flight meets the first
 * target it overlaps (ascending id) once. Heroes defend with their same-frame snapshot.
 */
export function hitItems(
  world: World,
  bodies: readonly Fighter[],
  snaps: Map<number, DefenseSnapshot>,
): void {
  for (const item of world.items) {
    if (item.state !== ItemState.Flying) continue;
    if (item.flight !== Flight.Throw && item.flight !== Flight.Returned) continue;
    const owner = bodies.find((b) => b.id === item.owner);
    const a = routeAction(item.code);
    if (!owner || !a) {
      item.flight = Flight.Drop;
      continue;
    }
    const box = itemBox(item, a);
    for (const t of bodies) {
      if (t.id === owner.id || item.hitIds.includes(t.id) || !canHit(owner, a, t)) continue;
      if (!boxesMeet(box, hurtbox(t))) continue;
      item.hitIds.push(t.id);
      const snap = snaps.get(t.id);
      if (snap && defendItem(world, owner, a, item, t, snap)) break;
      const src: HitSource = {
        owner,
        x: item.x - item.vx,
        facing: item.vx >= 0 ? 1 : -1,
        vx: 0,
        contactIds: [],
        contactScales: [],
        code: item.code,
      };
      applyHit(world, src, a, 0, t);
      // The weapon drops after its one collision; an emptied one breaks there.
      item.flight = Flight.Drop;
      item.vx = -Math.trunc(item.vx / 4);
      item.vy = fx(4);
      if (item.breakOnImpact) breakItem(world, item, 1);
      break;
    }
  }
}

/**
 * Tagged Projectile-Response Profiles against a thrown weapon: a counter returns a
 * counterReturnable weapon as the defender's own attack; an Exact Block deflects it to a
 * safe neutral landing (no damage to the distant thrower); a normal guard blocks it.
 * Returns true when the defense handled the contact.
 */
function defendItem(
  world: World,
  owner: Fighter,
  a: ActionDef,
  item: Item,
  t: Fighter,
  s: DefenseSnapshot,
): boolean {
  const c = world.frame;
  const def = WEAPONS[item.def]!;
  const vx = item.x - item.vx - t.x;
  const vz = item.z - t.z;
  t.defIdle = 0;
  if (s.state === MoveState.Counter && t.state === MoveState.Counter) {
    if (!def.throw.counterReturnable) {
      logDefense(world, t, DefEvent.CounterUncounterable, c - s.counterFrame, owner);
      return false;
    }
    if (!inArc(s.counterX, s.counterZ, vx, vz)) {
      logDefense(world, t, DefEvent.CounterWrongDir, c - s.counterFrame, owner);
      return false;
    }
    addDefense(world, t, DEFENSE.counterReward);
    logDefense(world, t, DefEvent.Counter, c - s.counterFrame, owner);
    t.counterFrame = NO_FRAME;
    enter(t, MoveState.Idle, 0);
    // The returned weapon becomes the countering hero's attack against its thrower.
    item.flight = Flight.Returned;
    item.owner = t.id;
    item.vx = -item.vx;
    item.hitIds = [t.id];
    logWeapon(world, t, WeaponEvent.Return, item.id);
    return true;
  }
  const inGuardArc = inArc(s.guardX, s.guardZ, vx, vz);
  const raised = s.state === MoveState.Guard || s.state === MoveState.Blockstun;
  const sinceExact = c - s.exactFrame;
  if (
    raised &&
    inGuardArc &&
    def.throw.exactDeflectable &&
    sinceExact >= 0 &&
    sinceExact < DEFENSE.exactWindow
  ) {
    addDefense(world, t, DEFENSE.exactReward);
    t.exactFrame = NO_FRAME;
    logDefense(world, t, DefEvent.Exact, sinceExact, owner);
    item.flight = Flight.Deflected;
    item.owner = 0;
    item.vx = (item.vx > 0 ? -1 : 1) * DEFLECT_SPEED;
    item.vy = DEFLECT_LIFT;
    if (t.state === MoveState.Blockstun) enter(t, MoveState.Guard, 0);
    t.vx = 0;
    t.vz = 0;
    logWeapon(world, t, WeaponEvent.Deflect, item.id);
    return true;
  }
  if (s.guarding && inGuardArc && def.throw.blockable) {
    normalGuard(world, owner, a, t);
    item.flight = Flight.Drop;
    item.vx = -Math.trunc(item.vx / 5);
    item.vy = fx(3);
    logWeapon(world, t, WeaponEvent.Blocked, item.id);
    return true;
  }
  logDefense(world, t, s.guarding && !inGuardArc ? DefEvent.Behind : DefEvent.Hit, 0, owner);
  return false;
}

/** Lab: puts a fresh weapon in a fighter's hands (replacing nothing it already holds). */
export function armFighter(world: World, f: Fighter, weapon: number, spawn: (def: number) => Item): void {
  if (f.item !== 0) return;
  claim(world, f, spawn(weapon));
}
