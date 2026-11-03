import { startAction } from '../src/combat/actions';
import { DEFENSE, inArc } from '../src/combat/defense';
import { ENEMIES, HEROES, kitOf, routeAction } from '../src/combat/roster';
import { ActionBit, DirBit } from '../src/input/bits';
import { fx } from '../src/math/fixed';
import {
  DefEvent,
  type Fighter,
  type FrameInput,
  MoveState,
  Protect,
  type World,
} from '../src/world/types';
import { createWorld, step, type WorldOptions } from '../src/world/world';
import { dummyOf } from './bot';
import { hero, idle, inp, repeat, run } from './helpers';

const TRAINER = ENEMIES[0]!;
const attackIndex = (id: string) => TRAINER.actions.findIndex((a) => a.id === id);

/** Hero 1 faces right, `gap` px left of Dummy 1 (same depth); the dummy faces the hero. */
function arena(options: WorldOptions = {}, gap = 120, heroId = 'mountain'): World {
  const w = createWorld(1, { dummies: 1, heroes: [heroId, 'river'], ...options });
  const h = hero(w);
  const d = dummyOf(w);
  h.x = d.x - fx(gap);
  h.z = d.z;
  h.facing = 1;
  d.facing = -1;
  // Settle for a while, so tests can press Guard well before an attack's contact.
  run(w, repeat(idle, LEAD_IN));
  return w;
}

const LEAD_IN = 50;

/** The dummy starts an attack at once (the trainer's own script is off). */
function attack(w: World, id: string, d = dummyOf(w)): void {
  startAction(d, attackIndex(id));
}

const G = ActionBit.Guard;
const guardHeld = (extra: Partial<FrameInput> = {}) => inp({ held: G, ...extra });
const guardPress = (extra: Partial<FrameInput> = {}) => inp({ pressed: G, held: G, ...extra });

/**
 * Frame on which the dummy's attack first touches an idle hero, measured on a copy of the
 * same setup, so tests can press relative to contact.
 */
function contactFrame(make: () => World, id: string): number {
  const w = make();
  attack(w, id);
  for (let i = 0; i < 120; i += 1) {
    step(w, [idle]);
    if (hero(w).defEvent !== DefEvent.None) return hero(w).defFrame;
  }
  throw new Error('no contact');
}

/** Steps until world.frame reaches `frame`, sending `input(frame)` each step. */
function until(w: World, frame: number, input: (f: number) => FrameInput = () => idle): void {
  while (w.frame < frame) step(w, [input(w.frame)]);
}

describe('guard arc (Review Focus 1)', () => {
  test.each([
    [0, true],
    [74, true],
    [76, false],
    [90, false],
    [180, false],
  ])('a contact %i° off the defensive facing is inside: %s', (deg, inside) => {
    // cos/sin of the test angles in thousandths (precomputed; no float maths in the sim).
    const table: Record<number, [number, number]> = {
      0: [1000, 0],
      74: [276, 961],
      76: [242, 970],
      90: [0, 1000],
      180: [-1000, 0],
    };
    const [c, s] = table[deg]!;
    expect(inArc(1, 0, fx(c), fx(s))).toBe(inside);
    expect(inArc(1, 0, fx(c), fx(-s))).toBe(inside);
  });

  test('diagonal facings cover their own arc', () => {
    expect(inArc(1, -1, fx(100), fx(-100))).toBe(true);
    expect(inArc(1, -1, fx(-100), fx(100))).toBe(false);
    expect(inArc(0, -1, fx(0), fx(-50))).toBe(true);
  });
});

describe('heroes take hits from the training enemy', () => {
  test('the jab hits an idle hero and opens the hero’s own combo context', () => {
    const w = arena();
    attack(w, 'jab');
    run(w, repeat(idle, 20));
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.Hit);
    expect(h.health).toBe(1000 - 40);
    expect(h.ctx.route.map((c) => routeAction(c)?.id)).toEqual(['jab']);
    run(w, repeat(idle, 40));
    expect(h.state).toBe(MoveState.Idle);
    expect(h.ctx.open).toBe(false);
  });

  test('the bell hammer knocks a hero down; the hero gets up protected and acts again', () => {
    const w = arena({ refill: false });
    attack(w, 'bell-hammer');
    let downed = false;
    let protectedGetUp = false;
    for (let i = 0; i < 160; i += 1) {
      step(w, [idle]);
      if (hero(w).state === MoveState.Down) downed = true;
      if (hero(w).state === MoveState.GetUp && hero(w).protectedRecovery) protectedGetUp = true;
    }
    expect(downed && protectedGetUp).toBe(true);
    expect(hero(w).state).toBe(MoveState.Idle);
    expect(hero(w).health).toBe(1000 - 150);
  });

  test('dummies never attack while the trainer is off', () => {
    const w = arena();
    run(w, repeat(idle, 300));
    expect(dummyOf(w).aiStep).toBe(0);
    expect(hero(w).health).toBe(1000);
  });

  test('an armed dummy walks into range and attacks every interval, cycling its attacks', () => {
    const w = arena({ trainer: { attackers: 1, pattern: -1, interval: 40, approach: true } }, 500);
    run(w, repeat(idle, 600));
    const d = dummyOf(w);
    expect(d.aiStep).toBeGreaterThanOrEqual(3);
    expect(Math.abs(d.x - hero(w).x)).toBeLessThan(fx(300));
  });

  test('a fixed pattern repeats one attack', () => {
    const w = arena({ trainer: { attackers: 1, pattern: attackIndex('jab'), interval: 40 } });
    const seen = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      step(w, [idle]);
      const d = dummyOf(w);
      if (d.action >= 0) seen.add(kitOf(d)!.actions[d.action]!.id);
    }
    expect([...seen]).toEqual(['jab']);
  });
});

describe('normal guard and guard crush (Review Focus 1, 4)', () => {
  test('guard held from well before contact: chip damage, Defense cost, block-stun', () => {
    const w = arena();
    step(w, [guardPress()]);
    run(w, repeat(guardHeld(), 40));
    attack(w, 'jab');
    let n = 0;
    while (hero(w).defEvent === DefEvent.None && n++ < 60) step(w, [guardHeld()]);
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.Guard);
    expect(h.health).toBe(1000 - 8);
    expect(h.defense).toBe(90);
    expect(h.state).toBe(MoveState.Blockstun);
    expect(h.ctx.open).toBe(false);
    run(w, repeat(guardHeld(), 20));
    expect(h.state).toBe(MoveState.Guard);
  });

  test('a contact from behind bypasses the guard', () => {
    const make = () => {
      const w = arena();
      hero(w).facing = -1;
      return w;
    };
    const c = contactFrame(make, 'jab');
    const w = make();
    attack(w, 'jab');
    until(w, c - 30);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    expect(hero(w).defEvent).toBe(DefEvent.Behind);
    expect(hero(w).health).toBe(1000 - 40);
  });

  test('a direction held before Guard sets the defensive facing', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    attack(w, 'jab');
    until(w, c - 30, () => inp({ moveZ: -1, dirPressed: w.frame === 0 ? DirBit.up : 0 }));
    step(w, [guardPress({ moveZ: -1 })]);
    expect([hero(w).guardX, hero(w).guardZ]).toEqual([0, -1]);
    until(w, c + 1, () => guardHeld({ moveZ: -1 }));
    expect(hero(w).defEvent).toBe(DefEvent.Behind);
  });

  test('a pivot takes five frames; the old arc protects until then', () => {
    const make = () => {
      const w = arena();
      hero(w).facing = -1;
      return w;
    };
    const c = contactFrame(make, 'jab');
    for (const [lead, event] of [
      [3, DefEvent.Behind],
      [6, DefEvent.ExactEarly],
    ] as const) {
      const w = make();
      attack(w, 'jab');
      until(w, c - 40);
      step(w, [guardPress()]);
      until(w, c - lead, () => guardHeld());
      step(w, [guardHeld({ moveX: 1, dirPressed: DirBit.right })]);
      until(w, c + 1, () => guardHeld({ moveX: 1 }));
      expect(hero(w).defEvent).toBe(event);
    }
  });

  test('guard-piercing beats held guard; true unblockable beats any guard', () => {
    for (const [id, event] of [
      ['thrust', DefEvent.Pierced],
      ['bell-hammer', DefEvent.Unblockable],
    ] as const) {
      const c = contactFrame(arena, id);
      const w = arena();
      attack(w, id);
      until(w, c - 40);
      step(w, [guardPress()]);
      until(w, c + 1, () => guardHeld());
      expect(hero(w).defEvent).toBe(event);
    }
  });

  test('guard damage that exhausts Defense crushes once: no extra damage, 27 f stagger', () => {
    const c = contactFrame(arena, 'club');
    const w = arena({ refill: false });
    hero(w).defense = 30;
    attack(w, 'club');
    until(w, c - 40);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.GuardCrush);
    expect(h.defense).toBe(0);
    expect(h.health).toBe(1000 - 18);
    expect(h.state).toBe(MoveState.GuardCrush);
    expect(h.ctx.open).toBe(false);
    run(w, repeat(guardHeld(), DEFENSE.guardCrushFrames - 1));
    expect(h.state).toBe(MoveState.GuardCrush);
    run(w, [guardHeld()]);
    // Normal guard stays unavailable at 0 Defense.
    expect(h.state).toBe(MoveState.Idle);
  });

  test('two simultaneous guarded contacts add chip damage but crush only once', () => {
    const make = () => {
      const w = arena({ dummies: 2, refill: false });
      const d2 = dummyOf(w, 102);
      d2.x = dummyOf(w).x;
      d2.z = dummyOf(w).z + fx(6);
      d2.facing = -1;
      return w;
    };
    const c = contactFrame(make, 'club');
    const w = make();
    hero(w).defense = 30;
    attack(w, 'club');
    attack(w, 'club', dummyOf(w, 102));
    until(w, c - 40);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    expect(hero(w).health).toBe(1000 - 36);
    expect(hero(w).state).toBe(MoveState.GuardCrush);
    expect(hero(w).stateFrame).toBe(0);
  });
});

describe('Exact Block (Review Focus 2)', () => {
  test.each([0, 1, 2, 3, 4])('pressed %i f before contact: deflect, no cost, +15 %%', (lead) => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    hero(w).defense = 50;
    attack(w, 'jab');
    until(w, c - lead);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.Exact);
    expect(h.defOffset).toBe(lead);
    expect(h.health).toBe(1000);
    expect(h.defense).toBe(65);
    // A single-hit action is deflected: the attacker recoils and the hero recovers first.
    expect(dummyOf(w).state).toBe(MoveState.Recoil);
    expect(h.state).toBe(MoveState.Guard);
  });

  test('a quick tap (released before contact) still exact-blocks', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    attack(w, 'jab');
    until(w, c - 3);
    step(w, [guardPress()]);
    until(w, c + 1);
    expect(hero(w).defEvent).toBe(DefEvent.Exact);
    run(w, repeat(idle, 6));
    expect(hero(w).state).toBe(MoveState.Idle);
  });

  test('pressed 5 f before contact: normal guard, reported as too early', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    attack(w, 'jab');
    until(w, c - 5);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    expect(hero(w).defEvent).toBe(DefEvent.ExactEarly);
    expect(hero(w).defOffset).toBe(5);
    expect(hero(w).defense).toBe(90);
  });

  test('pressed after contact: no retroactive block, reported as too late', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    attack(w, 'jab');
    until(w, c + 2);
    step(w, [guardPress()]);
    expect(hero(w).defEvent).toBe(DefEvent.Late);
    expect(hero(w).defOffset).toBe(2);
    expect(hero(w).health).toBe(1000 - 40);
  });

  test('a missed attempt starts a precision cooldown: the next press only guards', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    attack(w, 'jab');
    until(w, c - 12);
    step(w, [guardPress()]);
    step(w, [idle]);
    until(w, c - 2);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    expect(hero(w).defEvent).toBe(DefEvent.Cooldown);
    expect(hero(w).defense).toBe(90);
  });

  test('multi-hit: an exact block does not stop the action; the deflect-break contact does', () => {
    const c = contactFrame(arena, 'two-step');
    const second = c + 11;
    const w = arena();
    hero(w).defense = 50;
    attack(w, 'two-step');
    until(w, c - 1);
    step(w, [guardPress()]);
    until(w, c + 1, () => guardHeld());
    expect(hero(w).defEvent).toBe(DefEvent.Exact);
    expect(dummyOf(w).state).toBe(MoveState.Attack);
    until(w, second - 8, () => guardHeld());
    step(w, [idle]); // release, then a fresh press for the second contact
    until(w, second - 2);
    step(w, [guardPress()]);
    until(w, second + 1, () => guardHeld());
    expect(hero(w).defEvent).toBe(DefEvent.ExactBreak);
    expect(dummyOf(w).state).toBe(MoveState.Recoil);
    expect(dummyOf(w).stun).toBe(DEFENSE.deflectBreakRecoil);
    // The +15 % reward came once for the whole action.
    expect(hero(w).defense).toBe(65);
    expect(hero(w).health).toBe(1000);
  });

  test('at zero Defense a fresh press still exact-blocks; holding does not guard', () => {
    const c = contactFrame(arena, 'jab');
    const exact = arena();
    hero(exact).defense = 0;
    attack(exact, 'jab');
    until(exact, c - 2);
    step(exact, [guardPress()]);
    until(exact, c + 1, () => guardHeld());
    expect(hero(exact).defEvent).toBe(DefEvent.Exact);
    expect(hero(exact).defense).toBe(15);

    const held = arena();
    hero(held).defense = 0;
    attack(held, 'jab');
    until(held, c - 20);
    step(held, [guardPress()]);
    until(held, c + 1, () => guardHeld());
    expect(hero(held).defEvent).toBe(DefEvent.Hit);
  });
});

describe('Directional Predictive Counter (Review Focus 3)', () => {
  const toward = (extra: Partial<FrameInput> = {}) =>
    inp({ moveX: 1, dirPressed: DirBit.right, ...extra });

  test.each([0, 1, 2])('direction then Guard, %i f before contact: counter', (lead) => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    hero(w).defense = 40;
    attack(w, 'jab');
    until(w, c - lead - 1);
    step(w, [toward()]);
    step(w, [guardPress({ moveX: 1 })]);
    until(w, c + 1, () => guardHeld({ moveX: 1 }));
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.Counter);
    expect(h.defOffset).toBe(lead);
    expect(h.defense).toBe(65);
    expect(h.health).toBe(1000);
    expect(HEROES[h.hero]!.actions[h.action]!.id).toBe('bedrock-return');
    run(w, repeat(idle, 10));
    const d = dummyOf(w);
    expect(d.ctx.route.map((r) => routeAction(r)?.id)).toEqual(['bedrock-return']);
    expect(d.health).toBeLessThan(1000);
  });

  test('Guard then a fresh direction inside the chord tolerance also counters', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena({}, 120, 'river');
    attack(w, 'jab');
    until(w, c - 2);
    step(w, [guardPress()]);
    step(w, [guardHeld({ moveX: 1, dirPressed: DirBit.right })]);
    until(w, c + 1, () => guardHeld({ moveX: 1 }));
    expect(hero(w).defEvent).toBe(DefEvent.Counter);
    expect(HEROES[hero(w).hero]!.actions[hero(w).action]!.id).toBe('eddy-return');
  });

  test('pressed 3 f before contact: the window has closed, vulnerable recovery', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    attack(w, 'jab');
    until(w, c - 4);
    step(w, [toward()]);
    step(w, [guardPress({ moveX: 1 })]);
    until(w, c + 1, () => guardHeld({ moveX: 1 }));
    expect(hero(w).defEvent).toBe(DefEvent.Hit);
    expect(hero(w).health).toBe(1000 - 40);
  });

  test('a counter with no contact ends in 24 f of vulnerable recovery, never in guard', () => {
    const w = arena();
    step(w, [toward()]);
    step(w, [guardPress({ moveX: 1 })]);
    expect(hero(w).state).toBe(MoveState.Counter);
    run(w, repeat(guardHeld({ moveX: 1 }), 3));
    expect(hero(w).state).toBe(MoveState.CounterMiss);
    expect(hero(w).defEvent).toBe(DefEvent.CounterMiss);
    run(w, repeat(guardHeld({ moveX: 1 }), DEFENSE.counterMissFrames - 1));
    expect(hero(w).state).toBe(MoveState.CounterMiss);
  });

  test('toward the wrong side, or against an uncounterable attack, the hit connects', () => {
    const c = contactFrame(arena, 'jab');
    const wrong = arena();
    attack(wrong, 'jab');
    until(wrong, c - 2);
    step(wrong, [inp({ moveZ: 1, dirPressed: DirBit.down })]);
    step(wrong, [guardPress({ moveZ: 1 })]);
    until(wrong, c + 1, () => guardHeld({ moveZ: 1 }));
    expect(hero(wrong).defEvent).toBe(DefEvent.CounterWrongDir);
    expect(hero(wrong).health).toBe(1000 - 40);

    const ct = contactFrame(arena, 'thrust');
    const w = arena();
    attack(w, 'thrust');
    until(w, ct - 2);
    step(w, [toward()]);
    step(w, [guardPress({ moveX: 1 })]);
    until(w, ct + 1, () => guardHeld({ moveX: 1 }));
    expect(hero(w).defEvent).toBe(DefEvent.CounterUncounterable);
    expect(hero(w).health).toBe(1000 - 70);
  });

  test('a counter works at zero Defense', () => {
    const c = contactFrame(arena, 'jab');
    const w = arena();
    hero(w).defense = 0;
    attack(w, 'jab');
    until(w, c - 2);
    step(w, [toward()]);
    step(w, [guardPress({ moveX: 1 })]);
    until(w, c + 1, () => guardHeld({ moveX: 1 }));
    expect(hero(w).defEvent).toBe(DefEvent.Counter);
    expect(hero(w).defense).toBe(25);
  });
});

describe('Combo Breaker (Review Focus 5)', () => {
  const chord = inp({ pressed: ActionBit.Guard | ActionBit.Ultimate, held: G });

  /** Lets the barrage land its first two hits, so the hero is trapped in hit-stun. */
  function trapped(defense = 100): World {
    const w = arena({ refill: false });
    hero(w).defense = defense;
    attack(w, 'barrage');
    for (let i = 0; i < 60 && hero(w).ctx.hits < 2; i += 1) step(w, [idle]);
    expect(hero(w).state).toBe(MoveState.Hitstun);
    return w;
  }

  test('Guard + Ultimate in hit-stun: 75 % spent, combo closed, protected, enemies pushed', () => {
    const w = trapped();
    const health = dummyOf(w).health;
    step(w, [chord]);
    const h = hero(w);
    expect(h.defEvent).toBe(DefEvent.Breaker);
    expect(h.state).toBe(MoveState.Breaker);
    expect(h.defense).toBe(25);
    expect(h.ctx.open).toBe(false);
    expect(h.ctx.ended).toBe(Protect.Breaker);
    expect(h.protectedRecovery).toBe(true);
    const d = dummyOf(w);
    expect(d.state).toBe(MoveState.Recoil);
    expect(d.vx).toBeGreaterThan(0);
    run(w, repeat(idle, 20));
    expect(d.health).toBe(health);
    expect(h.health).toBeGreaterThan(1000 - 120);
    run(w, repeat(idle, DEFENSE.breakerFrames));
    expect(h.state).toBe(MoveState.Idle);
    expect(h.protectedRecovery).toBe(false);
  });

  test('the chord works in either order inside the tolerance', () => {
    const w = trapped();
    step(w, [inp({ pressed: ActionBit.Ultimate })]);
    step(w, [inp({ pressed: G, held: G })]);
    expect(hero(w).defEvent).toBe(DefEvent.Breaker);
  });

  test('under 75 % Defense: refused, nothing spent, never activates later', () => {
    const w = trapped(60);
    step(w, [chord]);
    expect(hero(w).defEvent).toBe(DefEvent.BreakerDenied);
    expect(hero(w).defOffset).toBe(1);
    expect(hero(w).defense).toBe(60);
    expect(hero(w).state).toBe(MoveState.Hitstun);
    hero(w).defense = 100;
    run(w, repeat(idle, 4));
    expect(hero(w).state).not.toBe(MoveState.Breaker);
  });

  test('in neutral or during a guard crush the chord breaks nothing', () => {
    const w = arena();
    step(w, [chord]);
    expect(hero(w).state).not.toBe(MoveState.Breaker);
    expect(hero(w).defense).toBe(100);
    const crush = arena();
    hero(crush).state = MoveState.GuardCrush;
    hero(crush).stun = 27;
    step(crush, [chord]);
    expect(hero(crush).defEvent).toBe(DefEvent.BreakerDenied);
    expect(hero(crush).defOffset).toBe(2);
    expect(hero(crush).defense).toBe(100);
  });
});

describe('Defense meter recovery (Review Focus 4)', () => {
  test('below 25 %: after 90 f calm, +1 every 4 f up to 25 %, never higher', () => {
    const w = arena();
    const h = hero(w);
    h.defense = 0;
    h.defIdle = 0;
    run(w, repeat(idle, 90));
    expect(h.defense).toBe(1);
    run(w, repeat(idle, 4 * 24));
    expect(h.defense).toBe(25);
    run(w, repeat(idle, 200));
    expect(h.defense).toBe(25);
  });

  test('guarding resets the delay; above the floor nothing regenerates', () => {
    const w = arena();
    const h = hero(w);
    h.defense = 10;
    h.defIdle = 0;
    run(w, repeat(idle, 80));
    step(w, [guardPress()]);
    run(w, repeat(idle, 80));
    expect(h.defense).toBe(10);
    h.defense = 40;
    run(w, repeat(idle, 300));
    expect(h.defense).toBe(40);
  });

  test('the Lab switch keeps Defense full', () => {
    const w = arena({ infiniteDefense: true });
    hero(w).defense = 0;
    step(w, [idle]);
    expect(hero(w).defense).toBe(100);
  });
});

test('a hero’s Fighter fields stay in sync with the kits (no stray enemy kit on heroes)', () => {
  const w = arena();
  const h: Fighter = hero(w);
  expect(kitOf(h)?.id).toBe('mountain');
  expect(kitOf(dummyOf(w))?.id).toBe('trainer');
});
