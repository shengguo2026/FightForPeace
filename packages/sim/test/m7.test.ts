import { fx } from '../src/math/fixed';
import { MoveState, type FrameInput, type World } from '../src/world/types';
import { createWorld, hashWorld, step } from '../src/world/world';
import { ARENAS, DIFFICULTIES, PROFILES, difficultyOf } from '../src/enemies/data';
import { budgetOf, usage, visible } from '../src/enemies/director';
import { bossOf, startPhase } from '../src/enemies/boss';
import { arenaNames, kitName } from '../src/enemies/encounter';
import { ENEMIES } from '../src/combat/roster';
import { botInput } from './arenaBot';

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const kits = (w: World) =>
  w.bodies.filter((b) => b.team === 'enemy').map((b) => ENEMIES[b.hero]!.id);

function defeat(e: { ko: boolean; state: MoveState }): void {
  e.ko = true;
  e.state = MoveState.Defeated;
}

function run(w: World, frames: number, each?: (w: World) => void, bot = true): void {
  for (let i = 0; i < frames && w.encounter!.result === 0; i += 1) {
    step(w, [bot ? botInput(w) : IDLE]);
    each?.(w);
  }
}

test('M7 data: 7 enemy kits with profiles, 5 difficulties, every arena valid', () => {
  for (const id of ['recruit', 'shield', 'runner', 'overseer', 'lookout', 'enforcer', 'commander'])
    expect(ENEMIES.some((k) => k.id === id)).toBe(true);
  expect(PROFILES.filter((p) => p).length).toBe(7);
  expect(DIFFICULTIES.map((d) => d.id)).toEqual(['easy', 'medium', 'hard', 'extreme', 'ultimate']);
  expect(arenaNames().length).toBe(ARENAS.length);
  const boss = PROFILES.find((p) => p?.boss)!;
  expect(boss.boss!.phases.map((p) => p.from)).toEqual([100, 66, 33]);
  expect(kitName(-1)).toBe('?');
});

test('every trial clears at Easy, Medium and Hard with the test bot, deterministically', () => {
  for (const a of ARENAS.filter((x) => x.id.startsWith('trial-'))) {
    for (const [n, diff] of ['easy', 'medium', 'hard'].entries()) {
      if (n < a.minDifficulty) continue;
      const w = createWorld(7, { arena: a.id, difficulty: diff });
      run(w, 5400);
      expect(w.encounter!.result, `${a.id} ${diff}`).not.toBe(0);
    }
  }
  const p = createWorld(3, { arena: 'beat-bridge', difficulty: 'hard' });
  const q = createWorld(3, { arena: 'beat-bridge', difficulty: 'hard' });
  for (let i = 0; i < 1200; i += 1) {
    step(p, [botInput(p)]);
    step(q, [botInput(q)]);
  }
  expect(hashWorld(p)).toBe(hashWorld(q));
});

test('director: reservations never exceed the budget, the pressure cap or the attacker limit', () => {
  for (const diff of ['easy', 'medium', 'hard']) {
    const w = createWorld(5, { arena: 'beat-courtyard', difficulty: diff });
    const d = difficultyOf(w);
    let peak = 0;
    run(w, 3000, (w) => {
      const u = usage(w);
      peak = Math.max(peak, u.total);
      expect(u.total).toBeLessThanOrEqual(budgetOf(w));
      for (const v of u.pressure.values()) expect(v).toBeLessThanOrEqual(d.cap);
      expect(u.attackers).toBeLessThanOrEqual(d.attackers[0]);
      expect(u.hardCC).toBeLessThanOrEqual(d.hardCC);
    });
    expect(peak).toBeGreaterThan(0);
  }
});

test('visibility: off-screen enemies commit only offscreenCapable attacks, after a warning', () => {
  const w = createWorld(2, { arena: 'trial-lookout', difficulty: 'medium' });
  let warned = false;
  run(w, 4000, (w) => {
    for (const e of w.bodies) {
      if (e.team !== 'enemy' || e.threat <= 0 || e.state !== MoveState.Attack) continue;
      const a = ENEMIES[e.hero]!.actions[e.action];
      if (!visible(w, e) && e.stateFrame === 1) expect(a?.tags).toContain('offscreenCapable');
    }
    if (w.bodies.some((e) => e.team === 'enemy' && e.warnUntil > w.frame)) warned = true;
  });
  expect(w.encounter!.offscreenUnwarned).toBe(0);
  expect(typeof warned).toBe('boolean');
});

test('substitution: the courtyard beat brings the Black-Iron Enforcer only from Hard', () => {
  const kitsAt = (diff: string) => {
    const w = createWorld(1, { arena: 'beat-courtyard', difficulty: diff });
    for (let i = 0; i < 40; i += 1) step(w, [IDLE]);
    return kits(w);
  };
  expect(kitsAt('medium')).not.toContain('enforcer');
  expect(kitsAt('hard')).toContain('enforcer');
});

test('morale: a broken recruit flees while allies fight, the last one surrenders', () => {
  const w = createWorld(1, { arena: 'beat-bridge', difficulty: 'medium' });
  for (let i = 0; i < 40; i += 1) step(w, [IDLE]);
  const enemies = w.bodies.filter((b) => b.team === 'enemy');
  expect(enemies.length).toBeGreaterThan(1);
  const r = enemies.find((e) => ENEMIES[e.hero]!.id === 'recruit')!;
  r.health = Math.trunc(r.maxHealth / 5);
  step(w, [IDLE]);
  expect(r.state).toBe(MoveState.Flee);
  const w2 = createWorld(1, { arena: 'trial-recruit', difficulty: 'medium' });
  for (let i = 0; i < 40; i += 1) step(w2, [IDLE]);
  const all = w2.bodies.filter((b) => b.team === 'enemy');
  for (const e of all.slice(1)) defeat(e);
  const last = all.slice(0, 1);
  last[0]!.health = Math.trunc(last[0]!.maxHealth / 5);
  step(w2, [IDLE]);
  expect(last[0]!.state).toBe(MoveState.Surrender);
});

test('Sluice Commander: Resolve, Stagger Break, queued phases with capped carry, surrender', () => {
  const w = createWorld(1, { arena: 'boss-commander', difficulty: 'medium' });
  const seen = {
    stagger: false,
    pending: false,
    phases: new Set<number>(),
    carry: 0,
    shift: false,
  };
  run(w, 9000, (w) => {
    const b = w.encounter!.boss;
    if (!b) return;
    if (b.stagger > 0) seen.stagger = true;
    if (b.pending) seen.pending = true;
    if (b.shift > 0) seen.shift = true;
    seen.carry = Math.max(seen.carry, b.carry);
    seen.phases.add(b.phase);
  });
  const prof = PROFILES.find((p) => p?.boss)!.boss!;
  expect(seen.stagger).toBe(true);
  expect(seen.pending).toBe(true);
  expect(seen.shift).toBe(true);
  expect(seen.carry).toBeLessThanOrEqual(prof.transition.carryCap);
  expect([...seen.phases].sort()).toEqual([0, 1, 2]);
  if (w.encounter!.result === 1) expect(bossOf(w)!.ko).toBe(true);
});

test('Sluice Commander: phase 2 handwheel spawns; phase 3 winch is counted, never timed', () => {
  const w = createWorld(1, { arena: 'boss-commander', difficulty: 'medium' });
  for (let i = 0; i < 40; i += 1) step(w, [IDLE]);
  const boss = bossOf(w)!;
  const items = w.items.length;
  startPhase(w, boss, 1);
  expect(w.items.length).toBe(items + 1);
  expect(kits(w).filter((k) => k === 'recruit').length).toBe(2);
  for (const e of w.bodies) if (e.team === 'enemy' && e !== boss) defeat(e);
  startPhase(w, boss, 2);
  const dev = w.encounter!.devices[0]!;
  expect(dev.active).toBe(true);
  // The hero stands far away and never fights: the winch only advances by cranks.
  const hero = w.bodies.find((b) => b.team === 'hero')!;
  hero.x = fx(300);
  let maxProgress = 0;
  let warnedSurge = false;
  for (let i = 0; i < 4000; i += 1) {
    hero.health = hero.maxHealth;
    step(w, [IDLE]);
    maxProgress = Math.max(maxProgress, dev.progress);
    if (w.environment.hazards.some((h) => h.phase === 1)) warnedSurge = true;
  }
  expect(maxProgress).toBeGreaterThan(0);
  expect(warnedSurge).toBe(true);
  // A frozen boss makes no progress however long the clock runs.
  const before = dev.progress;
  boss.state = MoveState.Surrender;
  for (let i = 0; i < 600; i += 1) step(w, [IDLE]);
  expect(dev.progress).toBe(before);
});
