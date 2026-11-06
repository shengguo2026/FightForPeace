import { ActionBit } from '../src/input/bits';
import {
  ChannelKind,
  MoveState,
  WorkerState,
  type FrameInput,
  type World,
} from '../src/world/types';
import { heroOf } from '../src/world/world';
import { nonCombatant } from '../src/combat/damage';
import { beatOf, interactionFor, isDowned } from '../src/stage/run';
import { fx } from '../src/math/fixed';
import { botInput } from './arenaBot';

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };

function toward(w: World, slot: number, x: number, z: number): FrameInput {
  const h = heroOf(w, slot)!;
  const dx = Math.trunc((x - h.x) / 256);
  const dz = Math.trunc((z - h.z) / 256);
  return {
    ...IDLE,
    moveX: Math.abs(dx) > 40 ? (dx > 0 ? 1 : -1) : 0,
    moveZ: Math.abs(dz) > 20 ? (dz > 0 ? 1 : -1) : 0,
  };
}

/**
 * A deterministic stand-in player for stage tests: fights with the arena bot, then frees
 * workers, revives its partner, inspects the clue and the evidence, and walks right.
 */
export function stageBotInput(
  w: World,
  slot = 0,
  style: { guardEvery?: number; attackEvery?: number } = {},
): FrameInput {
  const h = heroOf(w, slot);
  const run = w.run;
  if (!h || !run || h.ko) return IDLE;
  const fighting = w.bodies.some((e) => e.team === 'enemy' && !e.ko && !nonCombatant(e));
  if (fighting) return botInput(w, slot, style.guardEvery, style.attackEvery);
  if (h.state === MoveState.Channel) return { ...IDLE, held: ActionBit.Interact };
  if (interactionFor(w, h) !== ChannelKind.None) {
    const ready = h.state === MoveState.Idle || h.state === MoveState.Walk;
    return {
      ...IDLE,
      pressed: ready && w.frame % 2 === 0 ? ActionBit.Interact : 0,
      held: ActionBit.Interact,
    };
  }
  const partner = w.bodies.find((b) => b.team === 'hero' && b.slot !== slot && isDowned(b));
  if (partner) return toward(w, slot, partner.x, partner.z);
  const bound = run.workers.find((k) => k.state === WorkerState.Bound);
  if (bound) return toward(w, slot, bound.x, bound.z + fx(30));
  const beat = beatOf(w)!;
  if (run.evidence === 1 && beat.evidence)
    return toward(w, slot, fx(beat.evidence.x), fx(beat.evidence.z));
  if (run.clue === 1 && beat.clue) return toward(w, slot, fx(beat.clue.x), fx(beat.clue.z));
  // Walk right along a clear lane (below the mill pillar, above the cog).
  return { ...toward(w, slot, h.x + fx(400), fx(880)), moveX: 1 };
}
