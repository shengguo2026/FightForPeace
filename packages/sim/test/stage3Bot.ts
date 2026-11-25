import { ActionBit } from '../src/input/bits';
import { MoveState, type FrameInput, type World } from '../src/world/types';
import { heroOf } from '../src/world/world';
import { nonCombatant } from '../src/combat/damage';
import { fx } from '../src/math/fixed';
import { CaseState, HoldKind, UnitPhase, objectiveDefs } from '../src/objectives/state';
import { objectiveHint } from '../src/objectives/units';
import { stageBotInput } from './stageBot';
import { beatOf } from '../src/stage/run';

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

function toward(w: World, slot: number, x: number, z: number): FrameInput {
  const h = heroOf(w, slot)!;
  const dx = Math.trunc((x - h.x) / 256);
  const dz = Math.trunc((z - h.z) / 256);
  return {
    ...IDLE,
    moveX: Math.abs(dx) > 30 ? (dx > 0 ? 1 : -1) : 0,
    moveZ: Math.abs(dz) > 15 ? (dz > 0 ? 1 : -1) : 0,
  };
}

/**
 * M28: the stage bot with the Stage 3 objectives: once the fight is over it frees captives,
 * collects and seals (or recovers) the research record case, then plays as the stage bot
 * (clues, evidence, the exit). `seal: false` leaves the case collected but unsealed.
 */
/** Per world and slot: the last x, frames without progress and an active sidestep. */
const STUCK = new WeakMap<World, { x: number; still: number; side: number; until: number }[]>();

/**
 * The arena bot walks straight at its target; a breakable between them stops it (and the
 * enemy walking at it). After half a second without moving it steps around: towards the
 * other half of the floor for a moment.
 */
function unstick(w: World, slot: number, input: FrameInput): FrameInput {
  const h = heroOf(w, slot);
  if (!h) return input;
  let all = STUCK.get(w);
  if (!all) STUCK.set(w, (all = []));
  const s = (all[slot] ??= { x: h.x, still: 0, side: 0, until: 0 });
  if (w.frame < s.until) return { ...input, moveX: 0, moveZ: s.side as FrameInput['moveZ'] };
  const trying = input.moveX !== 0 || input.moveZ !== 0;
  s.still = trying && Math.abs(h.x - s.x) < fx(2) ? s.still + 1 : 0;
  s.x = h.x;
  if (s.still >= 30) {
    s.still = 0;
    s.side = h.z < fx(810) ? 1 : -1;
    s.until = w.frame + 45;
  }
  return input;
}

export function stage3BotInput(
  w: World,
  slot = 0,
  style: {
    guardEvery?: number;
    attackEvery?: number;
    branches?: boolean;
    seal?: boolean;
  } = {},
): FrameInput {
  return unstick(w, slot, stage3Inner(w, slot, style));
}

function stage3Inner(
  w: World,
  slot = 0,
  style: {
    guardEvery?: number;
    attackEvery?: number;
    /** Take the optional branches (the upper lane at a two-way exit). */
    branches?: boolean;
    seal?: boolean;
  } = {},
): FrameInput {
  const beat = w.run ? beatOf(w) : null;
  const lane = beat && beat.next.length === 2 && style.branches ? 700 : 880;
  style = { ...style, lane } as typeof style;
  const h = heroOf(w, slot);
  const o = w.objectives;
  const defs = objectiveDefs(w);
  if (!h || h.ko || !o || !defs) return stageBotInput(w, slot, style);
  const fighting = w.bodies.some((e) => e.team === 'enemy' && !e.ko && !nonCombatant(e));
  if (fighting) return stageBotInput(w, slot, style);
  if (h.state === MoveState.Channel) return { ...IDLE, held: ActionBit.Interact };
  const hint = objectiveHint(w, h);
  if (hint !== HoldKind.None && !(hint === HoldKind.Seal && style.seal === false)) {
    const ready = h.state === MoveState.Idle || h.state === MoveState.Walk;
    return {
      ...IDLE,
      pressed: ready && w.frame % 2 === 0 ? ActionBit.Interact : 0,
      held: ActionBit.Interact,
    };
  }
  const bound = o.units.findIndex((u) => u.phase === UnitPhase.Captive);
  if (bound >= 0) {
    const u = o.units[bound]!;
    return toward(w, slot, u.x, u.z + fx(20));
  }
  const open = o.cases.findIndex(
    (c) =>
      c.state === CaseState.Present ||
      c.state === CaseState.Disturbed ||
      (style.seal !== false &&
        (c.state === CaseState.Collected || c.state === CaseState.Recovered)),
  );
  if (open >= 0) {
    const d = defs.cases[open]!;
    return toward(w, slot, fx(d.x), fx(d.z + 20));
  }
  return stageBotInput(w, slot, style);
}
