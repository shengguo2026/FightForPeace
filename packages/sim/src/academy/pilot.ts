import { DirBit, ActionBit } from '../input/bits';
import { fx } from '../math/fixed';
import { Dir, type ActionDef, type RecipeStep } from '../combat/types';
import { kitOf } from '../combat/roster';
import { MoveState, type Axis, type FrameInput, type Fighter, type World } from '../world/types';
import { heroOf } from '../world/world';

/**
 * M11 recipe playback (Academy demonstrations and My Combos): plays a route of abstract
 * actions through a player's hero, pressing each step when the previous one connected,
 * the way a player would. It only produces FrameInputs; the simulation is unchanged, so a
 * playback is as deterministic as any other input.
 */
export interface PilotState {
  step: number;
  /** Frame of the last press (-1 before the first). */
  pressedAt: number;
  /** Action running when the last press was made. */
  pressedAction: number;
  /** A Dash was pressed for a dash-started step; its attack comes next. */
  dashing: boolean;
  /** Frames spent waiting for the next step. */
  waited: number;
  done: boolean;
  /** Gave up (the previous step never connected). */
  failed: boolean;
}

export function newPilot(): PilotState {
  return {
    step: 0,
    pressedAt: -1,
    pressedAction: -1,
    dashing: false,
    waited: 0,
    done: false,
    failed: false,
  };
}

/** Frames the pilot waits for a step's moment before giving up. */
export const PILOT_PATIENCE = 180;

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

function free(h: Fighter): boolean {
  return h.action < 0 && (h.state === MoveState.Idle || h.state === MoveState.Walk);
}

/** The input that starts `a` for a hero facing `facing`. */
export function inputFor(a: ActionDef, facing: number, dash = false): FrameInput {
  let moveX: Axis = 0;
  let moveZ: Axis = 0;
  if (a.dir === Dir.Forward) moveX = facing > 0 ? 1 : -1;
  else if (a.dir === Dir.Backward) moveX = facing > 0 ? -1 : 1;
  else if (a.dir === Dir.Up || a.dir === Dir.Vertical) moveZ = -1;
  else if (a.dir === Dir.Down) moveZ = 1;
  const dirPressed =
    (moveX > 0 ? DirBit.right : 0) |
    (moveX < 0 ? DirBit.left : 0) |
    (moveZ < 0 ? DirBit.up : 0) |
    (moveZ > 0 ? DirBit.down : 0);
  let bit: number;
  switch (a.context) {
    case 'special':
      bit = ActionBit.Special;
      break;
    case 'ultimate':
      bit = ActionBit.Ultimate;
      break;
    case 'dash':
      bit = dash ? ActionBit.Attack : ActionBit.Dash;
      break;
    case 'dashLow':
      bit = dash ? ActionBit.LowAttack : ActionBit.Dash;
      break;
    case 'grab':
      bit = ActionBit.Interact;
      break;
    default:
      bit = ActionBit.Attack;
  }
  return { moveX, moveZ, pressed: bit, held: bit, dirPressed };
}

/** Is it the moment for the next step? (The hero can act, or its last step connected.) */
function moment(
  world: World,
  h: Fighter,
  st: PilotState,
  a: ActionDef | null,
  jump: boolean,
): boolean {
  if (st.pressedAt < 0) return free(h);
  const since = world.frame - st.pressedAt;
  if (since < 2) return false;
  // The action started by the last press (not the one running when it was made) hit.
  const connected = h.action >= 0 && h.action !== st.pressedAction && h.contactAt >= 0;
  if (jump) return connected;
  if (a && a.context === 'groundFocus')
    return (
      (connected && st.step > 1) ||
      (free(h) &&
        world.bodies.some(
          (b) => b.team !== h.team && b.state === MoveState.Down && Math.abs(b.x - h.x) < fx(320),
        ))
    );
  if (a && a.context === 'air')
    return (h.state === MoveState.Air && h.stateFrame > 2 && h.action < 0) || connected;
  if (connected) return true;
  return free(h) && since > 8;
}

/**
 * This frame's input for `slot` playing `steps` (indices into the hero's own kit). Call
 * once per simulation step, before stepping.
 */
export function pilotInput(
  world: World,
  slot: number,
  steps: readonly RecipeStep[],
  st: PilotState,
): FrameInput {
  const h = heroOf(world, slot);
  if (!h || st.done) return IDLE;
  if (st.step >= steps.length) {
    st.done = true;
    return IDLE;
  }
  const step = steps[st.step]!;
  const kit = kitOf(h);
  const a = step.jump ? null : (kit?.actions[step.any[0] ?? -1] ?? null);
  if (!step.jump && !a) {
    st.done = true;
    st.failed = true;
    return IDLE;
  }
  // A dash-started step: the Dash went out; its attack follows a few frames in.
  if (st.dashing && a) {
    if (h.state === MoveState.Dash && h.stateFrame >= 3) {
      st.dashing = false;
      return advance(world, h, st, inputFor(a, h.facing, true));
    }
    if (world.frame - st.pressedAt > 20) st.dashing = false;
    return IDLE;
  }
  if (!moment(world, h, st, a, step.jump)) {
    st.waited += 1;
    if (st.waited > PILOT_PATIENCE) {
      st.done = true;
      st.failed = true;
    }
    return IDLE;
  }
  if (step.jump)
    return advance(world, h, st, {
      ...IDLE,
      pressed: ActionBit.Jump,
      held: ActionBit.Jump,
    });
  if (a!.context === 'dash' || a!.context === 'dashLow') {
    st.dashing = true;
    st.pressedAt = world.frame;
    st.waited = 0;
    return inputFor(a!, h.facing, false);
  }
  return advance(world, h, st, inputFor(a!, h.facing));
}

function advance(world: World, h: Fighter, st: PilotState, input: FrameInput): FrameInput {
  st.step += 1;
  st.pressedAt = world.frame;
  st.pressedAction = h.action;
  st.waited = 0;
  return input;
}

/** Recipe steps from action ids of a hero's kit (`jump` for a jump-chase hint). */
export function stepsFromIds(
  kitActions: readonly { id: string }[],
  ids: readonly string[],
): RecipeStep[] {
  const out: RecipeStep[] = [];
  for (const id of ids) {
    if (id === 'jump') out.push({ jump: true, any: [] });
    else {
      const any = id
        .split('|')
        .map((x) => kitActions.findIndex((a) => a.id === x))
        .filter((i) => i >= 0);
      if (any.length > 0) out.push({ jump: false, any });
    }
  }
  return out;
}
