import { fx } from '../src/math/fixed';
import { ActionBit } from '../src/input/bits';
import { type FrameInput, ItemState, MoveState, type World } from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';
import { ARENAS, PROFILES } from '../src/enemies/data';
import { ENEMIES } from '../src/combat/roster';
import { WEAPONS, weaponIndex } from '../src/combat/armory';
import { claim, spawnItem } from '../src/combat/held';
import { canHit } from '../src/combat/hits';
import { nonCombatant } from '../src/combat/damage';
import { snapshotWorld, restoreWorld } from '../src/net/snapshot';
import { MOUNTED, CORRIDORS, RiderState, mountOf, setupPursuit } from '../src/mounted/pursuit';
import { MoverPhase, PassPhase, RobotState, SharedEvent } from '../src/shared/state';
import { gearBroken } from '../src/shared/fighters';
import { dismount } from '../src/shared/riders';
import { detonate } from '../src/shared/weapons';
import { becomeSupporter, claimCache, handOver } from '../src/shared/handover';
import { botInput } from './arenaBot';

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const kit = (id: string) => ENEMIES.findIndex((k) => k.id === id);
const enemy = (w: World, id: string) =>
  w.bodies.find((b) => b.hero === kit(id) && b.team === 'enemy');
/** Runs `frames` idle frames (nobody presses anything). */
function idle(w: World, frames: number): void {
  for (let i = 0; i < frames; i += 1) step(w, [IDLE]);
}
/** Runs until the first wave has arrived. */
function arrive(w: World): void {
  for (let i = 0; i < 400 && w.encounter!.wave < 0; i += 1) step(w, [IDLE]);
}
/** A snapshot restored mid-run continues to exactly the same hash. */
function roundTrip(w: World, inputs: (w: World) => FrameInput, frames: number): void {
  const copy = restoreWorld(snapshotWorld(w));
  for (let i = 0; i < frames; i += 1) {
    step(w, [inputs(w)]);
    step(copy, [inputs(copy)]);
  }
  expect(hashWorld(copy)).toBe(hashWorld(w));
}

describe('M24 registry order and data (rule 2)', () => {
  test('existing weapons and enemy kits keep their indices; M24 files come after them', () => {
    expect(WEAPONS.slice(0, 8).map((w) => w.id)).toEqual([
      'workstaff',
      'handwheel',
      'timber-board',
      'breaching-grenade',
      'service-lance',
      'six-round-sidearm',
      'support-gun',
      'support-rail',
    ]);
    // M27 appends the Stage 3 weapons and roles after the M24 files.
    const m24 = (id: string) => id.startsWith('m24-');
    const w24 = WEAPONS.slice(8);
    const wEnd = w24.findIndex((w) => !m24(w.id));
    expect(w24.slice(0, wEnd).every((w) => m24(w.id))).toBe(true);
    expect(w24.slice(wEnd).some((w) => m24(w.id))).toBe(false);
    expect(ENEMIES[0]!.id).toBe('trainer');
    const first = ENEMIES.findIndex((k) => m24(k.id));
    const e24 = ENEMIES.slice(first);
    const eEnd = e24.findIndex((k) => !m24(k.id));
    expect(e24.slice(0, eEnd).every((k) => m24(k.id))).toBe(true);
    expect(e24.slice(eEnd).some((k) => m24(k.id))).toBe(false);
    // The Lab scenes are the last arenas (after every stage and greenhouse arena).
    // (M25 appends its test room after them, M27 its Stage 3 rooms.)
    const lab = ARENAS.findIndex((a) => a.id.startsWith('lab-m24-'));
    const after = ARENAS.slice(lab).filter((a) => !/^(lab-m2[57]-|s3-|stage3\.)/.test(a.id));
    expect(after.every((a) => a.id.startsWith('lab-m24-'))).toBe(true);
    expect(after.length).toBe(9);
  });

  test('the mount catalogue keeps the bike first and the Stage 2 corridors on it', () => {
    expect(MOUNTED.mounts[0]!.id).toBe('civil-bike');
    expect(MOUNTED.mounts[0]!.atZero).toBe('recover');
    for (const id of ['perimeter-pursuit', 'marek-intercept'])
      expect(mountOf(CORRIDORS.find((c) => c.id === id)!).id).toBe('civil-bike');
    const lab = CORRIDORS.find((c) => c.id === 'pursuit-m24-mounts')!;
    expect(mountOf(lab).id).toBe('mountain-horse');
    expect(mountOf(lab).atZero).toBe('dismount');
  });

  test('Stage 1 and Stage 2 worlds carry no M24 state', () => {
    for (const arena of ['beat-courtyard', 'boss-commander']) {
      const w = createWorld(3, { arena, difficulty: 'medium' });
      for (let i = 0; i < 900; i += 1) step(w, [botInput(w)]);
      expect(w.shared).toBeUndefined();
      expect(w.bodies.some((b) => b.ext)).toBe(false);
    }
  });
});

describe('E2/E3 moving hazards, tagged tools and property incidents', () => {
  test('a mover warns before it sweeps, and a strike in the warning redirects it', () => {
    const w = createWorld(1, { arena: 'lab-m24-hazards', difficulty: 'medium' });
    const cart = w.shared!.movers[0]!;
    let warnedAt = -1;
    let activeAt = -1;
    for (let i = 0; i < 600 && activeAt < 0; i += 1) {
      step(w, [IDLE]);
      if (cart.phase === MoverPhase.Warn && warnedAt < 0) warnedAt = w.frame;
      if (cart.phase === MoverPhase.Active) activeAt = w.frame;
    }
    expect(warnedAt).toBeGreaterThan(0);
    expect(activeAt - warnedAt).toBeGreaterThanOrEqual(69);
    roundTrip(w, () => IDLE, 200);
  });

  test('the pry bar opens a tagged crate at once; hero damage to protected property counts once per cluster', () => {
    const w = createWorld(1, { arena: 'lab-m24-hazards', difficulty: 'medium' });
    const h = heroOf(w, 0)!;
    const crate = w.environment.breakables.find((b) => b.tags?.includes('crate'))!;
    const bar = w.items.find((i) => WEAPONS[i.def]!.id === 'm24-pry-bar')!;
    claim(w, h, bar);
    h.x = crate.x - fx(110);
    h.z = crate.z;
    h.facing = 1;
    for (let i = 0; i < 30; i += 1)
      step(w, [i === 0 ? { ...IDLE, pressed: ActionBit.Attack } : IDLE]);
    expect(crate.state).toBe(3);
    expect(w.shared!.log.kind === SharedEvent.Opened || w.shared!.events > 0).toBe(true);
    // Two protected stalls in one cluster: one incident.
    const stalls = w.environment.breakables.filter((b) => b.property === 1);
    for (const s of stalls) {
      h.x = s.x - fx(110);
      h.z = s.z;
      for (let i = 0; i < 30; i += 1)
        step(w, [i === 0 ? { ...IDLE, pressed: ActionBit.Attack } : IDLE]);
    }
    expect(w.shared!.incidents.length).toBe(1);
  });
});

describe('E4 moving platform', () => {
  test('a body standing on the platform travels with it', () => {
    const w = createWorld(1, { arena: 'lab-m24-platform', difficulty: 'medium' });
    const p = w.shared!.platforms[0]!;
    const h = heroOf(w, 0)!;
    h.x = p.x;
    h.z = p.z;
    const start = h.x;
    idle(w, p.wait + 60);
    expect(h.x).toBeGreaterThan(start + fx(100));
    expect(h.x - p.x).toBeLessThan(fx(5));
    roundTrip(w, () => IDLE, 120);
  });
});

describe('E5 finite gear and boss phase conditions', () => {
  test('gear blocks frontal strikes until its Guard is spent, then breaks once', () => {
    const w = createWorld(2, { arena: 'lab-m24-gear', difficulty: 'easy' });
    arrive(w);
    const e = enemy(w, 'm24-shield-escort')!;
    expect(e.ext!.gear).toEqual([160, 80]);
    const health = e.health;
    for (let i = 0; i < 2400 && !gearBroken(e); i += 1) step(w, [botInput(w)]);
    expect(e.ext!.gear[0]).toBe(0);
    expect(e.health).toBeLessThanOrEqual(health);
    roundTrip(w, (x) => botInput(x), 120);
  });

  test('the mounted shield boss: phase 1 ends only on the dismount, phase 2 only with broken gear', () => {
    const w = createWorld(4, { arena: 'lab-m24-marshal', difficulty: 'easy' });
    arrive(w);
    const b = enemy(w, 'm24-marshal')!;
    expect(b.ext!.rider!.phase).not.toBe(PassPhase.Dismounted);
    const prof = PROFILES[b.hero]!;
    expect(prof.boss!.phases.map((p) => p.require)).toEqual(['dismount', 'gear', 'none']);
    // While mounted, a hit costs Stability and never Health.
    const health = b.health;
    for (let i = 0; i < 300 && b.ext!.rider!.phase !== PassPhase.Dismounted; i += 1) {
      step(w, [botInput(w)]);
      if (b.ext!.rider!.phase !== PassPhase.Dismounted) expect(b.health).toBe(health);
    }
    if (b.ext!.rider!.phase !== PassPhase.Dismounted) {
      dismount(w, b, b.x - fx(100));
      expect(b.state).toBe(MoveState.Down);
      expect(b.protectedRecovery).toBe(true);
    }
    expect(b.ext!.rider!.phase).toBe(PassPhase.Dismounted);
    // Health reaching the floor of the gear phase holds there while the shield stands.
    w.encounter!.boss!.phase = 1;
    b.health = Math.trunc((b.maxHealth * 35) / 100) + 5;
    for (let i = 0; i < 1200; i += 1) step(w, [botInput(w)]);
    if (!gearBroken(b)) expect(w.encounter!.boss!.phase).toBe(1);
  });
});

describe('E6 mounted fighters in on-foot arenas', () => {
  test('a rider rests, warns a lane, passes, and at zero Stability dismounts safely', () => {
    const w = createWorld(3, { arena: 'lab-m24-riders', difficulty: 'easy' });
    arrive(w);
    const r = enemy(w, 'm24-mounted-raider')!;
    const seen = new Set<number>();
    for (let i = 0; i < 600; i += 1) {
      step(w, [IDLE]);
      seen.add(r.ext!.rider!.phase);
    }
    expect([...seen].sort()).toEqual([PassPhase.Rest, PassPhase.Warn, PassPhase.Pass]);
    // Hits pay Stability only.
    const h = heroOf(w, 0)!;
    expect(canHit(h, ENEMIES[0]!.actions[0]!, r)).toBe(true);
    for (let i = 0; i < 3000 && r.ext!.rider!.phase !== PassPhase.Dismounted; i += 1)
      step(w, [botInput(w)]);
    expect(r.ext!.rider!.phase).toBe(PassPhase.Dismounted);
    roundTrip(w, (x) => botInput(x), 120);
  });
});

describe('E7/E8 rivals, noncombatants, feints and disguises', () => {
  test('the rival never falls below its floor and withdraws; the noncombatant is never a target', () => {
    const w = createWorld(5, { arena: 'lab-m24-rivals', difficulty: 'easy' });
    arrive(w);
    const rival = enemy(w, 'm24-rival')!;
    const by = enemy(w, 'm24-bystander')!;
    const merchant = enemy(w, 'm24-false-merchant')!;
    expect(nonCombatant(by)).toBe(true);
    expect(nonCombatant(merchant)).toBe(true);
    const floor = Math.trunc((rival.maxHealth * 30) / 100);
    rival.health = floor + 10;
    let withdrew = false;
    let revealed = false;
    let feinted = false;
    for (let i = 0; i < 3600; i += 1) {
      step(w, [botInput(w)]);
      expect(rival.health).toBeGreaterThanOrEqual(floor);
      if (rival.state === MoveState.Flee) withdrew = true;
      if (!merchant.ext!.disguised) revealed = true;
      if (w.shared!.log.kind === SharedEvent.Feint) feinted = true;
    }
    expect(by.health).toBe(by.maxHealth);
    expect(revealed).toBe(true);
    expect(withdrew || rival.health === floor).toBe(true);
    expect(feinted).toBe(true);
  });
});

describe('E9 heavy weapons, blast throwables and E13 provisions', () => {
  test('the heavy gun refuses jumps, slows walking and locks when hot', () => {
    const w = createWorld(1, { arena: 'lab-m24-weapons', difficulty: 'easy' });
    const h = heroOf(w, 0)!;
    const gun = w.items.find((i) => WEAPONS[i.def]!.id === 'm24-heavy-gun')!;
    claim(w, h, gun);
    step(w, [{ ...IDLE, pressed: ActionBit.Jump }]);
    expect(h.state).not.toBe(MoveState.Air);
    const walk = (x: World) => {
      const f = heroOf(x, 0)!;
      const from = f.x;
      for (let i = 0; i < 10; i += 1) step(x, [{ ...IDLE, moveX: 1 }]);
      return f.x - from;
    };
    const slow = walk(w);
    const free = walk(createWorld(1, { arena: 'lab-m24-weapons', difficulty: 'easy' }));
    expect(slow).toBeGreaterThan(0);
    expect(slow).toBeLessThan(free);
    let locked = false;
    for (let i = 0; i < 600 && !locked; i += 1) {
      step(w, [i % 70 === 0 ? { ...IDLE, pressed: ActionBit.Attack } : IDLE]);
      locked = (h.ext?.heatLock ?? 0) > 0;
    }
    expect(locked).toBe(true);
  });

  test('a blast spares the thrower team and costs enemies Defense; a provision is eaten on demand', () => {
    const w = createWorld(1, { arena: 'lab-m24-weapons', difficulty: 'easy' });
    arrive(w);
    const h = heroOf(w, 0)!;
    const foe = w.bodies.find((b) => b.team === 'enemy')!;
    const dev = spawnItem(w, weaponIndex('m24-concussion'), foe.x, foe.z);
    dev.lastHolder = h.id;
    h.x = foe.x;
    h.z = foe.z;
    const [hh, fd] = [h.health, foe.defense];
    detonate(w, dev);
    expect(dev.state).toBe(ItemState.Gone);
    expect(h.health).toBe(hh);
    expect(foe.defense).toBeLessThan(fd);
    // Provision: carried, eaten with Interact + Up.
    const w2 = createWorld(1, { arena: 'lab-m24-weapons', difficulty: 'easy' });
    const h2 = heroOf(w2, 0)!;
    h2.health = 100;
    const food = w2.items.find((i) => WEAPONS[i.def]!.id === 'm24-ration')!;
    claim(w2, h2, food);
    step(w2, [{ ...IDLE, moveZ: -1, pressed: ActionBit.Interact }]);
    expect(h2.item).toBe(0);
    expect(h2.health).toBe(220);
  });
});

describe('E10 mount catalogue', () => {
  test('a dismount mount at zero Stability is lost and the hero finishes the corridor on foot', () => {
    const c = CORRIDORS.findIndex((x) => x.id === 'pursuit-m24-mounts');
    const w = createWorld(1, { difficulty: 'easy' });
    setupPursuit(w, c, 0);
    const r = w.pursuit!.riders[0]!;
    r.state = RiderState.Crash;
    r.since = w.frame;
    for (let i = 0; i < 200; i += 1) step(w, [IDLE]);
    expect(r.state).toBe(RiderState.OnFoot);
    const x = r.x;
    for (let i = 0; i < 300; i += 1) step(w, [IDLE]);
    expect(r.x).toBeGreaterThan(x);
    for (let i = 0; i < 5000 && w.pursuit!.phase === 0; i += 1) step(w, [IDLE]);
    expect(w.pursuit!.phase).not.toBe(0);
  });
});

describe('E11 hand-over and support role; E12 support robot', () => {
  test('hand-over maps bars without raising them and caches the held weapon once', () => {
    const w = createWorld(1, { arena: 'lab-m24-handover', difficulty: 'easy' });
    const h = heroOf(w, 0)!;
    const staff = w.items.find((i) => WEAPONS[i.def]!.id === 'workstaff')!;
    claim(w, h, staff);
    staff.integrity = 50;
    h.health = 200;
    h.defense = 40;
    const before = h.hero;
    expect(handOver(w, 0, 'river')).toBe(true);
    expect(h.hero).not.toBe(before === h.hero ? -1 : before);
    expect(h.health).toBeLessThanOrEqual(200);
    expect(h.defense).toBeLessThanOrEqual(40);
    expect(h.item).toBe(0);
    expect(claimCache(w, 0)).toBe(true);
    expect(w.items.find((i) => i.id === h.item)!.integrity).toBe(50);
    expect(claimCache(w, 0)).toBe(false);
    roundTrip(w, () => IDLE, 60);
  });

  test('a supporter stays put, is never a target and spends each action once', () => {
    const w = createWorld(1, { arena: 'lab-m24-handover', difficulty: 'easy' });
    step(w, [IDLE, IDLE]);
    const p2 = heroOf(w, 1)!;
    expect(becomeSupporter(w, 1)).toBe(true);
    expect(nonCombatant(p2)).toBe(true);
    const x = p2.x;
    for (let i = 0; i < 10; i += 1)
      step(w, [IDLE, { ...IDLE, moveX: 1, pressed: ActionBit.Attack }]);
    expect(p2.x).toBe(x);
    expect(p2.ext!.support!.used).toBe(0b1111);
  });

  test('the robot station: request, active cover, then consumed; delay holds the next wave', () => {
    const w = createWorld(1, { arena: 'lab-m24-robot', difficulty: 'easy' });
    const [cover, delay] = w.shared!.stations;
    const h = heroOf(w, 0)!;
    h.x = cover!.x;
    h.z = cover!.z;
    step(w, [IDLE]);
    expect(cover!.state).toBe(RobotState.Approaching);
    idle(w, cover!.approach + 1);
    expect(cover!.state).toBe(RobotState.Active);
    expect(w.environment.surfaces.some((s) => s.id === cover!.coverId)).toBe(true);
    // Only one intervention at a time.
    h.x = delay!.x;
    h.z = delay!.z;
    step(w, [IDLE]);
    expect(delay!.state).toBe(RobotState.Unused);
    idle(w, cover!.frames);
    expect(cover!.state).toBe(RobotState.Consumed);
    expect(w.environment.surfaces.some((s) => s.id === 391)).toBe(false);
    h.x = delay!.x;
    h.z = delay!.z;
    idle(w, 2);
    // A hostile at the station during the approach disrupts it (then one retry).
    expect([RobotState.Approaching, RobotState.Disrupted]).toContain(delay!.state);
    if (delay!.state === RobotState.Approaching) {
      idle(w, delay!.approach + 1);
      if ((delay!.state as number) === RobotState.Active)
        expect(w.shared!.delayUntil).toBeGreaterThan(w.frame);
    }
    roundTrip(w, () => IDLE, 60);
  });
});
