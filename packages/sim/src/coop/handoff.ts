import { type ActionDef, TargetState } from '../combat/types';
import { CoopEvent, type Fighter, MoveState, type World } from '../world/types';
import { baseKit } from '../combat/roster';
import { COOP, logCoop, senderRow } from './data';

/**
 * Organic Tagged Handoffs (F&D §6.5): a sender's tagged hit opens an authored target-state
 * window on its target; the partner's tagged receiving move claims it by connecting while
 * the target is still in that state. A claim continues the same target-owned combo
 * context: nothing is reset, repositioned or extended.
 */

/** The TargetState a fighter is in right now (handoffs and team finishers ask for these). */
export function targetState(t: Fighter): number {
  if (t.state === MoveState.Down) return t.groundWindow > 0 ? TargetState.Down : TargetState.None;
  if (t.state === MoveState.Launched) return TargetState.Airborne;
  if (t.state === MoveState.Hitstun) return t.y > 0 ? TargetState.Airborne : TargetState.Stagger;
  return TargetState.None;
}

/** The other living hero on the stage, if any. */
export function partnerOf(world: World, f: Fighter): Fighter | undefined {
  return world.bodies.find(
    (b) => b.team === 'hero' && b.id !== f.id && b.state !== MoveState.Defeated,
  );
}

/** Receiver tags of the handoff open on `t`: its own row's (Reciprocal Handoffs). */
function receiversOf(t: Fighter): readonly string[] {
  const row = COOP.handoffs[t.handoffRow - 1];
  if (row) return row.receivers;
  return COOP.handoffs.filter((h) => h.state === t.handoff).flatMap((h) => h.receivers);
}

/** Hero tags of a fighter's kit (never its id or name). */
function heroTags(f: Fighter): readonly string[] {
  return baseKit(f)?.tags ?? [];
}

/** The authored pair route of the handoff open on `t`, if any (for the Lab). */
export function handoffRoute(t: Fighter): { id: string; name: string } | null {
  return COOP.handoffs[t.handoffRow - 1]?.route ?? null;
}

/** Does this action of `att` claim the handoff open on `t`? (No state change.) */
export function canClaim(
  world: World,
  att: Fighter,
  a: ActionDef,
  t: Fighter,
  stateBefore: number,
): boolean {
  if (t.handoff === 0 || att.team !== 'hero' || att.id === t.handoffFrom) return false;
  if (world.frame > t.handoffUntil || stateBefore !== t.handoff) return false;
  const receivers = receiversOf(t);
  if (!a.tags.some((tag) => receivers.includes(tag))) return false;
  // Short Pre-Input Buffer: the receiving move may start a few frames before the window.
  const started = world.frame - att.stateFrame;
  return started >= t.handoffAt - COOP.preBuffer;
}

/** The partner claimed the handoff: the opportunity closes on the claim. */
export function claimHandoff(world: World, att: Fighter, t: Fighter): void {
  logCoop(world, CoopEvent.HandoffClaim, att.id, t.handoffFrom, t.id, t.handoff);
  world.coop.handoffs += 1;
  if (handoffRoute(t)) world.coop.reciprocal += 1;
  t.handoff = 0;
  t.handoffFrom = 0;
  t.handoffRow = 0;
}

/**
 * After a hero's hit has been resolved: a sender-tagged action opens (or refreshes) a
 * handoff when the target is now in the tag's state and a partner is there to take it.
 */
export function openHandoff(world: World, owner: Fighter, a: ActionDef, t: Fighter): void {
  if (owner.team !== 'hero' || t.team === 'hero') return;
  const partner = partnerOf(world, owner);
  if (!partner) return;
  if (!t.ctx.open || t.ctx.exhausted || t.protectedRecovery) return;
  const row = senderRow(a.tags, targetState(t), heroTags(owner), heroTags(partner));
  const h = COOP.handoffs[row];
  if (!h) return;
  t.handoff = h.state;
  t.handoffRow = row + 1;
  t.handoffFrom = owner.id;
  t.handoffAt = world.frame;
  t.handoffUntil = world.frame + h.window - 1;
  logCoop(world, CoopEvent.HandoffOpen, owner.id, partner.id, t.id, h.state);
}

/**
 * End of every frame: a handoff closes on authored expiry, when the target leaves the
 * required state (it became actionable, landed, was protected, broke the combo).
 */
export function stepHandoffs(world: World): void {
  for (const t of world.bodies) {
    if (t.handoff === 0) continue;
    const expired = world.frame >= t.handoffUntil;
    const gone = !t.ctx.open || t.protectedRecovery || targetState(t) !== t.handoff;
    if (!expired && !gone) continue;
    logCoop(world, CoopEvent.HandoffClosed, t.handoffFrom, 0, t.id, expired ? 1 : 2);
    t.handoff = 0;
    t.handoffFrom = 0;
    t.handoffRow = 0;
  }
}

/** Frames left in the open handoff on `t` (0 = none), for the Lab and the cue. */
export function handoffLeft(world: World, t: Fighter): number {
  return t.handoff === 0 ? 0 : Math.max(0, t.handoffUntil - world.frame + 1);
}
