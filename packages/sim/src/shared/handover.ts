/**
 * M24 solo control hand-over and the co-op support role (E11, Stage 5 §9.2–§9.3).
 *
 * Hand-over: a stage swaps a slot's hero mid-run. Health, Defense and the Attack Bar map by
 * percentage of the new maximum and never rise; combo and temporary states clear; the held
 * weapon or provision goes into a single-use cache the new hero may claim once.
 *
 * Support role: in co-op one player can become a non-mobile supporter with authored
 * one-shot actions (Attack uses the next unused one). The supporter is out of the fight.
 */
import { fx } from '../math/fixed';
import { type Fighter, type FrameInput, ItemState, MoveState, type World } from '../world/types';
import { ActionBit } from '../input/bits';
import { WEAPONS } from '../combat/armory';
import { HEROES, heroIndex, kitOf } from '../combat/roster';
import { defaultLoadout } from '../combat/loadout';
import { claim, spawnItem } from '../combat/held';
import { enter, toActionable } from '../combat/reactions';
import { METER } from '../combat/meter';
import { nonCombatant } from '../combat/damage';
import { SharedEvent, ensureShared, extOf, sharedLog } from './state';

/** Maps `value` of `max` onto `nextMax` by percentage, never upwards. */
function mapped(value: number, max: number, nextMax: number): number {
  if (max <= 0) return Math.min(value, nextMax);
  return Math.min(value, Math.trunc((nextMax * value) / max));
}

/**
 * Hands the slot's control to hero `id`. Returns false when the slot has no hero or the
 * hero is unknown. Deterministic and checkpoint-safe (everything stays in the world).
 */
export function handOver(world: World, slot: number, id: string): boolean {
  const f = world.bodies.find((b) => b.team === 'hero' && b.slot === slot);
  const hero = heroIndex(id);
  if (!f || hero < 0 || !HEROES[hero]) return false;
  const s = ensureShared(world);
  // The held item moves into the slot's single-use cache.
  const held = f.item !== 0 ? world.items.find((i) => i.id === f.item) : undefined;
  if (held) {
    const def = WEAPONS[held.def];
    s.caches = s.caches.filter((c) => c.slot !== slot);
    s.caches.push({
      slot,
      weapon: def?.provision ? -1 : held.def,
      integrity: held.integrity,
      ammo: held.ammo,
      provision: def?.provision ? held.def : -1,
      claimed: false,
    });
    held.state = ItemState.Gone;
    held.holder = 0;
    world.items = world.items.filter((i) => i !== held);
    f.item = 0;
  }
  f.wkit = -1;
  f.breakPending = false;
  // Health, Defense and the Attack Bar map by percentage (the new maxima are the same today;
  // the mapping keeps a future hero with other maxima honest). Never upwards.
  const maxHealth = f.maxHealth;
  f.health = Math.max(1, mapped(f.health, maxHealth, f.maxHealth));
  f.defense = mapped(f.defense, 100, 100);
  f.meter = mapped(f.meter, METER.max, METER.max);
  // Combo and temporary states clear.
  f.action = -1;
  f.attackKind = 0;
  f.chainUsed = 0;
  f.ctx.open = false;
  toActionable(f);
  f.hero = hero;
  world.playerHero[slot] = hero;
  f.loadout = [...defaultLoadout(kitOf(f))];
  world.playerLoadout[slot] = [...f.loadout];
  sharedLog(world, SharedEvent.HandOver, f.id, hero);
  return true;
}

/** The slot's hero claims its cache (empty hands); returns whether something was taken. */
export function claimCache(world: World, slot: number): boolean {
  const s = world.shared;
  const f = world.bodies.find((b) => b.team === 'hero' && b.slot === slot);
  const c = s?.caches.find((x) => x.slot === slot && !x.claimed);
  if (!s || !f || !c || f.item !== 0) return false;
  const def = c.weapon >= 0 ? c.weapon : c.provision;
  if (def < 0) return false;
  const item = spawnItem(world, def, f.x, f.z);
  if (c.weapon >= 0) {
    item.integrity = c.integrity;
    item.ammo = c.ammo;
  }
  claim(world, f, item);
  c.claimed = true;
  sharedLog(world, SharedEvent.CacheClaim, f.id, def);
  return true;
}

/** The supporter's authored one-shot actions (placeholder set; a stage authors its own). */
export const SupportAction = { Heal: 0, Guard: 1, Delay: 2, Stagger: 3 } as const;
export const SUPPORT_ACTIONS = [
  SupportAction.Heal,
  SupportAction.Guard,
  SupportAction.Delay,
  SupportAction.Stagger,
] as const;
/** Heal: Health restored to the partner; Delay: frames the next wave waits. */
const SUPPORT = { heal: 60, delay: 300, stagger: 40, range: fx(500) };

/** Makes the slot's hero a non-mobile supporter with `count` one-shot actions. */
export function becomeSupporter(
  world: World,
  slot: number,
  count = SUPPORT_ACTIONS.length,
): boolean {
  const f = world.bodies.find((b) => b.team === 'hero' && b.slot === slot);
  if (!f) return false;
  const e = extOf(world, f);
  e.support = { used: 0, count: Math.min(count, SUPPORT_ACTIONS.length) };
  toActionable(f);
  sharedLog(world, SharedEvent.SupportAction, f.id, -1);
  return true;
}

/** A supporter is out of the fight. */
export function supporting(f: Fighter): boolean {
  return !!f.ext?.support;
}

/**
 * One frame of a supporter (instead of its movement): it stays put; Attack uses the next
 * unused action. Returns true for a supporter.
 */
export function stepSupporter(world: World, f: Fighter, input: FrameInput): boolean {
  const sup = f.ext?.support;
  if (!sup) return false;
  f.vx = 0;
  f.vz = 0;
  f.state = MoveState.Idle;
  if ((input.pressed & ActionBit.Attack) === 0) return true;
  let next = -1;
  for (let i = 0; i < sup.count; i += 1)
    if ((sup.used & (1 << i)) === 0) {
      next = i;
      break;
    }
  if (next < 0) {
    sharedLog(world, SharedEvent.Refused, f.id);
    return true;
  }
  sup.used |= 1 << next;
  const kind = SUPPORT_ACTIONS[next]!;
  const partner = world.bodies.find((b) => b.team === 'hero' && b.id !== f.id && !b.ko);
  if (kind === SupportAction.Heal && partner)
    partner.health = Math.min(partner.maxHealth, partner.health + SUPPORT.heal);
  else if (kind === SupportAction.Guard && partner) partner.defense = 100;
  else if (kind === SupportAction.Delay) {
    const s = ensureShared(world);
    s.delayUntil = Math.max(s.delayUntil, world.frame + SUPPORT.delay);
  } else if (kind === SupportAction.Stagger) {
    for (const t of world.bodies) {
      if (t.team !== 'enemy' || t.ko || nonCombatant(t) || t.protectedRecovery) continue;
      if (Math.abs(t.x - (partner ?? f).x) > SUPPORT.range) continue;
      t.action = -1;
      t.attackKind = 0;
      enter(t, MoveState.Hitstun, SUPPORT.stagger);
    }
  }
  sharedLog(world, SharedEvent.SupportAction, f.id, kind);
  return true;
}
