import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startAction } from '../src/combat/actions';
import { METER } from '../src/combat/meter';
import { ENEMIES, HEROES, kitOf } from '../src/combat/roster';
import { TargetState } from '../src/combat/types';
import { COOP, TEAM_FINISHERS } from '../src/coop/data';
import { finisherFor, inviteLeft } from '../src/coop/team';
import { canClaim, targetState } from '../src/coop/handoff';
import { fx } from '../src/math/fixed';
import {
  CoopEvent,
  type Fighter,
  type FrameInput,
  GrabEvent,
  MoveState,
  Protect,
  TeamDenied,
  type World,
} from '../src/world/types';
import { createWorld, hashWorld, heroOf, step, type WorldOptions } from '../src/world/world';
import { dummyOf } from './bot';
import { hero, idle, inp, press, repeat } from './helpers';

const TRAINER = ENEMIES[0]!;
const kitIdx = (f: Fighter, id: string) => kitOf(f)!.actions.findIndex((a) => a.id === id);

/**
 * Two heroes around Dummy 1: Player 1 `gap` px to its left facing right, Player 2 `gap` px
 * to its right facing left (Player 2 joins on the first frame).
 */
function pair(heroes = ['mountain', 'river'], options: WorldOptions = {}, gap = 90): World {
  const w = createWorld(1, { dummies: 1, heroes, ...options });
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

function both(w: World, a: FrameInput, b: FrameInput, n = 1): void {
  for (let i = 0; i < n; i += 1) step(w, [a, b]);
}

function until(w: World, cond: () => boolean, limit = 200): void {
  for (let i = 0; i < limit && !cond(); i += 1) step(w, [idle, idle]);
  if (!cond()) throw new Error('condition never held');
}

/** Starts an action on a hero so that its first active frame is `inFrames` frames away. */
function strikeIn(w: World, slot: number, id: string, inFrames: number): void {
  const h = hero(w, slot);
  const i = kitIdx(h, id);
  startAction(h, i);
  h.stateFrame = kitOf(h)!.actions[i]!.startup - inFrames;
}

describe('co-op data is keyed by tags (roadmap guardrails M8)', () => {
  test('coop.yaml names tags, never hero ids', () => {
    const json = JSON.stringify(COOP);
    for (const h of HEROES) expect(json).not.toContain(`"${h.id}"`);
    expect(TEAM_FINISHERS[0]!.pair).toEqual(['founder', 'founder']);
    expect(COOP.actions.map((a) => a.kind).sort()).toEqual(['assist', 'interrupt', 'release']);
  });

  test('co-op and hit code never branch on a hero name', () => {
    const dir = fileURLToPath(new URL('../src/coop/', import.meta.url));
    const files = readdirSync(dir).map((f) => readFileSync(dir + f, 'utf8'));
    files.push(readFileSync(new URL('../src/combat/hits.ts', import.meta.url), 'utf8'));
    for (const src of files) {
      for (const h of HEROES) expect(src).not.toMatch(new RegExp(`['"]${h.id}['"]`));
      expect(src).not.toMatch(/Mountain|River Scout/);
    }
  });

  test('a finisher pairs heroes by their tags, in either order', () => {
    const w = pair();
    expect(finisherFor(hero(w, 0), hero(w, 1))).toBe(0);
    expect(finisherFor(hero(w, 1), hero(w, 0))).toBe(0);
  });
});

describe('friendly safety (Cooperative Safety with Soft Presence)', () => {
  test("a partner's strike passes through the ally: no damage, stun, meter or combo", () => {
    const w = createWorld(1, { heroes: ['mountain', 'river'] });
    step(w, [idle, idle]);
    const [p1, p2] = [hero(w, 0), hero(w, 1)];
    p2.x = p1.x + fx(80);
    p2.z = p1.z;
    both(w, press('Attack'), idle);
    both(w, idle, idle, 12);
    expect(p2.health).toBe(p2.maxHealth);
    expect(p2.state).toBe(MoveState.Idle);
    expect(p2.ctx.open).toBe(false);
    expect(p1.meter).toBe(0);
    expect(p1.contactAt).toBe(-1);
  });

  test('an ordinary grab never selects the ally', () => {
    const w = createWorld(1, { heroes: ['mountain', 'river'] });
    step(w, [idle, idle]);
    const [p1, p2] = [hero(w, 0), hero(w, 1)];
    p2.x = p1.x + fx(60);
    p2.z = p1.z;
    both(w, press('Interact'), idle);
    both(w, idle, idle, 10);
    expect(p2.grabbedBy).toBe(0);
    expect(p1.grabEvent).toBe(GrabEvent.Whiff);
  });

  test("a hero's projectile flies through the partner without being consumed", () => {
    const w = createWorld(1, { heroes: ['river', 'mountain'] });
    step(w, [idle, idle]);
    const [p1, p2] = [hero(w, 0), hero(w, 1)];
    p2.x = p1.x + fx(150);
    p2.z = p1.z;
    both(w, press('Special'), idle);
    let seen = false;
    for (let i = 0; i < 30; i += 1) {
      both(w, idle, idle);
      const p = w.projectiles[0];
      if (p && p.x > p2.x) seen = true;
    }
    expect(seen).toBe(true);
    expect(p2.health).toBe(p2.maxHealth);
  });

  test('allies stay soft: walking straight into the partner never stops a hero', () => {
    const w = createWorld(1, { heroes: ['mountain', 'river'] });
    step(w, [idle, idle]);
    const [p1, p2] = [hero(w, 0), hero(w, 1)];
    p2.x = p1.x + fx(100);
    p2.z = p1.z;
    const solo = createWorld(1, { heroes: ['mountain'] });
    const start = p1.x;
    const soloStart = hero(solo).x;
    both(w, inp({ moveX: 1 }), idle, 60);
    for (let i = 0; i < 60; i += 1) step(solo, [inp({ moveX: 1 })]);
    // Never blocked: nearly the solo pace, with gentle separation only.
    expect(p1.x - start).toBeGreaterThan(((hero(solo).x - soloStart) * 2) / 3);
  });
});

describe('Combined Hit Bundles (F&D §6.5)', () => {
  /** Both heroes' first jabs reach the dummy on the same frame. */
  function sameFrame(heroes: string[]): World {
    const w = pair(heroes);
    const jab = (s: number) => kitOf(hero(w, s))!.actions[0]!.id;
    strikeIn(w, 0, jab(0), 1);
    strikeIn(w, 1, jab(1), 1);
    both(w, idle, idle);
    return w;
  }

  test('same-frame hits form one bundle: both damages from the scale at the frame start', () => {
    const w = sameFrame(['mountain', 'river']);
    const d = dummyOf(w);
    expect(w.coop.bundles).toBe(1);
    expect(w.coop.bundleHits).toBe(2);
    expect(w.coop.bundleTarget).toBe(d.id);
    const full = HEROES[0]!.actions[0]!.damage + HEROES[1]!.actions[0]!.damage;
    expect(d.ctx.damage).toBe(full);
    expect(d.ctx.actions).toBe(2);
    expect(d.ctx.route).toHaveLength(2);
    // Each hero earns its own participation meter.
    expect(hero(w, 0).meter).toBeGreaterThan(0);
    expect(hero(w, 1).meter).toBeGreaterThan(0);
    expect(w.coop.log.kind).toBe(CoopEvent.Bundle);
  });

  test('the dominant reaction does not depend on which player slot a hero is in', () => {
    const a = sameFrame(['mountain', 'river']);
    const b = sameFrame(['river', 'mountain']);
    expect(a.coop.bundleDominant).toBe(b.coop.bundleDominant);
    expect(dummyOf(a).ctx.damage).toBe(dummyOf(b).ctx.damage);
    expect(dummyOf(a).stun).toBe(dummyOf(b).stun);
  });

  test('a launcher outranks a light hit in the bundle', () => {
    const w = pair();
    strikeIn(w, 0, 'high-bank-lift', 1);
    strikeIn(w, 1, 'reed-tap', 1);
    both(w, idle, idle);
    const d = dummyOf(w);
    expect(w.coop.bundleHits).toBe(2);
    expect(d.state).toBe(MoveState.Launched);
    expect(Math.trunc(w.coop.bundleDominant / 64)).toBe(0); // Mountain's kit code
  });

  test('hits on later frames are evaluated normally, not pulled into the bundle', () => {
    const w = pair();
    strikeIn(w, 0, 'masons-touch', 1);
    strikeIn(w, 1, 'reed-tap', 2);
    both(w, idle, idle, 2);
    expect(w.coop.bundles).toBe(0);
    expect(dummyOf(w).ctx.actions).toBe(2);
  });
});

describe('Organic Tagged Handoffs', () => {
  test('a launcher opens an airborne handoff; the partner claims it without resetting budgets', () => {
    const w = pair();
    const d = dummyOf(w);
    strikeIn(w, 0, 'high-bank-lift', 1);
    both(w, idle, idle);
    expect(d.handoff).toBe(TargetState.Airborne);
    expect(d.handoffFrom).toBe(hero(w, 0).id);
    const juggle = d.ctx.juggleBudget;
    const scale = d.ctx.scale;
    // River Scout's Northbank Arc (receiveAirborne) reaches the airborne dummy.
    hero(w, 1).x = d.x + fx(60);
    strikeIn(w, 1, 'northbank-arc', 1);
    both(w, idle, idle);
    expect(w.coop.handoffs).toBe(1);
    expect(w.coop.log.kind === CoopEvent.HandoffClaim || d.handoffFrom === hero(w, 1).id).toBe(
      true,
    );
    expect(d.ctx.actions).toBe(2);
    expect(d.ctx.juggleBudget).toBeLessThan(juggle);
    expect(d.ctx.scale).toBeLessThan(scale);
  });

  test('the receiving move may start up to 7 frames before the window, not earlier', () => {
    const w = pair();
    const d = dummyOf(w);
    strikeIn(w, 0, 'high-bank-lift', 1);
    both(w, idle, idle);
    const p2 = hero(w, 1);
    const i = kitIdx(p2, 'northbank-arc');
    const a = kitOf(p2)!.actions[i]!;
    startAction(p2, i);
    const opened = w.frame - d.handoffAt;
    p2.stateFrame = opened + COOP.preBuffer;
    expect(canClaim(w, p2, a, d, targetState(d))).toBe(true);
    p2.stateFrame = opened + COOP.preBuffer + 1;
    expect(canClaim(w, p2, a, d, targetState(d))).toBe(false);
    // The sender never claims its own opportunity; a non-receiver never does either.
    const p1 = hero(w, 0);
    expect(canClaim(w, p1, kitOf(p1)!.actions[7]!, d, targetState(d))).toBe(false);
    const jab = kitOf(p2)!.actions[kitIdx(p2, 'open-channel-kick')]!;
    p2.stateFrame = 0;
    expect(canClaim(w, p2, jab, d, targetState(d))).toBe(false);
  });

  test('an unclaimed handoff closes: the target falls normally, nothing is preserved', () => {
    const w = pair();
    const d = dummyOf(w);
    strikeIn(w, 0, 'gatepost-hammer', 1);
    both(w, idle, idle);
    expect(d.handoff).toBe(TargetState.Stagger);
    until(w, () => d.handoff === 0, 60);
    expect(w.coop.log.kind).toBe(CoopEvent.HandoffClosed);
    expect(w.coop.handoffs).toBe(0);
  });

  test('solo play never opens a handoff', () => {
    const w = createWorld(1, { dummies: 1, heroes: ['mountain', 'river'] });
    const d = dummyOf(w);
    const h = hero(w);
    h.x = d.x - fx(90);
    h.z = d.z;
    strikeIn(w, 0, 'high-bank-lift', 1);
    step(w, [idle]);
    expect(d.ctx.open).toBe(true);
    expect(d.handoff).toBe(0);
  });
});

describe('Team finishers: Invite and Confirm with Equal Meter Contribution', () => {
  /** The dummy staggered by Player 1's jab, both heroes at `meter` %. */
  function ready(meter = 50): World {
    const w = pair();
    strikeIn(w, 0, 'masons-touch', 1);
    both(w, idle, idle);
    hero(w, 0).meter = meter * METER.unit;
    hero(w, 1).meter = meter * METER.unit;
    expect(dummyOf(w).state).toBe(MoveState.Hitstun);
    return w;
  }

  test('invite, confirm: both pay 50 %, both parts strike, the combo closes protected', () => {
    const w = ready();
    const d = dummyOf(w);
    both(w, press('TeamAttack'), idle);
    expect(w.coop.invite).not.toBeNull();
    expect(w.coop.log.kind).toBe(CoopEvent.Invite);
    expect(inviteLeft(w)).toBe(29); // 30 frames, counting the invitation's own frame
    expect(hero(w, 0).meter).toBe(50 * METER.unit); // nothing spent before confirmation
    both(w, idle, idle, 5);
    both(w, idle, press('TeamAttack'));
    expect(w.coop.log.kind).toBe(CoopEvent.Confirm);
    expect(hero(w, 0).meter).toBe(0);
    expect(hero(w, 1).meter).toBe(0);
    expect(hero(w, 0).cinematic && hero(w, 1).cinematic).toBe(true);
    until(w, () => w.coop.finishers > 0, 40);
    expect(d.protectedRecovery).toBe(true);
    expect(d.ctx.open).toBe(false);
    expect(d.ctx.ended).toBe(Protect.TeamFinisher);
    expect(w.coop.bundleHits).toBe(2);
    // Each part does at least its authored floor of 50 % damage.
    expect(d.ctx.damage).toBeGreaterThanOrEqual(HEROES[0]!.actions[0]!.damage + 2 * 75);
  });

  test('an unanswered invitation expires after 30 frames and spends nothing', () => {
    const w = ready();
    both(w, press('TeamAttack'), idle);
    both(w, idle, idle, 31);
    expect(w.coop.invite).toBeNull();
    expect(w.coop.log.kind).toBe(CoopEvent.Expired);
    expect(hero(w, 0).meter).toBe(50 * METER.unit);
    expect(hero(w, 1).meter).toBe(50 * METER.unit);
  });

  test('not enough meter: no invitation', () => {
    const w = ready(40);
    both(w, press('TeamAttack'), idle);
    expect(w.coop.invite).toBeNull();
    expect(w.coop.log.kind).toBe(CoopEvent.Unavailable);
    expect(w.coop.log.detail).toBe(TeamDenied.Meter);
  });

  test('no target in an authored state: no invitation', () => {
    const w = pair();
    hero(w, 0).meter = METER.max;
    hero(w, 1).meter = METER.max;
    both(w, press('TeamAttack'), idle);
    expect(w.coop.log.detail).toBe(TeamDenied.NoTarget);
  });

  test('same-frame presses merge into one confirmed request', () => {
    const w = ready();
    both(w, press('TeamAttack'), press('TeamAttack'));
    expect(w.coop.log.kind).toBe(CoopEvent.Merged);
    expect(hero(w, 0).meter).toBe(0);
    expect(hero(w, 1).meter).toBe(0);
  });

  test('confirmation revalidates: a recovered target makes it invalid and nothing is spent', () => {
    const w = ready();
    const d = dummyOf(w);
    both(w, press('TeamAttack'), idle);
    until(w, () => d.state === MoveState.Idle, 30);
    both(w, idle, press('TeamAttack'));
    expect(w.coop.log.kind).toBe(CoopEvent.Invalid);
    expect(w.coop.log.detail).toBe(TeamDenied.NoTarget);
    expect(hero(w, 0).meter).toBe(50 * METER.unit);
    expect(hero(w, 1).meter).toBe(50 * METER.unit);
  });

  test('the invite works the same from either player', () => {
    const run = (inviter: 0 | 1) => {
      const w = ready();
      const t = press('TeamAttack');
      both(w, inviter === 0 ? t : idle, inviter === 1 ? t : idle);
      both(w, inviter === 1 ? t : idle, inviter === 0 ? t : idle);
      until(w, () => w.coop.finishers > 0, 40);
      return dummyOf(w).ctx.damage;
    };
    expect(run(0)).toBe(run(1));
  });
});

describe('grab assists and rescue (tagged co-op actions)', () => {
  /** Player 1 holds the dummy; Player 2 stands behind it facing it. */
  function held(): World {
    const w = pair(['mountain', 'river'], {}, 80);
    both(w, press('Interact'), idle);
    until(w, () => dummyOf(w).state === MoveState.Grabbed, 20);
    const d = dummyOf(w);
    const p2 = hero(w, 1);
    p2.x = d.x + fx(70);
    p2.z = d.z;
    p2.facing = -1;
    return w;
  }

  test('one tagged partner assist lands on the held enemy; the hold stays dominant', () => {
    const w = held();
    const d = dummyOf(w);
    expect(d.assist).toBe(1);
    both(w, idle, press('Attack'));
    until(w, () => w.coop.assists > 0, 15);
    expect(d.state).toBe(MoveState.Grabbed);
    expect(d.grabbedBy).toBe(hero(w, 0).id);
    expect(d.assist).toBe(2);
    expect(d.ctx.damage).toBe(HEROES[1]!.actions[0]!.damage);
    expect(hero(w, 1).meter).toBeGreaterThan(0);
    expect(w.coop.log.kind).toBe(CoopEvent.Assist);
    // A second partner attack ignores the held target.
    both(w, idle, idle, 10);
    const dmg = d.ctx.damage;
    const meter = hero(w, 1).meter;
    both(w, idle, press('Attack'));
    both(w, idle, idle, 8);
    expect(d.ctx.damage).toBe(dmg);
    expect(hero(w, 1).meter).toBe(meter);
    // The grabbing hero still has its throw.
    both(w, press('Interact'), idle);
    until(w, () => d.state === MoveState.Launched, 20);
  });

  test('restraint release: neutral Interact next to a restrained partner frees them', () => {
    const w = pair();
    const p1 = hero(w, 0);
    p1.state = MoveState.Restrained;
    p1.stun = 150;
    const p2 = hero(w, 1);
    p2.x = p1.x + fx(100);
    p2.z = p1.z;
    both(w, idle, press('Interact'));
    expect(p1.state).toBe(MoveState.Idle);
    expect(w.coop.log.kind).toBe(CoopEvent.Release);
    expect(w.coop.rescues).toBe(1);
  });

  test('partner interrupt: striking a rescue-interruptible grabber frees the held hero', () => {
    const w = pair(['mountain', 'river'], {}, 100);
    const d = dummyOf(w);
    hero(w, 1).x = d.x + fx(300);
    startAction(
      d,
      TRAINER.actions.findIndex((a) => a.id === 'collar-grab'),
    );
    until(w, () => hero(w, 0).state === MoveState.Grabbed, 40);
    const p2 = hero(w, 1);
    p2.x = d.x + fx(80);
    p2.z = d.z;
    p2.facing = -1;
    both(w, idle, press('Attack'));
    until(w, () => hero(w, 0).state !== MoveState.Grabbed, 20);
    expect(w.coop.log.kind).toBe(CoopEvent.Interrupt);
    expect(w.coop.log.actor).toBe(p2.id);
    expect(w.coop.rescues).toBe(1);
  });
});

test('co-op state is part of the canonical hash', () => {
  const a = pair();
  const b = pair();
  expect(hashWorld(a)).toBe(hashWorld(b));
  b.coop.handoffs = 1;
  expect(hashWorld(a)).not.toBe(hashWorld(b));
  expect(heroOf(a, 1)).toBeDefined();
  expect(repeat(idle, 2)).toHaveLength(2);
});
