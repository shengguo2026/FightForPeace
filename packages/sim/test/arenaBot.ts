import { ActionBit, DirBit } from '../src/input/bits';
import { MoveState, type FrameInput, type World } from '../src/world/types';
import { heroOf } from '../src/world/world';
import { nonCombatant } from '../src/combat/damage';
import { actionOf } from '../src/combat/actions';

/**
 * A deterministic stand-in player for arena tests: walks to the nearest enemy still in
 * the fight, presses Attack on a fixed rhythm in range, and raises Guard while an enemy
 * close by is in its startup (every `guardEvery`-th time). Not an AI for the game.
 */
export function botInput(w: World, slot = 0, guardEvery = 2, attackEvery = 9): FrameInput {
  const h = heroOf(w, slot);
  const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
  if (!h) return idle;
  const dodge = warnedLineDodge(w, h);
  if (dodge !== 0) return { ...idle, moveZ: dodge };
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
  // M23: standing on the target (dx 0) is no reason to turn; the bot used to turn back
  // and forth every frame there and never attacked.
  const facingWrong = inRange && dx !== 0 && (dx > 0 ? 1 : -1) !== h.facing;
  // M14: never attack away from the target (a jab string facing the wrong way could
  // chain forever against an enemy idling at the edge of the view).
  const pressed = inRange && !facingWrong && w.frame % attackEvery === 0 ? ActionBit.Attack : 0;
  return {
    moveX: facingWrong ? (dx > 0 ? 1 : -1) : (moveX as -1 | 0 | 1),
    moveZ: moveZ as -1 | 0 | 1,
    pressed,
    held: pressed,
    dirPressed: facingWrong ? (dx > 0 ? DirBit.right : DirBit.left) : 0,
  };
}

/**
 * M23: a warned line (a firearm aim or a sweeping burst, spec §9 and §12) is drawn for its
 * whole startup, and the Academy teaches stepping out of its lane. The bot does that too:
 * while an aim covers its lane in front of the shooter, it walks to the nearer free side.
 * Without this the bot stood in every Jackal Burst, which measured the bot, not the boss.
 */
function warnedLineDodge(w: World, h: World['bodies'][number]): -1 | 0 | 1 {
  for (const e of w.bodies) {
    if (e.team !== 'enemy' || e.ko || e.state !== MoveState.Attack) continue;
    const a = actionOf(e);
    if (!a || !a.tags.includes('warnedLine') || e.stateFrame > a.startup) continue;
    const ahead = ((h.x - e.x) / 256) * e.facing;
    const dz = (h.z - e.z) / 256;
    if (ahead < 0 || ahead > a.hitbox.x + a.hitbox.w + 40) continue;
    if (Math.abs(dz) > a.hitbox.depth + 24) continue;
    const mid = (w.bounds.minZ + w.bounds.maxZ) / 2;
    if (dz !== 0) {
      const away = dz > 0 ? 1 : -1;
      const roomAway = away > 0 ? h.z < w.bounds.maxZ - 256 * 30 : h.z > w.bounds.minZ + 256 * 30;
      if (roomAway) return away;
      return away > 0 ? -1 : 1;
    }
    return h.z < mid ? 1 : -1;
  }
  return 0;
}
