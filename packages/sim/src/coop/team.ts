import { ActionBit } from '../input/bits';
import { startAction } from '../combat/actions';
import { nonCombatant } from '../combat/damage';
import { METER } from '../combat/meter';
import { inReaction, interrupt } from '../combat/reactions';
import { kitOf } from '../combat/roster';
import { HEROES } from '../combat/roster';
import type { TeamFinisherDef } from '../combat/types';
import { bossResists } from '../enemies/boss';
import {
  CoopEvent,
  type Fighter,
  type FrameInput,
  MoveState,
  TeamDenied,
  type World,
} from '../world/types';
import { TEAM_FINISHERS, logCoop } from './data';
import { partnerOf, targetState } from './handoff';
import { tally } from '../stage/tally';

/**
 * Authored Team Finishers with Invite and Confirm (F&D §6.5): an eligible hero presses
 * Team Attack, the partner must press it too inside the confirmation window. On
 * confirmation everything is checked again, then both costs are committed atomically and
 * both heroes begin their part. Declined, expired or invalid invitations spend nothing.
 * Same-frame presses merge into one request that both players have already confirmed.
 */

/** States in which a hero is active and controllable enough to join a team finisher. */
const BUSY = new Set<number>([
  MoveState.Air,
  MoveState.Grabbing,
  MoveState.Grabbed,
  MoveState.Restrained,
  MoveState.Blockstun,
  MoveState.GuardCrush,
  MoveState.Counter,
  MoveState.CounterMiss,
  MoveState.Breaker,
  MoveState.Recoil,
  MoveState.Pickup,
  MoveState.Defeated,
]);

function controllable(world: World, f: Fighter): boolean {
  if (BUSY.has(f.state) || inReaction(f)) return false;
  // Already performing a team part.
  const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
  return !(f.state === MoveState.Attack && a?.category === 'team');
}

function tagsOf(f: Fighter): readonly string[] {
  return HEROES[f.hero]?.tags ?? [];
}

/** The first finisher whose pair matches the two heroes' tags (either order). */
export function finisherFor(a: Fighter, b: Fighter): number {
  const ta = tagsOf(a);
  const tb = tagsOf(b);
  return TEAM_FINISHERS.findIndex(
    (f) =>
      (ta.includes(f.pair[0]!) && tb.includes(f.pair[1]!)) ||
      (ta.includes(f.pair[1]!) && tb.includes(f.pair[0]!)),
  );
}

function moveIndex(f: Fighter, fin: TeamFinisherDef): number {
  const kit = kitOf(f);
  return kit ? kit.actions.findIndex((x) => x.id === fin.move && x.category === 'team') : -1;
}

function inRange(fin: TeamFinisherDef, h: Fighter, t: Fighter): boolean {
  return Math.abs(t.x - h.x) <= fin.rangeX && Math.abs(t.z - h.z) <= fin.rangeZ;
}

function hasMeter(world: World, f: Fighter, fin: TeamFinisherDef): boolean {
  return world.infiniteMeter || f.meter >= fin.cost * METER.unit;
}

/** An enemy the finisher may take: authored target state, open combo, unprotected. */
function targetOk(world: World, fin: TeamFinisherDef, t: Fighter): boolean {
  return (
    t.team === 'enemy' &&
    t.ctx.open &&
    !t.protectedRecovery &&
    !t.cinematic &&
    t.grabbedBy === 0 &&
    !nonCombatant(t) &&
    (fin.bossStrike || !bossResists(world, t)) &&
    fin.targets.includes(targetState(t))
  );
}

/** Nearest valid target in range of `h` (then the lower id). */
function pickTarget(world: World, fin: TeamFinisherDef, h: Fighter): Fighter | null {
  let best: Fighter | null = null;
  let bestD = 0;
  for (const t of [...world.bodies].sort((p, q) => p.id - q.id)) {
    if (!targetOk(world, fin, t) || !inRange(fin, h, t)) continue;
    const dx = Math.trunc((t.x - h.x) / 256);
    const dz = Math.trunc((t.z - h.z) / 256);
    const d = dx * dx + dz * dz;
    if (best === null || d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** Why `a` (with partner `b`) cannot start or commit a finisher on `t`; None if it can. */
function denial(
  world: World,
  a: Fighter,
  b: Fighter | undefined,
  t: Fighter | null,
  full: boolean,
): number {
  if (!b) return TeamDenied.NoPartner;
  const fi = finisherFor(a, b);
  const fin = TEAM_FINISHERS[fi];
  if (!fin || moveIndex(a, fin) < 0 || moveIndex(b, fin) < 0) return TeamDenied.Pairing;
  if (!controllable(world, a) || (full && !controllable(world, b))) return TeamDenied.Busy;
  if (!hasMeter(world, a, fin) || !hasMeter(world, b, fin)) return TeamDenied.Meter;
  if (!t || !targetOk(world, fin, t) || !inRange(fin, a, t)) return TeamDenied.NoTarget;
  if (full && !inRange(fin, b, t)) return TeamDenied.Range;
  return TeamDenied.None;
}

const byId = (world: World, id: number) => world.bodies.find((b) => b.id === id);

/**
 * Team Attack presses of this frame, before the heroes move. `inputs[slot]` drives the
 * hero of player slot `slot`.
 */
export function stepTeam(world: World, inputs: readonly (FrameInput | undefined)[]): void {
  const inv = world.coop.invite;
  if (inv && world.frame > inv.until) {
    logCoop(world, CoopEvent.Expired, inv.from, 0, inv.target, inv.finisher);
    world.coop.invite = null;
  }
  const pressers = world.bodies
    .filter(
      (b) =>
        b.team === 'hero' &&
        b.state !== MoveState.Defeated &&
        ((inputs[b.slot]?.pressed ?? 0) & ActionBit.TeamAttack) !== 0,
    )
    .sort((p, q) => p.id - q.id);
  if (pressers.length === 0) return;

  const invite = world.coop.invite;
  if (invite) {
    const partner = pressers.find((p) => p.id !== invite.from);
    if (!partner) return;
    // Confirmation: revalidate both heroes, the target, range and meter.
    world.coop.invite = null;
    const from = byId(world, invite.from);
    const t = byId(world, invite.target) ?? null;
    const why = from ? denial(world, from, partner, t, true) : TeamDenied.NoPartner;
    if (why !== TeamDenied.None || !from || !t) {
      logCoop(world, CoopEvent.Invalid, partner.id, invite.from, invite.target, why);
      return;
    }
    logCoop(world, CoopEvent.Confirm, partner.id, from.id, t.id, invite.finisher);
    commit(world, TEAM_FINISHERS[invite.finisher]!, from, partner, t);
    return;
  }

  const a = pressers[0]!;
  const b = partnerOf(world, a);
  const fi = b ? finisherFor(a, b) : -1;
  const fin = TEAM_FINISHERS[fi];
  const t = fin ? pickTarget(world, fin, a) : null;
  if (pressers.length >= 2 && b) {
    // Simultaneous invitations merge into one request; both already took part.
    const why = denial(world, a, b, t, true);
    if (why !== TeamDenied.None || !t) {
      logCoop(world, CoopEvent.Unavailable, a.id, b.id, t?.id ?? 0, why);
      return;
    }
    logCoop(world, CoopEvent.Merged, a.id, b.id, t.id, fi);
    commit(world, fin!, a, b, t);
    return;
  }
  const why = denial(world, a, b, t, false);
  if (why !== TeamDenied.None || !t) {
    logCoop(world, CoopEvent.Unavailable, a.id, b?.id ?? 0, t?.id ?? 0, why);
    return;
  }
  world.coop.invite = {
    from: a.id,
    target: t.id,
    finisher: fi,
    at: world.frame,
    until: world.frame + fin!.confirm - 1,
  };
  logCoop(world, CoopEvent.Invite, a.id, b!.id, t.id, fi);
}

/**
 * Atomic commit: both costs, the authored reposition (each hero on opposite sides of the
 * target), the target held for the strike, and both team parts begin together.
 */
function commit(world: World, fin: TeamFinisherDef, a: Fighter, b: Fighter, t: Fighter): void {
  // M21: the twins' Accord counts for Guardians in Accord (both heroes committed).
  if (fin.id === 'twin-accord') tally(world, 'accord');
  for (const h of [a, b]) if (!world.infiniteMeter) h.meter -= fin.cost * METER.unit;
  const side = a.x <= t.x ? -1 : 1;
  const { minX, maxX } = world.bounds;
  const clamp = (x: number) => (x < minX ? minX : x > maxX ? maxX : x);
  let hold = 0;
  for (const [h, s] of [
    [a, side],
    [b, -side],
  ] as const) {
    const index = moveIndex(h, fin);
    interrupt(h);
    h.x = clamp(t.x + s * fin.place);
    h.z = t.z;
    h.y = 0;
    h.facing = h.x > t.x ? -1 : h.x < t.x ? 1 : (-s as 1 | -1);
    startAction(h, index);
    // The part begins with this frame's hero step (frame 0 of the action).
    h.stateFrame = -1;
    // Both players opted in: neither can be interrupted until the part ends.
    h.cinematic = true;
    const move = kitOf(h)!.actions[index]!;
    hold = Math.max(hold, move.startup + 4);
  }
  // The target is held in place for the strike (it was already in an authored state).
  interrupt(t);
  t.state = MoveState.Hitstun;
  t.stateFrame = 0;
  t.stun = hold;
  t.x = clamp(t.x);
  t.y = 0;
  t.vx = 0;
  t.vy = 0;
  t.vz = 0;
  t.airRecover = false;
  t.bounce = 0;
  t.handoff = 0;
  t.handoffFrom = 0;
  t.handoffRow = 0;
}

/** Frames left to confirm the pending invitation (0 = none), for the cue and the Lab. */
export function inviteLeft(world: World): number {
  const i = world.coop.invite;
  return i ? Math.max(0, i.until - world.frame + 1) : 0;
}
