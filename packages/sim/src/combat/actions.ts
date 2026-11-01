import { ActionBit, DirBit } from '../input/bits';
import type { MovementProfile } from '../movement/profile';
import { type Fighter, type FrameInput, MoveState, type World } from '../world/types';
import { HEROES, activeSpan, dirMatches, findAction } from './roster';
import {
  type ActionDef,
  CANCEL_TIMING,
  Dir,
  type InputContext,
  type LinkDef,
  Reject,
} from './types';

/** Destination codes for the Lab verdict log (action links use the action index ≥ 0). */
export const VerdictTo = { None: -1, Jump: -2, Dash: -3, Special: -4, Ultimate: -5 } as const;

const LINK_CODE: Record<LinkDef['kind'], number> = {
  action: 0,
  jump: VerdictTo.Jump,
  dash: VerdictTo.Dash,
  special: VerdictTo.Special,
  ultimate: VerdictTo.Ultimate,
};

/** Remembers the most recently pressed cardinal direction (horizontal wins a same-frame tie). */
export function noteCardinal(f: Fighter, dirPressed: number): void {
  for (const bit of [DirBit.up, DirBit.down, DirBit.left, DirBit.right]) {
    if (dirPressed & bit) f.lastCardinal = bit;
  }
}

/**
 * Direction at input acceptance (spec §5.3): Forward/Backward against the current
 * facing, Up/Down in stage depth; with both axes held the most recent press decides.
 */
export function resolveDir(f: Fighter, input: FrameInput): number {
  const { moveX: hx, moveZ: hz } = input;
  const horizontal = hx === 0 ? Dir.Neutral : hx === f.facing ? Dir.Forward : Dir.Backward;
  const depth = hz === 0 ? Dir.Neutral : hz < 0 ? Dir.Up : Dir.Down;
  if (horizontal === Dir.Neutral) return depth;
  if (depth === Dir.Neutral) return horizontal;
  const lastIsDepth = f.lastCardinal === DirBit.up || f.lastCardinal === DirBit.down;
  return lastIsDepth ? depth : horizontal;
}

export function actionOf(f: Fighter, index = f.action): ActionDef | undefined {
  return index >= 0 && f.hero >= 0 ? HEROES[f.hero]?.actions[index] : undefined;
}

/** Selects the action for a fresh press in a context, or -1. */
export function selectAction(f: Fighter, context: InputContext, dir: number): number {
  const hero = HEROES[f.hero];
  return hero ? findAction(hero, context, dir) : -1;
}

/** Starts an action. Aerial actions keep the current momentum; ground actions root the hero. */
export function startAction(f: Fighter, index: number): void {
  const a = actionOf(f, index)!;
  f.state = MoveState.Attack;
  f.stateFrame = 0;
  f.action = index;
  f.attackKind = a.category === 'low' ? ActionBit.LowAttack : ActionBit.Attack;
  f.contactAt = -1;
  f.contactIds = [];
  f.contactScales = [];
  f.hitSeg = -1;
  f.hitIds = [];
  f.reqLink = -1;
  f.reqFrame = 0;
  f.chainUsed |= 1 << index;
  f.ghost = a.tags.includes('passThrough');
  if (a.category === 'aerial') {
    f.airUsed = true;
  } else {
    f.vx = 0;
    f.vz = 0;
    f.vy = 0;
    f.dirX = 0;
    f.dirZ = 0;
  }
}

function logVerdict(f: Fighter, frame: number, to: number, reject: number): void {
  f.verdictTo = to;
  f.verdictReject = reject;
  f.verdictFrame = frame;
}

function linkCode(l: LinkDef): number {
  return l.kind === 'action' ? l.to : LINK_CODE[l.kind];
}

export interface CancelPress {
  kind: LinkDef['kind'];
  dir: number;
}

/** Converts this frame's presses into cancel presses, in a fixed priority order. */
export function cancelPresses(
  input: FrameInput,
  dashRequested: boolean,
  dir: number,
): CancelPress[] {
  const out: CancelPress[] = [];
  if (input.pressed & (ActionBit.Attack | ActionBit.LowAttack)) out.push({ kind: 'action', dir });
  if (input.pressed & ActionBit.Special) out.push({ kind: 'special', dir });
  if (input.pressed & ActionBit.Ultimate) out.push({ kind: 'ultimate', dir });
  if (input.pressed & ActionBit.Jump) out.push({ kind: 'jump', dir });
  if (dashRequested) out.push({ kind: 'dash', dir: Dir.Forward });
  return out;
}

export type PressOutcome = 'queued' | 'rejected' | 'unlinked';

/**
 * Reason-aware cancel handling for one press during an action. A valid link is queued
 * (replacing an older valid one); an invalid press is logged with its reason and never
 * replaces a queued link. 'unlinked' lets the caller fall back to the fresh-start buffer.
 */
export function pressDuringAction(
  world: World,
  f: Fighter,
  a: ActionDef,
  press: CancelPress,
): PressOutcome {
  const frame = world.frame;
  const n = f.stateFrame + 1;
  const index = a.links.findIndex((l) => l.kind === press.kind && dirMatches(l.dir, press.dir));
  if (index === -1) {
    logVerdict(f, frame, VerdictTo.None, Reject.Unlinked);
    return 'unlinked';
  }
  const link = a.links[index]!;
  const reject = (reason: number): PressOutcome => {
    logVerdict(f, frame, linkCode(link), reason);
    return 'rejected';
  };
  if (link.kind === 'special' || link.kind === 'ultimate') return reject(Reject.NotYet);
  if (link.kind === 'action' && (f.chainUsed & (1 << link.to)) !== 0)
    return reject(Reject.AlreadyUsed);
  const targets = contactTargets(world, f);
  if (targets.some((t) => t.ctx.exhausted)) return reject(Reject.StunExhausted);
  if (link.premium > 0 && !world.infiniteMeter && f.meter < link.premium)
    return reject(Reject.NoMeter);
  if (link.category === 'dashBridge' && targets.some((t) => t.ctx.bridgeUsed))
    return reject(Reject.BridgeSpent);
  const timing = CANCEL_TIMING[link.category];
  const activeEnd = a.startup + activeSpan(a);
  if (f.contactAt >= 0) {
    if (n > f.contactAt + timing.window) return reject(Reject.TooLate);
    if (!link.onHit && !link.onGuard) return reject(Reject.NeedsHit);
  } else if (n > activeEnd && !link.onWhiff) {
    return reject(Reject.NeedsHit);
  }
  f.reqLink = index;
  f.reqFrame = n;
  logVerdict(f, frame, linkCode(link), Reject.None);
  return 'queued';
}

function contactTargets(world: World, f: Fighter): Fighter[] {
  return world.bodies.filter((b) => f.contactIds.includes(b.id));
}

/**
 * Decides on a queued link this frame: 'fire' (start the destination now), 'wait', or a
 * late rejection (contact never came, or came too late for an early press).
 */
export function queuedLink(world: World, f: Fighter, a: ActionDef): LinkDef | null {
  if (f.reqLink < 0) return null;
  const link = a.links[f.reqLink]!;
  const timing = CANCEL_TIMING[link.category];
  const n = f.stateFrame + 1;
  const activeEnd = a.startup + activeSpan(a);
  const drop = (reason: number): null => {
    logVerdict(f, world.frame, linkCode(link), reason);
    f.reqLink = -1;
    return null;
  };
  if (f.contactAt >= 0) {
    if (f.reqFrame < f.contactAt - timing.buffer) return drop(Reject.TooEarly);
    if (n <= activeEnd) return null;
    if (link.premium > 0 && !world.infiniteMeter && f.meter < link.premium)
      return drop(Reject.NoMeter);
    return link;
  }
  if (n <= activeEnd) return null;
  if (link.onWhiff) return link;
  return drop(Reject.NeedsHit);
}

/** Pays for a premium transition and records the bridge on every target this action hit. */
export function commitLink(world: World, f: Fighter, link: LinkDef): void {
  if (link.premium > 0 && !world.infiniteMeter) f.meter -= link.premium;
  if (link.category === 'dashBridge') {
    for (const t of contactTargets(world, f)) t.ctx.bridgeUsed = true;
  }
  f.reqLink = -1;
}

/** Applies the action's movement samples for action frame n (1-based). */
export function applyActionMovement(
  f: Fighter,
  a: ActionDef,
  n: number,
  input: FrameInput,
  p: MovementProfile,
): void {
  const s = a.moves.find((m) => n >= m.from && n <= m.to);
  const aerial = a.category === 'aerial';
  if (s) {
    if (s.forward !== null) f.vx = s.forward * f.facing;
    else if (!aerial) f.vx = 0;
    const depthSign = s.depthFromInput ? input.moveZ : 1;
    if (s.depth !== 0 || !aerial) f.vz = s.depth * depthSign || 0;
    if (s.vy !== null && n === s.from) f.vy = s.vy;
  } else if (!aerial) {
    f.vx = 0;
    f.vz = 0;
  }
  f.x += f.vx;
  f.z += f.vz;
  if (aerial) {
    f.y += f.vy;
    f.vy -= p.gravity;
  }
}

/** Frames left in a grounded action after action frame n. */
export function framesLeft(a: ActionDef, n: number): number {
  return a.startup + activeSpan(a) + (a.landing ? 0 : a.recovery) - n;
}
