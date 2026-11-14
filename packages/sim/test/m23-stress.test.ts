import { describe, expect, test } from 'vitest';
import { ActionBit } from '../src/input/bits';
import { MoveState, type FrameInput, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';

/**
 * M23 anti-infinite and stress checks (spec §18: "no … infinite combos …; stress tests
 * cover crowded combat, mounted co-op, grenade return, every Marek phase"). Every hero and
 * the pairs hammer every Stage 2 enemy role and Marek with looping offence (with a full
 * meter, so Specials and Ultimates loop too): no target may be held in hit reactions past
 * the combo budget's reach. The step-cost checks (the simulation's share of a 60 Hz
 * frame in the heaviest Stage 2 situations: tests/perf/stage2-step-cost.test.ts (wall-clock
 * time is not allowed in @ffp/sim).
 */
const HEROES = ['mountain', 'river', 'wind', 'fire'];
const ROLES = [
  'claimhand',
  'glassrunner',
  'reaver',
  'marauder',
  'saboteur',
  'enforcer2',
  'signalman',
];
/** A target held longer than this in hitstun or airborne would be an infinite (6 s; the
 * longest measured in M23 was Wind Sentinel on Marek, about 4.4 s). */
const HELD_CAP = 60 * 6;

const PRESSES = [
  ActionBit.Attack,
  ActionBit.Attack,
  ActionBit.Attack,
  ActionBit.LowAttack,
  ActionBit.Special,
  ActionBit.Attack,
  ActionBit.Jump,
  ActionBit.Attack,
  ActionBit.Ultimate,
  ActionBit.TeamAttack,
  ActionBit.Dash,
  ActionBit.Attack,
];

/** Looping offence that walks into the nearest enemy; `rhythm` varies the timing per slot. */
function hammer(w: World, slot: number, rhythm: number): FrameInput {
  const h = w.bodies.find((b) => b.team === 'hero' && b.slot === slot);
  const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
  if (!h || h.ko) return idle;
  let best = null;
  for (const e of w.bodies)
    if (e.team === 'enemy' && !e.ko && (!best || Math.abs(e.x - h.x) < Math.abs(best.x - h.x)))
      best = e;
  if (!best) return idle;
  const dx = (best.x - h.x) / 256;
  const dz = (best.z - h.z) / 256;
  const press = w.frame % rhythm === 0 ? PRESSES[(w.frame / rhythm) % PRESSES.length]! : 0;
  return {
    moveX: Math.abs(dx) > 70 ? (dx > 0 ? 1 : -1) : 0,
    moveZ: Math.abs(dz) > 12 ? (dz > 0 ? 1 : -1) : 0,
    pressed: press,
    held: press,
    dirPressed: 0,
  };
}

/** Longest stretch any enemy spent in hitstun or airborne, in frames. */
function longestHeld(room: string, heroes: string[], frames: number): number {
  const w = createWorld(9, { greenhouse: room, heroes, difficulty: 'medium', infiniteMeter: true });
  const held = new Map<number, number>();
  let longest = 0;
  for (let i = 0; i < frames; i += 1) {
    for (const h of w.bodies) if (h.team === 'hero') h.health = h.maxHealth;
    step(
      w,
      heroes.map((_, s) => hammer(w, s, 3 + s * 2)),
    );
    for (const e of w.bodies) {
      if (e.team !== 'enemy') continue;
      const inCombo = e.state === MoveState.Hitstun || e.state === MoveState.Launched;
      const n = inCombo ? (held.get(e.id) ?? 0) + 1 : 0;
      held.set(e.id, n);
      longest = Math.max(longest, n);
    }
  }
  return longest;
}

describe('no infinite combos on Stage 2 enemies and Marek', () => {
  for (const hero of HEROES)
    test(`${hero} against every role and Marek`, () => {
      for (const room of [...ROLES.map((r) => `trial-${r}`), 'boss-marek']) {
        const n = longestHeld(room, [hero], 60 * 40);
        expect(n, `${hero} in ${room}`).toBeLessThan(HELD_CAP);
      }
    }, 120_000);

  for (const pair of [
    ['mountain', 'river'],
    ['wind', 'fire'],
    ['river', 'fire'],
  ])
    test(`${pair.join(' + ')} together against every role and Marek`, () => {
      for (const room of [...ROLES.map((r) => `trial-${r}`), 'boss-marek']) {
        const n = longestHeld(room, pair, 60 * 40);
        expect(n, `${pair.join('+')} in ${room}`).toBeLessThan(HELD_CAP);
      }
    }, 120_000);
});
