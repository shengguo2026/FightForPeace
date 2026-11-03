import { JUGGLE_BUDGET, juggleBand } from '../src/combat/context';
import { groundFocus } from '../src/combat/ground';
import { canHit } from '../src/combat/hits';
import { recipeDone, recipeProgress } from '../src/combat/recipes';
import { HEROES, heroIndex } from '../src/combat/roster';
import { Reject } from '../src/combat/types';
import { DirBit } from '../src/input/bits';
import { fx } from '../src/math/fixed';
import { ON_FOOT } from '../src/movement/profile';
import { type FrameInput, MoveState, Protect, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { type Cue, contacted, duel, dummyOf, perform, routeIds, running } from './bot';
import { hero, idle, press, repeat, run } from './helpers';

const fwd = (extra: Partial<FrameInput> = {}) =>
  press('Attack', { moveX: 1, dirPressed: DirBit.right, ...extra });
const back = () => press('Attack', { moveX: -1, dirPressed: DirBit.left });
const up = () => press('Attack', { moveZ: -1, dirPressed: DirBit.up });

/** Launcher → jump chase → air neutral → air forward, timed by contact. */
function aerialCues(w: World, launcher: string, airNeutral: string): Cue[] {
  const d = dummyOf(w);
  return [
    { when: () => true, input: up() },
    { when: () => contacted(w, launcher), input: press('Jump') },
    {
      when: () => hero(w).state === MoveState.Air && hero(w).stateFrame > 2 && d.y > 0,
      input: press('Attack'),
    },
    { when: () => contacted(w, airNeutral), input: fwd() },
  ];
}

/** Dash → low attack (counter-trip) → ground extension → ground finisher. */
function groundCues(w: World, finisher: FrameInput): Cue[] {
  const d = dummyOf(w);
  return [
    { when: () => true, input: press('Dash') },
    { when: () => hero(w).stateFrame >= 3, input: press('LowAttack') },
    {
      when: () => d.state === MoveState.Down && running(w) === null && hero(w).state <= 1,
      input: press('Attack'),
    },
    { when: () => running(w) !== null && hero(w).contactAt >= 0, input: finisher },
  ];
}

const foundationCues = (w: World): Cue[] => [
  { when: () => true, input: press('Attack') },
  { when: () => hero(w).contactAt >= 0, input: press('Attack') },
  { when: () => hero(w).contactAt >= 0 && hero(w).chainUsed !== 1, input: press('Attack') },
];

describe('Academy recipes from spec §8.3 performed on a dummy (Review Focus 5)', () => {
  const cases: [string, string, (w: World) => Cue[], object, number][] = [
    ['mountain', 'foundation', foundationCues, {}, 80],
    [
      'mountain',
      'aerial-conversion',
      (w) => aerialCues(w, 'high-bank-lift', 'rafter-palm'),
      {},
      80,
    ],
    ['mountain', 'low-to-ground', (w) => groundCues(w, fwd()), { counterHit: true }, 200],
    ['river', 'foundation', foundationCues, {}, 80],
    ['river', 'aerial-conversion', (w) => aerialCues(w, 'northbank-arc', 'reedwing-tap'), {}, 80],
    ['river', 'low-to-ground', (w) => groundCues(w, fwd()), { counterHit: true }, 200],
  ];
  test.each(cases)('%s %s', (heroId, recipeId, cues, options, gap) => {
    const w = duel(heroId, options, gap);
    const d = dummyOf(w);
    const h = heroIndex(heroId);
    const recipe = HEROES[h]!.recipes.find((r) => r.id === recipeId)!;
    let best = 0;
    const steps = cues(w);
    for (let i = 0; i < steps.length; i += 1) {
      perform(w, [steps[i]!], 0);
      best = Math.max(best, recipeProgress(recipe, d.ctx.route, h));
    }
    run(w, repeat(idle, 60));
    expect(recipeDone(recipe, d.ctx.route, h)).toBe(true);
  });

  test("Mountain's low-to-ground recipe also accepts Foundation Rise", () => {
    const w = duel('mountain', { counterHit: true }, 200);
    perform(w, groundCues(w, back()));
    expect(routeIds(dummyOf(w).ctx.route)).toEqual([
      'faultline-reap',
      'settling-palm',
      'foundation-rise',
    ]);
  });

  test('a wrong first action never matches, and a partner hit in between is ignored', () => {
    const h = heroIndex('mountain');
    const r = HEROES[h]!.recipes[0]!;
    const code = (heroI: number, id: string) =>
      heroI * 64 + HEROES[heroI]!.actions.findIndex((a) => a.id === id);
    const m = (id: string) => code(h, id);
    const partner = code(heroIndex('river'), 'reed-tap');
    expect(recipeProgress(r, [m('anchor-hook'), m('masons-touch')], h)).toBe(0);
    expect(
      recipeDone(r, [m('masons-touch'), partner, m('brace-elbow'), m('gatepost-hammer')], h),
    ).toBe(true);
  });
});

describe('juggle budget (Review Focus 1)', () => {
  test('a launcher pays its juggle cost; a grounded stagger pays nothing', () => {
    const w = duel('mountain');
    run(w, [press('Attack'), ...repeat(idle, 8)]);
    expect(dummyOf(w).ctx.juggleBudget).toBe(JUGGLE_BUDGET);
    const w2 = duel('mountain');
    run(w2, [up(), ...repeat(idle, 14)]);
    expect(dummyOf(w2).ctx.juggleBudget).toBe(JUGGLE_BUDGET - 30);
    expect(dummyOf(w2).state).toBe(MoveState.Launched);
  });

  test('lift bands: full above 60, 70 % from 31, 40 % from 1', () => {
    expect([100, 61, 60, 31, 30, 1].map(juggleBand)).toEqual([100, 100, 70, 70, 40, 40]);
    const lifts: number[] = [];
    for (const budget of [100, 50, 20]) {
      const w = duel('mountain');
      const d = dummyOf(w);
      d.ctx = { ...d.ctx, open: true, juggleBudget: budget };
      d.state = MoveState.Hitstun;
      d.stun = 100;
      run(w, [up(), ...repeat(idle, 10)]);
      lifts.push(d.vy);
    }
    expect(lifts[0]).toBeGreaterThan(lifts[1]!);
    expect(lifts[1]).toBeGreaterThan(lifts[2]!);
  });

  test('exhaustion on a grounded target: the hit lands, then a protected soft reset closes the combo', () => {
    const w = duel('mountain', { refill: false });
    const d = dummyOf(w);
    d.ctx = { ...d.ctx, open: true, actions: 3, juggleBudget: 10 };
    d.state = MoveState.Hitstun;
    d.stun = 100;
    const before = d.health;
    run(w, [up(), ...repeat(idle, 12)]);
    expect(d.health).toBeLessThan(before); // the hit landed
    expect(d.protectedRecovery).toBe(true);
    expect(d.ctx.open).toBe(false);
    expect(d.ctx.ended).toBe(Protect.SoftReset);
  });

  test('a co-op juggle on one dummy spends one shared budget', () => {
    const w = createWorld(1, { dummies: 1 });
    const d = dummyOf(w);
    // Join P2 and place both heroes on either side of the dummy.
    step(w, [idle, idle]);
    const [p1, p2] = [hero(w, 0), hero(w, 1)];
    p1.x = d.x - fx(80);
    p1.z = d.z;
    p2.x = d.x + fx(80);
    p2.z = d.z;
    p2.facing = -1;
    const both = (a: FrameInput, b: FrameInput) => step(w, [a, b]);
    both(up(), idle);
    for (let i = 0; i < 14; i += 1) both(idle, idle);
    expect(d.ctx.juggleBudget).toBe(70);
    // Both heroes jump and hit the airborne dummy in turn.
    for (let i = 0; i < 60 && d.ctx.open; i += 1) {
      const t = i % 30;
      both(
        t === 0 ? press('Jump') : t === 6 ? press('Attack') : idle,
        t === 10 ? press('Jump') : t === 16 ? press('Attack') : idle,
      );
    }
    // High Bank Lift 30, Rafter Palm 10 (P1), Reedwing Tap 10 (P2): one budget.
    expect(routeIds(d.ctx.route)).toEqual(['high-bank-lift', 'rafter-palm', 'reedwing-tap']);
    expect(d.ctx.juggleBudget).toBe(50);
  });

  test('jump chase after the exhausting hit is rejected with the reason', () => {
    const w = duel('mountain');
    const d = dummyOf(w);
    d.ctx = { ...d.ctx, open: true, actions: 3, juggleBudget: 30 };
    d.y = fx(100);
    d.state = MoveState.Launched;
    d.vy = 0;
    // Rafter Palm from the air exhausts the budget... use High Bank Lift on an airborne dummy.
    d.ctx.juggleBudget = 20;
    run(w, [up()]);
    perform(w, [{ when: () => hero(w).contactAt >= 0, input: press('Jump') }], 0);
    expect(d.protectedRecovery).toBe(true);
    expect(hero(w).verdictReject).toBe(Reject.JuggleExhausted);
    expect(hero(w).state).not.toBe(MoveState.Air);
  });
});

describe('protected recovery (Review Focus 3)', () => {
  test('a launch that lands without a ground window ends in protected get-up', () => {
    const w = duel('mountain');
    const d = dummyOf(w);
    run(w, [up()]);
    let protectedAt = -1;
    for (let i = 0; i < 80 && protectedAt < 0; i += 1) {
      run(w, [idle]);
      if (d.protectedRecovery) protectedAt = i;
    }
    expect(d.state).toBe(MoveState.Down);
    expect(d.ctx.open).toBe(false);
    expect(d.ctx.ended).toBe(Protect.GetUp);
  });

  test('nothing hits a protected target, and the attacker gains no meter from it', () => {
    const w = duel('mountain');
    const d = dummyOf(w);
    d.protectedRecovery = true;
    d.state = MoveState.Hitstun;
    d.stun = 60;
    run(w, [press('Attack'), ...repeat(idle, 10)]);
    expect(d.ctx.hits).toBe(0);
    expect(hero(w).meter).toBe(0);
  });

  test('hit-stun exhaustion is a protected soft reset', () => {
    const w = duel('mountain');
    const d = dummyOf(w);
    d.ctx = { ...d.ctx, open: true, actions: 5, stunBudget: 5 };
    d.state = MoveState.Hitstun;
    d.stun = 100;
    run(w, [press('Attack'), ...repeat(idle, 6)]);
    expect(d.protectedRecovery).toBe(true);
    expect(d.ctx.ended).toBe(Protect.SoftReset);
    run(w, repeat(idle, 20));
    expect(d.protectedRecovery).toBe(false);
    expect(d.state).toBe(MoveState.Idle);
  });
});

describe('wall rebound and ground bounce (Review Focus 2)', () => {
  /** Mountain's three-hit string next to the right stage edge. */
  function cornerString(): World {
    const w = duel('mountain');
    const d = dummyOf(w);
    d.x = w.bounds.maxX - fx(60);
    hero(w).x = d.x - fx(80);
    perform(w, foundationCues(w), 0);
    return w;
  }

  test('Gatepost Hammer near the wall rebounds the dummy once', () => {
    const w = cornerString();
    const d = dummyOf(w);
    let rebounded = false;
    for (let i = 0; i < 40; i += 1) {
      run(w, [idle]);
      if (d.state === MoveState.Launched && d.vx < 0) rebounded = true;
    }
    expect(rebounded).toBe(true);
    expect(d.ctx.wallBounceUsed).toBe(true);
  });

  test('a second wall hit in the same combo is an ordinary impact', () => {
    const w = duel('mountain');
    const d = dummyOf(w);
    d.x = w.bounds.maxX - fx(60);
    hero(w).x = d.x - fx(80);
    d.ctx = { ...d.ctx, open: true, actions: 1, wallBounceUsed: true };
    d.state = MoveState.Hitstun;
    d.stun = 100;
    perform(w, foundationCues(w).slice(0, 1), 0);
    run(w, repeat(idle, 4));
    // Brace Elbow and Gatepost Hammer, then watch for a rebound that must not happen.
    perform(w, foundationCues(w).slice(1), 0);
    let reachedWall = false;
    for (let i = 0; i < 30; i += 1) {
      run(w, [idle]);
      reachedWall ||= d.x === w.bounds.maxX;
      expect((d.state as number) === MoveState.Launched && d.vx < 0).toBe(false);
    }
    expect(reachedWall).toBe(true);
  });

  test('Stonefall Knee bounces the dummy off the ground once, then it lands for good', () => {
    const w = duel('mountain');
    const d = dummyOf(w);
    perform(w, aerialCues(w, 'high-bank-lift', 'rafter-palm'), 0);
    let landings = 0;
    let wasAir = d.y > 0;
    for (let i = 0; i < 120; i += 1) {
      run(w, [idle]);
      const air = d.y > 0;
      if (wasAir && !air) landings += 1;
      wasAir = air;
    }
    expect(dummyOf(w).ctx.groundBounceUsed).toBe(true);
    expect(landings).toBe(1); // the bounce itself never touched down for good
    expect(d.ctx.ended).toBe(Protect.GetUp);
  });
});

describe('Ground-Opportunity Focus and the two-step route (Review Focus 4)', () => {
  /** Mountain trips dummy 1 with Mason's Touch → Low Bank Sweep and waits until it is down. */
  function swept(): World {
    const w = duel('mountain');
    const d = dummyOf(w);
    perform(
      w,
      [
        { when: () => true, input: press('Attack') },
        {
          when: () => hero(w).contactAt >= 0,
          input: press('Attack', { moveZ: 1, dirPressed: DirBit.down }),
        },
        { when: () => d.state === MoveState.Down && running(w) === null, input: idle },
      ],
      0,
    );
    return w;
  }

  test('Low Bank Sweep opens a ground window; focus needs range and facing', () => {
    const w = swept();
    const d = dummyOf(w);
    const h = hero(w);
    expect(d.groundWindow).toBeGreaterThan(0);
    expect(groundFocus(w.bodies, h)).toBe(d);
    h.facing = -1;
    expect(groundFocus(w.bodies, h)).toBeNull();
    h.facing = 1;
    h.x = d.x - fx(260);
    expect(groundFocus(w.bodies, h)).toBeNull();
  });

  test('without focus, Attack keeps its standing meaning', () => {
    const w = swept();
    hero(w).facing = -1;
    run(w, [press('Attack')]);
    expect(running(w)).toBe('masons-touch');
  });

  test('ground actions never hit standing targets; standing actions never hit downed ones', () => {
    const w = swept();
    const d = dummyOf(w);
    const m = HEROES[heroIndex('mountain')]!;
    const att = hero(w);
    const palm = m.actions.find((a) => a.id === 'settling-palm')!;
    const touch = m.actions.find((a) => a.id === 'masons-touch')!;
    expect(canHit(att, palm, d)).toBe(true);
    expect(canHit(att, touch, d)).toBe(false);
    d.state = MoveState.Idle;
    expect(canHit(att, palm, d)).toBe(false);
  });

  test('one extension then one finisher, shared; a second extension is rejected', () => {
    const w = swept();
    const d = dummyOf(w);
    perform(w, [{ when: () => true, input: press('Attack') }], 0);
    expect(running(w)).toBe('settling-palm');
    perform(w, [{ when: () => running(w) === null && hero(w).state <= 1, input: idle }], 0);
    expect(d.ctx.groundExtUsed).toBe(true);
    expect(d.groundWindow).toBeGreaterThan(0);
    run(w, [press('Attack')]);
    expect(running(w)).toBeNull();
    expect(hero(w).verdictReject).toBe(Reject.GroundSpent);
    // The finisher is still available.
    run(w, [fwd()]);
    expect(running(w)).toBe('lockgate-press');
    run(w, repeat(idle, 40));
    expect(d.ctx.groundFinUsed).toBe(true);
    expect(d.ctx.hits).toBe(2 + 1 + 3); // touch, sweep, palm, three press hits
    expect(d.protectedRecovery).toBe(true);
    expect(d.ctx.ended).toBe(Protect.GetUp);
  });

  test('missing the window leads to protected recovery; re-knockdown never reopens it', () => {
    const w = swept();
    const d = dummyOf(w);
    let protectedSeen = false;
    for (let i = 0; i < 45; i += 1) {
      run(w, [idle]);
      protectedSeen ||= d.protectedRecovery;
    }
    expect(protectedSeen).toBe(true);
    expect(d.ctx.ended).toBe(Protect.MissedWindow);
    // In one context, a second opensGroundWindow knockdown does not open a new window.
    const w2 = swept();
    const d2 = dummyOf(w2);
    d2.ctx.groundOpened = true;
    d2.state = MoveState.Launched;
    d2.y = fx(10);
    d2.vy = 0;
    d2.groundWindow = 0;
    run(w2, repeat(idle, 6));
    expect(d2.state).toBe(MoveState.Down);
    expect(d2.groundWindow).toBe(0);
    expect(d2.protectedRecovery).toBe(true);
  });

  test('Rising Eddy resolves as a separating kick once the ground-bounce quota is spent', () => {
    const w = duel('river', { counterHit: true }, 200);
    const d = dummyOf(w);
    const cues = groundCues(w, fwd());
    perform(w, cues.slice(0, 3), 0);
    d.ctx.groundBounceUsed = true;
    perform(w, cues.slice(3), 40);
    expect(routeIds(d.ctx.route)).toContain('rising-eddy');
    expect(d.state === MoveState.Down || d.state === MoveState.GetUp).toBe(true);
    expect(d.y).toBe(0);
    expect(d.ctx.ended).toBe(Protect.GetUp);
  });

  test('a ground relaunch spends the ground-bounce quota and its juggle cost', () => {
    const w = duel('river', { counterHit: true }, 200);
    const d = dummyOf(w);
    perform(w, groundCues(w, fwd()), 0);
    run(w, repeat(idle, 12));
    expect(d.ctx.groundBounceUsed).toBe(true);
    expect(d.ctx.juggleBudget).toBe(JUGGLE_BUDGET - 35);
  });
});

describe('jump landing recovery', () => {
  test(`a plain jump lands into ${ON_FOOT.jumpLandingFrames} frames of landing recovery`, () => {
    const w = createWorld(1);
    run(w, [press('Jump')]);
    let n = 0;
    while (hero(w).state === MoveState.Air && n < 60) {
      run(w, [idle]);
      n += 1;
    }
    expect(hero(w).state).toBe(MoveState.Landing);
    run(w, repeat(idle, ON_FOOT.jumpLandingFrames - 1));
    expect(hero(w).state).toBe(MoveState.Landing);
    run(w, [idle]);
    expect(hero(w).state).toBe(MoveState.Idle);
  });

  test('Attack pressed during landing recovery is buffered', () => {
    const w = createWorld(1);
    run(w, [press('Jump')]);
    while (hero(w).state === MoveState.Air) run(w, [idle]);
    run(w, [press('Attack'), ...repeat(idle, ON_FOOT.jumpLandingFrames)]);
    expect(running(w)).toBe('masons-touch');
  });
});

test('jump chase accepts the jump while a direction is still held (Up after the launcher)', () => {
  const w = duel('mountain');
  perform(
    w,
    [
      { when: () => true, input: up() },
      { when: () => contacted(w, 'high-bank-lift'), input: press('Jump', { moveZ: -1 }) },
    ],
    0,
  );
  run(w, repeat(idle, 8));
  expect(hero(w).state).toBe(MoveState.Air);
});
