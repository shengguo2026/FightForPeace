/**
 * M25 hostile channels (Stage 3 §7.2, audit rows 6.1, 6.2, 8.4): visible, interruptible
 * enemy actions against a protected unit or an evidence case. A free enemy is offered the
 * channel, walks to its spot and works it with an on-screen tell; any reaction (a hit, a
 * grab, a knock-down, a block), fleeing or defeat interrupts it, and it is offered again
 * after its cooldown. Run to its end, it counts once: the unit's hostile-action count rises
 * (until the unit is safe) or the unsealed case is disturbed. An active interference
 * station of the support robot pauses the working channel nearest to it.
 */
import { ENEMY_VARIANTS } from '../combat/heroes.gen';
import type { EnemyProfile } from '../combat/types';
import { ENEMIES } from '../combat/roster';
import { nonCombatant } from '../combat/damage';
import { isBoss } from '../enemies/boss';
import { profileOf } from '../enemies/data';
import { face, walkTo } from '../enemies/ai';
import { Intervention } from '../world/stage';
import { RobotState } from '../shared/state';
import { MoveState, type Fighter, type World } from '../world/types';
import { fx } from '../math/fixed';
import {
  CaseState,
  ChannelPhase,
  type HostileChannel,
  ObjEvent,
  UnitPhase,
  objectiveDefs,
  objectiveLog,
} from './state';

/** A channel's actor stands this close to its spot (each axis) to work it. */
const SPOT_X = fx(14);
const SPOT_Z = fx(10);
/** An actor that lost its way (knocked aside on the approach) is offered again this soon. */
const REOFFER = 30;

const WORKING_STATES: readonly number[] = [MoveState.Idle, MoveState.Walk];

function kitAllowed(f: Fighter, kits: readonly string[]): boolean {
  if (kits.length === 0) return true;
  const id = ENEMIES[f.hero]?.id ?? '';
  return kits.some((k) => k === id || (ENEMY_VARIANTS[k] ?? []).some(([v]) => v === id));
}

/** An enemy that may be offered a channel now. */
function free(world: World, f: Fighter): boolean {
  return (
    f.team === 'enemy' &&
    !f.ko &&
    !!profileOf(f) &&
    WORKING_STATES.includes(f.state) &&
    f.threat === 0 &&
    !nonCombatant(f) &&
    !isBoss(world, f) &&
    !f.ext?.disguised &&
    !f.ext?.rider
  );
}

/** The target of a channel is locked: the unit is safe or the case sealed. */
function targetLocked(world: World, i: number): boolean {
  const o = world.objectives!;
  const d = objectiveDefs(world)!.channels[i]!;
  return d.unit
    ? (o.units[d.target]?.locked ?? true)
    : (o.cases[d.target]?.state ?? CaseState.Sealed) === CaseState.Sealed;
}

function release(c: HostileChannel): void {
  c.actor = 0;
  c.paused = false;
}

/** The channel the robot's active interference pauses (index), or -1. */
function pausedChannel(world: World): number {
  const st = world.shared?.stations.find(
    (s) => s.kind === Intervention.Interfere && s.state === RobotState.Active,
  );
  if (!st) return -1;
  const defs = objectiveDefs(world)!.channels;
  let best = -1;
  let bestD = 0;
  world.objectives!.channels.forEach((c, i) => {
    if (c.phase !== ChannelPhase.Working) return;
    const d = defs[i]!;
    const dist = Math.abs(fx(d.x) - st.x) + Math.abs(fx(d.z) - st.z);
    if (best < 0 || dist < bestD) {
      best = i;
      bestD = dist;
    }
  });
  return best;
}

function complete(world: World, i: number): void {
  const o = world.objectives!;
  const d = objectiveDefs(world)!.channels[i]!;
  const c = o.channels[i]!;
  c.phase = ChannelPhase.Done;
  release(c);
  if (d.unit) {
    const u = o.units[d.target]!;
    if (!u.locked) u.count += 1;
    objectiveLog(world, ObjEvent.ChannelDone, i, u.count);
    return;
  }
  const k = o.cases[d.target]!;
  if (k.state !== CaseState.Sealed) {
    k.state = CaseState.Disturbed;
    k.disturbed = true;
    objectiveLog(world, ObjEvent.Disturbed, d.target, i);
  }
}

/**
 * Once per frame after hits: channels against locked targets close; working channels check
 * their actor (a reaction or defeat interrupts) and advance unless the robot pauses them;
 * idle channels whose time has come are offered to the nearest free enemy.
 */
export function stepChannels(world: World): void {
  const o = world.objectives;
  const defs = objectiveDefs(world);
  if (!o || !defs) return;
  const paused = pausedChannel(world);
  o.channels.forEach((c, i) => {
    if (c.phase === ChannelPhase.Done || c.phase === ChannelPhase.Closed) return;
    if (targetLocked(world, i)) {
      c.phase = ChannelPhase.Closed;
      release(c);
      return;
    }
    const d = defs.channels[i]!;
    if (c.phase === ChannelPhase.Approach || c.phase === ChannelPhase.Working) {
      const f = world.bodies.find((b) => b.id === c.actor);
      const ok = !!f && !f.ko && WORKING_STATES.includes(f.state) && !nonCombatant(f);
      if (!ok) {
        if (c.phase === ChannelPhase.Working) {
          c.stops += 1;
          c.readyAt = world.frame + d.cooldown;
          objectiveLog(world, ObjEvent.ChannelStopped, i, c.actor);
        } else c.readyAt = world.frame + REOFFER;
        c.phase = ChannelPhase.Idle;
        c.progress = 0;
        release(c);
        return;
      }
      if (c.phase !== ChannelPhase.Working) return;
      if (i === paused) {
        if (!c.paused) objectiveLog(world, ObjEvent.ChannelPaused, i);
        c.paused = true;
        return;
      }
      c.paused = false;
      c.progress += 1;
      if (c.progress >= d.tell) complete(world, i);
      return;
    }
    // Idle: offer it to the nearest free enemy (lowest id on a tie) not working another.
    if (world.frame < c.readyAt) return;
    const busy = new Set(o.channels.map((x) => x.actor));
    let best: Fighter | null = null;
    let bestD = 0;
    for (const f of world.bodies) {
      if (busy.has(f.id) || !free(world, f) || !kitAllowed(f, d.kits)) continue;
      const dist = Math.abs(f.x - fx(d.x)) + Math.abs(f.z - fx(d.z));
      if (best === null || dist < bestD || (dist === bestD && f.id < best.id)) {
        best = f;
        bestD = dist;
      }
    }
    if (!best) return;
    c.phase = ChannelPhase.Approach;
    c.actor = best.id;
    c.progress = 0;
  });
}

/**
 * The enemy AI's hook: an enemy offered a channel walks to its spot, then stands working
 * it (the tell) facing its target. Returns true while the enemy is busy with a channel.
 */
export function stepHostileChannel(world: World, f: Fighter, prof: EnemyProfile): boolean {
  const o = world.objectives;
  if (!o) return false;
  const i = o.channels.findIndex(
    (c) =>
      c.actor === f.id && (c.phase === ChannelPhase.Approach || c.phase === ChannelPhase.Working),
  );
  if (i < 0) return false;
  const defs = objectiveDefs(world)!;
  const d = defs.channels[i]!;
  const c = o.channels[i]!;
  const tx = d.unit ? o.units[d.target]!.x : fx(defs.cases[d.target]!.x);
  if (c.phase === ChannelPhase.Approach) {
    if (!walkTo(f, prof, fx(d.x), fx(d.z), SPOT_X, SPOT_Z)) return true;
    c.phase = ChannelPhase.Working;
    c.progress = 0;
    objectiveLog(world, ObjEvent.ChannelStart, i, f.id);
  }
  f.vx = 0;
  f.vz = 0;
  f.state = MoveState.Idle;
  face(f, tx);
  return true;
}

/** Share (0–1000) of a channel's tell done, for the HUD. */
export function channelProgress(world: World, i: number): number {
  const o = world.objectives;
  const d = objectiveDefs(world)?.channels[i];
  if (!o || !d) return 0;
  return Math.trunc((o.channels[i]!.progress * 1000) / d.tell);
}

/** Is any enemy (alive, combatant) inside a unit's protected zone right now? */
export function hostileInZone(world: World, unit: number): boolean {
  const o = world.objectives!;
  const d = objectiveDefs(world)!.units[unit]!;
  const u = o.units[unit]!;
  return world.bodies.some(
    (b) =>
      b.team === 'enemy' &&
      !b.ko &&
      !nonCombatant(b) &&
      Math.abs(b.x - u.x) <= fx(d.hw) &&
      Math.abs(b.z - u.z) <= fx(d.hd),
  );
}

/** Units still exposed (not safe). */
export function exposed(world: World, unit: number): boolean {
  return (world.objectives?.units[unit]?.phase ?? UnitPhase.Safe) !== UnitPhase.Safe;
}
