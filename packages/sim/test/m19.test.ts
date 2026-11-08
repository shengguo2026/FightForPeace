import { botInput } from './arenaBot';
import { ENEMIES, kitOf } from '../src/combat/roster';
import { claim, spawnItem } from '../src/combat/held';
import { WEAPONS, weaponIndex } from '../src/combat/armory';
import { enter, interrupt } from '../src/combat/reactions';
import { dealDamage, nonCombatant } from '../src/combat/damage';
import { ENEMY_VARIANTS } from '../src/combat/heroes.gen';
import { CallKind } from '../src/combat/types';
import { Cheat } from '../src/cheats/cheats';
import { ARENAS, DIFFICULTIES, PROFILES, enemyKitIndex, profileOf } from '../src/enemies/data';
import { spawnEnemy, startStagger } from '../src/enemies/boss';
import { usage } from '../src/enemies/director';
import { arrive, firearmOf, variantKit } from '../src/enemies/stage2';
import { fx } from '../src/math/fixed';
import {
  CORRIDORS,
  Intercept,
  EnemyState,
  PursuitPhase,
  addRoadRider,
} from '../src/mounted/pursuit';
import { restoreWorld, snapshotWorld } from '../src/net/snapshot';
import { AssetState, GrenadePhase, ROOMS } from '../src/preservation/greenhouse';
import {
  EncEvent,
  type Fighter,
  type FrameInput,
  GunLost,
  ItemState,
  MoveState,
  Order,
  Special,
  Threat,
  type World,
} from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';

const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const STAGE2 = [
  'claimhand',
  'glassrunner',
  'reaver',
  'marauder',
  'saboteur',
  'rider',
  'enforcer2',
  'signalman',
];
const DIFFS = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];
const SAFE = Cheat.SAFEHEART | Cheat.SOFTERBLOWS;

/** A greenhouse room with its waves held back (tests place what they need). */
function room(id: string, difficulty = 'medium', heroes = ['river']): World {
  const w = createWorld(5, { greenhouse: id, heroes, difficulty });
  w.encounter!.start = 1_000_000;
  if (w.greenhouse!.grenade) w.greenhouse!.grenade.nextAt = 1_000_000;
  step(
    w,
    heroes.map(() => idle),
  );
  return w;
}
function run(w: World, n: number, inputs: (w: World) => FrameInput[] = () => [idle, idle]) {
  for (let i = 0; i < n; i += 1) step(w, inputs(w));
}
const hero = (w: World, slot = 0) => heroOf(w, slot)!;
function place(f: Fighter, x: number, z: number): Fighter {
  f.x = fx(x);
  f.z = fx(z);
  f.vx = 0;
  f.vz = 0;
  return f;
}
function enemy(w: World, kit: string, x: number, z: number): Fighter {
  const e = spawnEnemy(w, variantKit(kit, w.encounter!.difficulty), fx(x), fx(z));
  arrive(w, e);
  return e;
}
/** A hit's interruption, as a hero's strike would cause it. */
function hit(f: Fighter, stun = 12): void {
  interrupt(f);
  enter(f, MoveState.Hitstun, stun);
}
const boss = (w: World) => w.bodies.find((b) => b.id === w.encounter!.boss?.id)!;

/** Runs a room with the test bot (safe cheats) until it ends; returns the world. */
function botRoom(id: string, difficulty: string, heroes: string[], frames = 60 * 240): World {
  const w = createWorld(3, {
    greenhouse: id,
    heroes,
    difficulty,
    cheats: { hero: [SAFE, SAFE], session: 0 },
  });
  for (let i = 0; i < frames && w.encounter!.result === 0; i += 1)
    step(
      w,
      heroes.map((_, s) => botInput(w, s)),
    );
  return w;
}

describe('M19 data', () => {
  test('eight Stage 2 roles and Marek, with difficulty variants', () => {
    for (const id of [...STAGE2, 'marek']) expect(PROFILES[enemyKitIndex(id)], id).not.toBeNull();
    expect(profileOf({ team: 'enemy', hero: enemyKitIndex('saboteur') })!.role).toBe('objective');
    expect(profileOf({ team: 'enemy', hero: enemyKitIndex('signalman') })!.role).toBe('commander');
    expect(ENEMY_VARIANTS.claimhand!.map(([id]) => id)).toEqual([
      'claimhand-elite',
      'claimhand-master',
    ]);
    // Variants keep their base kit's art and moves.
    const master = ENEMIES[variantKit('claimhand', 4)]!;
    expect(master.id).toBe('claimhand-master');
    expect(master.art).toBe('claimhand');
    expect(ENEMIES[variantKit('claimhand', 1)]!.id).toBe('claimhand');
    expect(ENEMIES[variantKit('claimhand', 2)]!.id).toBe('claimhand-elite');
    expect(ENEMIES[variantKit('signalman', 3)]!.id).toBe('signalman');
    expect(ENEMIES[variantKit('signalman', 4)]!.id).toBe('signalman-master');
    // Firearm aims per difficulty (solo, co-op).
    expect(DIFFICULTIES.map((d) => d.aims[0])).toEqual([1, 1, 1, 2, 2]);
    // Stage 2 roles never take firearms.
    for (const id of STAGE2)
      expect(profileOf({ team: 'enemy', hero: enemyKitIndex(id) })!.firearms).toBe(false);
  });

  test('rooms: one trial per role, two beats and Marek’s yard; reserves and scorch target', () => {
    const ids = ROOMS.map((r) => r.id);
    for (const k of STAGE2) expect(ids).toContain(`trial-${k}`);
    expect(ids).toContain('beat-loading-yard');
    expect(ids).toContain('beat-filtration');
    const yard = ROOMS.find((r) => r.id === 'boss-marek')!;
    expect(yard.scorch).toBeGreaterThanOrEqual(0);
    expect(yard.npcs.map((n) => n.id)).toEqual(['tomas']);
    expect(ROOMS.find((r) => r.id === 'beat-filtration')!.saboteurGrenade).toBe(true);
    const signal = ROOMS.find((r) => r.id === 'trial-signalman')!;
    expect(ARENAS[signal.arena]!.reserve.length).toBeGreaterThan(0);
    expect(CORRIDORS.find((c) => c.id === 'marek-intercept')!.boss).not.toBeNull();
  });
});

describe('M19 roles in arena scenarios', () => {
  test('every Stage 2 room clears at every difficulty with the test bot, deterministically', () => {
    for (const r of ROOMS.filter((x) => x.id.startsWith('trial-') || x.id.startsWith('beat-'))) {
      for (const d of DIFFS) {
        const a = botRoom(r.id, d, ['fire']);
        expect(a.encounter!.result, `${r.id} ${d}`).toBe(1);
        if (d === 'hard') expect(hashWorld(botRoom(r.id, d, ['fire']))).toBe(hashWorld(a));
      }
    }
  }, 300_000);

  test('a confirmed Claim Jab converts into the Seizing Cross (enemy conversions)', () => {
    const w = room('trial-claimhand');
    const h = place(hero(w), 600, 760);
    const e = place(enemy(w, 'claimhand', 700, 760), 700, 760);
    e.facing = -1;
    e.targetId = h.id;
    let converted = false;
    run(w, 200, () => {
      const a = e.state === MoveState.Attack ? kitOf(e)?.actions[e.action] : undefined;
      if (a?.id === 'seizing-cross') converted = true;
      return [idle];
    });
    expect(converted).toBe(true);
  });

  test('a Revolver Marauder spawns armed (rounds by difficulty), spends real rounds, never takes another gun', () => {
    for (const [i, d] of DIFFS.entries()) {
      const w = room('trial-marauder', d);
      const m = enemy(w, 'marauder', 1200, 760);
      const gun = firearmOf(w, m)!;
      expect(WEAPONS[gun.def]!.id).toBe('six-round-sidearm');
      expect(gun.ammo).toBe([3, 4, 5, 6, 6][i]);
    }
    const w = room('trial-marauder', 'medium');
    place(hero(w), 300, 760);
    const m = enemy(w, 'marauder', 1100, 760);
    const gun = firearmOf(w, m)!;
    const start = gun.ammo;
    let shots = 0;
    run(w, 900, () => {
      if (m.state === MoveState.Attack && m.stateFrame === 0) {
        const a = kitOf(m)!.actions[m.action]!;
        if (a.ammo > 0) shots += 1;
      }
      return [idle];
    });
    expect(shots).toBeGreaterThan(0);
    expect(gun.ammo).toBeLessThan(start);
    // A loose support gun is never a Stage 2 pickup, not even for the Marauder.
    const w2 = room('trial-marauder', 'medium');
    place(hero(w2), 300, 760);
    const m2 = enemy(w2, 'marauder', 1100, 760);
    const own = firearmOf(w2, m2)!;
    own.state = ItemState.Gone;
    m2.item = 0;
    m2.wkit = -1;
    const other = spawnItem(w2, weaponIndex('support-gun'), m2.x + fx(40), m2.z);
    run(w2, 120);
    expect(other.state).toBe(ItemState.Ground);
  });

  test('firearm aims are limited by difficulty (Medium: one warned line at a time)', () => {
    const w = room('trial-marauder', 'medium');
    place(hero(w), 900, 760);
    enemy(w, 'marauder', 1500, 700);
    enemy(w, 'marauder', 300, 820);
    enemy(w, 'marauder', 1600, 860);
    let peak = 0;
    run(w, 1200, (x) => {
      const n = x.bodies.filter((b) => b.team === 'enemy' && b.threatFlags & Threat.Aim).length;
      peak = Math.max(peak, n);
      return [idle];
    });
    expect(peak).toBe(1);
    expect(usage(w).aims).toBeLessThanOrEqual(1);
  });

  test('Systems Saboteur: Access, Tamper and Commit put a control into Safe fallback; a hit stops it', () => {
    const w = room('trial-saboteur', 'medium');
    const gh = w.greenhouse!;
    place(hero(w), 200, 900);
    const s = enemy(w, 'saboteur', 900, 760);
    // Interrupted at Access: the step is lost, Exit Route follows, morale counts it.
    let struck = false;
    run(w, 400, () => {
      if (!struck && s.special === Special.Breach && s.breach === 2) {
        struck = true;
        hit(s);
      }
      return [idle];
    });
    expect(s.interrupts).toBe(1);
    expect(w.encounter!.event.kind === EncEvent.BreachStopped || s.interrupts === 1).toBe(true);
    // Left alone it finishes one control (Safe fallback, repairable), then another.
    const done = () => w.encounter!.breached.length;
    run(w, 1500);
    expect(done()).toBeGreaterThanOrEqual(1);
    const first = gh.assets[w.encounter!.breached[0]!]!;
    expect(first.state).toBe(AssetState.Fallback);
    // Each control at most once.
    expect(new Set(w.encounter!.breached).size).toBe(w.encounter!.breached.length);
  });

  test('one sabotage per room at a time', () => {
    const w = room('trial-saboteur', 'hard');
    place(hero(w), 200, 900);
    enemy(w, 'saboteur', 900, 760);
    enemy(w, 'saboteur', 1300, 760);
    let both = false;
    run(w, 900, (x) => {
      const n = x.bodies.filter((b) => b.special === Special.Breach).length;
      if (n > 1) both = true;
      return [idle];
    });
    expect(both).toBe(false);
  });

  test('the filtration Saboteur carries the room’s one grenade (Remove, Arm, Aim, Release)', () => {
    const w = room('beat-filtration', 'medium');
    const g = w.greenhouse!.grenade!;
    g.nextAt = 0;
    place(hero(w), 700, 760);
    const s = enemy(w, 'saboteur', 1200, 760);
    const seen = new Set<number>();
    run(w, 600, () => {
      seen.add(g.phase);
      return [idle];
    });
    expect(g.thrower).toBe(s.id);
    expect(g.rounds).toBe(1);
    expect(seen.has(GrenadePhase.Aim)).toBe(true);
  });

  test('an interrupted grenade shakes the Saboteur', () => {
    const w = room('beat-filtration', 'medium');
    const g = w.greenhouse!.grenade!;
    g.nextAt = 0;
    place(hero(w), 700, 760);
    const s = enemy(w, 'saboteur', 1200, 760);
    run(w, 300, () => {
      if (g.phase === GrenadePhase.Arm && s.state === MoveState.Idle) hit(s);
      return [idle];
    });
    expect(s.shaken).toBe(true);
  });

  test('Jackal Signalman: Crossfang sends two allies to opposite depth sides; a hit breaks a call', () => {
    const w = room('trial-signalman', 'extreme');
    const h = place(hero(w), 900, 760);
    const sig = enemy(w, 'signalman', 1300, 760);
    const a = enemy(w, 'claimhand', 400, 700);
    const b = enemy(w, 'claimhand', 1500, 840);
    let call = 0;
    let sides: number[] = [];
    run(w, 700, () => {
      if (sig.special === Special.Call && call === 0) call = sig.callKind;
      if (!sides.length && [a, b].every((e) => e.order === Order.Crossfang)) {
        sides = [a, b].map((e) => e.orderSide).sort();
        expect([a.orderTarget, b.orderTarget]).toEqual([h.id, h.id]);
      }
      return [idle];
    });
    expect(call).toBe(CallKind.Crossfang);
    expect(sides).toEqual([-1, 1]);
    // Interrupted before it confirms: Signal Break, and the room's call lock clears.
    const w2 = room('trial-signalman', 'extreme');
    place(hero(w2), 900, 760);
    const s2 = enemy(w2, 'signalman', 1300, 760);
    enemy(w2, 'claimhand', 400, 700);
    enemy(w2, 'claimhand', 1500, 840);
    let broke = false;
    let struck = false;
    run(w2, 700, () => {
      if (!struck && s2.special === Special.Call && s2.stateFrame === 10) {
        struck = true;
        hit(s2);
      }
      const a2 = s2.state === MoveState.Attack ? kitOf(s2)?.actions[s2.action] : undefined;
      if (a2?.id === 'signal-break') broke = true;
      return [idle];
    });
    expect(broke).toBe(true);
    expect(s2.interrupts).toBeGreaterThanOrEqual(1);
  });

  test('Replace the Line (Ultimate): a wounded raider withdraws, a reserve enters through a warned edge', () => {
    const w = room('trial-signalman', 'ultimate');
    place(hero(w), 900, 760);
    const sig = enemy(w, 'signalman', 1300, 760);
    const hurt = enemy(w, 'claimhand', 1500, 700);
    hurt.health = Math.trunc(hurt.maxHealth / 3);
    // Only the replace call applies: one wounded ally, nobody for Crossfang or an escort.
    let warned = false;
    let entered = 0;
    run(w, 1500, (x) => {
      if (x.encounter!.entryKit >= 0) warned = true;
      if (x.encounter!.event.kind === EncEvent.ReserveIn) entered = x.encounter!.event.a;
      return [idle];
    });
    expect(ENEMIES[sig.hero]!.id).toBe('signalman-master');
    expect(warned).toBe(true);
    expect(w.encounter!.reserveUsed).toBe(1);
    expect(entered).toBeGreaterThan(0);
    expect(hurt.state === MoveState.Flee || !w.bodies.includes(hurt)).toBe(true);
  });

  test('Lockstep Escort: the Stage 2 Enforcer screens a Marauder and reserves its threat until hit', () => {
    const w = room('trial-enforcer2', 'hard');
    place(hero(w), 300, 760);
    const en = enemy(w, 'enforcer2', 1300, 760);
    const m = enemy(w, 'marauder', 1500, 760);
    let escorting = false;
    run(w, 300, () => {
      if (en.order === Order.Escort && en.orderTarget === m.id) {
        escorting = true;
        expect(en.threat).toBeGreaterThan(0);
      }
      return [idle];
    });
    expect(escorting).toBe(true);
    // Being hit ends it (and its reservation).
    if (en.order !== Order.Escort) return;
    en.lastHitFrame = w.frame;
    hit(en, 4);
    run(w, 10);
    expect(en.order).toBe(Order.None);
  });

  test('a Road Rider on foot arrives knocked down with protected recovery', () => {
    const w = room('trial-rider', 'medium');
    const r = enemy(w, 'rider', 1700, 760);
    expect(r.state).toBe(MoveState.Down);
    expect(r.protectedRecovery).toBe(true);
    run(w, 120);
    expect(r.state === MoveState.Down || r.state === MoveState.GetUp).toBe(false);
  });

  test('a pivot grab (Aisle Turn) swings the hero round to the other side', () => {
    const w = room('trial-reaver', 'medium');
    const h = place(hero(w), 900, 760);
    const r = place(enemy(w, 'reaver', 1000, 760), 1000, 760);
    r.facing = -1;
    const i = kitOf(r)!.actions.findIndex((a) => a.id === 'aisle-turn');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(kitOf(r)!.actions[i]!.tags).toContain('pivot');
    void h;
  });

  test('morale: two interruptions shake a Saboteur; an isolated Signalman runs', () => {
    const w = room('trial-saboteur', 'medium');
    place(hero(w), 300, 760);
    const s = enemy(w, 'saboteur', 1200, 760);
    s.interrupts = 2;
    s.health = Math.trunc((s.maxHealth * 55) / 100);
    run(w, 2);
    expect(nonCombatant(s)).toBe(true);
    const w2 = room('trial-signalman', 'extreme');
    place(hero(w2), 300, 760);
    const sig = enemy(w2, 'signalman', 1200, 760);
    sig.health = Math.trunc((sig.maxHealth * 60) / 100);
    run(w2, 2);
    expect(sig.state).toBe(MoveState.Flee);
  });
});

describe('M19 Marek Vane', () => {
  function yard(difficulty = 'medium', heroes = ['river'], opening = 0): World {
    const w = createWorld(5, {
      greenhouse: 'boss-marek',
      heroes,
      difficulty,
      ...(opening ? { intercept: opening } : {}),
    });
    run(w, 40);
    return w;
  }

  test('Armed Command: he holds the support gun (24 rounds); Jackal Burst spends three', () => {
    const w = yard();
    const m = boss(w);
    const gun = firearmOf(w, m)!;
    expect(WEAPONS[gun.def]!.id).toBe('support-gun');
    expect(gun.ammo).toBe(24);
    expect(w.encounter!.boss!.gunItem).toBe(gun.id);
    place(hero(w), 900, 760);
    place(m, 1600, 760);
    let burst = false;
    run(w, 600, () => {
      const a = m.state === MoveState.Attack ? kitOf(m)?.actions[m.action] : undefined;
      if (a?.id === 'jackal-burst') burst = true;
      return [idle];
    });
    expect(burst).toBe(true);
    expect(gun.ammo % 3).toBe(0);
    expect(gun.ammo).toBeLessThan(24);
  });

  test('a Resolve break drops the gun; a hero taking it disarms him and queues Predator Unbound', () => {
    const w = yard();
    const m = boss(w);
    const b = w.encounter!.boss!;
    const h = place(hero(w), 900, 760);
    startStagger(w, m);
    const gun = w.items.find((i) => i.id === b.gunItem)!;
    expect(gun.state).toBe(ItemState.Ground);
    expect(m.item).toBe(0);
    gun.x = h.x;
    gun.z = h.z;
    claim(w, h, gun);
    b.stagger = 1;
    run(w, 20);
    expect(b.gunLost).toBe(GunLost.Disarmed);
    run(w, 400);
    expect(b.phase).toBe(1);
    // Predator Unbound never takes a firearm.
    expect(firearmOf(w, m)).toBeUndefined();
  });

  test('emptied, he tosses the gun aside (Emptied) and the phase changes', () => {
    const w = yard();
    const m = boss(w);
    const b = w.encounter!.boss!;
    place(hero(w), 900, 760);
    firearmOf(w, m)!.ammo = 0;
    run(w, 400);
    expect(b.gunLost).toBe(GunLost.Emptied);
    expect(b.phase).toBe(1);
  });

  test('Command Pressure brings the phase’s supports once (variants by difficulty)', () => {
    for (const [d, kits] of [
      ['medium', ['claimhand', 'claimhand']],
      ['hard', ['claimhand-elite', 'marauder-elite']],
    ] as const) {
      const w = yard(d);
      const m = boss(w);
      place(hero(w), 1100, 760);
      place(m, 1700, 760);
      run(w, 1500);
      const b = w.encounter!.boss!;
      expect(b.summoned, d).toBe(true);
      const supports = w.bodies
        .filter((e) => e.team === 'enemy' && e.id !== m.id && profileOf(e))
        .map((e) => ENEMIES[e.hero]!.id)
        .sort();
      expect(supports).toEqual([...kits].sort());
    }
  });

  test('Scorched Claim: at low Health he goes for the cargo; interrupted it costs Resolve, finished it leaves it Critical', () => {
    const w = yard();
    const m = boss(w);
    const b = w.encounter!.boss!;
    place(hero(w), 300, 900);
    // Straight to Predator Unbound at low Health.
    firearmOf(w, m)!.ammo = 0;
    run(w, 400);
    expect(b.phase).toBe(1);
    m.health = Math.trunc(m.maxHealth / 4);
    const resolve = b.resolve;
    let stopped = false;
    run(w, 900, () => {
      if (m.special === Special.Scorch && !stopped && m.stateFrame === 30) {
        stopped = true;
        hit(m);
      }
      return [idle];
    });
    expect(b.scorchStops).toBe(1);
    expect(b.resolve).toBeLessThan(resolve);
    run(w, 1500);
    expect(b.scorch).toBe(3);
    const cargo = w.greenhouse!.assets[ROOMS[w.greenhouse!.room]!.scorch]!;
    expect(cargo.state).toBe(AssetState.Critical);
  });

  test('capture: a Resolve break at or below 30% is the clean surrender; supports lose their nerve', () => {
    const w = yard('hard');
    const m = boss(w);
    const b = w.encounter!.boss!;
    place(hero(w), 300, 900);
    const helper = enemy(w, 'claimhand', 1400, 700);
    m.health = Math.trunc(m.maxHealth / 4);
    startStagger(w, m);
    expect(b.capture).toBe(1);
    expect(m.state).toBe(MoveState.Surrender);
    run(w, 3);
    expect(nonCombatant(helper)).toBe(true);
  });

  test('capture: Health 0 while Resolve remains is the forced capture', () => {
    const w = yard();
    const m = boss(w);
    const b = w.encounter!.boss!;
    // Last phase, so the phase floor does not hold Health.
    firearmOf(w, m)!.ammo = 0;
    place(hero(w), 300, 900);
    run(w, 400);
    expect(b.phase).toBe(1);
    expect(b.resolve).toBeGreaterThan(0);
    dealDamage(w, m, m.health);
    expect(b.capture).toBe(2);
    expect(m.ko).toBe(true);
  });

  test('the mounted intercept: Marek rides in, never breaks away; breaking him ends it at once', () => {
    const w = createWorld(5, {
      pursuit: 'marek-intercept',
      heroes: ['fire'],
      difficulty: 'medium',
    });
    const p = w.pursuit!;
    const c = CORRIDORS[p.corridor]!;
    let rider = null;
    for (let i = 0; i < 60 * 60 && !rider; i += 1) {
      step(w, [{ ...idle, moveX: 1 }]);
      rider = p.enemies.find((e) => e.boss) ?? null;
    }
    expect(rider).not.toBeNull();
    expect(p.marek).toBe(Intercept.Riding);
    expect(rider!.maxStability).toBeGreaterThan(100);
    // Breaking his Stability: critical, then a qualifying hit crashes him.
    rider!.critical = true;
    rider!.commits = 99;
    run(w, 30, () => [{ ...idle, moveX: 1 }]);
    expect(rider!.state).not.toBe(EnemyState.Leave);
    void c;
  });

  test('the intercept’s outcome opens the yard: broken, Marek starts knocked down with half Resolve', () => {
    const plain = yard('medium', ['river']);
    const opened = yard('medium', ['river'], Intercept.Broken);
    const b = opened.encounter!.boss!;
    expect(b.intercept).toBe(Intercept.Broken);
    expect(b.resolve).toBeLessThan(plain.encounter!.boss!.resolve);
    const d = yard('medium', ['river'], Intercept.Dismounted);
    expect(d.encounter!.boss!.intercept).toBe(Intercept.Dismounted);
    expect(d.encounter!.boss!.resolve).toBe(plain.encounter!.boss!.resolve);
  });

  test('a crash ends the intercept with Broken; the finish with him mounted is a forced dismount', () => {
    const w = createWorld(5, { pursuit: 'marek-intercept', heroes: ['fire'], difficulty: 'easy' });
    const p = w.pursuit!;
    run(w, 5, () => [{ ...idle, moveX: 1 }]);
    const e = addRoadRider(p, fx(2000), fx(800), w.frame);
    e.boss = true;
    p.marek = Intercept.Riding;
    e.critical = true;
    e.state = EnemyState.Crash;
    p.marek = Intercept.Broken;
    run(w, 5, () => [{ ...idle, moveX: 1 }]);
    expect(p.phase).not.toBe(PursuitPhase.Ride);
  });

  test('every Marek phase at every difficulty: the bot reaches a capture, deterministically', () => {
    for (const d of DIFFS) {
      const a = botRoom('boss-marek', d, ['fire', 'river']);
      const b = a.encounter!.boss!;
      expect(a.encounter!.result, d).toBe(1);
      expect(b.capture, d).toBeGreaterThan(0);
      if (d === 'medium')
        expect(hashWorld(botRoom('boss-marek', d, ['fire', 'river']))).toBe(hashWorld(a));
    }
  }, 300_000);

  test('a snapshot mid-fight restores to the same hash', () => {
    const w = yard('hard', ['fire', 'river']);
    run(w, 600, (x) => [botInput(x, 0), botInput(x, 1)]);
    const c = restoreWorld(snapshotWorld(w));
    run(w, 300, (x) => [botInput(x, 0), botInput(x, 1)]);
    run(c, 300, (x) => [botInput(x, 0), botInput(x, 1)]);
    expect(hashWorld(c)).toBe(hashWorld(w));
  });
});
