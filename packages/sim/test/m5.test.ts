import { startAction } from '../src/combat/actions';
import { GRAB, escapeOpen, holdFrame } from '../src/combat/grabs';
import { compatibleMoves, defaultLoadout, loadoutAction } from '../src/combat/loadout';
import { METER, awardGuardMeter, crowdShare, gainBand } from '../src/combat/meter';
import { ENEMIES, HEROES, kitOf } from '../src/combat/roster';
import { Dir, Reject } from '../src/combat/types';
import { fx } from '../src/math/fixed';
import {
  DefEvent,
  type Fighter,
  type FrameInput,
  GrabEvent,
  MoveState,
  Protect,
  type World,
} from '../src/world/types';
import { createWorld, equip, step, type WorldOptions } from '../src/world/world';
import { dummyOf, routeIds, running } from './bot';
import { hero, idle, press, repeat, run } from './helpers';

const MOUNTAIN = HEROES[0]!;
const TRAINER = ENEMIES[0]!;
const idx = (kit: typeof MOUNTAIN, id: string) => kit.actions.findIndex((a) => a.id === id);

/** Hero 1 `gap` px left of Dummy 1 (same depth), facing right; the dummy faces the hero. */
function arena(heroId = 'mountain', options: WorldOptions = {}, gap = 90, dummies = 1): World {
  const w = createWorld(1, { dummies, heroes: [heroId, 'river'], ...options });
  const h = hero(w);
  const d = dummyOf(w);
  h.x = d.x - fx(gap);
  h.z = d.z;
  h.facing = 1;
  d.facing = -1;
  return w;
}

/** Steps idle frames until `cond` holds (at most `limit`). */
function until(w: World, cond: () => boolean, limit = 200, input: FrameInput = idle): void {
  for (let i = 0; i < limit && !cond(); i += 1) step(w, [input]);
  if (!cond()) throw new Error('condition never held');
}

const ids = (f: Fighter) => routeIds(f.ctx.route);

describe('Attack meter (Review Focus 1)', () => {
  test('gain bands and the crowd bonus cap', () => {
    expect([100, 71, 70, 31, 30, 1, 0].map(gainBand)).toEqual([100, 100, 60, 60, 25, 25, 0]);
    // 100 % + 25 % + 25 % = 150 %: the fourth target adds nothing.
    expect([0, 1, 2, 3].map(crowdShare)).toEqual([100, 25, 25, 0]);
  });

  test('a guarded contact earns a quarter of the authored gain', () => {
    const w = arena();
    const h = hero(w);
    awardGuardMeter(w, h, MOUNTAIN.actions[idx(MOUNTAIN, 'stonewake-palm')]!);
    expect(h.meter).toBe(15); // 6 % × 25 % = 1.5 %
  });

  test('the meter is capped at a full bar', () => {
    const w = arena();
    hero(w).meter = METER.max - 5;
    run(w, [press('Attack'), ...repeat(idle, 8)]);
    expect(hero(w).meter).toBe(METER.max);
  });
});

describe('loadout (Review Focus 2)', () => {
  test('defaults: core Specials in neutral, forward and backward; Ultimate in neutral only', () => {
    const l = defaultLoadout(MOUNTAIN);
    const name = (i: number) => (i < 0 ? null : MOUNTAIN.actions[i]!.id);
    expect(l.slice(0, 5).map(name)).toEqual([
      'stonewake-palm',
      'gatebreaker-advance',
      'rising-rampart',
      null,
      null,
    ]);
    expect(l.slice(5).map(name)).toEqual(['rivergate-oath', null, null, null, null]);
  });

  test('Up + Special with an empty slot is rejected and never falls back', () => {
    const w = arena();
    run(w, [press('Special', { moveZ: -1 }), idle]);
    expect(hero(w).state).not.toBe(MoveState.Attack);
    expect(hero(w).verdictReject).toBe(Reject.EmptySlot);
  });

  test('equipping a catalogue move: compatible slots only, neutral fixed, moves between slots', () => {
    const w = arena();
    expect(equip(w, 0, 'special', Dir.Neutral, 'skybreak-column')).toBe('fixed');
    expect(equip(w, 0, 'special', Dir.Forward, 'skybreak-column')).toBe('incompatible');
    expect(equip(w, 0, 'special', Dir.Up, 'rivergate-oath')).toBe('incompatible');
    expect(equip(w, 0, 'special', Dir.Up, 'skybreak-column')).toBe('ok');
    run(w, [press('Special', { moveZ: -1 })]);
    expect(running(w)).toBe('skybreak-column');
    // Moving it to Backward empties Up and replaces Rising Rampart.
    expect(equip(w, 0, 'special', Dir.Backward, 'skybreak-column')).toBe('ok');
    const h = hero(w);
    expect(loadoutAction(h, 'special', Dir.Up)).toBe(-1);
    expect(loadoutAction(h, 'special', Dir.Backward)).toBe(idx(MOUNTAIN, 'skybreak-column'));
    expect(
      compatibleMoves(MOUNTAIN, 'special', Dir.Backward).map((i) => MOUNTAIN.actions[i]!.id),
    ).toEqual(['rising-rampart', 'skybreak-column']);
  });

  test('world options set a player loadout; a catalogue Ultimate fires from its slot', () => {
    const w = arena('river', {
      infiniteMeter: true,
      loadouts: [[{ kind: 'ultimate', dir: Dir.Forward, action: 'floodline-passage' }]],
    });
    run(w, [press('Ultimate', { moveX: 1 })]);
    expect(running(w)).toBe('floodline-passage');
  });

  test('a cancel link names a slot: an emptied slot rejects the link', () => {
    const w = arena('mountain');
    equip(w, 0, 'special', Dir.Neutral, null); // refused: neutral is fixed
    expect(loadoutAction(hero(w), 'special', Dir.Neutral)).toBe(idx(MOUNTAIN, 'stonewake-palm'));
    expect(equip(w, 0, 'special', Dir.Forward, null)).toBe('ok');
    // Stone Shoulder → Forward + Special on hit: the Forward slot is now empty.
    run(w, [press('Attack', { moveX: 1 })]);
    until(w, () => hero(w).contactAt >= 0);
    run(w, [press('Special', { moveX: 1 })]);
    expect(hero(w).verdictReject).toBe(Reject.EmptySlot);
  });
});

describe('Specials (Review Focus 3)', () => {
  test('Gatebreaker Advance armor absorbs a jab (damage, no reaction)', () => {
    const w = arena('mountain', {}, 160);
    const d = dummyOf(w);
    // The jab connects on its frame 15; start Gatebreaker so that lands inside frames 6–15.
    startAction(d, idx(TRAINER, 'jab'));
    run(w, repeat(idle, 4));
    run(w, [press('Special', { moveX: 1 })]);
    until(w, () => hero(w).defEvent !== DefEvent.None, 40);
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.Armored);
    expect(running(w)).toBe('gatebreaker-advance');
    expect(h.health).toBe(h.maxHealth - 40);
    expect(h.ctx.open).toBe(false);
  });

  test('Rising Rampart is strike-invulnerable on frames 1–6', () => {
    const w = arena('mountain', {}, 110);
    const d = dummyOf(w);
    startAction(d, idx(TRAINER, 'jab'));
    run(w, repeat(idle, 11)); // the jab is active on its frames 15–17
    run(w, [press('Special', { moveX: -1 })]);
    run(w, repeat(idle, 4));
    expect(running(w)).toBe('rising-rampart');
    expect(hero(w).health).toBe(hero(w).maxHealth);
  });

  test('Current Crescent flies, hits one enemy once, and a new one replaces the old', () => {
    const w = arena('river', {}, 420);
    run(w, [press('Special')]);
    until(w, () => w.projectiles.length === 1, 20);
    const first = w.projectiles[0]!.x;
    run(w, [idle]);
    expect(w.projectiles[0]!.x).toBeGreaterThan(first);
    until(w, () => dummyOf(w).ctx.open, 60);
    expect(w.projectiles).toHaveLength(0);
    expect(ids(dummyOf(w))).toEqual(['current-crescent']);
    expect(dummyOf(w).ctx.hits).toBe(1);
  });

  test('a second crescent replaces the first one in flight', () => {
    const w = arena('river', {}, 900);
    run(w, [press('Special'), ...repeat(idle, 33), press('Special')]);
    // The first is still flying (spawned on frame 11, 40 frames of life) when the second spawns.
    expect(w.projectiles).toHaveLength(1);
    const old = w.projectiles[0]!.x;
    until(w, () => w.projectiles[0]!.x < old, 20);
    expect(w.projectiles).toHaveLength(1);
  });

  test('Gale Wheel holds and carries its target until the final hit', () => {
    const w = arena('river', {}, 90);
    run(w, [press('Special', { moveX: 1 })]);
    until(w, () => dummyOf(w).ctx.hits === 1);
    expect(dummyOf(w).state).toBe(MoveState.Hitstun);
    until(w, () => dummyOf(w).ctx.hits === 5, 40);
    expect(dummyOf(w).ctx.actions).toBe(1);
  });
});

describe('Ultimates (Review Focus 4)', () => {
  test('without a full bar the Ultimate is refused and nothing is spent', () => {
    const w = arena();
    hero(w).meter = 990;
    run(w, [press('Ultimate'), idle]);
    expect(hero(w).verdictReject).toBe(Reject.NoMeter);
    expect(hero(w).meter).toBe(990);
    expect(hero(w).state).not.toBe(MoveState.Attack);
  });

  test('a full bar is spent on acceptance; the Ultimate ends the combo with a protected get-up', () => {
    const w = arena();
    hero(w).meter = METER.max;
    run(w, [press('Ultimate')]);
    expect(running(w)).toBe('rivergate-oath');
    expect(hero(w).meter).toBe(0);
    until(w, () => dummyOf(w).ctx.hits === 4, 60);
    expect(hero(w).meter).toBe(0); // Ultimates never feed the meter
    until(w, () => dummyOf(w).state === MoveState.Down, 80);
    expect(dummyOf(w).protectedRecovery).toBe(true);
    expect(dummyOf(w).ctx.ended).toBe(Protect.GetUp);
  });

  test('cinematic protection after the first contact: the jab cannot touch the hero', () => {
    const w = arena('mountain', {}, 90, 2);
    const d2 = dummyOf(w, 102);
    d2.x = hero(w).x - fx(100);
    d2.z = hero(w).z;
    d2.facing = 1;
    hero(w).meter = METER.max;
    run(w, [press('Ultimate')]);
    until(w, () => hero(w).cinematic, 30);
    startAction(d2, idx(TRAINER, 'jab'));
    run(w, repeat(idle, 20));
    expect(hero(w).health).toBe(hero(w).maxHealth);
    expect(running(w)).toBe('rivergate-oath');
  });

  test('a gatepost hit cancels into the Ultimate only with a full bar', () => {
    const w = arena('mountain', { infiniteMeter: true }, 80);
    for (let i = 0; i < 90 && running(w) !== 'gatepost-hammer'; i += 1)
      run(w, [i % 3 === 0 ? press('Attack') : idle]);
    until(w, () => running(w) === 'gatepost-hammer' && hero(w).contactAt >= 0, 30);
    run(w, [press('Ultimate')]);
    until(w, () => running(w) === 'rivergate-oath', 20);
    expect(ids(dummyOf(w))).toContain('gatepost-hammer');
  });
});

/** Grabs the dummy with neutral Interact and waits until the hold starts. */
function grabbed(heroId = 'mountain', options: WorldOptions = {}, dummies = 1): World {
  const w = arena(heroId, options, 90, dummies);
  run(w, [press('Interact')]);
  until(w, () => hero(w).state === MoveState.Grabbing, 20);
  return w;
}

describe('grabs (Review Focus 5)', () => {
  test('neutral Interact grabs the dummy in front and holds it', () => {
    const w = grabbed();
    const h = hero(w);
    const d = dummyOf(w);
    expect(d.state).toBe(MoveState.Grabbed);
    expect(h.grabId).toBe(d.id);
    expect(d.grabbedBy).toBe(h.id);
    expect(d.x - h.x).toBe(GRAB.holdDist);
    expect(h.grabEvent).toBe(GrabEvent.Hold);
  });

  test('nobody in reach: a punishable whiff', () => {
    const w = arena('mountain', {}, 400);
    run(w, [press('Interact'), ...repeat(idle, 8)]);
    expect(hero(w).verdictReject).toBe(Reject.NoTarget);
    expect(hero(w).state).toBe(MoveState.Attack);
    expect(running(w)).toBe('millstone-clasp');
  });

  test('a backward grab turns to the enemy behind; the cone ignores the one in front', () => {
    const w = arena('mountain', {}, 90, 2);
    const d2 = dummyOf(w, 102);
    d2.x = hero(w).x - fx(100);
    d2.z = hero(w).z;
    run(w, [press('Interact', { moveX: -1 })]);
    until(w, () => hero(w).state === MoveState.Grabbing, 20);
    expect(hero(w).grabId).toBe(102);
    expect(hero(w).facing).toBe(-1);
  });

  test('route: one extension, then the release strike; the target keeps one context', () => {
    const w = grabbed();
    run(w, [press('Attack')]);
    expect(running(w)).toBe('keystone-knee');
    until(w, () => hero(w).state === MoveState.Grabbing, 40);
    expect(dummyOf(w).state).toBe(MoveState.Grabbed);
    expect(hero(w).grabExtUsed).toBe(true);
    run(w, [press('Attack')]);
    expect(running(w)).toBe('lintel-drop');
    until(w, () => hero(w).grabId === 0, 30);
    const d = dummyOf(w);
    expect(ids(d)).toEqual(['keystone-knee', 'lintel-drop']);
    expect(d.ctx.actions).toBe(2);
    expect(d.regrabUntil).toBe(w.frame - 1 + GRAB.regrab);
  });

  test('the decision window runs out: a separating shove, then re-grab immunity', () => {
    const w = grabbed();
    run(w, repeat(idle, GRAB.decision + 1));
    const d = dummyOf(w);
    expect(hero(w).grabEvent).toBe(GrabEvent.Shove);
    expect(d.state).toBe(MoveState.Recoil);
    expect(d.health).toBe(d.maxHealth);
    // An immediate re-grab finds nobody grabbable.
    const h = hero(w);
    h.x = d.x - fx(90);
    run(w, [press('Interact'), ...repeat(idle, 8)]);
    expect(h.verdictReject).toBe(Reject.NoTarget);
  });

  test('two heroes grab one dummy on the same frame: one holds, the other recovers briefly', () => {
    const w = arena('mountain', { heroes: ['mountain', 'mountain'] }, 90);
    run(w, [idle], 1); // Player 2 joins
    const p2 = hero(w, 1);
    const d = dummyOf(w);
    p2.x = d.x + fx(90);
    p2.z = d.z;
    p2.facing = -1;
    step(w, [press('Interact'), press('Interact')]);
    until(w, () => d.state === MoveState.Grabbed, 20);
    const holders = [hero(w), p2].filter((h) => h.state === MoveState.Grabbing);
    const loser = [hero(w), p2].find((h) => h.state !== MoveState.Grabbing)!;
    expect(holders).toHaveLength(1);
    expect(loser.verdictReject).toBe(Reject.Contested);
    expect(loser.state).toBe(MoveState.Landing);
    expect(loser.stun).toBe(GRAB.contested);
  });

  test('a hit on the grabbing hero releases the target safely', () => {
    const w = grabbed('mountain', {}, 2);
    const d2 = dummyOf(w, 102);
    d2.x = hero(w).x - fx(100);
    d2.z = hero(w).z;
    d2.facing = 1;
    startAction(d2, idx(TRAINER, 'jab'));
    until(w, () => hero(w).state === MoveState.Hitstun, 30);
    run(w, [idle]);
    const d = dummyOf(w);
    expect(hero(w).grabId).toBe(0);
    expect(d.grabbedBy).toBe(0);
    expect(d.state).not.toBe(MoveState.Grabbed);
    expect(d.regrabUntil).toBeGreaterThan(w.frame);
  });

  test('Brace Elbow cancels into the grab on hit; the combo context carries on', () => {
    const w = arena('mountain', {}, 80);
    run(w, [press('Attack'), ...repeat(idle, 6), press('Attack')]);
    until(w, () => running(w) === 'brace-elbow' && hero(w).contactAt >= 0, 30);
    run(w, [press('Interact')]);
    until(w, () => hero(w).state === MoveState.Grabbing, 30);
    run(w, [press('Attack')]);
    until(w, () => dummyOf(w).ctx.actions === 3, 30);
    expect(ids(dummyOf(w))).toEqual(['masons-touch', 'brace-elbow', 'keystone-knee']);
  });
});

describe('throws and body projectiles (Review Focus 6)', () => {
  test('neutral Interact throws forward; Backward + Interact throws behind', () => {
    const fwd = grabbed();
    run(fwd, [press('Interact')]);
    expect(running(fwd)).toBe('sluicegate-toss');
    until(fwd, () => dummyOf(fwd).state === MoveState.Launched, 20);
    expect(dummyOf(fwd).vx).toBeGreaterThan(0);
    const back = grabbed();
    run(back, [press('Interact', { moveX: -1 })]);
    expect(running(back)).toBe('turning-weir');
    until(back, () => dummyOf(back).state === MoveState.Launched, 20);
    expect(dummyOf(back).x).toBeLessThan(hero(back).x);
    expect(dummyOf(back).vx).toBeLessThan(0);
  });

  test('the thrown body hits the next enemy once; it gets its own context', () => {
    const w = grabbed('mountain', {}, 2);
    const d2 = dummyOf(w, 102);
    d2.x = hero(w).x + fx(260);
    d2.z = hero(w).z;
    const meterBefore = hero(w).meter;
    run(w, [press('Interact')]);
    until(w, () => d2.ctx.open, 60);
    const d1 = dummyOf(w);
    expect(d1.thrownBy).toBe(0);
    expect(ids(d2)).toEqual(['sluicegate-toss']);
    expect(ids(d1)).toEqual(['sluicegate-toss']);
    expect(d2.ctx.hits).toBe(1);
    // One action: the second target earns only the 25 % crowd share.
    expect(hero(w).meter - meterBefore).toBe(60 + 15);
    run(w, repeat(idle, 30));
    expect(d2.ctx.hits).toBe(1);
  });

  test('heroes are never hit by a thrown enemy', () => {
    const w = grabbed('mountain');
    run(w, [idle], 1);
    const p2 = hero(w, 1);
    p2.x = hero(w).x + fx(240);
    p2.z = hero(w).z;
    run(w, [press('Interact')]);
    run(w, repeat(idle, 40));
    expect(p2.health).toBe(p2.maxHealth);
  });
});

/** Dummy 1 starts a grab on a hero standing `gap` px away. */
function enemyGrab(id: 'collar-grab' | 'rope-snare', gap = 100, options: WorldOptions = {}) {
  const w = arena('mountain', options, gap);
  startAction(dummyOf(w), idx(TRAINER, id));
  until(w, () => hero(w).state === MoveState.Grabbed, 40);
  return w;
}

describe('Grab Escape, restraint and rescue (Review Focus 7)', () => {
  test('Guard inside the 11-frame window escapes: no damage, both separate', () => {
    const w = enemyGrab('collar-grab');
    const d = dummyOf(w);
    until(w, () => escapeOpen(w, hero(w)), 40);
    run(w, repeat(idle, 4));
    run(w, [press('Guard')]);
    const h = hero(w);
    expect(h.grabEvent).toBe(GrabEvent.Escape);
    expect(h.grabOffset).toBe(4);
    expect(h.state).toBe(MoveState.Recoil);
    expect(d.state).toBe(MoveState.Recoil);
    expect(h.health).toBe(h.maxHealth);
    expect(h.defense).toBe(100);
  });

  test('an early press fails and is the only attempt: the throw lands', () => {
    const w = enemyGrab('collar-grab');
    const d = dummyOf(w);
    run(w, [press('Guard')]);
    expect(hero(w).grabEvent).toBe(GrabEvent.EscapeEarly);
    until(w, () => escapeOpen(w, hero(w)), 40);
    run(w, [press('Guard'), press('Guard')]); // mashing makes no new attempt
    expect(hero(w).state).toBe(MoveState.Grabbed);
    until(w, () => hero(w).state !== MoveState.Grabbed, 40);
    expect(holdFrame(w, d)).toBeGreaterThanOrEqual(48);
    expect(hero(w).grabEvent).toBe(GrabEvent.Thrown);
    expect(hero(w).health).toBe(hero(w).maxHealth - 80);
  });

  test('a late press fails', () => {
    const w = enemyGrab('collar-grab');
    until(w, () => escapeOpen(w, hero(w)), 40);
    until(w, () => !escapeOpen(w, hero(w)), 20);
    run(w, [press('Guard')]);
    expect(hero(w).grabEvent).toBe(GrabEvent.EscapeLate);
    expect(hero(w).grabOffset).toBe(1);
  });

  test('Rope Snare restrains; a solo hero is freed by the time-out', () => {
    const w = enemyGrab('rope-snare');
    until(w, () => hero(w).state === MoveState.Restrained, 60);
    expect(hero(w).grabEvent).toBe(GrabEvent.Restrained);
    run(w, repeat(idle, 150));
    expect(hero(w).state).toBe(MoveState.Idle);
    expect(hero(w).grabEvent).toBe(GrabEvent.RestraintEnded);
  });

  test('the partner frees a restrained hero with Interact', () => {
    const w = enemyGrab('rope-snare');
    until(w, () => hero(w).state === MoveState.Restrained, 60);
    step(w, [idle, idle]);
    const p2 = hero(w, 1);
    p2.x = hero(w).x - fx(80);
    p2.z = hero(w).z;
    step(w, [idle, press('Interact')]);
    expect(hero(w).state).toBe(MoveState.Idle);
    expect(hero(w).grabEvent).toBe(GrabEvent.Rescued);
    expect(p2.grabEvent).toBe(GrabEvent.RescuedPartner);
  });

  test('the partner strikes the grabber during the hold: rescue', () => {
    const w = enemyGrab('collar-grab');
    step(w, [idle, idle]);
    const p2 = hero(w, 1);
    const d = dummyOf(w);
    p2.x = d.x + fx(80);
    p2.z = d.z;
    p2.facing = -1;
    step(w, [idle, press('Attack')]);
    until(w, () => hero(w).state !== MoveState.Grabbed, 20, idle);
    expect(hero(w).grabEvent).toBe(GrabEvent.Rescued);
    expect(hero(w).health).toBe(hero(w).maxHealth);
    expect(kitOf(d)?.id).toBe('trainer');
  });

  test('a held hero cannot be hit by another enemy', () => {
    const w = arena('mountain', {}, 100, 2);
    startAction(dummyOf(w), idx(TRAINER, 'collar-grab'));
    until(w, () => hero(w).state === MoveState.Grabbed, 40);
    const d2 = dummyOf(w, 102);
    d2.x = hero(w).x - fx(100);
    d2.z = hero(w).z;
    d2.facing = 1;
    startAction(d2, idx(TRAINER, 'jab'));
    run(w, repeat(idle, 20));
    expect(hero(w).state).toBe(MoveState.Grabbed);
    expect(hero(w).health).toBe(hero(w).maxHealth);
  });

  test('the armed trainer walks into grab reach and its first Collar Grab connects', () => {
    const w = arena(
      'mountain',
      {
        trainer: {
          attackers: 1,
          pattern: idx(TRAINER, 'collar-grab'),
          interval: 30,
          approach: true,
        },
      },
      400,
    );
    until(w, () => dummyOf(w).state === MoveState.Attack, 300);
    until(
      w,
      () => dummyOf(w).state !== MoveState.Attack || hero(w).state === MoveState.Grabbed,
      40,
    );
    expect(hero(w).state).toBe(MoveState.Grabbed);
  });
});
