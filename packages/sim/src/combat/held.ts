import { fx } from '../math/fixed';
import {
  type Fighter,
  Flight,
  type Item,
  ItemState,
  MoveState,
  type World,
} from '../world/types';
import { WEAPONS } from './armory';
import { baseKit } from './roster';
import { Reject, type WeaponDef } from './types';
import { kitOf } from './roster';

/**
 * Held-weapon state shared by the item lifecycle, hits, defense and the environment
 * (F&D §7.1). This module only reads and writes state; it decides nothing about collisions.
 */

/** Weapon condition shown to players (Layered Information Display). Numbers are encoded. */
export const Condition = { Ready: 0, Worn: 1, Critical: 2 } as const;

/** Item constants (candidates). */
export const ITEM = {
  /** Gravity on flying items, per frame. */
  gravity: fx(0.25),
  /** Height a held item rides at, and where a throw or a drop starts. */
  carryY: fx(110),
  /** Pickup reach from the fighter's centre. */
  reachX: fx(80),
  reachZ: fx(40),
  /** Short Reclaim Priority after a disarmed weapon rests. */
  reclaim: 45,
  /** Settling frames of a landing correction. */
  settle: 10,
  /** Floor footprint used for landing validation. */
  halfW: fx(30),
  halfD: fx(10),
} as const;

export function itemById(world: World, id: number): Item | undefined {
  return id === 0 ? undefined : world.items.find((i) => i.id === id);
}

export function heldItem(world: World, f: Fighter): Item | undefined {
  return itemById(world, f.item);
}

export function weaponDef(index: number): WeaponDef | undefined {
  return WEAPONS[index];
}

export function heldDef(world: World, f: Fighter): WeaponDef | undefined {
  const item = heldItem(world, f);
  return item ? WEAPONS[item.def] : undefined;
}

/** Is this action index one of the weapon's (not the fighter's own kit)? */
export function isWeaponAction(f: Fighter, index = f.action): boolean {
  if (f.wkit < 0 || index < 0) return false;
  return index >= (baseKit(f)?.actions.length ?? 0);
}

export function conditionOf(def: WeaponDef, integrity: number): number {
  if (integrity <= def.integrity.critical) return Condition.Critical;
  if (integrity <= def.integrity.worn) return Condition.Worn;
  return Condition.Ready;
}

/** A normal guard's Defense cost, scaled by a held guard-modifier item. */
export function guardCostFor(world: World, f: Fighter, cost: number): number {
  const def = heldDef(world, f);
  return def ? Math.trunc((cost * def.guardCostPercent) / 100) : cost;
}

export function logWeapon(world: World, f: Fighter | undefined, event: number, detail = 0): void {
  if (!f) return;
  f.weaponEvent = event;
  f.weaponDetail = detail;
  f.weaponFrame = world.frame;
}

/**
 * Pays authored integrity for the held weapon. Integrity never silently changes damage;
 * reaching zero only marks the weapon to break once the current action has resolved.
 */
export function payIntegrity(world: World, f: Fighter, amount: number): void {
  const item = heldItem(world, f);
  if (!item || amount <= 0) return;
  item.integrity = Math.max(0, item.integrity - amount);
  if (item.integrity === 0) f.breakPending = true;
}

/** A fresh item of weapon `def` resting at (x, z), which is also its recovery anchor. */
export function spawnItem(world: World, def: number, x: number, z: number): Item {
  const w = WEAPONS[def]!;
  const item: Item = {
    id: world.nextItem,
    def,
    state: ItemState.Ground,
    x,
    z,
    y: 0,
    vx: 0,
    vy: 0,
    integrity: w.integrity.max,
    ammo: w.ammo,
    holder: 0,
    lastHolder: 0,
    owner: 0,
    code: 0,
    flight: Flight.Drop,
    breakOnImpact: false,
    disarmed: false,
    hitIds: [],
    reserveFor: 0,
    reserveUntil: 0,
    settleX: x,
    settleZ: z,
    settleLeft: 0,
    anchorX: x,
    anchorZ: z,
  };
  world.nextItem += 1;
  world.items.push(item);
  world.items.sort((a, b) => a.id - b.id);
  return item;
}

/** Puts an item into a fighter's hands (pickup, or the Lab arming a dummy). */
export function claim(world: World, f: Fighter, item: Item): void {
  item.state = ItemState.Held;
  item.holder = f.id;
  item.lastHolder = f.id;
  item.reserveFor = 0;
  item.reserveUntil = 0;
  item.vx = 0;
  item.vy = 0;
  f.item = item.id;
  f.wkit = item.def;
  f.breakPending = item.integrity === 0;
}

/**
 * The held item leaves the hand (throw, drop, disarm). The armed kit stays while a
 * weapon action is still running (the final action resolves); otherwise it ends now.
 */
export function letGo(f: Fighter, item: Item): void {
  item.holder = 0;
  item.state = ItemState.Flying;
  item.hitIds = [];
  f.item = 0;
  f.breakPending = false;
  if (!(f.state === MoveState.Attack && isWeaponAction(f))) f.wkit = -1;
}

/**
 * Weapon guardrails at action start: a two-handed weapon blocks the hero's Specials and
 * Ultimates unless the move is marked `armed: unchanged`; `armed: unavailable` moves need
 * empty hands; a finite-ammo action needs (and spends) its rounds. Returns Reject.None
 * when the action may start.
 */
export function weaponGate(world: World, f: Fighter, index: number): number {
  const a = kitOf(f)?.actions[index];
  const item = heldItem(world, f);
  if (!a || !item) return Reject.None;
  const def = WEAPONS[item.def]!;
  if (!isWeaponAction(f, index)) {
    const loadout = a.category === 'special' || a.category === 'ultimate';
    if (a.armed === 'unavailable') return Reject.HandsFull;
    if (loadout && def.hands === 2 && a.armed !== 'unchanged') return Reject.HandsFull;
    return Reject.None;
  }
  if (a.ammo > 0) {
    if (item.ammo < a.ammo) return Reject.NoAmmo;
    item.ammo -= a.ammo;
  }
  return Reject.None;
}
