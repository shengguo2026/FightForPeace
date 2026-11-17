/**
 * M24 shared systems (Combat Constitution audit): the state of the generic engine features
 * later stages express as data. Everything here is plain data in the world. A world that
 * uses none of it has no `shared` field and encodes exactly as before M24, so every Stage 1
 * and Stage 2 replay keeps its hash.
 */
import type { ByteWriter } from '../state/encode';
import type { Fighter, Item, World } from '../world/types';

/** Moving-hazard phases. Numbers are encoded; never renumber. */
export const MoverPhase = { Rest: 0, Warn: 1, Active: 2, Done: 3 } as const;

/** A moving hazard (all positions fixed point). */
export interface Mover {
  id: number;
  x: number;
  z: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  hw: number;
  hd: number;
  h: number;
  phase: number;
  phaseFrame: number;
  /** Frames before the first warning, then the rest between cycles. */
  start: number;
  rest: number;
  warn: number;
  active: number;
  damage: number;
  redirect: string;
  /** Redirected this cycle by this hero (0 = not): it then strikes enemies only. */
  redirectedBy: number;
  cycles: number;
  done: number;
  tags: string[];
  /** Fighters it already struck this cycle. */
  hitIds: number[];
  /**
   * M27 triggered mover: the device kind that releases it, and releases still to run.
   * Absent on scheduled movers (their encoding is unchanged).
   */
  trigger?: string;
  released?: number;
}

/** A moving platform (fixed point). */
export interface Platform {
  id: number;
  x: number;
  z: number;
  hw: number;
  hd: number;
  x0: number;
  x1: number;
  speed: number;
  /** Travel direction (1 towards x1, -1 towards x0) and frames left of the wait at an end. */
  dir: number;
  wait: number;
  waitLeft: number;
  /** How far it moved this frame (fixed point), for the bodies it carries. */
  moved: number;
}

/** A player-attributed property incident (one per damage cluster, for M25's ledgers). */
export interface Incident {
  cluster: number;
  frame: number;
  by: number;
  prop: number;
}

/** Support-robot request states (Stage 6 §13). Numbers are encoded; never renumber. */
export const RobotState = {
  Unused: 0,
  Approaching: 1,
  Disrupted: 2,
  Cooldown: 3,
  Active: 4,
  Consumed: 5,
} as const;

export interface Station {
  id: number;
  x: number;
  z: number;
  kind: number;
  state: number;
  frame: number;
  /** The one retry after a disruption is still available. */
  retry: boolean;
  approach: number;
  frames: number;
  cooldown: number;
  cover: { x: number; z: number; hw: number; hd: number; h: number } | null;
  /** Scenery id of the deployed cover (0 = none). */
  coverId: number;
}

/** The single-use cache of a solo hand-over (Stage 5 §9.2). */
export interface Cache {
  slot: number;
  /** Weapon registry index, integrity and rounds of the stowed weapon (-1 = none). */
  weapon: number;
  integrity: number;
  ammo: number;
  /** Provision registry index (-1 = none). */
  provision: number;
  claimed: boolean;
}

/** M24 events for the Lab and tests. Numbers are encoded; never renumber. */
export const SharedEvent = {
  None: 0,
  MoverWarn: 1,
  MoverHit: 2,
  Redirect: 3,
  Opened: 4,
  Incident: 5,
  GearBlock: 6,
  GearBreak: 7,
  PassWarn: 8,
  PassHit: 9,
  Dismount: 10,
  RivalFloor: 11,
  Withdraw: 12,
  Feint: 13,
  Reveal: 14,
  Blast: 15,
  Eat: 16,
  HeatLock: 17,
  HandOver: 18,
  CacheClaim: 19,
  SupportAction: 20,
  RobotRequest: 21,
  RobotDisrupted: 22,
  RobotActive: 23,
  RobotConsumed: 24,
  Refused: 25,
} as const;

export interface SharedLog {
  kind: number;
  frame: number;
  a: number;
  b: number;
}

export interface SharedState {
  movers: Mover[];
  platforms: Platform[];
  incidents: Incident[];
  stations: Station[];
  /** Only one robot intervention runs at a time: its station id (0 = none). */
  robotBusy: number;
  /** The next wave waits until this frame (Reserve Delay). */
  delayUntil: number;
  caches: Cache[];
  log: SharedLog;
  /** Events so far (Lab counter). */
  events: number;
}

/** Mounted fighter in an on-foot arena. */
export const PassPhase = { Rest: 0, Warn: 1, Pass: 2, Dismounted: 3 } as const;

export interface MountedRiderState {
  stability: number;
  max: number;
  phase: number;
  frame: number;
  /** Lane depth of the current pass (fixed point) and its direction. */
  lane: number;
  dir: number;
  hitIds: number[];
}

/** Co-op supporter (Stage 5 §9.3): authored one-shot actions, each used or not. */
export interface SupportState {
  /** Bit per action: 1 = used. */
  used: number;
  count: number;
}

/** Per-fighter M24 state; only present on fighters that use a feature. */
export interface FighterExt {
  /** Remaining Guard per gear piece (profile order); 0 = broken. */
  gear: number[];
  rider: MountedRiderState | null;
  /** Rival: the frame it reached its floor (0 = not yet). */
  floorAt: number;
  disguised: boolean;
  /** Spawn frame (disguise reveal timing). */
  born: number;
  /** Feint: action frame at which the running attack stops (0 = none); feints so far. */
  feintAt: number;
  feints: number;
  /** Heavy weapon heat and the frame its lock ends. */
  heat: number;
  heatLock: number;
  support: SupportState | null;
}

export function newShared(): SharedState {
  return {
    movers: [],
    platforms: [],
    incidents: [],
    stations: [],
    robotBusy: 0,
    delayUntil: 0,
    caches: [],
    log: { kind: 0, frame: 0, a: 0, b: 0 },
    events: 0,
  };
}

/** The world's shared state, created on first use. */
export function ensureShared(world: World): SharedState {
  world.shared ??= newShared();
  return world.shared;
}

export function newExt(world: World): FighterExt {
  return {
    gear: [],
    rider: null,
    floorAt: 0,
    disguised: false,
    born: world.frame,
    feintAt: 0,
    feints: 0,
    heat: 0,
    heatLock: 0,
    support: null,
  };
}

/** The fighter's M24 state, created on first use (this also creates the world's). */
export function extOf(world: World, f: Fighter): FighterExt {
  ensureShared(world);
  f.ext ??= newExt(world);
  return f.ext;
}

export function sharedLog(world: World, kind: number, a = 0, b = 0): void {
  const s = ensureShared(world);
  s.log = { kind, frame: world.frame, a, b };
  s.events += 1;
}

/**
 * Appends the M24 state to the canonical encoding. Absent state writes nothing, so worlds
 * without M24 features hash exactly as before.
 */
export function encodeShared(w: ByteWriter, world: World): void {
  const s = world.shared;
  if (!s) return;
  w.u8(0xa4);
  w.u32(s.movers.length);
  for (const m of s.movers) {
    for (const v of [m.id, m.x, m.z, m.x0, m.z0, m.x1, m.z1, m.hw, m.hd, m.h]) w.i32(v);
    w.u8(m.phase);
    for (const v of [m.phaseFrame, m.start, m.rest, m.warn, m.active, m.damage]) w.i32(v);
    w.u32(m.redirectedBy);
    w.u32(m.cycles);
    w.u32(m.done);
    w.u32(m.hitIds.length);
    for (const id of m.hitIds) w.u32(id);
    // M27: only triggered movers carry their pending releases.
    if (m.trigger) w.u32(m.released ?? 0);
  }
  w.u32(s.platforms.length);
  for (const p of s.platforms) {
    for (const v of [p.id, p.x, p.z, p.hw, p.hd, p.x0, p.x1, p.speed, p.dir, p.wait, p.waitLeft])
      w.i32(v);
    w.i32(p.moved);
  }
  w.u32(s.incidents.length);
  for (const i of s.incidents) for (const v of [i.cluster, i.frame, i.by, i.prop]) w.i32(v);
  w.u32(s.stations.length);
  for (const st of s.stations) {
    for (const v of [st.id, st.x, st.z, st.kind, st.state, st.frame]) w.i32(v);
    w.u8(st.retry ? 1 : 0);
    w.u32(st.coverId);
  }
  w.u32(s.robotBusy);
  w.i32(s.delayUntil);
  w.u32(s.caches.length);
  for (const c of s.caches) {
    for (const v of [c.slot, c.weapon, c.integrity, c.ammo, c.provision]) w.i32(v);
    w.u8(c.claimed ? 1 : 0);
  }
  w.u8(s.log.kind);
  w.i32(s.log.frame);
  w.i32(s.log.a);
  w.i32(s.log.b);
  w.u32(s.events);
  const bodies = world.bodies.filter((b) => b.ext).sort((a, b) => a.id - b.id);
  w.u32(bodies.length);
  for (const b of bodies) {
    const e = b.ext!;
    w.u32(b.id);
    w.u32(e.gear.length);
    for (const g of e.gear) w.i32(g);
    const r = e.rider;
    w.u8(r ? 1 : 0);
    if (r) {
      for (const v of [r.stability, r.max, r.phase, r.frame, r.lane, r.dir]) w.i32(v);
      w.u32(r.hitIds.length);
      for (const id of r.hitIds) w.u32(id);
    }
    w.i32(e.floorAt);
    w.u8(e.disguised ? 1 : 0);
    w.i32(e.born);
    w.i32(e.feintAt);
    w.u32(e.feints);
    w.i32(e.heat);
    w.i32(e.heatLock);
    w.u8(e.support ? 1 : 0);
    if (e.support) {
      w.u32(e.support.used);
      w.u32(e.support.count);
    }
  }
  const items = world.items.filter((i: Item) => i.fuseAt !== undefined).sort((a, b) => a.id - b.id);
  w.u32(items.length);
  for (const i of items) {
    w.u32(i.id);
    w.i32(i.fuseAt!);
  }
}
