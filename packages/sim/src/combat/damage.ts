import { type Fighter, MoveState, type World } from '../world/types';
import { profileOf } from '../enemies/data';

/**
 * Fighters out of the fight (F&D §8, spec D.4): fleeing, surrendered and defeated
 * characters are never legal targets; a boss in its phase transition is protected.
 */
export function nonCombatant(f: Fighter): boolean {
  return (
    f.state === MoveState.Flee ||
    f.state === MoveState.Surrender ||
    f.state === MoveState.Defeated ||
    f.state === MoveState.PhaseShift
  );
}

/** Health at which the boss's next phase begins (0 in the last phase). */
export function phaseFloor(world: World, f: Fighter): number {
  const b = world.encounter?.boss;
  const phases = profileOf(f)?.boss?.phases;
  if (!b || b.id !== f.id || !phases) return 0;
  const next = phases[b.phase + 1];
  return next ? Math.trunc((f.maxHealth * next.from) / 100) : 0;
}

/**
 * Every Health loss goes through here. In the Lab nobody is ever defeated (refill). In an
 * arena a fighter at 0 is `ko`. The boss's Queued Transition with Capped Damage
 * Carryover: the threshold-crossing hit resolves completely but Health is clamped at the
 * phase floor; later damage fills the carryover pool up to its cap (beyond it, contacts
 * deal no Health damage). Returns the Health damage actually taken.
 */
export function dealDamage(world: World, t: Fighter, dmg: number): number {
  if (dmg <= 0) return 0;
  const b = world.encounter?.boss;
  if (b && b.id === t.id) {
    const cap = profileOf(t)?.boss?.transition.carryCap ?? 0;
    if (b.pending) {
      b.carry = Math.min(cap, b.carry + dmg);
      return 0;
    }
    const floor = phaseFloor(world, t);
    if (floor > 0 && t.health - dmg <= floor) {
      const taken = t.health - floor;
      b.carry = Math.min(cap, dmg - taken);
      t.health = floor;
      b.pending = true;
      b.pendingSince = world.frame;
      return taken;
    }
  }
  const before = t.health;
  t.health = Math.max(0, t.health - dmg);
  if (t.health === 0 && world.encounter) t.ko = true;
  return before - t.health;
}

/** The boss's carryover pool is full: further contacts earn no Attack meter. */
export function carryFull(world: World, t: Fighter): boolean {
  const b = world.encounter?.boss;
  if (!b || b.id !== t.id || !b.pending) return false;
  return b.carry >= (profileOf(t)?.boss?.transition.carryCap ?? 0);
}
