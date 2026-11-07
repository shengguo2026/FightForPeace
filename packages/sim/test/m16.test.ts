import { startAction } from '../src/combat/actions';
import { conversionFor, largeTarget } from '../src/combat/hits';
import { HEROES, kitOf } from '../src/combat/roster';
import { enemyKitIndex } from '../src/enemies/data';
import { Reject, TargetState } from '../src/combat/types';
import { COOP, TEAM_FINISHERS } from '../src/coop/data';
import { handoffRoute } from '../src/coop/handoff';
import { finisherFor } from '../src/coop/team';
import { spawnEnemy } from '../src/enemies/boss';
import { fx } from '../src/math/fixed';
import { type Fighter, type FrameInput, MoveState, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { dummyOf } from './bot';
import { hero, idle, press } from './helpers';

const kitIdx = (f: Fighter, id: string) => kitOf(f)!.actions.findIndex((a) => a.id === id);
const actionOf = (f: Fighter) => kitOf(f)!.actions[f.action]?.id;

/** Two heroes around Dummy 1, Player 1 on the left facing right (as in the M8 tests). */
function pair(heroes: string[], gap = 90): World {
  const w = createWorld(1, { dummies: 1, heroes });
  step(w, [idle, idle]);
  const d = dummyOf(w);
  const [p1, p2] = [hero(w, 0), hero(w, 1)];
  p1.x = d.x - fx(gap);
  p2.x = d.x + fx(gap);
  p1.z = d.z;
  p2.z = d.z;
  p1.facing = 1;
  p2.facing = -1;
  d.facing = -1;
  return w;
}

function solo(id: string, gap = 90): World {
  const w = createWorld(1, { dummies: 1, heroes: [id] });
  step(w, [idle]);
  const d = dummyOf(w);
  const h = hero(w);
  h.x = d.x - fx(gap);
  h.z = d.z;
  h.facing = 1;
  d.facing = -1;
  return w;
}

function frames(w: World, n: number): void {
  const inputs: FrameInput[] = w.bodies.filter((b) => b.team === 'hero').map(() => idle);
  for (let i = 0; i < n; i += 1) step(w, inputs);
}

/** Starts an action so that its first active frame is `inFrames` frames away. */
function strikeIn(w: World, slot: number, id: string, inFrames: number): void {
  const h = hero(w, slot);
  const i = kitIdx(h, id);
  expect(i, id).toBeGreaterThanOrEqual(0);
  startAction(h, i);
  h.stateFrame = kitOf(h)!.actions[i]!.startup - inFrames;
}

describe('the four-hero roster (spec §7)', () => {
  test('four heroes in roster order, each a guardian; the twins share the twin tag', () => {
    expect(HEROES.map((h) => h.id)).toEqual(['mountain', 'river', 'wind', 'fire']);
    for (const h of HEROES) expect(h.tags).toContain('guardian');
    expect(HEROES.filter((h) => h.tags.includes('twin')).map((h) => h.id)).toEqual([
      'wind',
      'fire',
    ]);
  });

  test('every kit has normals, a low, three starting Specials, an Ultimate and team parts', () => {
    for (const h of HEROES) {
      const cats = h.actions.map((a) => a.category);
      expect(cats.filter((c) => c === 'special').length, h.id).toBeGreaterThanOrEqual(3);
      expect(cats, h.id).toContain('ultimate');
      expect(cats, h.id).toContain('counter');
      expect(
        h.actions.some((a) => a.category === 'low'),
        h.id,
      ).toBe(true);
      expect(
        h.actions.some((a) => a.id === 'confluence-strike'),
        h.id,
      ).toBe(true);
    }
  });

  test('all six pairs start, each hero once', () => {
    const ids = HEROES.map((h) => h.id);
    let pairs = 0;
    for (let i = 0; i < ids.length; i += 1)
      for (let j = i + 1; j < ids.length; j += 1) {
        const w = pair([ids[i]!, ids[j]!]);
        expect([kitOf(hero(w, 0))!.id, kitOf(hero(w, 1))!.id]).toEqual([ids[i], ids[j]]);
        pairs += 1;
      }
    expect(pairs).toBe(6);
  });
});

describe('Fire Warden: Contact-Confirmed Conversions', () => {
  test('Flashpoint Clinch on contact converts into the takedown when its active frames end', () => {
    const w = solo('fire');
    const h = hero(w);
    strikeIn(w, 0, 'flashpoint-clinch', 1);
    frames(w, 1);
    expect(h.convert).toBe(kitIdx(h, 'flashpoint-takedown') + 1);
    let seen = false;
    for (let i = 0; i < 12 && !seen; i += 1) {
      frames(w, 1);
      seen = actionOf(h) === 'flashpoint-takedown';
    }
    expect(seen).toBe(true);
    frames(w, 30);
    expect([MoveState.Down, MoveState.Launched, MoveState.GetUp]).toContain(dummyOf(w).state);
  });

  test('a whiffed Flashpoint Clinch never converts', () => {
    const w = solo('fire', 400);
    const h = hero(w);
    strikeIn(w, 0, 'flashpoint-clinch', 1);
    for (let i = 0; i < 40; i += 1) {
      frames(w, 1);
      expect(actionOf(h) === 'flashpoint-takedown').toBe(false);
    }
  });

  test("Ember Catch's trip needs an unarmed target", () => {
    const w = solo('fire');
    const h = hero(w);
    const d = dummyOf(w);
    const catchAct = kitOf(h)!.actions[kitIdx(h, 'ember-catch')]!;
    expect(conversionFor(w, catchAct, d)).toBe(kitIdx(h, 'ember-catch-trip'));
    d.wkit = 0;
    expect(conversionFor(w, catchAct, d)).toBe(-1);
  });

  test('large enemies take the braced alternative unless vulnerable; the boss likewise', () => {
    const w = createWorld(1, { arena: 'boss-commander', difficulty: 'medium', heroes: ['fire'] });
    for (let i = 0; i < 3000 && !w.encounter!.boss; i += 1) step(w, [idle]);
    const h = hero(w);
    const enforcer = spawnEnemy(w, enemyKitIndex('enforcer'), h.x + fx(200), h.z);
    const recruit = spawnEnemy(w, enemyKitIndex('recruit'), h.x + fx(300), h.z);
    const crucible = kitOf(h)!.actions[kitIdx(h, 'wardens-crucible')]!;
    const clinch = kitOf(h)!.actions[kitIdx(h, 'flashpoint-clinch')]!;
    expect(largeTarget(w, enforcer)).toBe(true);
    expect(largeTarget(w, recruit)).toBe(false);
    expect(conversionFor(w, crucible, recruit)).toBe(kitIdx(h, 'crucible-takedown'));
    expect(conversionFor(w, crucible, enforcer)).toBe(kitIdx(h, 'crucible-braced'));
    expect(conversionFor(w, clinch, enforcer)).toBe(-1);
    enforcer.state = MoveState.GuardCrush;
    expect(conversionFor(w, crucible, enforcer)).toBe(kitIdx(h, 'crucible-takedown'));
    expect(conversionFor(w, clinch, enforcer)).toBe(kitIdx(h, 'flashpoint-takedown'));
    const boss = w.bodies.find((b) => b.id === w.encounter!.boss!.id)!;
    expect(largeTarget(w, boss)).toBe(true);
    expect(conversionFor(w, crucible, boss)).toBe(kitIdx(h, 'crucible-braced'));
    w.encounter!.boss!.stagger = 30;
    expect(conversionFor(w, crucible, boss)).toBe(kitIdx(h, 'crucible-takedown'));
  });

  test('airborne or downed targets never convert', () => {
    const w = solo('fire');
    const h = hero(w);
    const d = dummyOf(w);
    const clinch = kitOf(h)!.actions[kitIdx(h, 'flashpoint-clinch')]!;
    d.y = fx(40);
    expect(conversionFor(w, clinch, d)).toBe(-1);
    d.y = 0;
    d.state = MoveState.Down;
    expect(conversionFor(w, clinch, d)).toBe(-1);
  });

  test('Rising Cast stands a grounded target back up into a bounded stagger', () => {
    const w = solo('fire', 70);
    const d = dummyOf(w);
    strikeIn(w, 0, 'ashline-reap', 1);
    frames(w, 1);
    let tries = 0;
    while (d.state !== MoveState.Down && tries < 80) {
      frames(w, 1);
      tries += 1;
    }
    expect(d.state).toBe(MoveState.Down);
    strikeIn(w, 0, 'rising-cast', 1);
    frames(w, 2);
    expect(d.state).toBe(MoveState.Hitstun);
    expect(d.y).toBe(0);
    expect(d.stun).toBeLessThanOrEqual(
      kitOf(hero(w))!.actions[kitIdx(hero(w), 'rising-cast')]!.reaction.hitstun,
    );
  });
});

describe('Wind Sentinel: whiff punish', () => {
  /** Slipstream Backfist on the dummy, then forward + Attack through its recovery. */
  function chain(counterHit: boolean): { punish: boolean; next: string | undefined } {
    const w = solo('wind');
    w.dummy.counterHit = counterHit;
    const h = hero(w);
    strikeIn(w, 0, 'slipstream-backfist', 1);
    frames(w, 2);
    const punish = h.punish;
    const fwd = press('Attack', { moveX: 1 });
    step(w, [fwd]);
    for (let i = 0; i < 20 && actionOf(h) === 'slipstream-backfist'; i += 1) step(w, [idle]);
    return { punish, next: actionOf(h) };
  }

  test('a plain hit never opens Clear-Sky Return', () => {
    const r = chain(false);
    expect(r.punish).toBe(false);
    expect(r.next).not.toBe('clear-sky-return');
  });

  test('a whiff punish (the Lab counter-hit option) opens it', () => {
    const r = chain(true);
    expect(r.punish).toBe(true);
    expect(r.next).toBe('clear-sky-return');
  });

  test('the reject reason is named', () => {
    expect(Reject.NeedsPunish).toBe(19);
  });
});

describe("Reciprocal Handoffs and Twin Guardians' Accord", () => {
  test("Wind's launcher opens Crosswind Temper for Fire Warden only", () => {
    const w = pair(['wind', 'fire']);
    const d = dummyOf(w);
    strikeIn(w, 0, 'northwind-rise', 1);
    frames(w, 1);
    expect(d.handoff).toBe(TargetState.Airborne);
    expect(handoffRoute(d)?.id).toBe('crosswind-temper');
    hero(w, 1).x = d.x + fx(60);
    // The receiving move starts inside the pre-input buffer (M8 rule).
    frames(w, 2);
    strikeIn(w, 1, 'rising-brand', 1);
    frames(w, 1);
    expect(w.coop.handoffs).toBe(1);
    expect(w.coop.reciprocal).toBe(1);
  });

  test('the same launcher with a founder partner opens the ordinary handoff', () => {
    const w = pair(['wind', 'river']);
    const d = dummyOf(w);
    strikeIn(w, 0, 'northwind-rise', 1);
    frames(w, 1);
    expect(d.handoff).toBe(TargetState.Airborne);
    expect(handoffRoute(d)).toBeNull();
  });

  test("Fire's Rising Cast opens Rising Ember Relay for Wind Sentinel", () => {
    const w = pair(['fire', 'wind'], 70);
    const d = dummyOf(w);
    strikeIn(w, 0, 'ashline-reap', 1);
    frames(w, 1);
    for (let i = 0; i < 80 && d.state !== MoveState.Down; i += 1) frames(w, 1);
    strikeIn(w, 0, 'rising-cast', 1);
    frames(w, 1);
    expect(d.handoff).toBe(TargetState.Stagger);
    expect(handoffRoute(d)?.id).toBe('rising-ember-relay');
    hero(w, 1).x = d.x + fx(80);
    frames(w, 2);
    strikeIn(w, 1, 'headwind-entry', 1);
    frames(w, 1);
    expect(w.coop.reciprocal).toBe(1);
  });

  test('the twins pair into the Accord; every other pair into Confluence Strike', () => {
    const accord = TEAM_FINISHERS.findIndex((f) => f.id === 'twin-accord');
    const confluence = TEAM_FINISHERS.findIndex((f) => f.id === 'confluence');
    expect(TEAM_FINISHERS[accord]!.bossStrike).toBe(true);
    expect(TEAM_FINISHERS[confluence]!.bossStrike).toBe(false);
    const ids = HEROES.map((h) => h.id);
    for (const a of ids)
      for (const b of ids) {
        if (a === b) continue;
        const w = pair([a, b]);
        const want = a !== 'mountain' && a !== 'river' && b !== 'mountain' && b !== 'river';
        expect(finisherFor(hero(w, 0), hero(w, 1)), `${a}+${b}`).toBe(want ? accord : confluence);
      }
  });

  test('coop.yaml keys routes by tags, never by hero', () => {
    const routes = COOP.handoffs.filter((h) => h.route).map((h) => h.route!.pair);
    expect(routes.length).toBe(4);
    for (const p of routes) expect(p).toEqual(['twin', 'twin']);
  });
});
