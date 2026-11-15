/**
 * M25 objective framework (campaign review G13): the state of protected units, evidence
 * cases and hostile channels. Everything is plain data in `world.objectives`; a world
 * without objectives has no such field and encodes exactly as before M25, so every Stage 1
 * and Stage 2 replay keeps its hash.
 */
import { fx } from '../math/fixed';
import { OBJECTIVES_DATA } from '../combat/heroes.gen';
import type { ArenaObjectivesDef, LadderDef, ObjectivesDef, OutcomeDef } from '../combat/types';
import type { ByteWriter } from '../state/encode';
import type { World } from '../world/types';
import { ARENAS } from '../enemies/data';

export const OBJECTIVES: ObjectivesDef = OBJECTIVES_DATA;

/** Protected-unit phases. Numbers are encoded; never renumber. */
export const UnitPhase = { Captive: 0, Freed: 1, Moving: 2, Waiting: 3, Safe: 4 } as const;
/** Evidence-case states. Numbers are encoded; never renumber. */
export const CaseState = {
  Present: 0,
  Collected: 1,
  Sealed: 2,
  Disturbed: 3,
  Recovered: 4,
} as const;
/** Hostile-channel phases. Numbers are encoded; never renumber. */
export const ChannelPhase = { Idle: 0, Approach: 1, Working: 2, Done: 3, Closed: 4 } as const;
/** What a hero holds Interact for. Numbers are encoded; never renumber. */
export const HoldKind = { None: 0, Free: 1, Collect: 2, Seal: 3, Recover: 4 } as const;

/** Objective events for the HUD, captions and tests (the last one is kept). Never renumber. */
export const ObjEvent = {
  None: 0,
  Freed: 1,
  Waiting: 2,
  Moving: 3,
  Safe: 4,
  ChannelStart: 5,
  ChannelStopped: 6,
  ChannelDone: 7,
  ChannelPaused: 8,
  Collected: 9,
  Sealed: 10,
  Disturbed: 11,
  Recovered: 12,
  Restored: 13,
} as const;

export interface ProtectedUnit {
  /** Fixed-point position. */
  x: number;
  z: number;
  phase: number;
  /** Frame the phase began. */
  since: number;
  /** Completed hostile actions against the unit. */
  count: number;
  /** The count no longer changes (the unit reached safety). */
  locked: boolean;
  /** Index of the route waypoint it walks to next. */
  leg: number;
}

export interface EvidenceCase {
  state: number;
  /** A hostile action disturbed it at least once (it can at best be Recovered). */
  disturbed: boolean;
}

export interface HostileChannel {
  phase: number;
  /** The enemy working it (fighter id, 0 = none). */
  actor: number;
  progress: number;
  /** Frame from which it is offered to an enemy. */
  readyAt: number;
  /** Times a hero interrupted it. */
  stops: number;
  /** The support robot's interference holds it this frame. */
  paused: boolean;
}

export interface ObjectiveHold {
  kind: number;
  target: number;
  progress: number;
  need: number;
}

export interface ObjectiveLog {
  kind: number;
  frame: number;
  a: number;
  b: number;
}

export interface ObjectiveState {
  /** Arena index whose `objectives` this state follows. */
  arena: number;
  units: ProtectedUnit[];
  cases: EvidenceCase[];
  channels: HostileChannel[];
  /** Per player slot: the Interact hold in progress. */
  hold: ObjectiveHold[];
  log: ObjectiveLog;
  /** Events so far (Lab counter). */
  events: number;
}

/** A checkpoint copy of the objective state (kept by the stage run or the Lab). */
export interface ObjectiveCheckpoint {
  units: ProtectedUnit[];
  cases: EvidenceCase[];
  channels: HostileChannel[];
}

export function idleHold(): ObjectiveHold {
  return { kind: HoldKind.None, target: 0, progress: 0, need: 0 };
}

/** The objective definitions of the world's objective state. */
export function objectiveDefs(world: World): ArenaObjectivesDef | null {
  const o = world.objectives;
  return o ? (ARENAS[o.arena]?.objectives ?? null) : null;
}

export function ladderOf(id: string): LadderDef {
  const l = OBJECTIVES.ladders.find((x) => x.id === id);
  if (!l) throw new Error(`unknown ladder "${id}"`);
  return l;
}

export function outcomeOf(id: string): OutcomeDef {
  const o = OBJECTIVES.outcomes.find((x) => x.id === id);
  if (!o) throw new Error(`unknown outcome "${id}"`);
  return o;
}

/** Builds the objective state of an arena that has objectives (else leaves the world alone). */
export function setupObjectives(world: World, arena: number): void {
  const def = ARENAS[arena]?.objectives;
  if (!def) return;
  world.objectives = {
    arena,
    units: def.units.map((u) => ({
      x: fx(u.x),
      z: fx(u.z),
      phase: UnitPhase.Captive,
      since: world.frame,
      count: 0,
      locked: false,
      leg: 0,
    })),
    cases: def.cases.map(() => ({ state: CaseState.Present, disturbed: false })),
    channels: def.channels.map((c) => ({
      phase: ChannelPhase.Idle,
      actor: 0,
      progress: 0,
      readyAt: world.frame + c.start,
      stops: 0,
      paused: false,
    })),
    hold: [idleHold(), idleHold()],
    log: { kind: ObjEvent.None, frame: 0, a: 0, b: 0 },
    events: 0,
  };
}

export function objectiveLog(world: World, kind: number, a = 0, b = 0): void {
  const o = world.objectives;
  if (!o) return;
  o.log = { kind, frame: world.frame, a, b };
  o.events += 1;
}

// --- checkpoints ----------------------------------------------------------------------------

/** A copy of the objective state for a checkpoint (null: the world has none). */
export function objectiveCheckpoint(world: World): ObjectiveCheckpoint | null {
  const o = world.objectives;
  if (!o) return null;
  return {
    units: o.units.map((u) => ({ ...u })),
    cases: o.cases.map((c) => ({ ...c })),
    channels: o.channels.map((c) => ({ ...c })),
  };
}

/**
 * Returns to a checkpoint, except what has locked since: a unit that reached safety and a
 * sealed case keep their final state (restarts never erase a rescue, a condition grade or
 * evidence, nor let them happen twice), and so do the channels against them. Everything
 * else takes its checkpoint state; a channel that was being worked waits to be offered again.
 */
export function restoreObjectives(world: World, cp: ObjectiveCheckpoint): void {
  const o = world.objectives;
  const def = objectiveDefs(world);
  if (!o || !def) return;
  const keepUnit = o.units.map((u) => u.locked);
  const keepCase = o.cases.map((c) => c.state === CaseState.Sealed);
  o.units = o.units.map((u, i) => (keepUnit[i] ? u : { ...cp.units[i]! }));
  o.cases = o.cases.map((c, i) => (keepCase[i] ? c : { ...cp.cases[i]! }));
  o.channels = o.channels.map((c, i) => {
    const d = def.channels[i]!;
    if (d.unit ? keepUnit[d.target] : keepCase[d.target]) return c;
    const back = { ...cp.channels[i]! };
    if (back.phase === ChannelPhase.Approach || back.phase === ChannelPhase.Working) {
      back.phase = ChannelPhase.Idle;
      back.progress = 0;
      back.readyAt = world.frame + d.cooldown;
    }
    back.actor = 0;
    back.paused = false;
    return back;
  });
  o.hold = [idleHold(), idleHold()];
  objectiveLog(world, ObjEvent.Restored);
}

// --- encoding -------------------------------------------------------------------------------

/** Appends the objective state; absent state writes nothing (older worlds hash as before). */
export function encodeObjectives(w: ByteWriter, world: World): void {
  const o = world.objectives;
  if (!o) return;
  w.u8(0xa5);
  w.u32(o.arena);
  w.u32(o.units.length);
  for (const u of o.units) {
    for (const v of [u.x, u.z, u.since, u.count, u.leg]) w.i32(v);
    w.u8(u.phase);
    w.u8(u.locked ? 1 : 0);
  }
  w.u32(o.cases.length);
  for (const c of o.cases) {
    w.u8(c.state);
    w.u8(c.disturbed ? 1 : 0);
  }
  w.u32(o.channels.length);
  for (const c of o.channels) {
    w.u8(c.phase);
    w.u32(c.actor);
    for (const v of [c.progress, c.readyAt, c.stops]) w.i32(v);
    w.u8(c.paused ? 1 : 0);
  }
  for (const h of o.hold) {
    w.u8(h.kind);
    for (const v of [h.target, h.progress, h.need]) w.i32(v);
  }
  w.u8(o.log.kind);
  for (const v of [o.log.frame, o.log.a, o.log.b]) w.i32(v);
  w.u32(o.events);
}
