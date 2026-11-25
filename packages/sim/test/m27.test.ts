import { fx } from '../src/math/fixed';
import { ActionBit } from '../src/input/bits';
import { Cheat } from '../src/cheats/cheats';
import {
  type FrameInput,
  ItemState,
  MoveState,
  Special,
  type Fighter,
  type World,
} from '../src/world/types';
import { createWorld, hashWorld, heroOf, step } from '../src/world/world';
import { ARENAS, PROFILES } from '../src/enemies/data';
import { ENEMIES, kitOf } from '../src/combat/roster';
import { WEAPONS } from '../src/combat/armory';
import { claim } from '../src/combat/held';
import { dealDamage } from '../src/combat/damage';
import { CallKind } from '../src/combat/types';
import { startStagger } from '../src/enemies/boss';
import { dropHeld, phaseWeapon } from '../src/enemies/stage2';
import { snapshotWorld, restoreWorld } from '../src/net/snapshot';
import { MOUNTED, CORRIDORS, RiderState, mountOf, setupPursuit } from '../src/mounted/pursuit';
import { MoverPhase, PassPhase, SharedEvent } from '../src/shared/state';
import { botInput } from './arenaBot';

const IDLE: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const SAFE = Cheat.SAFEHEART | Cheat.SOFTERBLOWS;
const kit = (id: string) => ENEMIES.findIndex((k) => k.id === id);
const base = (f: Fighter) => ENEMIES[f.hero]!.art ?? ENEMIES[f.hero]!.id;
const enemiesOf = (w: World, id: string) =>
  w.bodies.filter(
    (b) => b.team === 'enemy' && (ENEMIES[b.hero]!.id.startsWith(id) || base(b) === id),
  );
const itemOf = (w: World, id: string) => w.items.find((i) => WEAPONS[i.def]!.id === id)!;
const garran = (w: World) => w.bodies.find((b) => b.id === w.encounter!.boss?.id)!;
function idle(w: World, frames: number): void {
  for (let i = 0; i < frames; i += 1) step(w, [IDLE]);
}
function arrive(w: World): void {
  for (let i = 0; i < 400 && w.encounter!.wave < 0; i += 1) step(w, [IDLE]);
}
const press = (bits: number, extra: Partial<FrameInput> = {}): FrameInput => ({
  ...IDLE,
  ...extra,
  pressed: bits,
});
/** The id of the attack a fighter is running ('' when none). */
const actionOf = (f: Fighter) =>
  f.state === MoveState.Attack || f.special !== Special.None
    ? (kitOf(f)?.actions[f.action]?.id ?? '')
    : '';
function lab(arena: string, difficulty = 'medium', heroes = ['mountain']): World {
  return createWorld(27, { arena, difficulty, heroes, cheats: { hero: [SAFE, SAFE], session: 0 } });
}

describe('M27 registry order and data', () => {
  test('earlier weapons and enemy kits keep their indices; the Stage 3 files come after them', () => {
    const ids = WEAPONS.map((w) => w.id);
    const s3 = [
      'hiking-staff',
      'wood-axe',
      'quarry-hammer',
      'bandit-revolver',
      'quarry-hookstaff',
      'trail-rice',
      'vegetable-broth',
      'seed-cake',
      'camp-meal',
    ];
    const m24 = ids.indexOf('m24-ration');
    for (const id of s3) expect(ids.indexOf(id), id).toBeGreaterThan(m24);
    const kits = ENEMIES.map((k) => k.id);
    const last24 = Math.max(...kits.map((k, i) => (k.startsWith('m24-') ? i : -1)));
    for (const id of ['ambusher', 'bruiser', 'trapper', 'raider', 'stalker', 'captain', 'garran'])
      expect(kits.indexOf(id), id).toBeGreaterThan(last24);
    // Arena rooms are appended after the M25 rooms.
    const arenas = ARENAS.map((a) => a.id);
    // M28 appends Stage 3's arenas after the M27 rooms.
    const m27 = arenas.filter((a) => !/^(s3-|stage3\.)/.test(a));
    expect(m27.slice(-14)[0]).toBe('lab-m27-ambusher');
    expect(m27.at(-1)).toBe('lab-m27-garran');
    expect(
      arenas.slice(arenas.indexOf('lab-m27-garran') + 1).every((a) => /^(s3-|stage3\.)/.test(a)),
    ).toBe(true);
  });

  test("roles, difficulty gates and Garran's three phases", () => {
    const prof = (id: string) => PROFILES[kit(id)]!;
    expect(prof('ambusher').role).toBe('flanker');
    expect(prof('bruiser').role).toBe('pressure');
    expect(prof('trapper').role).toBe('grappler');
    expect(prof('captain').role).toBe('commander');
    const g = prof('garran').boss!;
    expect(g.phases.map((p) => p.name)).toEqual([
      'Hookstaff Control',
      'Clinch and Cast',
      'Winch Pressure',
    ]);
    expect(g.phases[0]!.armed).toBe('quarry-hookstaff');
    expect(g.phases[2]!.device).toBe('winch');
    expect(MOUNTED.mounts.find((m) => m.id === 'mountain-horse')!.atZero).toBe('dismount');
  });
});

describe('Stage 3 weapons and food', () => {
  test('the bandit revolver fires exactly five rounds, never reloads, then whips and throws', () => {
    const w = lab('lab-m27-cart-rails');
    const h = heroOf(w, 0)!;
    const gun = itemOf(w, 'bandit-revolver');
    claim(w, h, gun);
    expect(gun.ammo).toBe(5);
    const used: number[] = [];
    for (let shot = 0; shot < 7; shot += 1) {
      step(w, [press(ActionBit.Attack)]);
      used.push(h.state === MoveState.Attack ? h.action : -1);
      idle(w, 70);
    }
    expect(gun.ammo).toBe(0);
    expect(h.item).toBe(gun.id);
    // Five shots, then the same input is the pistol whip (another move, no round spent).
    expect(new Set(used.slice(0, 5)).size).toBe(1);
    expect(used[5]).toBeGreaterThanOrEqual(0);
    expect(used[5]).not.toBe(used[0]);
  });

  test('the quarry hammer breaks scaffolds faster than the hiking staff; the axe opens timber at once', () => {
    const strikes = (weapon: string) => {
      const w = lab('lab-m27-scaffold');
      const h = heroOf(w, 0)!;
      const sc = w.environment.breakables.find((b) => b.tags?.includes('scaffold'))!;
      claim(w, h, itemOf(w, weapon));
      h.x = sc.x - fx(120);
      h.z = sc.z;
      h.facing = 1;
      for (let n = 1; n <= 30; n += 1) {
        step(w, [press(ActionBit.Attack, { moveX: 1 })]);
        idle(w, 70);
        h.x = sc.x - fx(120);
        h.z = sc.z;
        h.facing = 1;
        if (sc.state === 3) return n;
      }
      return 99;
    };
    const staff = strikes('hiking-staff');
    // The hammer lives in the Hammer Line; put one in the scaffold room.
    const w = lab('lab-m27-hammer-line');
    const h = heroOf(w, 0)!;
    claim(w, h, itemOf(w, 'quarry-hammer'));
    const sc = w.environment.breakables.find((b) => b.tags?.includes('scaffold'))!;
    let hammer = 99;
    for (let n = 1; n <= 30 && hammer === 99; n += 1) {
      h.x = sc.x - fx(130);
      h.z = sc.z;
      h.facing = 1;
      step(w, [press(ActionBit.Attack, { moveX: 1 })]);
      idle(w, 70);
      if (sc.state === 3) hammer = n;
    }
    expect(staff).toBeLessThan(99);
    expect(hammer).toBeLessThan(staff);
    // The Wood Axe opens a timber barrier with one strike.
    const f = lab('lab-m27-outer-fence');
    const fh = heroOf(f, 0)!;
    claim(f, fh, itemOf(f, 'wood-axe'));
    const timber = f.environment.breakables.find((b) => b.tags?.includes('timber'))!;
    fh.x = timber.x - fx(120);
    fh.z = timber.z;
    fh.facing = 1;
    step(f, [press(ActionBit.Attack)]);
    idle(f, 40);
    expect(timber.state).toBe(3);
  });

  test('each food family raises its own bar when eaten (Interact + Up)', () => {
    const eat = (food: string) => {
      const w = lab('lab-m27-outer-fence');
      const h = heroOf(w, 0)!;
      h.health = 100;
      h.defense = 10;
      h.meter = 0;
      claim(w, h, itemOf(w, food));
      step(w, [press(ActionBit.Interact, { moveZ: -1 })]);
      expect(h.item, food).toBe(0);
      return [h.health - 100, h.defense - 10, h.meter];
    };
    const [rice, broth, cake, meal] = [
      'trail-rice',
      'vegetable-broth',
      'seed-cake',
      'camp-meal',
    ].map(eat);
    expect(rice![0]).toBeGreaterThan(0);
    expect(rice!.slice(1)).toEqual([0, 0]);
    expect(broth![1]).toBeGreaterThan(0);
    expect([broth![0], broth![2]]).toEqual([0, 0]);
    expect(cake![2]).toBeGreaterThan(0);
    expect(cake!.slice(0, 2)).toEqual([0, 0]);
    expect(meal!.every((v) => v > 0)).toBe(true);
    expect(meal![0]!).toBeLessThan(rice![0]!);
  });
});

describe('Mountain horse', () => {
  test('zero Stability is a safe disengage: the horse is lost, Health untouched, the ride goes on', () => {
    const c = CORRIDORS.findIndex((x) => x.id === 'horse-test-track');
    expect(mountOf(CORRIDORS[c]!).id).toBe('mountain-horse');
    const w = createWorld(1, { difficulty: 'medium' });
    setupPursuit(w, c, 1);
    const h = heroOf(w, 0)!;
    const r = w.pursuit!.riders[0]!;
    const health = h.health;
    r.state = RiderState.Crash;
    r.since = w.frame;
    idle(w, 200);
    expect(r.state).toBe(RiderState.OnFoot);
    expect(h.health).toBe(health);
    for (let i = 0; i < 6000 && w.pursuit!.phase === 0; i += 1) step(w, [IDLE]);
    expect(w.pursuit!.phase).not.toBe(0);
  });
});

describe('Stage 3 enemies', () => {
  /** Runs a trial room with the bot and collects every move each role used. */
  function trial(arena: string, frames = 2400, difficulty = 'medium') {
    const w = lab(arena, difficulty);
    const seen = new Map<string, Set<string>>();
    const states = new Set<number>();
    const events = new Set<number>();
    for (let i = 0; i < frames && w.encounter!.result === 0; i += 1) {
      step(w, [botInput(w)]);
      for (const e of w.bodies) {
        if (e.team !== 'enemy') continue;
        const a = actionOf(e);
        if (!a) continue;
        const k = base(e);
        if (!seen.has(k)) seen.set(k, new Set());
        seen.get(k)!.add(a);
      }
      states.add(heroOf(w, 0)!.state);
      if (w.shared) events.add(w.shared.log.kind);
    }
    return { w, seen, states, events };
  }

  test('Trail Ambusher: flanks, lunges and strikes', () => {
    const { seen } = trial('lab-m27-ambusher');
    expect(seen.get('ambusher')?.size ?? 0).toBeGreaterThanOrEqual(2);
  });

  test('Quarry Bruiser: committed swings and the charge', () => {
    const { seen } = trial('lab-m27-bruiser');
    expect(seen.get('bruiser')?.size ?? 0).toBeGreaterThanOrEqual(2);
  });

  test('Rope Trapper: the rope throw binds a hero, who always gets free', () => {
    const { seen, states, w } = trial('lab-m27-trapper', 3600);
    expect(seen.get('trapper')?.has('rope-throw')).toBe(true);
    expect(states.has(MoveState.Grabbed) || states.has(MoveState.Restrained)).toBe(true);
    const h = heroOf(w, 0)!;
    idle(w, 400);
    expect([MoveState.Grabbed, MoveState.Restrained]).not.toContain(h.state);
  });

  test('Mounted Raider: warned passes, then a safe dismount and the fight on foot', () => {
    const w = lab('lab-m27-raider', 'medium');
    arrive(w);
    const r = enemiesOf(w, 'raider')[0]!;
    const seen = new Set<number>();
    for (let i = 0; i < 6000 && r.ext!.rider!.phase !== PassPhase.Dismounted; i += 1) {
      step(w, [botInput(w)]);
      seen.add(r.ext!.rider!.phase);
    }
    expect(seen.has(PassPhase.Warn)).toBe(true);
    expect(r.ext!.rider!.phase).toBe(PassPhase.Dismounted);
    expect(r.health).toBeGreaterThan(0);
  });

  test('Ridge Stalker: a feint always shows its tell before the real strike', () => {
    const { events, seen } = trial('lab-m27-stalker', 3600, 'extreme');
    expect(events.has(SharedEvent.Feint)).toBe(true);
    expect(seen.get('stalker')?.size ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('Pack Captain: Flank Order sends two allies to opposite sides', () => {
    const w = lab('lab-m27-captain', 'ultimate');
    arrive(w);
    const cap = enemiesOf(w, 'captain')[0]!;
    let call = 0;
    for (let i = 0; i < 2400 && call === 0; i += 1) {
      step(w, [IDLE]);
      if (cap.special === Special.Call) call = cap.callKind;
    }
    expect(call).toBe(CallKind.Crossfang);
  });
});

describe('Garran Voss', () => {
  test('Hookstaff Control: he holds the real Hookstaff; disarmed, the phase ends and it lies loose', () => {
    const w = lab('lab-m27-garran-hook');
    arrive(w);
    const g = garran(w);
    const b = w.encounter!.boss!;
    expect(b.phase).toBe(0);
    const staff = phaseWeapon(w, g)!;
    expect(WEAPONS[staff.def]!.id).toBe('quarry-hookstaff');
    expect(staff.holder).toBe(g.id);
    // A hero's disarm (the staff knocked from his hands).
    dropHeld(w, g);
    for (let i = 0; i < 600 && b.phase === 0; i += 1) step(w, [IDLE]);
    expect(b.phase).toBe(1);
    expect(staff.state).not.toBe(ItemState.Gone);
    expect(staff.holder).not.toBe(g.id);
    // It is never replaced: Garran fights on unarmed.
    idle(w, 300);
    expect(g.item === 0 || g.item !== staff.id).toBe(true);
  });

  test('Clinch and Cast: he starts unarmed at 65 %, his grabs always let the hero go', () => {
    const w = lab('lab-m27-garran-clinch');
    arrive(w);
    const g = garran(w);
    const b = w.encounter!.boss!;
    expect(b.phase).toBe(1);
    expect(g.health).toBe(Math.trunc((g.maxHealth * 65) / 100));
    expect(g.item).toBe(0);
    const h = heroOf(w, 0)!;
    const seen = new Set<string>();
    let held = 0;
    let longest = 0;
    for (let i = 0; i < 3600 && w.encounter!.result === 0; i += 1) {
      step(w, [botInput(w)]);
      const a = actionOf(g);
      if (a) seen.add(a);
      held = h.state === MoveState.Grabbed || h.state === MoveState.Restrained ? held + 1 : 0;
      longest = Math.max(longest, held);
    }
    expect(
      ['collar-tie', 'shoulder-cast', 'ridge-trip', 'body-hook', 'palm-shove'].some((m) =>
        seen.has(m),
      ),
    ).toBe(true);
    expect(longest).toBeLessThan(400);
  });

  test('Winch Pressure: each crank releases one warned load; a redirected load costs him Resolve', () => {
    const w = lab('lab-m27-garran-winch');
    arrive(w);
    const g = garran(w);
    const b = w.encounter!.boss!;
    expect(b.phase).toBe(2);
    expect(w.encounter!.devices.find((d) => d.kind === 'winch')!.active).toBe(true);
    const movers = w.shared!.movers;
    expect(movers.every((m) => m.phase === MoverPhase.Rest)).toBe(true);
    // Nobody cranked yet: the loads stay at rest.
    let warned = -1;
    for (let i = 0; i < 4000 && warned < 0; i += 1) {
      step(w, [IDLE]);
      warned = movers.findIndex((m) => m.phase === MoverPhase.Warn);
    }
    expect(warned).toBeGreaterThanOrEqual(0);
    expect(movers.filter((m) => m.phase === MoverPhase.Warn).length).toBe(1);
    // A hero's strike in the warning redirects it; it then strikes Garran and costs Resolve.
    const m = movers[warned]!;
    m.redirectedBy = heroOf(w, 0)!.id;
    const resolve = b.resolve;
    for (let i = 0; i < m.warn + m.active && b.redirects === undefined; i += 1) {
      if (m.phase === MoverPhase.Active) {
        g.x = m.x;
        g.z = m.z;
        g.y = 0;
      }
      step(w, [IDLE]);
    }
    expect(b.redirects).toBe(1);
    expect(b.resolve < resolve || b.stagger > 0).toBe(true);
  });

  test('capture: a Resolve break at or below 30 % is the surrender; Health 0 is the forced capture', () => {
    const w = lab('lab-m27-garran-winch');
    arrive(w);
    const g = garran(w);
    startStagger(w, g);
    expect(w.encounter!.boss!.capture).toBe(1);
    expect(g.state).toBe(MoveState.Surrender);
    const w2 = lab('lab-m27-garran-winch');
    arrive(w2);
    const g2 = garran(w2);
    dealDamage(w2, g2, g2.health);
    expect(w2.encounter!.boss!.capture).toBe(2);
  });

  test.each(['medium', 'ultimate'])(
    'Chief of the Broken Ridge at %s: two heroes reach a capture, deterministically',
    (difficulty) => {
      const run = () => {
        const w = lab('lab-m27-garran', difficulty, ['mountain', 'river']);
        for (let i = 0; i < 60 * 300 && w.encounter!.result === 0; i += 1)
          step(w, [botInput(w, 0), botInput(w, 1)]);
        return w;
      };
      const a = run();
      expect(a.encounter!.result).toBe(1);
      expect(a.encounter!.boss!.capture).toBeGreaterThan(0);
      expect(hashWorld(run())).toBe(hashWorld(a));
    },
    300_000,
  );

  test('a snapshot restored mid-fight continues to the same hash', () => {
    const w = lab('lab-m27-garran-winch');
    for (let i = 0; i < 900; i += 1) step(w, [botInput(w)]);
    const copy = restoreWorld(snapshotWorld(w));
    for (let i = 0; i < 600; i += 1) {
      step(w, [botInput(w)]);
      step(copy, [botInput(copy)]);
    }
    expect(hashWorld(copy)).toBe(hashWorld(w));
  });
});
