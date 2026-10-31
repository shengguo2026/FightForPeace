import { activeHitbox } from '../src/combat/hits';
import { HEROES, totalFrames } from '../src/combat/roster';
import { Dir, Reject } from '../src/combat/types';
import { resolveDir } from '../src/combat/actions';
import { scaledHitstun, splitDamage, stunBand } from '../src/combat/context';
import { DirBit } from '../src/input/bits';
import { fx } from '../src/math/fixed';
import { type FrameInput, GroundTag, MoveState, type World } from '../src/world/types';
import { type WorldOptions, createWorld, step } from '../src/world/world';
import { hero, idle, inp, press, repeat, run, tapDir } from './helpers';

/** Hero 1 stands 80 px left of dummy 101, same depth, facing right. */
function duel(heroId: string, options: WorldOptions = {}): World {
  const w = createWorld(1, { dummies: 1, heroes: [heroId, 'river'], ...options });
  const h = hero(w);
  const d = dummy(w);
  h.x = d.x - fx(80);
  h.z = d.z;
  return w;
}

const dummy = (w: World) => w.bodies.find((b) => b.id === 101)!;
const actionId = (w: World) => {
  const h = hero(w);
  return h.action >= 0 ? HEROES[h.hero]!.actions[h.action]!.id : null;
};

/** Runs frames and records every action id the hero started. */
function trace(w: World, frames: FrameInput[]): string[] {
  const seen: string[] = [];
  for (const f of frames) {
    step(w, [f]);
    const id = actionId(w);
    if (id && hero(w).stateFrame === 0) seen.push(id);
  }
  return seen;
}

/** Presses Attack every `every` frames for `n` frames. */
const mash = (n: number, every = 3, extra: Partial<FrameInput> = {}) =>
  Array.from({ length: n }, (_, i) => (i % every === 0 ? press('Attack', extra) : idle));

describe('neutral fallback (Review Focus 1)', () => {
  test.each([
    ['mountain', ['masons-touch', 'brace-elbow', 'gatepost-hammer']],
    ['river', ['reed-tap', 'turning-current', 'open-channel-kick']],
  ])('%s: repeated Attack gives exactly three hits', (id, expected) => {
    const w = duel(id);
    const started: string[] = [];
    for (let i = 0; i < 80 && started.length < 3; i += 1) started.push(...trace(w, mash(1)));
    expect(started).toEqual(expected);
    run(w, repeat(idle, 14));
    expect(dummy(w).ctx.actions).toBe(3);
    expect(dummy(w).ctx.hits).toBe(3);
  });

  test('the third hit knocks the dummy back further than the first two', () => {
    const w = duel('mountain');
    run(w, mash(40));
    expect(dummy(w).ctx.damage).toBeGreaterThan(0);
    const d = dummy(w);
    expect(d.x - hero(w).x).toBeGreaterThan(fx(130));
  });

  test('repeated Attack into the air never chains', () => {
    const w = createWorld(1, { dummies: 0 });
    const started = trace(w, mash(40));
    expect(started.every((s) => s === 'masons-touch')).toBe(true);
    expect(started.length).toBeGreaterThan(0);
  });

  test('a press after a whiff is rejected with "needs a hit"', () => {
    const w = createWorld(1);
    run(w, [press('Attack'), ...repeat(idle, 9), press('Attack')]);
    expect(hero(w).verdictReject).toBe(Reject.NeedsHit);
  });
});

describe('frame data', () => {
  test("Mason's Touch lasts 17 frames and is active on frames 6–8", () => {
    const w = createWorld(1);
    const active: number[] = [];
    run(w, [press('Attack')]);
    for (let n = 1; n <= 20; n += 1) {
      if (hero(w).state === MoveState.Attack && activeHitbox(hero(w))) active.push(n);
      if (n === 17) expect(hero(w).state).toBe(MoveState.Attack);
      run(w, [idle]);
    }
    expect(active).toEqual([6, 7, 8]);
    expect(totalFrames(HEROES[0]!.actions[0]!)).toBe(17);
  });

  test('Stone Shoulder advances 5 px per frame', () => {
    const w = createWorld(1);
    const x0 = hero(w).x;
    run(w, [press('Attack', { moveX: 1 }), ...repeat(idle, 9)]);
    expect(actionId(w)).toBe('stone-shoulder');
    expect(hero(w).x - x0).toBe(fx(50));
  });

  test('an aerial ends in its landing recovery, and only one aerial per jump', () => {
    const w = createWorld(1);
    run(w, [press('Jump'), ...repeat(idle, 4), press('Attack')]);
    expect(actionId(w)).toBe('rafter-palm');
    run(w, repeat(idle, 12));
    run(w, [press('Attack')]);
    expect(actionId(w)).toBe('rafter-palm');
    expect(hero(w).stateFrame).toBeGreaterThan(5); // the second press did not restart it
    let frames = 0;
    while (hero(w).state !== MoveState.Landing && frames < 60) {
      run(w, [idle]);
      frames += 1;
    }
    expect(hero(w).state).toBe(MoveState.Landing);
    run(w, repeat(idle, 8));
    expect(hero(w).state).toBe(MoveState.Idle);
  });

  test('a direction without an air move falls back to the air neutral move', () => {
    const w = createWorld(1);
    run(w, [press('Jump'), ...repeat(idle, 4), press('Attack', { moveX: -1 })]);
    expect(actionId(w)).toBe('rafter-palm');
    expect(hero(w).facing).toBe(1);
  });

  test('every aerial direction of the River Scout has its own move', () => {
    const ids = [
      [{}, 'reedwing-tap'],
      [{ moveX: 1 }, 'current-chase'],
      [{ moveX: -1 }, 'ebbturn-heel'],
      [{ moveZ: -1 }, 'bank-switch-arc'],
      [{ moveZ: 1 }, 'bank-switch-arc'],
    ] as const;
    for (const [dir, id] of ids) {
      const w = createWorld(1, { heroes: ['river'] });
      run(w, [press('Jump'), ...repeat(idle, 4), press('Attack', dir)]);
      expect(actionId(w)).toBe(id);
    }
  });
});

describe('direction at acceptance (Review Focus 2)', () => {
  test.each<[Partial<FrameInput>, string]>([
    [{ moveX: 1 }, 'stone-shoulder'],
    [{ moveX: -1 }, 'anchor-hook'],
    [{ moveZ: -1 }, 'high-bank-lift'],
    [{ moveZ: 1 }, 'low-bank-sweep'],
    [{}, 'masons-touch'],
  ])('Mountain %o + Attack → %s', (dir, id) => {
    const w = createWorld(1);
    run(w, [press('Attack', dir)]);
    expect(actionId(w)).toBe(id);
    expect(hero(w).facing).toBe(1);
  });

  test('a diagonal resolves to the most recently pressed direction', () => {
    const w = createWorld(1);
    const h = hero(w);
    h.lastCardinal = DirBit.up;
    expect(resolveDir(h, inp({ moveX: 1, moveZ: -1 }))).toBe(Dir.Up);
    h.lastCardinal = DirBit.right;
    expect(resolveDir(h, inp({ moveX: 1, moveZ: -1 }))).toBe(Dir.Forward);
  });

  test('dash Attack and the dash low chord pick the dash and low actions', () => {
    const w = createWorld(1, { heroes: ['river'] });
    run(w, [press('Dash', { moveX: 1 }), idle, press('Attack')]);
    expect(actionId(w)).toBe('rapid-crossing');
    run(w, [press('Guard')]);
    expect(actionId(w)).toBe('undertow-slide');
  });
});

describe('reason-aware cancels (Review Focus 3)', () => {
  test('an unlinked direction is rejected and discarded', () => {
    const w = duel('mountain');
    run(w, [press('Attack'), ...repeat(idle, 6), press('Attack', { moveX: -1 })]);
    expect(hero(w).verdictReject).toBe(Reject.Unlinked);
    run(w, repeat(idle, 20));
    expect(hero(w).state).toBe(MoveState.Idle);
  });

  test('a link pressed too early is dropped at contact', () => {
    // Stone Shoulder first touches on frame 13; the chain buffer is 7 frames, so a press
    // on frame 2 is too early, and the Gatepost Hammer never comes out.
    const w = duel('mountain');
    run(w, [press('Attack', { moveX: 1 }), press('Attack'), ...repeat(idle, 14)]);
    expect(dummy(w).ctx.actions).toBe(1);
    expect(hero(w).verdictReject).toBe(Reject.TooEarly);
    run(w, repeat(idle, 20));
    expect(actionId(w)).not.toBe('gatepost-hammer');
  });

  test('a link pressed after its window is too late', () => {
    // Ebb Heel (26 frames) first touches on frame 9; the chain window is 14 frames.
    const w2 = duel('river');
    run(w2, [press('Attack', { moveX: -1 }), ...repeat(idle, 8 + 15)]);
    run(w2, [press('Attack')]);
    expect(hero(w2).verdictReject).toBe(Reject.TooLate);
  });

  test('Specials and Ultimates are rejected as arriving in M5', () => {
    const w = duel('mountain');
    run(w, [press('Attack'), ...repeat(idle, 6), press('Attack')]);
    while (actionId(w) !== 'brace-elbow') run(w, [idle]);
    run(w, repeat(idle, 8));
    run(w, [press('Special')]);
    expect(hero(w).verdictReject).toBe(Reject.NotYet);
  });

  test('a move cannot repeat in one string', () => {
    const w = duel('river');
    // Reed Tap → Southbank Slide → Ebb Heel → Reed Tap → (Southbank again: already used)
    run(w, [press('Attack'), ...repeat(idle, 5), press('Attack', { moveZ: 1 })]);
    while (actionId(w) !== 'southbank-slide') run(w, [idle]);
    const h = hero(w);
    h.chainUsed |= 1 << HEROES[1]!.actions.findIndex((a) => a.id === 'ebb-heel');
    run(w, repeat(idle, 10));
    run(w, [press('Attack', { moveX: h.facing === 1 ? -1 : 1 })]);
    expect(hero(w).verdictReject).toBe(Reject.AlreadyUsed);
  });

  test('an invalid press never replaces a queued valid link', () => {
    const w = duel('mountain');
    run(w, [press('Attack'), ...repeat(idle, 2), press('Attack'), press('Attack', { moveX: -1 })]);
    expect(hero(w).verdictReject).toBe(Reject.Unlinked);
    expect(hero(w).reqLink).toBeGreaterThanOrEqual(0);
    run(w, repeat(idle, 4));
    expect(actionId(w)).toBe('brace-elbow');
  });
});

/** Mountain: Mason → Brace → Gatepost on a dummy, stopping on Gatepost's first recovery frame. */
function toGatepostRecovery(w: World): void {
  run(w, mash(30, 3).slice(0, 1));
  for (let i = 0; i < 80 && !(actionId(w) === 'gatepost-hammer' && hero(w).stateFrame >= 15); i++) {
    run(w, [i % 3 === 0 ? press('Attack') : idle]);
  }
}

describe('premium dash bridge (Review Focus 4)', () => {
  test('costs 25 % once, on hit, and leads into the dash attack', () => {
    const w = duel('mountain');
    toGatepostRecovery(w);
    expect(dummy(w).ctx.actions).toBe(3);
    hero(w).meter = 40;
    run(w, [press('Dash')]);
    expect(hero(w).state).toBe(MoveState.Dash);
    expect(hero(w).bridged).toBe(true);
    expect(hero(w).meter).toBe(15);
    expect(dummy(w).ctx.bridgeUsed).toBe(true);
    run(w, [idle, press('Attack')]);
    expect(actionId(w)).toBe('rampart-charge');
  });

  test('double-tapping Forward also takes the bridge', () => {
    const w = duel('mountain');
    toGatepostRecovery(w);
    hero(w).meter = 25;
    run(w, [tapDir('right'), idle, tapDir('right')]);
    expect(hero(w).bridged).toBe(true);
    expect(hero(w).meter).toBe(0);
  });

  test('not enough meter rejects the bridge and spends nothing', () => {
    const w = duel('mountain');
    toGatepostRecovery(w);
    hero(w).meter = 10;
    run(w, [press('Dash')]);
    expect(hero(w).verdictReject).toBe(Reject.NoMeter);
    expect(hero(w).meter).toBe(10);
    expect(hero(w).state).toBe(MoveState.Attack);
  });

  test('a spent bridge is rejected', () => {
    const w = duel('mountain');
    toGatepostRecovery(w);
    hero(w).meter = 100;
    dummy(w).ctx.bridgeUsed = true;
    run(w, [press('Dash')]);
    expect(hero(w).verdictReject).toBe(Reject.BridgeSpent);
  });

  test('a bridged dash refuses a jump', () => {
    const w = duel('mountain', { infiniteMeter: true });
    toGatepostRecovery(w);
    run(w, [press('Dash'), press('Jump'), idle]);
    expect(hero(w).state).not.toBe(MoveState.Air);
    expect(hero(w).verdictReject).toBe(Reject.Unlinked);
  });

  test('whiffs never gain meter', () => {
    const w = createWorld(1);
    run(w, mash(60));
    expect(hero(w).meter).toBe(0);
  });
});

describe('combo context and budgets (Review Focus 5)', () => {
  test('hit-stun bands and the damage floor', () => {
    expect(stunBand(100)).toBe(100);
    expect(stunBand(71)).toBe(100);
    expect(stunBand(70)).toBe(75);
    expect(stunBand(31)).toBe(75);
    expect(stunBand(30)).toBe(50);
    expect(scaledHitstun(20, 50)).toBe(15);
    expect(splitDamage(100, 10, 0, 1)).toBe(30);
  });

  test('multi-hit damage sums to the scaled total', () => {
    const parts = [0, 1, 2].map((i) => splitDamage(61, 85, i, 3));
    expect(parts.reduce((a, b) => a + b, 0)).toBe(Math.trunc((61 * 85) / 100));
  });

  test('scale after the opener uses starter proration, then per-action costs', () => {
    const w = duel('river');
    run(w, [press('Attack'), ...repeat(idle, 6)]);
    expect(dummy(w).ctx.scale).toBe(80);
    expect(dummy(w).ctx.damage).toBe(25);
  });

  test('the context closes and resets when the dummy recovers', () => {
    const w = duel('mountain');
    run(w, mash(40));
    run(w, repeat(idle, 120));
    const d = dummy(w);
    expect(d.ctx.open).toBe(false);
    expect(d.ctx.scale).toBe(100);
    expect(d.ctx.stunBudget).toBe(100);
    expect(d.health).toBe(d.maxHealth);
  });

  test('meter gain stops at 30 % per combo', () => {
    const w = duel('mountain');
    const d = dummy(w);
    d.ctx = { ...d.ctx, open: true, meterBudget: 2 };
    d.state = MoveState.Hitstun;
    d.stun = 100;
    run(w, [press('Attack'), ...repeat(idle, 6)]);
    expect(hero(w).meter).toBe(2);
  });

  test('stun exhaustion forces separation and closes cancels', () => {
    const w = duel('mountain');
    const d = dummy(w);
    d.ctx = { ...d.ctx, open: true, actions: 5, stunBudget: 5 };
    d.state = MoveState.Hitstun;
    d.stun = 100;
    run(w, [press('Attack'), ...repeat(idle, 6)]);
    expect(dummy(w).ctx.exhausted).toBe(true);
    run(w, [press('Attack')]);
    expect(hero(w).verdictReject).toBe(Reject.StunExhausted);
  });

  test('two heroes on one dummy share its context', () => {
    const w = duel('mountain');
    step(w, [idle, idle]); // Player 2 joins
    const p2 = hero(w, 1);
    const d = dummy(w);
    p2.x = d.x + fx(80);
    p2.z = d.z;
    p2.facing = -1;
    run(w, [press('Attack'), ...repeat(idle, 6)]);
    step(w, [idle, press('Attack')]);
    run(w, repeat(idle, 6), 1);
    expect(dummy(w).ctx.actions).toBe(2);
  });
});

describe('launch, jump chase and aerial follow-up', () => {
  test.each([
    ['mountain', 'rafter-palm'],
    ['river', 'reedwing-tap'],
  ])('%s: Up + Attack launches, Jump chases, Attack hits in the air', (id, aerial) => {
    const w = duel(id);
    run(w, [press('Attack', { moveZ: -1 })]);
    let i = 0;
    while (dummy(w).state !== MoveState.Launched && i++ < 30) run(w, [idle]);
    expect(dummy(w).state).toBe(MoveState.Launched);
    run(w, [press('Jump')]);
    i = 0;
    while (hero(w).state !== MoveState.Air && i++ < 30) run(w, [idle]);
    expect(hero(w).state).toBe(MoveState.Air);
    run(w, repeat(idle, 3));
    run(w, [press('Attack'), ...repeat(idle, 8)]);
    expect(actionId(w)).toBe(aerial);
    expect(dummy(w).ctx.actions).toBe(2);
  });
});

describe('low attack and trips', () => {
  test('a counter-hit low attack trips into a ground-window knockdown', () => {
    const w = duel('mountain', { counterHit: true });
    hero(w).x -= fx(60);
    run(w, [press('Dash', { moveX: 1 }), press('Attack'), press('Guard')]);
    expect(actionId(w)).toBe('faultline-reap');
    run(w, repeat(idle, 40));
    expect(dummy(w).ctx.groundTag).toBe(GroundTag.Opens);
    expect([MoveState.Down, MoveState.GetUp, MoveState.Launched]).toContain(dummy(w).state);
  });

  test('a clean low hit only staggers', () => {
    const w = duel('mountain');
    hero(w).x -= fx(60);
    run(w, [press('Dash', { moveX: 1 }), press('Attack'), press('Guard'), ...repeat(idle, 12)]);
    expect(dummy(w).state).toBe(MoveState.Hitstun);
    expect(dummy(w).ctx.groundTag).toBe(GroundTag.None);
  });
});
