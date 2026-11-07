import { nonCombatant } from '../combat/damage';
import { ActionBit, DirBit } from '../input/bits';
import { type Fighter, type FrameInput, MoveState, type World } from '../world/types';
import { heroOf } from '../world/world';

/**
 * M15 Restricted Survival Proxy (F&D: Short Recovery Grace, Restricted Survival Proxy and
 * Host Migration). While a Wi-Fi player is missing, the game that holds authority drives
 * their hero with this input, computed from the world alone, so a resimulated frame gets
 * exactly the same input again.
 *
 * - During the recovery grace (and the hand-back to a returning player) the hero only
 *   finishes what it was doing and holds Guard in place: guarded neutral.
 * - After it, the proxy follows the partner, guards against attacks it can see coming and
 *   uses conservative basic attacks on an enemy right in front of it.
 * - It never spends meter (no Specials, Ultimates or team attacks), never dashes, grabs,
 *   picks up, uses or throws anything (no Interact) and makes no route, story or other
 *   player-owned choice. The hero keeps its real Health and Defense and gets no
 *   protection.
 */

/** Recovery grace before the proxy acts: 3 seconds of guarded neutral. */
export const PROXY_GRACE_FRAMES = 180;
/** At most one basic attack this often (frames). */
export const PROXY_ATTACK_EVERY = 24;
/** The proxy walks back to its partner when it is further away than this (pixels). */
export const PROXY_FOLLOW_PX = 220;

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const GUARD: FrameInput = { ...IDLE, held: ActionBit.Guard };

/** Which buttons the proxy can ever use. */
export const PROXY_ALLOWED = ActionBit.Attack | ActionBit.Guard;

const px = (v: number) => Math.trunc(v / 256);

function sign(v: number): -1 | 0 | 1 {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/**
 * The proxy's input for `slot` on the world's current frame. `absentFrames` counts frames
 * since the player went missing; `handover` is true while control is being handed back.
 */
export function proxyInput(
  world: World,
  slot: number,
  absentFrames: number,
  handover = false,
): FrameInput {
  const h = heroOf(world, slot);
  if (!h || h.ko) return IDLE;
  if (handover || absentFrames < PROXY_GRACE_FRAMES) return GUARD;
  let best: Fighter | null = null;
  let bestD = 0;
  for (const e of world.bodies) {
    if (e.team !== 'enemy' || e.ko || nonCombatant(e)) continue;
    const d = Math.abs(e.x - h.x) + 2 * Math.abs(e.z - h.z);
    if (best === null || d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (best) {
    const dx = px(best.x - h.x);
    const dz = px(best.z - h.z);
    const toward = dx >= 0 ? 1 : -1;
    // Guard against an attack it can see coming (directional: toward the attacker).
    if (best.state === MoveState.Attack && Math.abs(dx) < 260 && Math.abs(dz) < 50)
      return {
        ...IDLE,
        moveX: toward,
        held: ActionBit.Guard,
        pressed: h.state === MoveState.Guard ? 0 : ActionBit.Guard,
      };
    const inRange = Math.abs(dx) <= 130 && Math.abs(dz) <= 24;
    if (inRange) {
      // Turn toward the target first; never attack away from it.
      if (toward !== h.facing)
        return {
          ...IDLE,
          moveX: toward,
          dirPressed: toward > 0 ? DirBit.right : DirBit.left,
        };
      const attack = absentFrames % PROXY_ATTACK_EVERY === 0 ? ActionBit.Attack : 0;
      return { ...IDLE, pressed: attack, held: attack };
    }
  }
  // Stay with the partner (the camera and tether follow both heroes).
  const partner = world.bodies.find((b) => b.team === 'hero' && b.slot !== slot && !b.ko);
  if (partner) {
    const dx = px(partner.x - h.x);
    const dz = px(partner.z - h.z);
    if (Math.abs(dx) > PROXY_FOLLOW_PX || Math.abs(dz) > 60)
      return {
        ...IDLE,
        moveX: Math.abs(dx) > PROXY_FOLLOW_PX / 2 ? sign(dx) : 0,
        moveZ: Math.abs(dz) > 20 ? sign(dz) : 0,
      };
  }
  // Close to an enemy that is not attacking: approach it carefully.
  if (best) {
    const dx = px(best.x - h.x);
    const dz = px(best.z - h.z);
    if (Math.abs(dx) < 400)
      return {
        ...IDLE,
        moveX: Math.abs(dx) > 120 ? sign(dx) : 0,
        moveZ: Math.abs(dz) > 10 ? sign(dz) : 0,
      };
  }
  return IDLE;
}

/**
 * The first safe actionable moment to hand a hero back to its returning player: standing
 * or walking (never in the middle of an attack, a reaction, a grab or a jump), or out of
 * the fight.
 */
export function actionable(world: World, slot: number): boolean {
  const h = heroOf(world, slot);
  if (!h || h.ko) return true;
  return (
    (h.state === MoveState.Idle || h.state === MoveState.Walk || h.state === MoveState.Guard) &&
    h.action < 0
  );
}
