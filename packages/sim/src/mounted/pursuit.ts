import { fx } from '../math/fixed';
import { ByteWriter } from '../state/encode';
import { MOUNTED_DATA } from '../combat/heroes.gen';
import {
  type CorridorDef,
  type MountedActionDef,
  type MountedDef,
  type MountedDifficultyDef,
  MountedSlot,
  ObstacleKind,
  RiderKind,
  Seek,
} from '../combat/types';
import { METER } from '../combat/meter';
import { Cheat, heroCheat, incomingDamage, outgoingDamage } from '../cheats/cheats';
import { ActionBit } from '../input/bits';
import { type Fighter, type FrameInput, MoveState, type World } from '../world/types';

/**
 * M17 mounted system (Stage 2 spec §8): one civil-protection bike per active hero on a
 * Guided Pursuit Corridor. Riders move continuously inside an authored road band (soft
 * lanes, bounded speed, bends and obstacles); co-op shares one camera with a bounded
 * tether; every rider has Health plus visible Stability, a warned critical state and a
 * safe crash with protected recovery (solo micro-checkpoint rewind, co-op rescue). Attacks
 * are rider-delivered: bikes never collide with or damage anyone. Road Riders are the
 * Lane-Pressure Pursuers. Everything here is plain data in `world.pursuit`, encoded and
 * hashed like the rest of the world.
 */
export const MOUNTED: MountedDef = MOUNTED_DATA!;
export const CORRIDORS: readonly CorridorDef[] = MOUNTED.corridors;

/** Hero rider states. Numbers are encoded; never renumber. */
export const RiderState = {
  Ride: 0,
  /** A mounted action is running (attack, hop, lean, Special, Ultimate). */
  Action: 1,
  /** Controlled skid after a crash. */
  Crash: 2,
  /** Co-op: down at the road edge, waiting for the partner's rescue. */
  Downed: 3,
  /** Co-op: missed the rescue; rejoins at the next recovery gate. */
  Out: 4,
  /** Dismounted at the corridor's end. */
  Done: 5,
} as const;

/** Road Rider states. Numbers are encoded; never renumber. */
export const EnemyState = {
  /** Warned entry inside the visibility zone (no commitment yet). */
  Enter: 0,
  Approach: 1,
  /** Telegraphed wind-up of a committed attack. */
  Windup: 2,
  Strike: 3,
  /** Steering recovery after a committed attack. */
  Recover: 4,
  /** Cutoff Line: warned move into the lane ahead, then holding it. */
  Cutoff: 5,
  /** Brake-Fade: a signalled, non-attacking drop back. */
  Fade: 6,
  /** Safe crash: a controlled skid to the road edge. */
  Crash: 7,
  /** Dismounted at the road edge (out of the pursuit). */
  Down: 8,
  /** Breakaway: the authored exit. */
  Leave: 9,
} as const;

export const PursuitPhase = { Ride: 0, Finish: 1, Complete: 2 } as const;

/** Callouts over riders. Numbers are encoded; never renumber. */
export const RideEvent = {
  None: 0,
  Critical: 1,
  Crash: 2,
  Rescue: 3,
  RescueChance: 4,
  Rewind: 5,
  Rejoin: 6,
  Checkpoint: 7,
  Evade: 8,
  Brace: 9,
  Dismount: 10,
  EquipmentHit: 11,
  Intercept: 12,
  Impact: 13,
  Clear: 14,
  Ramp: 15,
  Finish: 16,
  Breakaway: 17,
  Whiff: 18,
  Hit: 19,
  Missed: 20,
} as const;

export interface HeroRider {
  slot: number;
  /** Body id of the hero fighter. */
  id: number;
  state: number;
  /** Frame the state began. */
  since: number;
  x: number;
  z: number;
  y: number;
  speed: number;
  stability: number;
  critical: boolean;
  lastHurt: number;
  /** Action index in the hero's mounted kit (MountedSlot order), -1 = none. */
  action: number;
  actionAt: number;
  /** Directional kick side (-1 up, 1 down) or hop lane shift. */
  actionDir: number;
  /** The running action connected (or, a lean, evaded). */
  hit: boolean;
  hitIds: number[];
  targetZ: number;
  hopFrames: number;
  hopHeight: number;
  wobbleUntil: number;
  /** Obstacle impact animation: no enemy commits against the rider until it ends. */
  obstacleUntil: number;
  penaltyUntil: number;
  protectUntil: number;
  guardUntil: number;
  rescueUntil: number;
  /** Obstacles already cleared or struck since the last rewind (corridor indices). */
  passed: number[];
  event: number;
  eventFrame: number;
}

export interface RoadRider {
  id: number;
  /** Wave index it came from. */
  wave: number;
  x: number;
  z: number;
  speed: number;
  health: number;
  maxHealth: number;
  stability: number;
  maxStability: number;
  critical: boolean;
  lastHurt: number;
  state: number;
  since: number;
  /** Target hero slot (-1 = none). */
  target: number;
  /** Equipment it goes for (-1 = the heroes). */
  equipment: number;
  /** Rider action (index in MOUNTED.rider.actions) of the running commitment. */
  attack: number;
  /** Which side of the target it rides on (-1 above, 1 below). */
  side: number;
  commits: number;
  braceAcc: number;
  struck: boolean;
  event: number;
  eventFrame: number;
  /** M19: Marek on his bike (the intercept's boss rider): never breaks away. */
  boss: boolean;
}

export interface PursuitRecord {
  frames: number;
  impacts: number;
  crashes: number;
  rewinds: number;
  rescues: number;
  rescueChances: number;
  failedRescues: number;
  /** Hits that interrupted a commitment against the partner. */
  intercepts: number;
  /** Commitments against equipment (Protection and Assistance opportunities). */
  threats: number;
  /** Equipment threats stopped by a hero. */
  saves: number;
  /** Road Riders forced into a safe crash or dismount by hero actions (Control). */
  dismounted: number;
  /** Road Riders that broke away on their own. */
  brokeAway: number;
  equipmentLost: number;
  /** Effective hero-specific actions: Special and Ultimate hits, timed leans, ramp hops. */
  mastery: number;
  hits: number;
}

export interface Pursuit {
  corridor: number;
  difficulty: number;
  /** Optional steering assistance (stronger soft-lane guidance; nothing automated). */
  assist: boolean;
  phase: number;
  phaseFrame: number;
  camX: number;
  riders: HeroRider[];
  enemies: RoadRider[];
  nextEnemy: number;
  /** Riders still to come per wave, and whether the wave waits for its trigger. */
  waveLeft: number[];
  waveArmed: boolean[];
  /** Equipment condition: 0 intact, 1 threatened, 2 damaged. */
  equipment: number[];
  /** Last micro-checkpoint passed (-1 = the start). */
  checkpoint: number;
  record: PursuitRecord;
  /**
   * M19 Marek's intercept: 0 not yet (or no boss), 3 riding, 1 broken into a safe crash
   * (the boss room's opening), 2 forced to dismount at the finish.
   */
  marek: number;
}

/** M19 intercept outcomes. Numbers are encoded; never renumber. */
export const Intercept = { None: 0, Broken: 1, Dismounted: 2, Riding: 3 } as const;

/** Road Rider ids start here (fighters use 1–2 and 101+, items 201+, scenery 301+). */
export const RIDER_ID_BASE = 501;
const MARGIN = fx(24);
const VIEW_W = fx(1920);
const LEAD_OFFSET = fx(760);
const FINISH_FRAMES = 90;
const RIDER_DZ = fx(90);
/** Spacing of several pursuers on one side of the same hero. */
const FORMATION_DX = fx(220);

export function corridorIndex(id: string): number {
  const i = CORRIDORS.findIndex((c) => c.id === id);
  if (i < 0) throw new Error(`unknown corridor "${id}"`);
  return i;
}

/** A hero's six mounted actions in slot order. */
export function mountedKit(hero: number): readonly MountedActionDef[] {
  return MOUNTED.heroes[hero] ?? MOUNTED.heroes[0]!;
}

export function mountedDifficulty(p: Pursuit): MountedDifficultyDef {
  return MOUNTED.difficulty[p.difficulty] ?? MOUNTED.difficulty[1]!;
}

function emptyRecord(): PursuitRecord {
  return {
    frames: 0,
    impacts: 0,
    crashes: 0,
    rewinds: 0,
    rescues: 0,
    rescueChances: 0,
    failedRescues: 0,
    intercepts: 0,
    threats: 0,
    saves: 0,
    dismounted: 0,
    brokeAway: 0,
    equipmentLost: 0,
    mastery: 0,
    hits: 0,
  };
}

/** Top and bottom of the road at `x` (linear between the authored points). */
export function roadAt(c: CorridorDef, x: number): { top: number; bottom: number } {
  const pts = c.road;
  if (x <= pts[0]!.at) return { top: pts[0]!.top, bottom: pts[0]!.bottom };
  for (let i = 1; i < pts.length; i += 1) {
    const b = pts[i]!;
    if (x > b.at) continue;
    const a = pts[i - 1]!;
    const t = x - a.at;
    const span = b.at - a.at;
    return {
      top: a.top + Math.trunc(((b.top - a.top) * t) / span),
      bottom: a.bottom + Math.trunc(((b.bottom - a.bottom) * t) / span),
    };
  }
  const last = pts[pts.length - 1]!;
  return { top: last.top, bottom: last.bottom };
}

/** Centre of soft lane 0–2 at `x`. */
export function laneZ(c: CorridorDef, x: number, lane: number): number {
  const r = roadAt(c, x);
  return r.top + Math.trunc(((r.bottom - r.top) * (2 * lane + 1)) / 6);
}

function nearestLane(c: CorridorDef, x: number, z: number): number {
  let best = laneZ(c, x, 0);
  for (let l = 1; l < 3; l += 1) {
    const lz = laneZ(c, x, l);
    if (Math.abs(lz - z) < Math.abs(best - z)) best = lz;
  }
  return best;
}

function clampRoad(c: CorridorDef, x: number, z: number): number {
  const r = roadAt(c, x);
  return Math.max(r.top + MARGIN, Math.min(r.bottom - MARGIN, z));
}

const toward = (v: number, target: number, step: number) =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step);

function newRider(slot: number, id: number, x: number, z: number, frame: number): HeroRider {
  const B = MOUNTED.bike;
  return {
    slot,
    id,
    state: RiderState.Ride,
    since: frame,
    x,
    z,
    y: 0,
    speed: B.base,
    stability: B.stability,
    critical: false,
    lastHurt: frame,
    action: -1,
    actionAt: 0,
    actionDir: 0,
    hit: false,
    hitIds: [],
    targetZ: z,
    hopFrames: 0,
    hopHeight: 0,
    wobbleUntil: 0,
    obstacleUntil: 0,
    penaltyUntil: 0,
    protectUntil: frame + B.protect,
    guardUntil: 0,
    rescueUntil: 0,
    passed: [],
    event: RideEvent.None,
    eventFrame: 0,
  };
}

/**
 * Turns the world into a pursuit through corridor `corridor` at difficulty `difficulty`:
 * the bounds become the corridor, and every hero on stage mounts its bike at the start.
 */
export function setupPursuit(
  world: World,
  corridor: number,
  difficulty: number,
  assist = false,
): void {
  const c = CORRIDORS[corridor]!;
  let minZ = c.road[0]!.top;
  let maxZ = c.road[0]!.bottom;
  for (const r of c.road) {
    minZ = Math.min(minZ, r.top);
    maxZ = Math.max(maxZ, r.bottom);
  }
  world.bounds = { minX: 0, maxX: c.length, minZ, maxZ };
  world.pursuit = {
    corridor,
    difficulty,
    assist,
    phase: PursuitPhase.Ride,
    phaseFrame: world.frame,
    camX: Math.max(0, c.start - fx(400)),
    riders: [],
    enemies: [],
    nextEnemy: RIDER_ID_BASE,
    waveLeft: c.waves.map((w) => (w.min <= difficulty ? w.riders.length : 0)),
    waveArmed: c.waves.map(() => true),
    equipment: c.equipment.map(() => 0),
    checkpoint: -1,
    record: emptyRecord(),
    marek: 0,
  };
  for (const f of world.bodies) if (f.team === 'hero') mount(world, f);
}

/** Puts a hero fighter on its bike (at the start, or beside its riding partner). */
function mount(world: World, f: Fighter): HeroRider {
  const p = world.pursuit!;
  const c = CORRIDORS[p.corridor]!;
  const partner = p.riders.find((r) => r.slot !== f.slot && riding(r));
  const x = partner ? partner.x - fx(100) : c.start - fx(f.slot * 120);
  const z = laneZ(c, x, f.slot === 0 ? 1 : 2);
  const r = newRider(f.slot, f.id, x, z, world.frame);
  if (partner) r.speed = partner.speed;
  p.riders.push(r);
  p.riders.sort((a, b) => a.slot - b.slot);
  sync(f, r);
  return r;
}

function riding(r: HeroRider): boolean {
  return r.state === RiderState.Ride || r.state === RiderState.Action;
}

/** On the road and drawn (not out, not dismounted). */
function onRoad(r: HeroRider): boolean {
  return r.state !== RiderState.Out && r.state !== RiderState.Done;
}

function enemyAlive(e: RoadRider): boolean {
  return (
    e.state !== EnemyState.Crash && e.state !== EnemyState.Down && e.state !== EnemyState.Leave
  );
}

function sync(f: Fighter, r: HeroRider): void {
  f.x = r.x;
  f.z = r.z;
  f.y = r.y;
  f.vx = r.speed;
  f.vz = 0;
  f.vy = 0;
  f.facing = 1;
  f.state = MoveState.Idle;
}

function heroEvent(r: HeroRider, kind: number, frame: number): void {
  r.event = kind;
  r.eventFrame = frame;
}

function enemyEvent(e: RoadRider, kind: number, frame: number): void {
  e.event = kind;
  e.eventFrame = frame;
}

/** Is the rider inside the evasion window of its running action? */
export function evading(r: HeroRider, hero: number, frame: number): boolean {
  if (r.action < 0) return false;
  const a = mountedKit(hero)[r.action]!;
  const t = frame - r.actionAt;
  return t >= a.evadeFrom && t <= a.evadeTo;
}

/** Frames a rider's running action lasts (a hop: its airtime plus recovery). */
export function riderActionLength(r: HeroRider, a: MountedActionDef): number {
  if (a.slot === MountedSlot.Hop) return r.hopFrames + a.recovery;
  return a.startup + a.active + a.recovery;
}

// --- the step -----------------------------------------------------------------------------

/** One frame of the pursuit. Inputs per player slot (already normalised). */
export function stepPursuit(world: World, inputs: readonly FrameInput[]): void {
  const p = world.pursuit!;
  for (const f of world.bodies)
    if (f.team === 'hero' && !p.riders.some((r) => r.slot === f.slot)) mount(world, f);
  const heroes = new Map<number, Fighter>();
  for (const f of world.bodies) if (f.team === 'hero') heroes.set(f.slot, f);
  if (p.phase === PursuitPhase.Complete) {
    for (const r of p.riders) {
      const f = heroes.get(r.slot);
      if (f) sync(f, r);
    }
    return;
  }
  const caps = tether(p);
  for (const r of p.riders) {
    const f = heroes.get(r.slot);
    if (f) stepRider(world, p, r, f, inputs[r.slot] ?? idle, caps.get(r.slot));
  }
  rescues(world, p, inputs);
  for (const e of p.enemies) stepEnemy(world, p, e, heroes);
  for (const r of p.riders) {
    const f = heroes.get(r.slot);
    if (f && r.state === RiderState.Action) heroHits(world, p, r, f);
  }
  for (const r of p.riders) obstacles(world, p, r, heroes.get(r.slot));
  recover(world, p);
  crashes(world, p);
  progress(world, p);
  camera(p);
  // Riders who left the scene (dismounted and passed, or broken away) are dropped.
  const left = p.camX - fx(320);
  const right = p.camX + VIEW_W + fx(320);
  p.enemies = p.enemies.filter(
    (e) =>
      !(e.state === EnemyState.Down && e.x < left) &&
      !(e.state === EnemyState.Leave && e.x > right),
  );
  for (const r of p.riders) {
    const f = heroes.get(r.slot);
    if (f) sync(f, r);
  }
  if (p.phase === PursuitPhase.Ride) p.record.frames += 1;
}

const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

/**
 * Shared-camera tether: beyond `soft` the leader's top speed falls and the trailer is
 * assisted; at `hard` the leader cannot open the gap any further. No teleporting.
 */
function tether(p: Pursuit): Map<number, { cap: number; bonus: number }> {
  const T = MOUNTED.bike.tether;
  const B = MOUNTED.bike;
  const out = new Map<number, { cap: number; bonus: number }>();
  const on = p.riders.filter(
    (r) =>
      onRoad(r) && (riding(r) || r.state === RiderState.Crash || r.state === RiderState.Downed),
  );
  if (on.length < 2 || p.phase !== PursuitPhase.Ride) return out;
  const [a, b] = on as [HeroRider, HeroRider];
  const lead = a.x >= b.x ? a : b;
  const trail = lead === a ? b : a;
  const gap = lead.x - trail.x;
  if (gap <= T.soft) return out;
  const range = Math.max(1, T.hard - T.soft);
  // The leader's top speed falls from max toward the trailer's speed (at least `slow`
  // lower) across the soft-to-hard band, so the gap settles at the hard limit.
  const floor = Math.min(trail.speed, B.max - T.slow);
  let cap = B.max - Math.trunc(((B.max - floor) * Math.min(gap - T.soft, range)) / range);
  if (gap >= T.hard) cap = Math.min(cap, trail.speed - (gap > T.hard ? B.brake : 0));
  out.set(lead.slot, { cap: Math.max(0, cap), bonus: 0 });
  out.set(trail.slot, { cap: B.max + T.assist, bonus: T.assist });
  return out;
}

function stepRider(
  world: World,
  p: Pursuit,
  r: HeroRider,
  f: Fighter,
  input: FrameInput,
  link: { cap: number; bonus: number } | undefined,
): void {
  const B = MOUNTED.bike;
  const c = CORRIDORS[p.corridor]!;
  const frame = world.frame;
  if (!onRoad(r)) return;
  if (r.state === RiderState.Crash || r.state === RiderState.Downed) {
    // A controlled skid toward the nearer road edge, rolling on at the slowest pace.
    r.speed = toward(r.speed, B.min, B.brake);
    r.action = -1;
    r.y = 0;
    const road = roadAt(c, r.x);
    const edge = r.z - road.top < road.bottom - r.z ? road.top + MARGIN : road.bottom - MARGIN;
    r.z = toward(r.z, edge, fx(2));
    r.x += r.speed;
    r.z = clampRoad(c, r.x, r.z);
    return;
  }
  if (p.phase === PursuitPhase.Finish) {
    r.speed = toward(r.speed, 0, B.brake);
    r.action = -1;
    r.state = RiderState.Ride;
    r.y = 0;
    r.x += r.speed;
    r.z = clampRoad(c, r.x, toward(r.z, nearestLane(c, r.x, r.z), B.laneDrift));
    return;
  }
  if (r.state === RiderState.Ride) startAction(world, p, r, f, input);
  const kit = mountedKit(f.hero);
  const a = r.action >= 0 ? kit[r.action]! : undefined;
  const t = frame - r.actionAt;
  // Speed: forward accelerates, backward brakes, neutral returns to the baseline.
  const bonus = link?.bonus ?? 0;
  const max = Math.min(link?.cap ?? B.max + bonus, B.max + bonus);
  let target = input.moveX > 0 ? max : input.moveX < 0 ? B.min : B.base + bonus;
  target = Math.min(target, max, cutoffCap(p, r));
  r.speed =
    r.speed < target ? Math.min(target, r.speed + B.accel) : Math.max(target, r.speed - B.brake);
  // Steering: continuous across the road; soft lanes pull gently without input.
  const slowed = r.penaltyUntil > frame || r.wobbleUntil > frame;
  const steer = slowed ? Math.trunc(B.steer / 2) : B.steer;
  let z = r.z;
  if (a && a.slot === MountedSlot.Special && t < a.startup) {
    z = toward(z, r.targetZ, steer * 2);
  } else if (input.moveZ !== 0) {
    z += input.moveZ * steer;
  } else {
    z = toward(z, nearestLane(c, r.x, z), p.assist ? B.assistDrift : B.laneDrift);
  }
  if (a && a.slot === MountedSlot.Hop && r.actionDir !== 0 && t < B.hop.shiftFrames)
    z += r.actionDir * Math.trunc(B.hop.shift / B.hop.shiftFrames);
  let boost = 0;
  if (a && a.boost > 0 && t < a.startup + a.active) boost = a.boost;
  r.x = Math.min(c.length - fx(40), r.x + r.speed + boost);
  r.z = clampRoad(c, r.x, z);
  // Hop arc.
  if (a && a.slot === MountedSlot.Hop && t <= r.hopFrames) {
    const T = r.hopFrames;
    r.y = Math.trunc((4 * r.hopHeight * t * (T - t)) / (T * T));
  } else r.y = 0;
  if (a && t + 1 >= riderActionLength(r, a)) endAction(r, a, frame);
}

/** A Road Rider holding the lane ahead (Cutoff Line) caps the speed of a rider behind it. */
function cutoffCap(p: Pursuit, r: HeroRider): number {
  let cap = Number.MAX_SAFE_INTEGER;
  for (const e of p.enemies) {
    if (e.state !== EnemyState.Cutoff || e.target !== r.slot) continue;
    const dx = e.x - r.x;
    if (dx > 0 && dx < fx(200) && Math.abs(e.z - r.z) < fx(70)) cap = Math.min(cap, e.speed);
  }
  return cap;
}

function startAction(world: World, p: Pursuit, r: HeroRider, f: Fighter, input: FrameInput): void {
  const kit = mountedKit(f.hero);
  const pressed = input.pressed;
  let slot = -1;
  if (pressed & ActionBit.Ultimate && (f.meter >= METER.max || world.infiniteMeter))
    slot = MountedSlot.Ultimate;
  else if (pressed & ActionBit.Special) slot = MountedSlot.Special;
  else if (pressed & ActionBit.Guard) slot = MountedSlot.Lean;
  else if (pressed & ActionBit.Jump) slot = MountedSlot.Hop;
  else if (pressed & (ActionBit.Attack | ActionBit.LowAttack))
    slot = input.moveZ !== 0 ? MountedSlot.Directional : MountedSlot.Neutral;
  if (slot < 0) return;
  const a = kit[slot]!;
  const frame = world.frame;
  const B = MOUNTED.bike;
  const c = CORRIDORS[p.corridor]!;
  r.state = RiderState.Action;
  r.action = slot;
  r.actionAt = frame;
  r.actionDir = input.moveZ;
  r.hit = false;
  r.hitIds = [];
  r.targetZ = r.z;
  if (slot === MountedSlot.Ultimate && !world.infiniteMeter) f.meter = 0;
  if (slot === MountedSlot.Hop) {
    const ramp = c.obstacles.findIndex(
      (o) =>
        o.kind === ObstacleKind.Ramp &&
        r.x >= o.at - o.hw - fx(60) &&
        r.x <= o.at + o.hw &&
        Math.abs(r.z - o.z) <= o.hd,
    );
    r.hopFrames = ramp >= 0 ? B.hop.rampFrames : B.hop.frames;
    r.hopHeight = ramp >= 0 ? B.hop.rampHeight : B.hop.height;
    if (ramp >= 0) {
      p.record.mastery += 1;
      heroEvent(r, RideEvent.Ramp, frame);
    }
  }
  if (slot === MountedSlot.Special) {
    const partner = p.riders.find((q) => q.slot !== r.slot && riding(q));
    if (a.seek === Seek.Partner && partner) {
      r.targetZ = partner.z + (partner.z <= r.z ? fx(90) : -fx(90));
      partner.guardUntil = Math.max(partner.guardUntil, frame + a.guard);
    } else if (a.seek === Seek.Threat || a.seek === Seek.Partner) {
      const e = threatFor(p, r);
      if (e) r.targetZ = e.z;
    }
    r.targetZ = clampRoad(c, r.x, r.targetZ);
    if (a.guard > 0) r.guardUntil = Math.max(r.guardUntil, frame + a.guard);
  }
  if (slot === MountedSlot.Ultimate && a.guard > 0) {
    for (const q of p.riders) if (onRoad(q)) q.guardUntil = Math.max(q.guardUntil, frame + a.guard);
  }
}

/** The pursuer a Special moves against: a committing one first, then the nearest. */
function threatFor(p: Pursuit, r: HeroRider): RoadRider | undefined {
  let best: RoadRider | undefined;
  let bestScore = Number.MAX_SAFE_INTEGER;
  for (const e of p.enemies) {
    if (!enemyAlive(e)) continue;
    const dx = Math.abs(e.x - r.x);
    if (dx > fx(500)) continue;
    const committing = e.state === EnemyState.Windup || e.state === EnemyState.Cutoff;
    const score = dx + Math.abs(e.z - r.z) - (committing ? fx(1000) : 0);
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

function endAction(r: HeroRider, a: MountedActionDef, frame: number): void {
  const whiff =
    !r.hit && a.miss > 0 && (a.slot === MountedSlot.Neutral || a.slot === MountedSlot.Directional);
  if (whiff) {
    r.penaltyUntil = frame + a.miss;
    heroEvent(r, RideEvent.Whiff, frame);
  }
  r.state = RiderState.Ride;
  r.action = -1;
  r.y = 0;
}

/** Co-op rescue: the partner rides alongside the downed rider and presses Team Attack. */
function rescues(world: World, p: Pursuit, inputs: readonly FrameInput[]): void {
  const B = MOUNTED.bike;
  const frame = world.frame;
  for (const d of p.riders) {
    if (d.state !== RiderState.Downed) continue;
    for (const q of p.riders) {
      if (q === d || !riding(q)) continue;
      const pressed = inputs[q.slot]?.pressed ?? 0;
      if (!(pressed & (ActionBit.TeamAttack | ActionBit.Interact))) continue;
      if (Math.abs(q.x - d.x) > B.rescue.x || Math.abs(q.z - d.z) > B.rescue.z) continue;
      d.state = RiderState.Ride;
      d.since = frame;
      d.stability = B.rescue.restore;
      d.critical = false;
      d.lastHurt = frame;
      d.protectUntil = frame + B.protect;
      d.speed = q.speed;
      p.record.rescues += 1;
      heroEvent(d, RideEvent.Rescue, frame);
      heroEvent(q, RideEvent.Rescue, frame);
    }
    if (d.state === RiderState.Downed && frame >= d.rescueUntil) {
      d.state = RiderState.Out;
      d.since = frame;
      p.record.failedRescues += 1;
      heroEvent(d, RideEvent.Missed, frame);
    }
  }
}

// --- hits ---------------------------------------------------------------------------------

/** Hero rider-delivered attacks against Road Riders (partners are never hit). */
function heroHits(world: World, p: Pursuit, r: HeroRider, f: Fighter): void {
  const a = mountedKit(f.hero)[r.action]!;
  const frame = world.frame;
  if (a.slot === MountedSlot.Hop || a.slot === MountedSlot.Lean) return;
  const t = frame - r.actionAt;
  if (t < a.startup || t >= a.startup + a.active) return;
  for (const e of p.enemies) {
    if (!enemyAlive(e) || r.hitIds.includes(e.id)) continue;
    const dx = e.x - r.x;
    const dz = e.z - r.z;
    let inReach: boolean;
    if (a.slot === MountedSlot.Ultimate) inReach = Math.abs(dx) <= a.radius;
    else if (a.slot === MountedSlot.Directional) {
      const across = dz * (r.actionDir === 0 ? 1 : r.actionDir);
      inReach = Math.abs(dx) <= a.reachX && across >= a.near && across <= a.far;
    } else if (a.seek === Seek.Ahead)
      inReach = dx >= -fx(40) && dx <= a.reachX && Math.abs(dz) <= a.reachZ;
    else inReach = Math.abs(dx) <= a.reachX && Math.abs(dz) <= a.reachZ;
    if (!inReach) continue;
    r.hitIds.push(e.id);
    r.hit = true;
    hitEnemy(world, p, r, f, e, a);
  }
}

function hitEnemy(
  world: World,
  p: Pursuit,
  r: HeroRider,
  f: Fighter,
  e: RoadRider,
  a: MountedActionDef,
): void {
  const frame = world.frame;
  const R = MOUNTED.rider;
  const diff = mountedDifficulty(p);
  const committing =
    e.state === EnemyState.Windup ||
    (e.state === EnemyState.Cutoff && frame - e.since < R.actions[e.attack]!.windup);
  if (committing) {
    if (e.equipment >= 0 && e.target < 0) {
      p.record.saves += 1;
      if (p.equipment[e.equipment] === 1) p.equipment[e.equipment] = 0;
      enemyEvent(e, RideEvent.Intercept, frame);
    } else if (e.target >= 0 && e.target !== r.slot) {
      p.record.intercepts += 1;
      enemyEvent(e, RideEvent.Intercept, frame);
    }
  }
  let stab = a.stability;
  if (e.state === EnemyState.Approach && diff.brace > 0) {
    e.braceAcc += 1;
    if (e.braceAcc % diff.brace === 0) {
      stab = Math.trunc((stab * R.braceShare) / 100);
      enemyEvent(e, RideEvent.Brace, frame);
    }
  }
  // Marek's intercept touches neither the boss fight's Health nor its Resolve.
  if (!e.boss) e.health = Math.max(0, e.health - outgoingDamage(world, f, a.damage));
  e.lastHurt = frame;
  if (e.critical || e.health === 0) crashEnemy(p, e, frame);
  else {
    e.stability -= stab;
    if (e.stability <= 0) {
      e.stability = 0;
      e.critical = true;
      enemyEvent(e, RideEvent.Critical, frame);
    } else if (e.event !== RideEvent.Brace || e.eventFrame !== frame)
      enemyEvent(e, RideEvent.Hit, frame);
  }
  if (a.meter > 0) f.meter = Math.min(METER.max, f.meter + a.meter);
  p.record.hits += 1;
  if (a.slot === MountedSlot.Special || a.slot === MountedSlot.Ultimate) p.record.mastery += 1;
  if (enemyAlive(e) && (committing || a.slot === MountedSlot.Ultimate)) {
    // An interrupted commitment, or an Ultimate clearing the pressure: Brake-Fade.
    if (e.equipment >= 0 && p.equipment[e.equipment] === 1) p.equipment[e.equipment] = 0;
    e.state = EnemyState.Fade;
    e.since = frame;
  }
}

function crashEnemy(p: Pursuit, e: RoadRider, frame: number): void {
  if (e.boss && p.marek === Intercept.Riding) p.marek = Intercept.Broken;
  if (e.equipment >= 0 && p.equipment[e.equipment] === 1) p.equipment[e.equipment] = 0;
  e.state = EnemyState.Crash;
  e.since = frame;
  e.critical = false;
  e.stability = 0;
  e.target = -1;
  p.record.dismounted += 1;
  enemyEvent(e, RideEvent.Dismount, frame);
}

/**
 * Stability loss of a hero rider. STEADYRIDE keeps it from decreasing; zero gives the
 * warned critical state, and a further qualifying hit (`crashOk`) the safe crash.
 */
function loseStability(
  world: World,
  p: Pursuit,
  r: HeroRider,
  f: Fighter | undefined,
  amount: number,
  crashOk: boolean,
): void {
  if (f && heroCheat(world, f, Cheat.STEADYRIDE)) return;
  if (r.critical) {
    if (crashOk) crashRider(world, p, r);
    return;
  }
  r.stability = Math.max(0, r.stability - amount);
  if (r.stability === 0) {
    r.critical = true;
    heroEvent(r, RideEvent.Critical, world.frame);
  }
}

function crashRider(world: World, p: Pursuit, r: HeroRider): void {
  r.state = RiderState.Crash;
  r.since = world.frame;
  r.action = -1;
  r.critical = false;
  r.stability = 0;
  r.y = 0;
  p.record.crashes += 1;
  heroEvent(r, RideEvent.Crash, world.frame);
}

/** A Road Rider's attack lands on a hero rider (Health and Stability, never a second penalty). */
function hitHero(
  world: World,
  p: Pursuit,
  r: HeroRider,
  f: Fighter | undefined,
  damage: number,
  stability: number,
): void {
  const frame = world.frame;
  const diff = mountedDifficulty(p);
  const B = MOUNTED.bike;
  if (f) {
    // Mounted failure is Stability's job: a mounted hit never takes the last Health point.
    const h = incomingDamage(world, f, Math.trunc((damage * diff.damage) / 100));
    if (h > 0) f.health = Math.max(Math.min(1, f.health), f.health - h);
  }
  r.wobbleUntil = frame + B.wobble;
  r.lastHurt = frame;
  heroEvent(r, RideEvent.Hit, frame);
  if (r.state === RiderState.Action && f) {
    const a = mountedKit(f.hero)[r.action]!;
    // A hit during the startup interrupts the action.
    if (frame - r.actionAt < a.startup) {
      r.state = RiderState.Ride;
      r.action = -1;
    }
  }
  let s = Math.trunc((stability * diff.damage) / 100);
  const guarded = r.guardUntil > frame;
  if (guarded) s = Math.trunc(s / 2);
  loseStability(world, p, r, f, s, !guarded);
}

// --- Road Riders --------------------------------------------------------------------------

function riderAction(kind: number): number {
  return MOUNTED.rider.actions.findIndex((a) => a.kind === kind);
}

function committedCount(p: Pursuit): number {
  let n = 0;
  for (const e of p.enemies)
    if (
      e.state === EnemyState.Windup ||
      e.state === EnemyState.Strike ||
      e.state === EnemyState.Cutoff
    )
      n += 1;
  return n;
}

function leader(p: Pursuit): HeroRider | undefined {
  let best: HeroRider | undefined;
  for (const r of p.riders) if (riding(r) && (!best || r.x > best.x)) best = r;
  return best;
}

function teamSpeed(p: Pursuit): number {
  return leader(p)?.speed ?? MOUNTED.bike.base;
}

/** Riders a pursuer may go for: riding, not protected, not in an obstacle animation. */
function exposed(r: HeroRider, frame: number): boolean {
  return riding(r) && r.protectUntil <= frame && r.obstacleUntil <= frame;
}

function pickTarget(p: Pursuit, e: RoadRider): number {
  let best = -1;
  let bestCount = Number.MAX_SAFE_INTEGER;
  for (const r of p.riders) {
    if (!riding(r)) continue;
    const n = p.enemies.filter((o) => o !== e && enemyAlive(o) && o.target === r.slot).length;
    if (n < bestCount) {
      bestCount = n;
      best = r.slot;
    }
  }
  return best;
}

function stepEnemy(world: World, p: Pursuit, e: RoadRider, heroes: Map<number, Fighter>): void {
  const R = MOUNTED.rider;
  const B = MOUNTED.bike;
  const c = CORRIDORS[p.corridor]!;
  const diff = mountedDifficulty(p);
  const frame = world.frame;
  const t = frame - e.since;
  const ref = teamSpeed(p);
  const target = e.target >= 0 ? p.riders.find((r) => r.slot === e.target) : undefined;
  const pace = (desiredX: number, base: number) => {
    const d = Math.trunc((desiredX - e.x) / 16);
    e.speed = Math.max(0, base + Math.max(-R.catchUp, Math.min(R.catchUp, d)));
  };
  const steerTo = (z: number) => {
    e.z = toward(e.z, clampRoad(c, e.x, z), R.steer);
  };
  switch (e.state) {
    case EnemyState.Enter: {
      e.speed = ref;
      if (t >= R.warn) {
        e.state = EnemyState.Approach;
        e.since = frame;
      }
      break;
    }
    case EnemyState.Approach: {
      const eq = e.equipment >= 0 ? c.equipment[e.equipment] : undefined;
      const lead = leader(p);
      if (eq && p.equipment[e.equipment] === 0 && lead && lead.x < eq.at + fx(200)) {
        // Goes for the warned equipment at the road edge.
        const road = roadAt(c, eq.at);
        const z = eq.side === 0 ? road.top + fx(60) : road.bottom - fx(60);
        const x = eq.at - fx(80);
        pace(x, ref);
        steerTo(z);
        if (
          Math.abs(e.x - x) <= fx(60) &&
          Math.abs(e.z - z) <= fx(30) &&
          committedCount(p) < diff.committed
        ) {
          e.state = EnemyState.Windup;
          e.since = frame;
          e.attack = riderAction(RiderKind.Boot);
          e.target = -1;
          p.equipment[e.equipment] = 1;
          p.record.threats += 1;
        }
        break;
      }
      if (eq) e.equipment = -1;
      if (!target || !riding(target)) {
        e.target = pickTarget(p, e);
        const tr = p.riders.find((r) => r.slot === e.target);
        if (tr) {
          // The side with fewer pursuers of this hero, else the side with more road.
          const on = (side: number) =>
            p.enemies.filter(
              (o) => o !== e && enemyAlive(o) && o.target === e.target && o.side === side,
            ).length;
          const road = roadAt(c, tr.x);
          const roomy = tr.z - road.top > road.bottom - tr.z ? -1 : 1;
          e.side = on(roomy) <= on(-roomy) ? roomy : -roomy;
        }
        e.since = frame;
        pace(e.x + fx(200), ref - fx(2));
        break;
      }
      // Formation: a second pursuer on the same side keeps station behind the first.
      const rank = p.enemies.filter(
        (o) => o.id < e.id && enemyAlive(o) && o.target === e.target && o.side === e.side,
      ).length;
      const dz = target.z + e.side * RIDER_DZ;
      const dx = target.x + fx(30) - rank * FORMATION_DX;
      pace(dx, target.speed);
      steerTo(dz);
      const aligned =
        Math.abs(e.x - dx) <= fx(80) && Math.abs(e.z - clampRoad(c, e.x, dz)) <= fx(24);
      const busy = p.enemies.some(
        (o) =>
          o !== e &&
          o.target === e.target &&
          (o.state === EnemyState.Windup ||
            o.state === EnemyState.Strike ||
            o.state === EnemyState.Cutoff),
      );
      if (
        aligned &&
        t >= R.settle &&
        !busy &&
        exposed(target, frame) &&
        committedCount(p) < diff.committed
      ) {
        const kind =
          e.commits % 3 === 2
            ? RiderKind.Cutoff
            : Math.abs(e.z - target.z) <= fx(100)
              ? RiderKind.Check
              : RiderKind.Boot;
        e.attack = riderAction(kind);
        e.state = kind === RiderKind.Cutoff ? EnemyState.Cutoff : EnemyState.Windup;
        e.since = frame;
        e.struck = false;
      }
      break;
    }
    case EnemyState.Windup: {
      const a = R.actions[e.attack]!;
      if (e.target >= 0 && target) {
        e.speed = target.speed;
        if (!onRoad(target) || target.state === RiderState.Crash) {
          e.state = EnemyState.Fade;
          e.since = frame;
          break;
        }
      } else e.speed = ref;
      if (t >= a.windup + diff.windup) {
        e.state = EnemyState.Strike;
        e.since = frame;
        e.struck = false;
        strike(world, p, e, target, heroes);
      }
      break;
    }
    case EnemyState.Strike: {
      const a = R.actions[e.attack]!;
      if (target) e.speed = target.speed;
      if (!e.struck) strike(world, p, e, target, heroes);
      if (t + 1 >= a.active) {
        e.state = EnemyState.Recover;
        e.since = frame;
      }
      break;
    }
    case EnemyState.Recover: {
      const a = R.actions[e.attack]!;
      e.speed = Math.max(0, ref - fx(1));
      if (t >= a.recovery) {
        e.commits += 1;
        if (!e.boss && (e.equipment >= 0 || e.commits >= R.breakaway)) leave(p, e, frame);
        else {
          e.state = EnemyState.Fade;
          e.since = frame;
        }
      }
      break;
    }
    case EnemyState.Cutoff: {
      const a = R.actions[e.attack]!;
      if (!target || !riding(target)) {
        e.state = EnemyState.Fade;
        e.since = frame;
        break;
      }
      // Warned acceleration into the lane ahead, then holding it: no contact, no damage.
      pace(target.x + a.reachX, target.speed);
      if (t >= a.windup) e.speed = Math.max(B.min, target.speed - fx(1));
      steerTo(target.z);
      if (t >= a.windup + a.active) {
        e.commits += 1;
        e.state = EnemyState.Fade;
        e.since = frame;
      }
      break;
    }
    case EnemyState.Fade: {
      const a = R.actions[riderAction(RiderKind.Fade)]!;
      e.speed = Math.max(0, ref - fx(2));
      if (t >= a.active) {
        if (!e.boss && e.commits >= R.breakaway) leave(p, e, frame);
        else {
          e.state = EnemyState.Approach;
          e.since = frame;
        }
      }
      break;
    }
    case EnemyState.Crash: {
      e.speed = toward(e.speed, 0, fx(1) / 2);
      const road = roadAt(c, e.x);
      const edge = e.z - road.top < road.bottom - e.z ? road.top + MARGIN : road.bottom - MARGIN;
      e.z = toward(e.z, edge, fx(3));
      if (t >= R.crash) {
        e.state = EnemyState.Down;
        e.since = frame;
        e.speed = 0;
      }
      break;
    }
    case EnemyState.Down:
      e.speed = 0;
      break;
    case EnemyState.Leave:
      e.speed = ref + fx(4);
      break;
  }
  e.x += e.speed;
  e.z = clampRoad(c, e.x, e.z);
}

/** Breakaway; `counted` false when the pursuit ends (it then says nothing about Control). */
function leave(p: Pursuit, e: RoadRider, frame: number, counted = true): void {
  if (e.equipment >= 0 && p.equipment[e.equipment] === 1) p.equipment[e.equipment] = 0;
  e.state = EnemyState.Leave;
  e.since = frame;
  e.target = -1;
  if (counted) p.record.brokeAway += 1;
  enemyEvent(e, RideEvent.Breakaway, frame);
}

/** A committed attack's active frame: the hero may be hit, evade it or be out of reach. */
function strike(
  world: World,
  p: Pursuit,
  e: RoadRider,
  target: HeroRider | undefined,
  heroes: Map<number, Fighter>,
): void {
  const R = MOUNTED.rider;
  const a = R.actions[e.attack]!;
  const frame = world.frame;
  if (e.target < 0 && e.equipment >= 0) {
    e.struck = true;
    if (p.equipment[e.equipment] !== 2) {
      p.equipment[e.equipment] = 2;
      p.record.equipmentLost += 1;
      enemyEvent(e, RideEvent.EquipmentHit, frame);
    }
    return;
  }
  if (!target || !riding(target)) return;
  const f = heroes.get(target.slot);
  if (Math.abs(target.x - e.x) > a.reachX || Math.abs(target.z - e.z) > a.reachZ) return;
  e.struck = true;
  if (target.protectUntil > frame) return;
  if (f && evading(target, f.hero, frame)) {
    const lean = mountedKit(f.hero)[target.action]!;
    if (lean.slot === MountedSlot.Lean && !target.hit) {
      target.hit = true;
      target.stability = Math.min(MOUNTED.bike.stability, target.stability + lean.restore);
      if (target.stability > 0) target.critical = false;
      p.record.mastery += 1;
    }
    heroEvent(target, RideEvent.Evade, frame);
    return;
  }
  hitHero(world, p, target, f, a.damage, a.stability);
}

// --- obstacles, recovery, crashes, progress ------------------------------------------------

function obstacles(world: World, p: Pursuit, r: HeroRider, f: Fighter | undefined): void {
  if (!riding(r) || p.phase !== PursuitPhase.Ride) return;
  const c = CORRIDORS[p.corridor]!;
  const B = MOUNTED.bike;
  const frame = world.frame;
  c.obstacles.forEach((o, i) => {
    if (r.passed.includes(i)) return;
    if (Math.abs(r.x - o.at) > o.hw + fx(20) || Math.abs(r.z - o.z) > o.hd + fx(14)) return;
    if (o.kind === ObstacleKind.Ramp) return;
    r.passed.push(i);
    if (r.y > 0) {
      heroEvent(r, RideEvent.Clear, frame);
      return;
    }
    p.record.impacts += 1;
    const dir = r.z >= o.z ? 1 : -1;
    r.z = clampRoad(c, r.x, r.z + dir * B.impact.push);
    r.wobbleUntil = frame + B.wobble;
    r.obstacleUntil = frame + B.wobble;
    r.lastHurt = frame;
    heroEvent(r, RideEvent.Impact, frame);
    loseStability(
      world,
      p,
      r,
      f,
      o.kind === ObstacleKind.Gate ? B.impact.gate : B.impact.barrier,
      true,
    );
  });
}

/** Clean riding: after a short damage-free interval Stability returns a little at a time. */
function recover(world: World, p: Pursuit): void {
  const frame = world.frame;
  const B = MOUNTED.bike;
  for (const r of p.riders) {
    if (!riding(r) || r.stability >= B.stability) continue;
    const quiet = frame - r.lastHurt - B.recover.delay;
    if (quiet < 0 || quiet % B.recover.every !== 0) continue;
    r.stability = Math.min(B.stability, r.stability + B.recover.amount);
    if (r.stability > 0) r.critical = false;
  }
  const R = MOUNTED.rider;
  for (const e of p.enemies) {
    if (!enemyAlive(e) || e.stability >= e.maxStability) continue;
    const quiet = frame - e.lastHurt - R.recover.delay;
    if (quiet < 0 || quiet % R.recover.every !== 0) continue;
    e.stability = Math.min(e.maxStability, e.stability + R.recover.amount);
    if (e.stability > 0) e.critical = false;
  }
}

/** A finished skid becomes a rescue chance (co-op) or a micro-checkpoint rewind. */
function crashes(world: World, p: Pursuit): void {
  const B = MOUNTED.bike;
  const frame = world.frame;
  for (const r of p.riders) {
    if (r.state !== RiderState.Crash || frame - r.since < B.crash) continue;
    const partner = p.riders.find((q) => q !== r && riding(q));
    if (partner) {
      r.state = RiderState.Downed;
      r.since = frame;
      r.rescueUntil = frame + B.rescue.window;
      p.record.rescueChances += 1;
      heroEvent(r, RideEvent.RescueChance, frame);
    } else {
      rewind(world, p);
      return;
    }
  }
}

/**
 * Every active rider is down: the team returns to the latest micro-checkpoint with fresh
 * Stability. Riders that were dealt with stay dealt with; the rest of their waves come
 * again, so nothing is duplicated or erased.
 */
export function rewind(world: World, p: Pursuit): void {
  const c = CORRIDORS[p.corridor]!;
  const B = MOUNTED.bike;
  const frame = world.frame;
  const x0 = p.checkpoint >= 0 ? c.checkpoints[p.checkpoint]! : c.start;
  for (const r of p.riders) {
    if (r.state === RiderState.Done) continue;
    r.state = RiderState.Ride;
    r.since = frame;
    r.x = x0 - fx(r.slot * 120);
    r.z = laneZ(c, r.x, r.slot === 0 ? 1 : 2);
    r.y = 0;
    r.speed = B.base;
    r.stability = B.stability;
    r.critical = false;
    r.lastHurt = frame;
    r.action = -1;
    r.protectUntil = frame + B.protect;
    r.wobbleUntil = 0;
    r.obstacleUntil = 0;
    r.penaltyUntil = 0;
    r.passed = [];
    heroEvent(r, RideEvent.Rewind, frame);
  }
  // Pursuers of waves after the checkpoint come again; earlier ones stay behind.
  for (const e of p.enemies) {
    if (!enemyAlive(e) || e.wave < 0 || c.waves[e.wave]!.at <= x0) continue;
    p.waveLeft[e.wave] = (p.waveLeft[e.wave] ?? 0) + 1;
    p.waveArmed[e.wave] = true;
  }
  p.enemies = [];
  p.equipment = p.equipment.map((s) => (s === 1 ? 0 : s));
  p.camX = Math.max(0, x0 - fx(400));
  p.record.rewinds += 1;
}

function progress(world: World, p: Pursuit): void {
  const c = CORRIDORS[p.corridor]!;
  const frame = world.frame;
  if (p.phase === PursuitPhase.Finish) {
    if (frame - p.phaseFrame >= FINISH_FRAMES) {
      p.phase = PursuitPhase.Complete;
      p.phaseFrame = frame;
      for (const r of p.riders) {
        r.state = RiderState.Done;
        r.since = frame;
        r.speed = 0;
      }
    }
    return;
  }
  const lead = leader(p);
  if (!lead) return;
  // M19: Marek rides in once (warned, like a wave) and never breaks away.
  if (c.boss && p.marek === Intercept.None && lead.x >= c.boss.at) {
    const x = p.camX + VIEW_W - fx(80);
    const e = addRoadRider(p, x, laneZ(c, x, c.boss.lane), frame);
    e.boss = true;
    e.health = 1;
    e.maxHealth = 1;
    e.stability = Math.trunc((e.stability * c.boss.stability) / 100);
    e.maxStability = e.stability;
    e.speed = lead.speed;
    p.marek = Intercept.Riding;
  }
  // Waves: Road Riders enter from warned positions inside the visible zone.
  c.waves.forEach((w, i) => {
    if (!p.waveArmed[i] || (p.waveLeft[i] ?? 0) <= 0 || lead.x < w.at) return;
    p.waveArmed[i] = false;
    const n = p.waveLeft[i]!;
    p.waveLeft[i] = 0;
    for (let k = w.riders.length - n; k < w.riders.length; k += 1)
      spawn(p, i, w.riders[k]!, w.target, lead, frame);
  });
  // Micro-checkpoints (recovery gates): riders who missed a rescue rejoin here.
  const next = c.checkpoints[p.checkpoint + 1];
  if (next !== undefined && lead.x >= next) {
    p.checkpoint += 1;
    heroEvent(lead, RideEvent.Checkpoint, frame);
    rejoin(p, lead, frame);
  }
  const ridingNow = p.riders.filter(riding);
  // Breaking Marek ends the intercept at once; reaching the finish forces his dismount.
  const broken = p.marek === Intercept.Broken;
  if (broken || (ridingNow.length > 0 && ridingNow.every((r) => r.x >= c.finish))) {
    if (p.marek === Intercept.Riding) p.marek = Intercept.Dismounted;
    p.phase = PursuitPhase.Finish;
    p.phaseFrame = frame;
    rejoin(p, lead, frame);
    for (const r of p.riders) {
      if (r.state === RiderState.Crash || r.state === RiderState.Downed) {
        r.state = RiderState.Ride;
        r.since = frame;
      }
      heroEvent(r, RideEvent.Finish, frame);
    }
    for (const e of p.enemies) if (enemyAlive(e)) leave(p, e, frame, false);
  }
}

function rejoin(p: Pursuit, lead: HeroRider, frame: number): void {
  const c = CORRIDORS[p.corridor]!;
  const B = MOUNTED.bike;
  for (const r of p.riders) {
    if (r.state !== RiderState.Out) continue;
    r.state = RiderState.Ride;
    r.since = frame;
    r.x = lead.x - fx(100);
    r.z = laneZ(c, r.x, lead.z < laneZ(c, r.x, 1) ? 2 : 0);
    r.speed = lead.speed;
    r.stability = B.stability;
    r.critical = false;
    r.lastHurt = frame;
    r.protectUntil = frame + B.protect;
    heroEvent(r, RideEvent.Rejoin, frame);
  }
}

function spawn(
  p: Pursuit,
  wave: number,
  w: { from: number; lane: number },
  equipment: number,
  lead: HeroRider,
  frame: number,
): void {
  const c = CORRIDORS[p.corridor]!;
  const x = w.from === 0 ? p.camX + fx(80) : p.camX + VIEW_W - fx(80);
  const e = addRoadRider(p, x, laneZ(c, x, w.lane), frame, wave, equipment);
  e.speed = lead.speed;
}

/**
 * Adds a Road Rider at (x, z) in its warned entry (waves use it; tests and the Lab may
 * place one directly). Stability follows the difficulty.
 */
export function addRoadRider(
  p: Pursuit,
  x: number,
  z: number,
  frame: number,
  wave = -1,
  equipment = -1,
): RoadRider {
  const R = MOUNTED.rider;
  const diff = mountedDifficulty(p);
  const stability = Math.trunc((R.stability * diff.riderStability) / 100);
  const e: RoadRider = {
    id: p.nextEnemy,
    wave,
    x,
    z,
    speed: MOUNTED.bike.base,
    health: R.health,
    maxHealth: R.health,
    stability,
    maxStability: stability,
    critical: false,
    lastHurt: 0,
    state: EnemyState.Enter,
    since: frame,
    target: -1,
    equipment,
    attack: -1,
    side: 1,
    commits: 0,
    braceAcc: 0,
    struck: false,
    event: RideEvent.None,
    eventFrame: 0,
    boss: false,
  };
  p.enemies.push(e);
  p.nextEnemy += 1;
  return e;
}

/** The camera follows the pair (never backwards in normal play) and keeps the trailer on screen. */
function camera(p: Pursuit): void {
  const c = CORRIDORS[p.corridor]!;
  const on = p.riders.filter((r) => onRoad(r) && r.state !== RiderState.Done);
  if (on.length === 0) return;
  let min = on[0]!.x;
  let max = on[0]!.x;
  for (const r of on) {
    min = Math.min(min, r.x);
    max = Math.max(max, r.x);
  }
  const target = Math.min(Math.trunc((min + max) / 2) - LEAD_OFFSET, min - fx(120));
  p.camX = Math.max(p.camX, Math.max(0, Math.min(target, c.length - VIEW_W)));
}

// --- the record ---------------------------------------------------------------------------

export type RecordCategory = 'response' | 'protection' | 'control' | 'stability' | 'assistance';

export interface RecordLine {
  id: RecordCategory;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C';
}

export interface ResponseRecord {
  lines: RecordLine[];
  /** Optional recognition of skilled play (not a requirement for completion). */
  mastery: boolean;
}

export function gradeOf(score: number): RecordLine['grade'] {
  return score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : 'C';
}

/** Frames a team riding just above the baseline pace needs from start to finish. */
export function parFrames(c: CorridorDef): number {
  return Math.trunc((c.finish - c.start) / (MOUNTED.bike.base + fx(1)));
}

/**
 * Civil-Protection Response Record: Response (forward progress), Protection (equipment),
 * Control (Road Riders dismounted by hero actions), Stability (no depletion, rewinds or
 * impacts) and Assistance (rescues and protective interceptions), plus Mastery. Every
 * result completes the pursuit; candidate scoring bands.
 */
export function responseRecord(p: Pursuit): ResponseRecord {
  const c = CORRIDORS[p.corridor]!;
  const r = p.record;
  const par = parFrames(c);
  const response = r.frames <= par ? 100 : Math.trunc((100 * par) / Math.max(1, r.frames));
  const total = c.equipment.length;
  const protection = total ? Math.trunc((100 * (total - r.equipmentLost)) / total) : 100;
  const resolved = r.dismounted + r.brokeAway;
  const control = resolved ? Math.trunc((100 * r.dismounted) / resolved) : 100;
  const stability = Math.max(0, 100 - 30 * r.rewinds - 15 * r.crashes - 4 * r.impacts);
  const chances = r.threats + r.rescueChances;
  const base = chances ? Math.trunc((100 * (r.saves + r.rescues)) / chances) : 100;
  const assistance = Math.min(100, base + 10 * r.intercepts);
  const line = (id: RecordCategory, score: number): RecordLine => ({
    id,
    score,
    grade: gradeOf(score),
  });
  return {
    lines: [
      line('response', response),
      line('protection', protection),
      line('control', control),
      line('stability', stability),
      line('assistance', assistance),
    ],
    mastery: r.rewinds === 0 && r.rescueChances === 0 && r.mastery >= 3,
  };
}

// --- encoding -----------------------------------------------------------------------------

export function encodePursuit(w: ByteWriter, p: Pursuit | null): void {
  w.u8(p ? 1 : 0);
  if (!p) return;
  w.u32(p.corridor);
  w.u32(p.difficulty);
  w.u8(p.assist ? 1 : 0);
  w.u8(p.phase);
  w.i32(p.phaseFrame);
  w.i32(p.camX);
  w.u32(p.riders.length);
  for (const r of p.riders) {
    w.u32(r.slot);
    w.u32(r.id);
    w.u8(r.state);
    w.i32(r.since);
    w.i32(r.x);
    w.i32(r.z);
    w.i32(r.y);
    w.i32(r.speed);
    w.i32(r.stability);
    w.u8(r.critical ? 1 : 0);
    w.i32(r.lastHurt);
    w.i32(r.action);
    w.i32(r.actionAt);
    w.i32(r.actionDir);
    w.u8(r.hit ? 1 : 0);
    w.u32(r.hitIds.length);
    for (const id of r.hitIds) w.u32(id);
    w.i32(r.targetZ);
    w.i32(r.hopFrames);
    w.i32(r.hopHeight);
    w.i32(r.wobbleUntil);
    w.i32(r.obstacleUntil);
    w.i32(r.penaltyUntil);
    w.i32(r.protectUntil);
    w.i32(r.guardUntil);
    w.i32(r.rescueUntil);
    w.u32(r.passed.length);
    for (const i of r.passed) w.u32(i);
    w.u8(r.event);
    w.i32(r.eventFrame);
  }
  w.u32(p.enemies.length);
  for (const e of p.enemies) {
    w.u32(e.id);
    w.i32(e.wave);
    w.i32(e.x);
    w.i32(e.z);
    w.i32(e.speed);
    w.i32(e.health);
    w.i32(e.maxHealth);
    w.i32(e.stability);
    w.i32(e.maxStability);
    w.u8(e.critical ? 1 : 0);
    w.i32(e.lastHurt);
    w.u8(e.state);
    w.i32(e.since);
    w.i32(e.target);
    w.i32(e.equipment);
    w.i32(e.attack);
    w.i32(e.side);
    w.u32(e.commits);
    w.u32(e.braceAcc);
    w.u8(e.struck ? 1 : 0);
    w.u8(e.boss ? 1 : 0);
    w.u8(e.event);
    w.i32(e.eventFrame);
  }
  w.u32(p.nextEnemy);
  w.u32(p.waveLeft.length);
  for (let i = 0; i < p.waveLeft.length; i += 1) {
    w.u32(p.waveLeft[i]!);
    w.u8(p.waveArmed[i] ? 1 : 0);
  }
  w.u32(p.equipment.length);
  for (const s of p.equipment) w.u8(s);
  w.i32(p.checkpoint);
  w.u8(p.marek);
  const r = p.record;
  for (const v of [
    r.frames,
    r.impacts,
    r.crashes,
    r.rewinds,
    r.rescues,
    r.rescueChances,
    r.failedRescues,
    r.intercepts,
    r.threats,
    r.saves,
    r.dismounted,
    r.brokeAway,
    r.equipmentLost,
    r.mastery,
    r.hits,
  ])
    w.u32(v);
}
