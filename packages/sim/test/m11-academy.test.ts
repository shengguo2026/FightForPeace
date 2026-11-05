import { describe, expect, test } from 'vitest';
import { newPilot, pilotInput, stepsFromIds } from '../src/academy/pilot';
import { newTracker, stepGuided, stepPhase } from '../src/academy/lesson';
import { recipeDone } from '../src/combat/recipes';
import { HEROES, PROGRESSION } from '../src/combat/roster';
import { fx } from '../src/math/fixed';
import type { World } from '../src/world/types';
import { createWorld, heroOf, step } from '../src/world/world';
import { idle, inp, press, repeat, tapDir } from './helpers';

/** A Lab world with one dummy right in front of the hero (counter-hit for trip openers). */
function lab(hero: string, counterHit = false): World {
  const w = createWorld(5, { dummies: 1, counterHit, heroes: [hero] });
  const h = heroOf(w, 0)!;
  const d = w.bodies.find((b) => b.team === 'enemy')!;
  h.x = d.x - fx(80);
  h.z = d.z;
  h.facing = 1;
  return w;
}

describe('recipe playback (Academy demonstrations, My Combos)', () => {
  for (const hero of HEROES)
    for (const r of hero.recipes)
      test(`${hero.id}: ${r.id} plays through to the end`, () => {
        const w = lab(hero.id, r.counterHit);
        if (r.family === 'ground') heroOf(w, 0)!.x -= fx(120);
        const d = w.bodies.find((b) => b.team === 'enemy')!;
        const pilot = newPilot();
        let best = 0;
        for (let i = 0; i < 400 && !recipeDone(r, d.ctx.route, 0 + HEROES.indexOf(hero)); i += 1) {
          step(w, [pilotInput(w, 0, r.steps, pilot)]);
          best = Math.max(best, d.ctx.route.length);
        }
        expect(recipeDone(r, d.ctx.route, HEROES.indexOf(hero))).toBe(true);
        expect(pilot.failed).toBe(false);
      });

  test('steps from action ids, with jump hints and alternatives', () => {
    const kit = HEROES[0]!.actions;
    const s = stepsFromIds(kit, ['high-bank-lift', 'jump', 'rafter-palm', 'lockgate-press|foundation-rise', 'nope']);
    expect(s).toHaveLength(4);
    expect(s[1]!.jump).toBe(true);
    expect(s[3]!.any).toHaveLength(2);
  });
});

describe('the First Steps route data', () => {
  test('four lessons, each with guided, trial and mastery goals', () => {
    const route = PROGRESSION.academy[0]!;
    expect(route.id).toBe('academy.first-steps');
    expect(route.lessons.map((l) => l.course)).toEqual([
      'orientation',
      'foundations',
      'defense',
      'resources',
    ]);
  });
});

describe('lesson goals', () => {
  test('move lesson: walk, jump and dash in any order', () => {
    const w = createWorld(1);
    const t = newTracker(w);
    const goals = PROGRESSION.academy[0]!.lessons[0]!.guided;
    let done = false;
    const frames = [
      ...repeat(inp({ moveX: 1 }), 80),
      press('Jump'),
      ...repeat(idle, 60),
      tapDir('right'),
      idle,
      tapDir('right'),
      ...repeat(idle, 10),
    ];
    for (const f of frames) {
      step(w, [f]);
      done = stepGuided(w, 0, t, goals, null) || done;
    }
    expect(t.met).toEqual(expect.arrayContaining(['walk', 'jump']));
    expect(done || t.met.includes('dash')).toBe(true);
  });

  test('chain lesson trial counts completed recipes', () => {
    const w = lab('mountain');
    const lesson = PROGRESSION.academy[0]!.lessons[1]!;
    const t = newTracker(w);
    const r = HEROES[0]!.recipes.find((x) => x.id === lesson.recipe)!;
    let pilot = newPilot();
    let result = 'running';
    for (let i = 0; i < 1500 && result !== 'complete'; i += 1) {
      if (pilot.done) {
        const d = w.bodies.find((b) => b.team === 'enemy')!;
        if (!d.ctx.open) {
          const h = heroOf(w, 0)!;
          h.x = d.x - fx(80);
          h.facing = 1;
          pilot = newPilot();
        }
      }
      step(w, [pilotInput(w, 0, r.steps, pilot)]);
      result = stepPhase(w, 0, t, lesson.trial, lesson.recipe);
    }
    expect(result).toBe('complete');
  });

  test('a timed attempt that runs out starts again without penalty', () => {
    const w = createWorld(1);
    const t = newTracker(w);
    const phase = { goals: ['walk' as const], count: 1, frames: 10 };
    let r = 'running';
    for (let i = 0; i < 12; i += 1) {
      step(w, [idle]);
      const x = stepPhase(w, 0, t, phase, null);
      if (x !== 'running') r = x;
    }
    expect(r).toBe('timeout');
    expect(t.done).toBe(0);
  });
});
