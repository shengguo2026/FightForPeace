import { fx } from '../math/fixed';
import { dealDamage } from './damage';
import { BODY_HALF_D, BODY_HALF_W } from '../movement/profile';
import {
  BreakState,
  DefEvent,
  EnvEvent,
  type Environment,
  type Fighter,
  Flight,
  GroundTag,
  HazardPhase,
  MoveState,
  Protect,
  type World,
  Bounce,
} from '../world/types';
import type { StageLayout } from '../world/stage';
import { weaponIndex } from './armory';
import { DAMAGE_FLOOR } from './context';
import { inArc, isGuarding, logDefense } from './defense';
import { ITEM, spawnItem } from './held';
import { enter, enterProtection, interrupt, rebound } from './reactions';
import type { ActionDef } from './types';

/**
 * The Representative Environmental Slice (spec §11.2): one impact surface, one multi-state
 * breakable with one usable fragment, one active hazard. Authored deterministic rules, no
 * free physics. Candidate constants:
 */
export const IMPACT = {
  /** Remaining speed a reacting target needs for a damaging contact. */
  minSpeed: fx(4),
  /** A hit pushing at least this fast is environment-eligible without an `impact` tag. */
  minPush: fx(6),
  /** Authored surface damage, plus a capped force contribution per px/f above minSpeed. */
  surfaceDamage: 30,
  forceCap: 30,
  forcePerPx: 4,
  /** A terminal slam drops the target off the surface. */
  slamLift: fx(3),
  slamBack: fx(1),
} as const;

export const HAZARD = {
  guardCost: 20,
  guardStun: 14,
  /** Anti-trapping: no further hazard contact for this many frames. */
  safe: 120,
  pushX: fx(3),
  pushZ: fx(5),
  lift: fx(6),
} as const;

const NO_LOG = {
  kind: EnvEvent.None,
  frame: 0,
  target: 0,
  prop: 0,
  force: 0,
  damage: 0,
  detail: 0,
};

export function emptyEnvironment(): Environment {
  return { surfaces: [], breakables: [], hazards: [], log: { ...NO_LOG } };
}

/** Builds a stage's scenery from its layout (prop ids from 301). */
export function createEnvironment(layout: StageLayout): Environment {
  let id = 301;
  const f = (v: number) => fx(v);
  return {
    surfaces: layout.surfaces.map((s) => ({
      id: id++,
      x: f(s.x),
      z: f(s.z),
      hw: f(s.hw),
      hd: f(s.hd),
      h: f(s.h),
      cracked: false,
      impacts: 0,
    })),
    breakables: layout.breakables.map((b) => ({
      id: id++,
      x: f(b.x),
      z: f(b.z),
      hw: f(b.hw),
      hd: f(b.hd),
      h: f(b.h),
      power: 0,
      thresholds: b.thresholds,
      state: BreakState.Intact,
      fragment: weaponIndex(b.fragment),
      spawned: false,
    })),
    hazards: layout.hazards.map((h) => ({
      id: id++,
      x: f(h.x),
      z: f(h.z),
      hw: f(h.hw),
      hd: f(h.hd),
      h: f(h.h),
      phase: HazardPhase.Rest,
      phaseFrame: 0,
      rest: h.rest,
      warn: h.warn,
      active: h.active,
      damage: h.damage,
    })),
    log: { ...NO_LOG },
  };
}

function log(
  world: World,
  kind: number,
  target: number,
  prop: number,
  force = 0,
  damage = 0,
  detail = 0,
): void {
  world.environment.log = { kind, frame: world.frame, target, prop, force, damage, detail };
}

interface Footprint {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

function overlapsFoot(a: Footprint, b: Footprint): boolean {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.z - b.z) < a.hd + b.hd;
}

/** Solid scenery a footprint at (x, z) overlaps, below height y: the pillar or intact boards. */
export function solidAt(world: World, foot: Footprint, y = 0): (Footprint & { h: number }) | null {
  const env = world.environment;
  for (const s of env.surfaces) if (y < s.h && overlapsFoot(foot, s)) return s;
  for (const b of env.breakables)
    if (b.state !== BreakState.Broken && y < b.h && overlapsFoot(foot, b)) return b;
  return null;
}

export function hazardAt(
  world: World,
  foot: Footprint,
): World['environment']['hazards'][number] | null {
  for (const h of world.environment.hazards) if (overlapsFoot(foot, h)) return h;
  return null;
}

/**
 * Landing validation (Natural Landing with Deterministic Safety Correction): inside the
 * lane with a margin, clear of solid scenery and outside hazard zones.
 */
export function validRest(world: World, x: number, z: number): boolean {
  const { minX, maxX, minZ, maxZ } = world.bounds;
  const m = fx(20);
  if (x < minX + m || x > maxX - m || z < minZ || z > maxZ) return false;
  const foot = { x, z, hw: ITEM.halfW, hd: ITEM.halfD };
  return !solidAt(world, foot) && !hazardAt(world, foot);
}

/**
 * The first legal resting point near (x, z) from a fixed ordered list: steps along the
 * belt towards the stage centre, then away from it, then in depth; null when none is
 * legal (the item returns to its recovery anchor).
 */
export function correctedRest(world: World, x: number, z: number): { x: number; z: number } | null {
  if (validRest(world, x, z)) return { x, z };
  const centre = (world.bounds.minX + world.bounds.maxX) >> 1;
  const toward = x <= centre ? 1 : -1;
  for (let k = 1; k <= 8; k += 1) {
    const candidates = [
      { x: x + toward * k * fx(24), z },
      { x: x - toward * k * fx(24), z },
      { x, z: z + k * fx(16) },
      { x, z: z - k * fx(16) },
    ];
    for (const c of candidates) if (validRest(world, c.x, c.z)) return c;
  }
  return null;
}

/** Hazard cycle: rest, a telegraphed warning, the active phase, then rest again. */
export function stepHazards(world: World): void {
  for (const h of world.environment.hazards) {
    // rest 0: a triggered hazard (the sluice surge) waits until a device releases it.
    if (h.rest === 0 && h.phase === HazardPhase.Rest) continue;
    h.phaseFrame += 1;
    const len =
      h.phase === HazardPhase.Rest ? h.rest : h.phase === HazardPhase.Warn ? h.warn : h.active;
    if (h.phaseFrame < len) continue;
    h.phaseFrame = 0;
    h.phase =
      h.phase === HazardPhase.Rest
        ? HazardPhase.Warn
        : h.phase === HazardPhase.Warn
          ? HazardPhase.Active
          : HazardPhase.Rest;
  }
}

/** An action strikes intact breakables its active box overlaps, once per action instance. */
export function strikeScenery(
  world: World,
  att: Fighter,
  a: ActionDef,
  box: { x0: number; x1: number; y0: number; z: number; depth: number },
): void {
  if (a.breakPower <= 0) return;
  for (const b of world.environment.breakables) {
    if (b.state === BreakState.Broken || att.propHits.includes(b.id)) continue;
    if (box.x0 >= b.x + b.hw || box.x1 <= b.x - b.hw || box.y0 >= b.h) continue;
    if (Math.abs(box.z - b.z) > box.depth + b.hd) continue;
    att.propHits.push(b.id);
    addBreakPower(world, b.id, a.breakPower, att.id);
  }
}

/**
 * breakPower moves a breakable through Intact, Loosened, Critical and Broken; breaking
 * releases its one interactive fragment. Scenery destruction grants no score or meter.
 */
export function addBreakPower(world: World, id: number, power: number, by: number): void {
  const b = world.environment.breakables.find((x) => x.id === id);
  if (!b || b.state === BreakState.Broken) return;
  b.power += power;
  const [loose, critical, broken] = b.thresholds;
  b.state =
    b.power >= broken
      ? BreakState.Broken
      : b.power >= critical
        ? BreakState.Critical
        : b.power >= loose
          ? BreakState.Loosened
          : BreakState.Intact;
  log(world, EnvEvent.Break, by, b.id, 0, power, b.state);
  if (b.state !== BreakState.Broken || b.spawned) return;
  b.spawned = true;
  const frag = spawnItem(world, b.fragment, b.x, b.z + b.hd + fx(30));
  // The fragment falls out of the frame and lands through the ordinary landing rules.
  frag.state = 2; // ItemState.Flying
  frag.flight = Flight.Drop;
  frag.y = fx(100);
  frag.vy = fx(3);
  log(world, EnvEvent.Fragment, by, b.id, 0, 0, frag.id);
}

/** Is this hit environment-eligible (an impact surface may slam its target)? */
export function impactEligible(a: ActionDef): boolean {
  return (
    a.tags.includes('impact') || a.tags.includes('wallBounce') || a.reaction.push >= IMPACT.minPush
  );
}

const REACTING = new Set<number>([MoveState.Hitstun, MoveState.Launched]);

/**
 * Fighters against solid scenery, after body collision. A reacting target armed by an
 * eligible hit and still fast enough meets the impact surface: the combo's one full
 * environmental damage event, then a wall rebound (if armed and unused) or a terminal
 * slam. Every other contact only separates.
 */
export function sceneryCollide(world: World): void {
  const env = world.environment;
  if (env.surfaces.length === 0 && env.breakables.length === 0) return;
  for (const f of [...world.bodies].sort((a, b) => a.id - b.id)) {
    const foot = { x: f.x, z: f.z, hw: BODY_HALF_W, hd: BODY_HALF_D };
    const s = solidAt(world, foot, f.y);
    if (!s) continue;
    const surface = env.surfaces.find((x) => x === s);
    if (surface && REACTING.has(f.state) && f.impactArmed) impact(world, f, surface);
    pushOut(f, s);
  }
}

function pushOut(f: Fighter, s: Footprint): void {
  const dx = f.x - s.x;
  const dz = f.z - s.z;
  const px = BODY_HALF_W + s.hw - Math.abs(dx);
  const pz = BODY_HALF_D + s.hd - Math.abs(dz);
  if (px <= 0 || pz <= 0) return;
  if (px * BODY_HALF_D <= pz * BODY_HALF_W) f.x += dx >= 0 ? px : -px;
  else f.z += dz >= 0 ? pz : -pz;
}

function impact(world: World, f: Fighter, s: World['environment']['surfaces'][number]): void {
  const speed = Math.abs(f.vx);
  const ctx = f.ctx;
  f.impactArmed = false;
  if (speed < IMPACT.minSpeed || !ctx.open || ctx.environmentImpactUsed) {
    f.vx = 0;
    log(world, EnvEvent.Separation, f.id, s.id, speed);
    return;
  }
  ctx.environmentImpactUsed = true;
  const force = Math.min(
    IMPACT.forceCap,
    Math.trunc((speed - IMPACT.minSpeed) / 256) * IMPACT.forcePerPx,
  );
  const raw = IMPACT.surfaceDamage + force;
  const dmg = Math.max(1, Math.trunc((raw * Math.max(DAMAGE_FLOOR, ctx.scale)) / 100));
  dealDamage(world, f, dmg);
  ctx.damage += dmg;
  ctx.lastDamage = dmg;
  ctx.hits += 1;
  s.cracked = true;
  s.impacts += 1;
  const away = f.x <= s.x ? -1 : 1;
  if (f.bounce & Bounce.Wall && !ctx.wallBounceUsed) {
    // A continuing wall rebound also consumes the combo's wall-rebound quota.
    f.x = s.x + away * (s.hw + BODY_HALF_W);
    rebound(world, f, away as 1 | -1);
    log(world, EnvEvent.Impact, f.id, s.id, speed, dmg, 1);
    return;
  }
  // Terminal slam: the allowance is spent, no unused rebound quota is.
  f.bounce = 0;
  f.state = MoveState.Launched;
  f.stateFrame = 0;
  f.vx = away * IMPACT.slamBack;
  f.vz = 0;
  f.vy = IMPACT.slamLift;
  f.y = Math.max(f.y, 1);
  f.airRecover = false;
  ctx.groundTag = GroundTag.Terminal;
  log(world, EnvEvent.Impact, f.id, s.id, speed, dmg, 2);
}

/**
 * The active cog hits everyone in its zone (heroes and enemies alike) once per contact,
 * then grants anti-trapping safety. A normal guard facing it blocks; exact blocks and
 * counters do not apply to machinery.
 */
export function hazardHits(world: World): void {
  for (const h of world.environment.hazards) {
    if (h.phase !== HazardPhase.Active) continue;
    for (const t of [...world.bodies].sort((a, b) => a.id - b.id)) {
      if (t.y >= h.h || world.frame < t.hazardSafeUntil) continue;
      if (t.protectedRecovery || t.cinematic) continue;
      if (
        t.state === MoveState.Grabbed ||
        t.state === MoveState.Grabbing ||
        t.state === MoveState.Restrained ||
        t.state === MoveState.Down ||
        t.state === MoveState.GetUp
      )
        continue;
      if (!overlapsFoot({ x: t.x, z: t.z, hw: BODY_HALF_W, hd: BODY_HALF_D }, h)) continue;
      t.hazardSafeUntil = world.frame + HAZARD.safe;
      const dirX = t.x >= h.x ? 1 : -1;
      const dirZ = t.z >= h.z ? 1 : -1;
      if (t.team === 'hero' && isGuarding(t) && inArc(t.guardX, t.guardZ, h.x - t.x, h.z - t.z)) {
        if (!world.infiniteDefense) t.defense = Math.max(0, t.defense - HAZARD.guardCost);
        enter(t, MoveState.Blockstun, HAZARD.guardStun);
        t.vx = dirX * HAZARD.pushX;
        t.vz = 0;
        t.z += dirZ * HAZARD.pushZ * 4;
        logDefense(world, t, DefEvent.Guard, 0);
        log(world, EnvEvent.HazardGuard, t.id, h.id, 0, 0, 0);
        continue;
      }
      const ctx = t.ctx;
      const dmg = ctx.open
        ? Math.max(1, Math.trunc((h.damage * Math.max(DAMAGE_FLOOR, ctx.scale)) / 100))
        : h.damage;
      dealDamage(world, t, dmg);
      if (ctx.open) {
        ctx.damage += dmg;
        ctx.lastDamage = dmg;
        ctx.hits += 1;
      }
      interrupt(t);
      if (t.team === 'hero') logDefense(world, t, DefEvent.Hit, 0);
      // Knocked clear of the cog in protected recovery: it cannot trap anyone.
      t.state = MoveState.Launched;
      t.stateFrame = 0;
      t.vx = dirX * HAZARD.pushX;
      t.vz = dirZ * HAZARD.pushZ;
      t.vy = HAZARD.lift;
      t.y = Math.max(t.y, 1);
      t.bounce = 0;
      t.airRecover = false;
      enterProtection(world, t, Protect.GetUp);
      log(world, EnvEvent.HazardHit, t.id, h.id, 0, dmg, 0);
    }
  }
}
