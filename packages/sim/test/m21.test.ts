import { describe, expect, test } from 'vitest';
import { HEROES } from '../src/combat/roster';
import { defaultLoadout, SLOTS } from '../src/combat/loadout';
import type { ActionDef } from '../src/combat/types';
import { runShowcase, showcasesOf } from '../src/academy/showcase';
import { tally } from '../src/stage/tally';
import { createWorld, encodeWorld } from '../src/world/world';

/**
 * M21: the twins' purchased-move catalogue (Appendix A), the showcase routes of the Move
 * Preview (every step must connect: this is the CI gate of roadmap decision 4) and the
 * run counters behind the Stage 2 achievements.
 */
const reach = (a: ActionDef) => a.hitbox.x + a.hitbox.w;

describe('the twins’ catalogue moves', () => {
  for (const id of ['wind', 'fire']) {
    test(`${id}: two optional Specials (Up, Down) and one Backward Ultimate`, () => {
      const kit = HEROES.find((h) => h.id === id)!;
      const cat = kit.actions.filter((a) => a.catalogue);
      expect(cat.filter((a) => a.context === 'special')).toHaveLength(2);
      expect(cat.filter((a) => a.context === 'ultimate')).toHaveLength(1);
      for (const a of cat) {
        expect(a.slots.length).toBeGreaterThan(0);
        expect(a.damage).toBeGreaterThan(0);
      }
    });
  }

  test('no bought move beats the starting option of its slot on range, startup, recovery and damage at once', () => {
    const problems: string[] = [];
    for (const kit of HEROES) {
      const lo = defaultLoadout(kit);
      for (const a of kit.actions.filter((x) => x.catalogue)) {
        const base = a.context === 'ultimate' ? SLOTS : 0;
        for (const dir of a.slots) {
          const d = kit.actions[lo[base + dir] ?? -1];
          if (!d) continue;
          const dominates =
            reach(a) >= reach(d) &&
            a.startup <= d.startup &&
            a.recovery <= d.recovery &&
            a.damage >= d.damage;
          if (dominates) problems.push(`${kit.id}: ${a.id} beats ${d.id}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('showcase routes (Move Preview)', () => {
  test('every hero has two or three freestyle routes; the twins one pair route each or more', () => {
    for (const kit of HEROES) {
      const sc = showcasesOf(kit.id);
      expect(sc.filter((s) => !s.partner).length).toBeGreaterThanOrEqual(2);
      if (kit.id === 'wind' || kit.id === 'fire') expect(sc.some((s) => s.partner)).toBe(true);
    }
  });

  for (const kit of HEROES)
    for (const sc of showcasesOf(kit.id))
      test(`${kit.id} · ${sc.id}: every step connects`, () => {
        const r = runShowcase(kit.id, sc);
        const missed = sc.steps.map((_, i) => i).filter((i) => r.landed[i]! < 0);
        expect(missed).toEqual([]);
        expect(r.failed).toBe(false);
      });

  test('a showcase replays identically (deterministic pilot)', () => {
    const sc = showcasesOf('fire')[0]!;
    const a = runShowcase('fire', sc, 7);
    const b = runShowcase('fire', sc, 7);
    expect(a.landed).toEqual(b.landed);
    expect(encodeWorld(a.world)).toEqual(encodeWorld(b.world));
  });
});

describe('Stage 2 run counters (state format 18)', () => {
  test('counters add up in a stage run and are encoded', () => {
    const w = createWorld(1, { stage: 'stage2', difficulty: 'medium', heroes: ['wind'] });
    const before = encodeWorld(w);
    tally(w, 'reciprocal');
    tally(w, 'calls', 2);
    tally(w, 'callsBroken');
    tally(w, 'grenadeDamage', 30);
    expect(w.run!.stats).toMatchObject({
      reciprocal: 1,
      calls: 2,
      callsBroken: 1,
      grenadeDamage: 30,
    });
    expect(encodeWorld(w)).not.toEqual(before);
  });

  test('outside a stage run (Lab rooms, arenas) nothing is counted', () => {
    const w = createWorld(1);
    expect(w.run).toBeNull();
    expect(() => tally(w, 'accord')).not.toThrow();
  });
});
