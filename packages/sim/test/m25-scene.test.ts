import { describe, expect, test } from 'vitest';
import { fx } from '../src/math/fixed';
import { ActionBit } from '../src/input/bits';
import { type FrameInput, MoveState, type World } from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';
import { ARENAS } from '../src/enemies/data';
import { nonCombatant } from '../src/combat/damage';
import { CaseState, UnitPhase } from '../src/objectives/state';
import { objectiveGrade } from '../src/objectives/results';
import { botInput } from './arenaBot';

/**
 * The M25 test room runs headless: a scripted hero walks to the captive and holds `J`, then
 * to the evidence case and holds `J` until it is sealed, fighting with the test bot when an
 * enemy is close. Solo and co-op, deterministically, it ends with the captive safe, the case
 * sealed and a grade.
 */
const ROOM = 'lab-m25-objectives';
const obj = () => ARENAS.find((a) => a.id === ROOM)!.objectives!;

function towards(w: World, slot: number, x: number, z: number): FrameInput | null {
  const h = heroOf(w, slot)!;
  const dx = fx(x) - h.x;
  const dz = fx(z) - h.z;
  const near = Math.abs(dx) <= fx(40) && Math.abs(dz) <= fx(30);
  if (near) return null;
  return {
    moveX: Math.abs(dx) > fx(20) ? (Math.sign(dx) as 1 | -1) : 0,
    moveZ: Math.abs(dz) > fx(14) ? (Math.sign(dz) as 1 | -1) : 0,
    pressed: 0,
    held: 0,
    dirPressed: 0,
  };
}

function scripted(w: World, slot: number): FrameInput {
  const o = w.objectives!;
  const h = heroOf(w, slot)!;
  const enemyClose = w.bodies.some(
    (b) =>
      b.team === 'enemy' &&
      !b.ko &&
      !nonCombatant(b) &&
      Math.abs(b.x - h.x) + Math.abs(b.z - h.z) < fx(260),
  );
  if (h.state === MoveState.Channel)
    return { moveX: 0, moveZ: 0, pressed: 0, held: ActionBit.Interact, dirPressed: 0 };
  const u = obj().units[0]!;
  const c = obj().cases[0]!;
  const goal =
    o.units[0]!.phase === UnitPhase.Captive
      ? { x: u.x - 40, z: u.z }
      : o.cases[0]!.state !== CaseState.Sealed
        ? { x: c.x - 40, z: c.z }
        : null;
  if (!goal || enemyClose) return botInput(w, slot);
  const move = towards(w, slot, goal.x, goal.z);
  if (move) return move;
  if (h.state !== MoveState.Idle && h.state !== MoveState.Walk) return botInput(w, slot);
  return {
    moveX: 0,
    moveZ: 0,
    pressed: ActionBit.Interact,
    held: ActionBit.Interact,
    dirPressed: 0,
  };
}

describe('M25 test room', () => {
  test.each([false, true])('co-op %s: captive safe, case sealed, graded', (coop) => {
    const run = () => {
      const w = createWorld(11, { arena: ROOM, difficulty: 'medium' });
      for (let i = 0; i < 6000; i += 1) {
        step(w, coop ? [scripted(w, 0), botInput(w, 1)] : [scripted(w, 0)]);
        const o = w.objectives!;
        if (o.units[0]!.phase === UnitPhase.Safe && o.cases[0]!.state === CaseState.Sealed) break;
      }
      return w;
    };
    const a = run();
    expect(hashWorld(a)).toBe(hashWorld(run()));
    expect(a.objectives!.units[0]!.phase).toBe(UnitPhase.Safe);
    expect(a.objectives!.units[0]!.locked).toBe(true);
    expect(a.objectives!.cases[0]!.state).toBe(CaseState.Sealed);
    const g = objectiveGrade(a)!;
    expect(g.points).toBeGreaterThan(0);
    expect(['S', 'A', 'B', 'C']).toContain(g.overall);
  });
});
