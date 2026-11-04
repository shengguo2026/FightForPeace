import { ActionBit, DirBit } from '../src/input/bits';
import { MoveState, type FrameInput, type World } from '../src/world/types';
import { heroOf } from '../src/world/world';
import { nonCombatant } from '../src/combat/damage';

/**
 * A deterministic stand-in player for arena tests: walks to the nearest enemy still in
 * the fight, presses Attack on a fixed rhythm in range, and raises Guard while an enemy
 * close by is in its startup (every `guardEvery`-th time). Not an AI for the game.
 */
export function botInput(w: World, slot = 0, guardEvery = 2): FrameInput {
  const h = heroOf(w, slot);
  const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
  if (!h) return idle;
  let best = null;
  let bestD = 0;
  for (const e of w.bodies) {
    if (e.team !== 'enemy' || e.ko || nonCombatant(e)) continue;
    const d = Math.abs(e.x - h.x) + 2 * Math.abs(e.z - h.z);
    if (best === null || d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (!best) return idle;
  const dx = Math.trunc((best.x - h.x) / 256);
  const dz = Math.trunc((best.z - h.z) / 256);
  const threatening = best.state === MoveState.Attack && Math.abs(dx) < 260 && Math.abs(dz) < 50;
  if (threatening && (w.frame >> 4) % guardEvery === 0) {
    const toward = dx > 0 ? 1 : -1;
    return {
      ...idle,
      held: ActionBit.Guard,
      pressed: h.state === MoveState.Guard ? 0 : ActionBit.Guard,
      moveX: toward as 1 | -1,
    };
  }
  const moveX = Math.abs(dx) > 120 ? (dx > 0 ? 1 : -1) : 0;
  const moveZ = Math.abs(dz) > 10 ? (dz > 0 ? 1 : -1) : 0;
  const inRange = Math.abs(dx) <= 130 && Math.abs(dz) <= 24;
  const pressed = inRange && w.frame % 9 === 0 ? ActionBit.Attack : 0;
  const facingWrong = inRange && (dx > 0 ? 1 : -1) !== h.facing;
  return {
    moveX: facingWrong ? (dx > 0 ? 1 : -1) : (moveX as -1 | 0 | 1),
    moveZ: moveZ as -1 | 0 | 1,
    pressed,
    held: pressed,
    dirPressed: facingWrong ? (dx > 0 ? DirBit.right : DirBit.left) : 0,
  };
}
