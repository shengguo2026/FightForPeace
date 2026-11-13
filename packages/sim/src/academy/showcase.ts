import { ActionBit } from '../input/bits';
import { fx } from '../math/fixed';
import { METER } from '../combat/meter';
import { HEROES, kitOf } from '../combat/roster';
import type { ActionDef, ShowcaseDef, ShowcaseStep } from '../combat/types';
import { MoveState, type FrameInput, type Fighter, type World } from '../world/types';
import { createWorld, heroOf, step, type WorldOptions } from '../world/world';
import { PILOT_PATIENCE, inputFor } from './pilot';

/**
 * M21 Move Preview (roadmap decision 4): plays an authored showcase route through the
 * hero and, for pair routes, a demonstration partner, pressing each step when the step
 * before it connected, the way players would. Like the M11 pilot it only produces
 * FrameInputs, so a preview is as deterministic as any other input; CI replays every
 * showcase with it and fails when a step does not land.
 */
export interface ShowcaseState {
  step: number;
  /** Frame of the last press (-1 before the first) and the slot that pressed. */
  pressedAt: number;
  pressedSlot: number;
  /** Action running on that slot's hero when the press was made. */
  pressedAction: number;
  /** A Dash went out for a dash-started step; its attack comes next. */
  dashing: boolean;
  waited: number;
  /** World frame each step landed (-1 not yet): its move made contact, the jump left the
   * ground, the invitation opened, the team part began. */
  landed: number[];
  done: boolean;
  failed: boolean;
}

export function newShowcase(steps: readonly ShowcaseStep[]): ShowcaseState {
  return {
    step: 0,
    pressedAt: -1,
    pressedSlot: 0,
    pressedAction: -1,
    dashing: false,
    waited: 0,
    landed: steps.map(() => -1),
    done: false,
    failed: false,
  };
}

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

function free(h: Fighter): boolean {
  return h.action < 0 && (h.state === MoveState.Idle || h.state === MoveState.Walk);
}

/** The showcases of a hero (an empty list for unknown ids). */
export function showcasesOf(hero: string): readonly ShowcaseDef[] {
  return HEROES.find((h) => h.id === hero)?.showcases ?? [];
}

/** The action a step names on its slot's hero (null: jump, team or unknown). */
function stepAction(world: World, s: ShowcaseStep): ActionDef | null {
  if (s.jump || s.team) return null;
  const h = heroOf(world, s.slot);
  return (h && kitOf(h)?.actions[s.any[0] ?? -1]) ?? null;
}

/** Did the last press's own action connect (not the one running when it was pressed)? */
function connected(world: World, st: ShowcaseState): boolean {
  const h = heroOf(world, st.pressedSlot);
  return !!h && h.action >= 0 && h.action !== st.pressedAction && h.contactAt >= 0;
}

function moment(world: World, st: ShowcaseState, s: ShowcaseStep, a: ActionDef | null): boolean {
  const h = heroOf(world, s.slot);
  if (!h) return false;
  if (st.pressedAt < 0) return free(h);
  const since = world.frame - st.pressedAt;
  if (since < 2) return false;
  const hit = connected(world, st);
  if (s.team) return s.slot === 0 ? hit || (free(h) && since > 8) : world.coop.invite !== null;
  if (s.jump) return hit;
  // The partner answers the hero's connected move as soon as it can act.
  if (s.slot !== st.pressedSlot) return hit && (free(h) || since > 3);
  if (a && a.context === 'groundFocus')
    return (
      (hit && st.step > 1) ||
      (free(h) &&
        world.bodies.some(
          (b) => b.team !== h.team && b.state === MoveState.Down && Math.abs(b.x - h.x) < fx(320),
        ))
    );
  if (a && a.context === 'air')
    return (h.state === MoveState.Air && h.stateFrame > 2 && h.action < 0) || hit;
  if (hit) return true;
  return free(h) && since > 8;
}

/** Marks steps that landed this frame (call after stepping the world). */
export function noteLanded(world: World, steps: readonly ShowcaseStep[], st: ShowcaseState): void {
  for (let k = 0; k < st.step; k += 1) {
    if (st.landed[k]! >= 0) continue;
    const s = steps[k]!;
    const h = heroOf(world, s.slot);
    if (!h) continue;
    let ok: boolean;
    if (s.jump) ok = h.state === MoveState.Air || h.y > 0;
    else if (s.team) {
      const a = h.action >= 0 ? kitOf(h)?.actions[h.action] : undefined;
      ok = a?.category === 'team' || (s.slot === 0 && world.coop.invite !== null);
    } else {
      const a = h.action >= 0 ? kitOf(h)?.actions[h.action] : undefined;
      ok = !!a && s.any.some((i) => kitOf(h)?.actions[i]?.id === a.id) && h.contactAt >= 0;
      // A contact conversion (Fire Warden's clinch, catch, Crucible) lands as its script.
      if (!ok && a && a.context === 'script' && h.contactAt >= 0 && k === st.step - 1) ok = true;
    }
    if (ok) st.landed[k] = world.frame;
  }
  if (st.step >= steps.length && !st.done) {
    if (st.landed.every((f) => f >= 0)) st.done = true;
    else if (world.frame - st.pressedAt > PILOT_PATIENCE) {
      st.done = true;
      st.failed = true;
    }
  }
}

/** This frame's inputs for slots 0 and 1. Call once per step, before stepping. */
export function showcaseInputs(
  world: World,
  steps: readonly ShowcaseStep[],
  st: ShowcaseState,
): [FrameInput, FrameInput] {
  const out: [FrameInput, FrameInput] = [IDLE, IDLE];
  if (st.done || st.step >= steps.length) return out;
  const s = steps[st.step]!;
  const h = heroOf(world, s.slot);
  const a = stepAction(world, s);
  if (!h || (!s.jump && !s.team && !a)) {
    st.done = true;
    st.failed = true;
    return out;
  }
  if (st.dashing && a) {
    if (h.state === MoveState.Dash && h.stateFrame >= 3) {
      st.dashing = false;
      out[s.slot] = press(world, h, s, st, inputFor(a, h.facing, true));
    } else if (world.frame - st.pressedAt > 20) st.dashing = false;
    return out;
  }
  if (!moment(world, st, s, a)) {
    st.waited += 1;
    if (st.waited > PILOT_PATIENCE) {
      st.done = true;
      st.failed = true;
    }
    return out;
  }
  if (s.jump)
    out[s.slot] = press(world, h, s, st, {
      ...IDLE,
      pressed: ActionBit.Jump,
      held: ActionBit.Jump,
    });
  else if (s.team)
    out[s.slot] = press(world, h, s, st, {
      ...IDLE,
      pressed: ActionBit.TeamAttack,
      held: ActionBit.TeamAttack,
    });
  else if (a!.context === 'dash' || a!.context === 'dashLow') {
    st.dashing = true;
    st.pressedAt = world.frame;
    st.waited = 0;
    out[s.slot] = inputFor(a!, h.facing, false);
  } else out[s.slot] = press(world, h, s, st, inputFor(a!, h.facing));
  return out;
}

function press(
  world: World,
  h: Fighter,
  s: ShowcaseStep,
  st: ShowcaseState,
  input: FrameInput,
): FrameInput {
  st.step += 1;
  st.pressedAt = world.frame;
  st.pressedSlot = s.slot;
  st.pressedAction = h.action;
  st.waited = 0;
  return input;
}

/** World options for a showcase: one training dummy, the hero and the partner. */
export function showcaseOptions(
  hero: string,
  sc: ShowcaseDef | null,
  extra: Pick<WorldOptions, 'loadouts'> = {},
): WorldOptions {
  return { dummies: 1, heroes: sc?.partner ? [hero, sc.partner] : [hero], ...extra };
}

/**
 * Places the heroes for a showcase (call on a world made with showcaseOptions): the hero
 * in front of the dummy, the partner behind it facing in, both with the route's meter.
 */
export function setupShowcase(world: World, sc: ShowcaseDef | null): void {
  const pair = !!sc?.partner;
  step(world, pair ? [IDLE, IDLE] : [IDLE]);
  const d = world.bodies.find((b) => b.team === 'enemy');
  const p1 = heroOf(world, 0);
  if (!d || !p1) return;
  d.x = fx(1000);
  d.facing = -1;
  p1.x = d.x - fx(90);
  p1.z = d.z;
  p1.facing = 1;
  const p2 = pair ? heroOf(world, 1) : undefined;
  if (p2) {
    p2.x = d.x + fx(90);
    p2.z = d.z;
    p2.facing = -1;
  }
  for (const h of [p1, p2])
    if (h && sc && sc.meter > 0) h.meter = Math.trunc((METER.max * sc.meter) / 100);
}

/** CI and tests: plays a showcase from a fresh world; returns the landed frames. */
export function runShowcase(
  hero: string,
  sc: ShowcaseDef,
  seed = 1,
): { landed: number[]; failed: boolean; world: World } {
  const world = createWorld(seed, showcaseOptions(hero, sc));
  setupShowcase(world, sc);
  const st = newShowcase(sc.steps);
  for (let i = 0; i < 1200 && !st.done; i += 1) {
    const inputs = showcaseInputs(world, sc.steps, st);
    step(world, sc.partner ? inputs : [inputs[0]]);
    noteLanded(world, sc.steps, st);
  }
  return { landed: st.landed, failed: st.failed || !st.done, world };
}

/** M21 Try it: what the follower saw of the hero last frame (to see a new contact). */
export interface FollowState {
  route: ShowcaseState;
  /** Action and contact of the player's hero last frame. */
  lastAction: number;
  lastContact: number;
  /** Frame of the last step that landed (a long pause drops the route). */
  lastLanded: number;
  /** Complete runs of the route by the player. */
  performed: number;
}

export function newFollow(steps: readonly ShowcaseStep[]): FollowState {
  return {
    route: newShowcase(steps),
    lastAction: -1,
    lastContact: -1,
    lastLanded: -1,
    performed: 0,
  };
}

/** Frames without a new step before an unfinished Try it attempt starts over. */
export const FOLLOW_DROP = 120;

/**
 * Try it (guided practice of a route): the player performs the hero's steps; each one
 * ticks off when it lands in order. A partner step is pressed by the demonstration
 * partner as soon as the player's step before it landed. Returns the partner's input.
 */
export function followShowcase(
  world: World,
  steps: readonly ShowcaseStep[],
  f: FollowState,
): FrameInput {
  const st = f.route;
  const h = heroOf(world, 0);
  let partner = IDLE;
  if (!h) return partner;
  if (st.step >= steps.length && st.landed.every((x) => x >= 0)) {
    f.performed += 1;
    f.route = newShowcase(steps);
    f.lastLanded = -1;
    return partner;
  }
  if (st.step > 0 && f.lastLanded >= 0 && world.frame - f.lastLanded > FOLLOW_DROP) {
    f.route = newShowcase(steps);
    f.lastLanded = -1;
    return partner;
  }
  const s = steps[st.step];
  const fresh =
    h.action >= 0 && h.contactAt >= 0 && (f.lastContact < 0 || h.action !== f.lastAction);
  f.lastAction = h.action;
  f.lastContact = h.action >= 0 ? h.contactAt : -1;
  if (!s) return partner;
  if (s.slot === 1) {
    const inputs = showcaseInputs(world, steps, st);
    partner = inputs[1];
    // A partner step that never comes (the player's step did not open it) starts over.
    if (st.done) {
      f.route = newShowcase(steps);
      f.lastLanded = -1;
    }
    return partner;
  }
  let landed = false;
  if (s.jump) landed = h.state === MoveState.Air && st.step > 0;
  else if (s.team) landed = world.coop.invite !== null;
  else if (fresh) {
    const a = kitOf(h)?.actions[h.action];
    landed = !!a && s.any.some((i) => kitOf(h)?.actions[i]?.id === a.id);
    // The first step may start any time; a later wrong move starts the route over.
    if (!landed && st.step > 0) {
      f.route = newShowcase(steps);
      const first = steps[0]!;
      if (
        !first.jump &&
        !first.team &&
        first.slot === 0 &&
        first.any.some((i) => kitOf(h)?.actions[i]?.id === a?.id)
      ) {
        f.route.landed[0] = world.frame;
        f.route.step = 1;
        f.route.pressedAt = world.frame;
        f.route.pressedAction = -1;
        f.lastLanded = world.frame;
      } else f.lastLanded = -1;
      return partner;
    }
  }
  if (landed) {
    st.landed[st.step] = world.frame;
    st.step += 1;
    st.pressedAt = world.frame;
    st.pressedSlot = 0;
    // The partner answers this landed step (any running action counts as connected).
    st.pressedAction = -1;
    st.waited = 0;
    f.lastLanded = world.frame;
  }
  return partner;
}
