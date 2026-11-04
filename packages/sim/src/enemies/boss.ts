import { type BossState, type Fighter, ItemState, MoveState, type World } from '../world/types';
import type { ActionDef } from '../combat/types';
import { emptyContext } from '../combat/context';
import { enter, interrupt, toActionable } from '../combat/reactions';
import { kitOf } from '../combat/roster';
import { spawnItem } from '../combat/held';
import { weaponIndex } from '../combat/armory';
import { fx } from '../math/fixed';
import { ARENAS, PROFILES, enemyKitIndex, livingHeroes, profileOf } from './data';

/**
 * Visible Resolve Gauge with Earned Stagger Windows and Queued Transition with Capped
 * Damage Carryover (spec §12.3, F&D §8). Candidate numbers live in the boss profile.
 */

/** Resolve damage per hit, in percent of the hit's Health damage, by action category. */
export const RESOLVE_PERCENT: Record<string, number> = {
  standing: 60,
  low: 60,
  dash: 60,
  aerial: 60,
  ground: 60,
  grabStrike: 80,
  throw: 100,
  counter: 150,
  special: 120,
  ultimate: 150,
  weaponThrow: 100,
};
/** Heavy finishers (knockdowns, launches) add this much Resolve damage. */
export const RESOLVE_FINISHER_BONUS = 15;
/** Resolve damage of a weapon clash against the boss. */
export const RESOLVE_CLASH = 30;
/** Hit-stun of a flinch while Resolve remains (frames, at most). */
export const FLINCH_STUN = 14;
/** Forced separation speed at the start of a phase transition. */
export const SHIFT_PUSH = fx(12);
const SHIFT_RADIUS = fx(700);

export function bossOf(world: World): Fighter | undefined {
  const b = world.encounter?.boss;
  return b ? world.bodies.find((f) => f.id === b.id) : undefined;
}

export function isBoss(world: World, f: Fighter): boolean {
  return world.encounter?.boss?.id === f.id;
}

export function newBossState(f: Fighter): BossState {
  const first = profileOf(f)!.boss!.phases[0]!;
  return {
    id: f.id,
    phase: 0,
    resolve: first.resolve,
    resolveMax: first.resolve,
    stagger: 0,
    closing: false,
    breaks: 0,
    pending: false,
    pendingSince: 0,
    carry: 0,
    shift: 0,
  };
}

/** Resolve damage of one hit of `a` that dealt `dmg` Health damage (before clamps). */
export function resolveDamage(a: ActionDef, dmg: number): number {
  const pct = RESOLVE_PERCENT[a.category] ?? 60;
  const k = a.reaction.kind;
  const bonus = k === 'knockdown' || k === 'launch' || k === 'trip' ? RESOLVE_FINISHER_BONUS : 0;
  return Math.max(1, Math.trunc((dmg * pct) / 100) + bonus);
}

/** While Resolve remains the boss resists launches, ground routes and full reactions. */
export function bossResists(world: World, t: Fighter): boolean {
  const b = world.encounter?.boss;
  return !!b && b.id === t.id && b.stagger === 0 && b.resolve > 0;
}

/** A Stagger Break is open on this fighter (full routes are legal). */
export function staggered(world: World, t: Fighter): boolean {
  const b = world.encounter?.boss;
  return !!b && b.id === t.id && b.stagger > 0;
}

/** Fresh combo context of the boss: boss-specific stun and juggle budgets. */
export function bossBudgets(world: World, t: Fighter): void {
  const prof = profileOf(t)?.boss;
  if (!prof || !isBoss(world, t)) return;
  t.ctx.stunBudget = prof.budgets.stun;
  t.ctx.juggleBudget = prof.budgets.juggle;
}

/**
 * A valid hit on the boss while Resolve remains: Resolve damage, and a limited reaction
 * (a short flinch, no lift; after `flinchCap` flinches in one combo, no reaction at all).
 * Depleting Resolve starts the telegraphed Stagger Break. Returns true when the boss
 * resisted (the caller skips the ordinary reaction).
 */
/**
 * Resolve damage of a non-dominant hit in a Combined Hit Bundle: it wears Resolve down but
 * causes no reaction of its own (the dominant hit's bossHit starts any Stagger Break).
 */
export function bossResolve(world: World, a: ActionDef, t: Fighter, dmg: number): void {
  const b = world.encounter?.boss;
  if (!b || b.id !== t.id || b.shift > 0 || b.stagger > 0) return;
  b.resolve = Math.max(0, b.resolve - resolveDamage(a, dmg));
}

export function bossHit(world: World, a: ActionDef, t: Fighter, dmg: number, dir: number): boolean {
  const b = world.encounter?.boss;
  if (!b || b.id !== t.id || b.shift > 0) return false;
  if (b.stagger > 0) return false;
  b.resolve = Math.max(0, b.resolve - resolveDamage(a, dmg));
  if (b.resolve === 0) {
    startStagger(world, t);
    return true;
  }
  const prof = profileOf(t)!.boss!;
  // Objective actions (the winch) are always interruptible.
  const running = t.state === MoveState.Attack ? kitOf(t)?.actions[t.action] : undefined;
  const objective = running?.tags.includes('objective') ?? false;
  // An attack's own action keeps running through a flinch only once the cap is reached.
  if (t.flinches >= prof.flinchCap && !objective) return true;
  t.flinches += 1;
  if (t.state === MoveState.Grabbing) return true;
  interrupt(t);
  enter(t, MoveState.Hitstun, Math.min(FLINCH_STUN, a.reaction.hitstun));
  t.vx = Math.trunc((dir * a.reaction.push) / 2);
  t.vz = 0;
  return true;
}

/** A weapon clash with the boss also costs Resolve. */
export function bossClash(world: World, t: Fighter): void {
  const b = world.encounter?.boss;
  if (!b || b.id !== t.id || b.stagger > 0 || b.shift > 0) return;
  b.resolve = Math.max(0, b.resolve - RESOLVE_CLASH);
  if (b.resolve === 0) startStagger(world, t);
}

function startStagger(world: World, t: Fighter): void {
  const b = world.encounter!.boss!;
  const prof = profileOf(t)!.boss!;
  b.stagger = prof.stagger.duration;
  b.breaks += 1;
  // The telegraph: the boss reels; the earned window opens a fresh combo with boss budgets.
  interrupt(t);
  t.y = 0;
  t.vy = 0;
  t.vx = 0;
  t.vz = 0;
  t.grabId = 0;
  t.ctx = { ...emptyContext() };
  enter(t, MoveState.Hitstun, prof.stagger.duration);
  t.flinches = 0;
  t.threat = 0;
}

/**
 * One frame of boss bookkeeping (before the boss's own AI step): the Stagger Break window,
 * the combo-scoped flinch count and the queued phase transition.
 */
export function stepBoss(world: World): void {
  const enc = world.encounter;
  const b = enc?.boss;
  if (!enc || !b) return;
  const f = world.bodies.find((x) => x.id === b.id);
  if (!f || f.ko) return;
  const prof = profileOf(f)!.boss!;
  if (!f.ctx.open && f.state !== MoveState.Hitstun) f.flinches = 0;
  if (b.stagger > 0) {
    // The window ends with its duration, or once a concluding knockdown or an exhausted
    // budget put the boss into protected recovery; never in the middle of a live combo.
    if (f.protectedRecovery) b.closing = true;
    if (!b.closing && (b.stagger > 1 || !f.ctx.open)) b.stagger -= 1;
    const actionable = f.state === MoveState.Idle || f.state === MoveState.Walk;
    if (b.stagger === 0 || (actionable && b.closing)) {
      endStagger(world, f);
    } else if (actionable) {
      // A dropped combo: the boss is still dazed for the rest of the window.
      enter(f, MoveState.Hitstun, b.stagger);
    }
    return;
  }
  if (b.shift > 0) {
    stepShift(world, f);
    return;
  }
  if (!b.pending) return;
  const safe =
    f.state === MoveState.Idle || f.state === MoveState.Walk || f.state === MoveState.Guard;
  if (safe || world.frame - b.pendingSince >= prof.transition.grace) beginShift(world, f);
}

function endStagger(world: World, f: Fighter): void {
  const b = world.encounter!.boss!;
  const prof = profileOf(f)!.boss!;
  b.stagger = 0;
  b.closing = false;
  b.resolve = b.resolveMax;
  // Protected re-entry.
  toActionable(f);
  enter(f, MoveState.Recover, prof.stagger.reentry);
  f.protectedRecovery = true;
}

/** The queued transition begins at a safe point (or when the grace limit runs out). */
function beginShift(world: World, f: Fighter): void {
  const b = world.encounter!.boss!;
  const prof = profileOf(f)!.boss!;
  if (f.grabId !== 0) {
    const held = world.bodies.find((x) => x.id === f.grabId);
    if (held) {
      held.grabbedBy = 0;
      toActionable(held);
    }
    f.grabId = 0;
  }
  interrupt(f);
  f.y = 0;
  f.vy = 0;
  f.vx = 0;
  f.vz = 0;
  f.threat = 0;
  f.protectedRecovery = false;
  f.ctx.open = false;
  enter(f, MoveState.PhaseShift, prof.transition.shift);
  b.shift = prof.transition.shift;
  // Telegraphed forced separation: heroes near the boss are pushed clear.
  for (const h of world.bodies) {
    if (h.team !== 'hero' || h.ko) continue;
    const dx = h.x - f.x;
    if (Math.abs(dx) > SHIFT_RADIUS) continue;
    if (h.state === MoveState.Grabbed || h.state === MoveState.Restrained) continue;
    h.vx = (dx >= 0 ? 1 : -1) * SHIFT_PUSH;
  }
  // Phase-transition policy for hostile projectiles: they expire, visibly, at once.
  world.projectiles = world.projectiles.filter((p) => {
    const o = world.bodies.find((x) => x.id === p.owner);
    return !o || o.team !== 'enemy';
  });
}

function heroesSafe(world: World): boolean {
  return livingHeroes(world).every(
    (h) =>
      h.state === MoveState.Idle ||
      h.state === MoveState.Walk ||
      h.state === MoveState.Guard ||
      h.state === MoveState.Dash ||
      h.state === MoveState.Landing ||
      h.state === MoveState.Restrained,
  );
}

function stepShift(world: World, f: Fighter): void {
  const b = world.encounter!.boss!;
  f.stateFrame += 1;
  if (b.shift > 1) {
    b.shift -= 1;
    return;
  }
  // The new phase starts only once every hero is in a safe actionable state.
  if (!heroesSafe(world)) return;
  b.shift = 0;
  startPhase(world, f, b.phase + 1);
}

/** Enters phase `n`: stored carryover applies, Resolve refills, supports and items arrive. */
export function startPhase(world: World, f: Fighter, n: number): void {
  const enc = world.encounter!;
  const b = enc.boss!;
  const prof = profileOf(f)!.boss!;
  const ph = prof.phases[n]!;
  b.phase = n;
  b.pending = false;
  f.health = Math.max(1, f.health - b.carry);
  b.carry = 0;
  b.resolve = ph.resolve;
  b.resolveMax = ph.resolve;
  f.readyAt = ph.attacks.map(() => world.frame + 30);
  toActionable(f);
  for (const d of enc.devices) d.active = d.kind === ph.device;
  const arena = ARENAS[enc.arena]!;
  // The weapon this phase claims is placed at its spot unless one is already in play.
  if (ph.weapon) {
    const w = weaponIndex(ph.weapon);
    const inPlay = world.items.some((i) => i.def === w && i.state !== ItemState.Gone);
    const spot = arena.weaponSpot ?? { x: Math.trunc(arena.width / 2), z: 760 };
    if (!inPlay) spawnItem(world, w, fx(spot.x), fx(spot.z));
  }
  ph.supports.forEach((kit, i) => {
    spawnEnemy(
      world,
      enemyKitIndex(kit),
      i === 0 ? world.bounds.minX + fx(60) : world.bounds.maxX - fx(60),
      fx(760 + i * 140),
    );
  });
}

/** Adds an enemy (encounter id sequence); used by waves and boss phases. */
export function spawnEnemy(world: World, kit: number, x: number, z: number): Fighter {
  const enc = world.encounter!;
  const id = enc.nextId;
  enc.nextId += 1;
  const f = createEnemy(id, kit, x, z);
  world.bodies.push(f);
  world.bodies.sort((p, q) => p.id - q.id);
  enc.waveIds.push(id);
  return f;
}

/** Factory installed by world.ts (avoids an import cycle). */
let createEnemy: (id: number, kit: number, x: number, z: number) => Fighter = () => {
  throw new Error('enemy factory not installed');
};
export function installEnemyFactory(fn: typeof createEnemy): void {
  createEnemy = fn;
}

/** The boss's kit look (presentation): 1 or 2. */
export function bossLook(world: World, f: Fighter): number {
  const b = world.encounter?.boss;
  if (!b || b.id !== f.id) return 1;
  const prof = PROFILES[f.hero]?.boss;
  return prof?.phases[b.phase]?.look ?? 1;
}
