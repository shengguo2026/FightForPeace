import { Cheat } from '../src/cheats/cheats';
import { WEAPONS, armedKit, weaponIndex } from '../src/combat/armory';
import { DEFENSE } from '../src/combat/defense';
import { claim, letGo, spawnItem } from '../src/combat/held';
import { METER } from '../src/combat/meter';
import { kitOf } from '../src/combat/roster';
import { Reject } from '../src/combat/types';
import { arenaNames } from '../src/enemies/encounter';
import { spawnEnemy } from '../src/enemies/boss';
import { ARENAS, enemyKitIndex } from '../src/enemies/data';
import { ActionBit } from '../src/input/bits';
import { fx } from '../src/math/fixed';
import { restoreWorld, snapshotWorld } from '../src/net/snapshot';
import {
  AssetState,
  GREENHOUSE,
  GRENADIER_ID,
  GhChannel,
  GrenadePhase,
  JetPhase,
  type LedgerAsset,
  ROOMS,
  RackState,
  damageAsset,
  ledgerGrade,
} from '../src/preservation/greenhouse';
import { type FrameInput, ItemState, MoveState, type World } from '../src/world/types';
import { armDummy, createWorld, hashWorld, heroOf, step } from '../src/world/world';

const G = GREENHOUSE!;
const ROOM = ROOMS[0]!;
const idle: FrameInput = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 };
const inp = (o: Partial<FrameInput> = {}): FrameInput => ({ ...idle, ...o });
const press = (bit: number, o: Partial<FrameInput> = {}) => inp({ pressed: bit, held: bit, ...o });
const hold = (bit: number) => inp({ held: bit });

/** The greenhouse room without its waves or grenade drill (tests add what they need). */
function room(
  heroes: string[] = ['river'],
  o: { difficulty?: string; cheats?: { hero: number[]; session: number } } = {},
): World {
  const w = createWorld(7, { greenhouse: ROOM.id, heroes, ...o });
  w.encounter!.start = 1_000_000;
  w.greenhouse!.grenade!.nextAt = 1_000_000;
  step(
    w,
    heroes.map(() => idle),
  );
  return w;
}
function run(w: World, n: number, f: FrameInput | ((i: number) => FrameInput[]) = idle) {
  for (let i = 0; i < n; i += 1) step(w, typeof f === 'function' ? f(i) : [f, f]);
}
const asset = (w: World, name: string): LedgerAsset =>
  w.greenhouse!.assets.find((a) => a.name === name)!;
const hero = (w: World, slot = 0) => heroOf(w, slot)!;
/** Puts a hero at pixel position (x, z), idle and unprotected. */
function place(w: World, x: number, z: number, slot = 0) {
  const h = hero(w, slot);
  h.x = fx(x);
  h.z = fx(z);
  h.state = MoveState.Idle;
  h.stateFrame = 0;
  h.vx = 0;
  h.vz = 0;
  return h;
}
function enemy(w: World, x: number, z: number, kit = 'recruit') {
  const e = spawnEnemy(w, enemyKitIndex(kit), fx(x), fx(z));
  return e;
}
function pickUp(w: World, weapon: string, slot = 0) {
  const h = hero(w, slot);
  const item = spawnItem(w, weaponIndex(weapon), h.x, h.z);
  claim(w, h, item);
  return item;
}

describe('M18 data', () => {
  test('the four Stage 2 weapons and the support rail are in the registry', () => {
    for (const id of [
      'service-lance',
      'six-round-sidearm',
      'support-gun',
      'breaching-grenade',
      'support-rail',
    ])
      expect(WEAPONS.some((w) => w.id === id)).toBe(true);
    // Stage 1 weapons keep their registry indices.
    expect(weaponIndex('workstaff')).toBe(0);
    expect(weaponIndex('handwheel')).toBe(1);
    expect(weaponIndex('timber-board')).toBe(2);
    const gun = WEAPONS[weaponIndex('six-round-sidearm')]!;
    expect(gun.ammo).toBe(6);
    expect(gun.fire.defenseCost).toBeGreaterThan(0);
    expect(gun.actions.some((a) => a.tags.includes('whenEmpty'))).toBe(true);
    expect(WEAPONS[weaponIndex('support-gun')]!.ammo).toBe(24);
  });

  test('the room is loaded with its hidden arena, Ledger assets and fixtures', () => {
    expect(ROOM.arena).toBeGreaterThanOrEqual(0);
    expect(ARENAS[ROOM.arena]!.stage).toBe(true);
    expect(arenaNames().some((a) => a.id === ARENAS[ROOM.arena]!.id)).toBe(false);
    expect(ROOM.assets.some((a) => a.id === 'shutter')).toBe(true);
    expect(ROOM.assets.some((a) => a.id === 'seedlings')).toBe(true);
    expect(G.pantry.map((p) => p.id)).toEqual([
      'greenhouse-wrap',
      'herb-fish-bowl',
      'mineral-broth',
      'honey-rice-cake',
      'harvest-stew',
    ]);
    expect(G.grades[0]!.id).toBe('flourishing');
  });
});

describe('Telescoping Service Lance', () => {
  test('a complete core: standing, aerial, ground, dash, low and throw', () => {
    const lance = WEAPONS[weaponIndex('service-lance')]!;
    const cats = new Set(lance.actions.map((a) => a.category));
    for (const c of ['standing', 'aerial', 'ground', 'dash', 'low', 'weaponThrow'])
      expect(cats.has(c as never)).toBe(true);
    expect(lance.melee).toBe(true);
    const w = room();
    pickUp(w, 'service-lance');
    const kit = kitOf(hero(w))!;
    expect(kit.actions.some((a) => a.id === 'lance-extend')).toBe(true);
    expect(
      armedKit(kitOf({ team: 'hero', hero: hero(w).hero })!, 'x', weaponIndex('service-lance'))
        .actions.length,
    ).toBe(kit.actions.length);
  });

  test('contextual fitting: Interact with the lance rights a toppled rack at once', () => {
    const w = room();
    w.greenhouse!.rack!.state = RackState.Toppled;
    pickUp(w, 'service-lance');
    place(w, ROOM.rack!.x / 256 + 40, ROOM.rack!.z / 256 + 20);
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(w.greenhouse!.rack!.state).toBe(RackState.Secure);
    expect(w.greenhouse!.record.fits).toBe(1);
    // The lance stays in the hands (no throw).
    expect(hero(w).item).not.toBe(0);
  });
});

describe('Six-Round Sidearm', () => {
  function armed() {
    const w = room();
    place(w, 600, 800);
    const item = pickUp(w, 'six-round-sidearm');
    return { w, item, h: hero(w) };
  }
  const fire = (w: World) => {
    for (let i = 0; i < 120 && hero(w).state !== MoveState.Idle; i += 1) step(w, [idle]);
    step(w, [press(ActionBit.Attack)]);
  };

  test('a shot spends one round and Defense, shows a warned line and commits', () => {
    const { w, item, h } = armed();
    const before = h.defense;
    fire(w);
    expect(item.ammo).toBe(5);
    expect(h.defense).toBe(before - WEAPONS[item.def]!.fire.defenseCost);
    const a = kitOf(h)!.actions[h.action]!;
    expect(a.id).toBe('sidearm-shot');
    expect(a.tags).toContain('warnedLine');
    expect(a.startup).toBeGreaterThanOrEqual(20);
    expect(a.links).toHaveLength(0);
  });

  test('without enough Defense the shot is refused', () => {
    const { w, item, h } = armed();
    h.defense = 5;
    fire(w);
    expect(h.verdictReject).toBe(Reject.NoDefense);
    expect(item.ammo).toBe(6);
  });

  test('six rounds, no reload; empty, the same input is the pistol whip', () => {
    const { w, item, h } = armed();
    for (let i = 0; i < 6; i += 1) {
      h.defense = DEFENSE.max;
      fire(w);
    }
    expect(item.ammo).toBe(0);
    fire(w);
    expect(kitOf(h)!.actions[h.action]!.id).toBe('sidearm-whip');
    expect(item.ammo).toBe(0);
  });

  test('rounds stay with the weapon: drop and pick up keeps the exact count', () => {
    const { w, item, h } = armed();
    fire(w);
    run(w, 60, () => [idle]);
    letGo(h, item);
    item.state = ItemState.Ground;
    item.y = 0;
    run(w, 50, () => [idle]);
    const p2 = place(w, item.x / 256, item.z / 256);
    run(w, 1, () => [press(ActionBit.Interact)]);
    run(w, 20, () => [idle]);
    expect(p2.item).toBe(item.id);
    expect(item.ammo).toBe(5);
  });
});

describe('Burst-Command Support Gun', () => {
  test('the armed dummy fires bursts of three rounds with recoil; the rest transfers on a disarm', () => {
    const w = createWorld(3, { dummies: 1, trainer: { attackers: 1, interval: 40 } });
    step(w, [idle]);
    armDummy(w, weaponIndex('support-gun'));
    const d = w.bodies.find((b) => b.team === 'enemy')!;
    const item = w.items.find((i) => i.id === d.item)!;
    const h = heroOf(w, 0)!;
    h.x = d.x - fx(400);
    h.z = d.z;
    let fired = false;
    let x0 = 0;
    let pushed = false;
    for (let i = 0; i < 400 && item.ammo > 18; i += 1) {
      step(w, [idle]);
      const a = kitOf(d)?.actions[d.action];
      if (d.state === MoveState.Attack && a?.id === 'support-burst') {
        if (!fired) {
          fired = true;
          x0 = d.x;
        } else if (d.x !== x0) pushed = true;
      }
    }
    expect(fired).toBe(true);
    expect(item.ammo).toBe(18);
    expect(pushed).toBe(true);
    // Disarmed: exactly the rounds it has left change hands.
    letGo(d, item);
    item.state = ItemState.Ground;
    item.y = 0;
    item.x = h.x;
    item.z = h.z;
    claim(w, h, item);
    expect(item.ammo).toBe(18);
  });

  test('empty, the shot input becomes the stock strike', () => {
    const w = room();
    place(w, 600, 800);
    const item = pickUp(w, 'support-gun');
    item.ammo = 2;
    step(w, [press(ActionBit.Attack)]);
    expect(kitOf(hero(w))!.actions[hero(w).action]!.id).toBe('support-stock');
  });
});

describe('Breaching grenade drill', () => {
  function drill(heroes = ['river']) {
    const w = room(heroes);
    place(w, 900, 760);
    w.greenhouse!.grenade!.nextAt = w.frame + 1;
    return w;
  }

  test('remove, arm, aim and release are visible steps; the blast resets the drill', () => {
    const w = drill();
    const seen: number[] = [];
    let fuseSeen = 0;
    for (let i = 0; i < 600 && w.greenhouse!.record.blasts === 0; i += 1) {
      step(w, [idle]);
      const g = w.greenhouse!.grenade!;
      if (seen.at(-1) !== g.phase) seen.push(g.phase);
      if (g.armed) fuseSeen = Math.max(fuseSeen, g.fuse);
    }
    expect(seen.slice(1, 7)).toEqual([
      GrenadePhase.Remove,
      GrenadePhase.Arm,
      GrenadePhase.Aim,
      GrenadePhase.Lob,
      GrenadePhase.Out,
      GrenadePhase.Wait,
    ]);
    expect(fuseSeen).toBeLessThanOrEqual(G.grenade.fuse);
    expect(w.greenhouse!.record.blasts).toBe(1);
  });

  test('a hit before arming drops an unarmed grenade; a hero secures it', () => {
    const w = drill();
    run(w, 3, () => [idle]);
    expect(w.greenhouse!.grenade!.phase).toBe(GrenadePhase.Remove);
    const t = w.bodies.find((b) => b.id === GRENADIER_ID)!;
    t.state = MoveState.Hitstun;
    t.stun = 20;
    step(w, [idle]);
    const g = w.greenhouse!.grenade!;
    expect(g.phase).toBe(GrenadePhase.Out);
    expect(g.armed).toBe(false);
    const item = w.items.find((i) => i.id === g.item)!;
    place(w, item.x / 256, item.z / 256);
    run(w, 1, () => [press(ActionBit.Interact)]);
    run(w, 5, () => [idle]);
    expect(w.greenhouse!.record.secured).toBe(1);
    expect(item.state).toBe(ItemState.Gone);
    run(w, 600, () => [idle]);
    expect(w.greenhouse!.record.blasts).toBe(0);
  });

  test('a live grenade can be picked up and returned; the fuse never resets', () => {
    const w = drill();
    for (let i = 0; i < 400 && w.greenhouse!.grenade!.phase !== GrenadePhase.Out; i += 1)
      step(w, [idle]);
    const g = w.greenhouse!.grenade!;
    expect(g.armed).toBe(true);
    const item = w.items.find((i) => i.id === g.item)!;
    const h = place(w, item.x / 256, item.z / 256);
    h.facing = 1;
    const fuse = g.fuse;
    run(w, 1, () => [press(ActionBit.Interact)]);
    run(w, 10, () => [idle]);
    expect(h.item).toBe(item.id);
    expect(g.fuse).toBeLessThan(fuse);
    run(w, 1, () => [press(ActionBit.Interact, { moveX: 1 })]);
    run(w, 12, () => [idle]);
    expect(w.greenhouse!.record.returned).toBe(1);
    for (let i = 0; i < 400 && w.greenhouse!.record.blasts === 0; i += 1) step(w, [idle]);
    expect(w.greenhouse!.record.blasts).toBe(1);
  });

  test('the blast is bounded: essentials stop at Safe fallback, never Lost', () => {
    const w = drill();
    const pump = asset(w, 'pump');
    pump.condition = 5;
    // Lay a live grenade beside the pump with one frame of fuse left.
    const g = w.greenhouse!.grenade!;
    const item = spawnItem(w, weaponIndex('breaching-grenade'), pump.x, pump.z + fx(30));
    g.item = item.id;
    g.phase = GrenadePhase.Out;
    g.armed = true;
    g.fuse = 1;
    step(w, [idle]);
    expect(w.greenhouse!.record.blasts).toBe(1);
    expect(pump.state).toBe(AssetState.Fallback);
    for (const a of w.greenhouse!.assets) expect(a.damage).toBeLessThanOrEqual(G.rules.maxHit);
  });
});

describe('Layered Pantry', () => {
  test('a hurt hero eats Health food scaled by the difficulty; a full hero leaves it', () => {
    const w = room(['river'], { difficulty: 'hard' });
    const p = w.greenhouse!.pantry[0]!;
    const h = place(w, p.x / 256, p.z / 256);
    run(w, 3, () => [idle]);
    expect(p.taken).toBe(false);
    h.health = 100;
    step(w, [idle]);
    expect(p.taken).toBe(true);
    expect(h.health).toBeGreaterThan(100);
    expect(h.health).toBeLessThan(100 + G.pantry[p.item]!.health);
  });

  test('Defense and Attack Bar items clamp to the maximum', () => {
    const w = room();
    const h = hero(w);
    const gh = w.greenhouse!;
    gh.pantry.push({ id: 900, item: 2, x: h.x, z: h.z, taken: false, by: 0 });
    gh.pantry.push({ id: 901, item: 3, x: h.x, z: h.z, taken: false, by: 0 });
    h.defense = DEFENSE.max - 5;
    h.meter = METER.max - 10;
    step(w, [idle]);
    expect(h.defense).toBe(DEFENSE.max);
    expect(h.meter).toBe(METER.max);
  });

  test('FULLPANTRY adds one copy of the first loose item', () => {
    const plain = room();
    const extra = room(['river'], { cheats: { hero: [0, 0], session: Cheat.FULLPANTRY } });
    expect(extra.greenhouse!.pantry.length).toBe(plain.greenhouse!.pantry.length + 1);
  });
});

describe('ownership-aware containers', () => {
  const at = (w: World, kind: string) =>
    w.greenhouse!.containers.find((c) => G.containers[c.kind]!.id === kind)!;

  test('a protected container opens with Interact and spawns its contents once', () => {
    const w = room();
    const c = at(w, 'maintenance-locker');
    place(w, c.x / 256 + 40, c.z / 256 + 40);
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(c.opened).toBe(true);
    expect(w.items.some((i) => WEAPONS[i.def]!.id === 'service-lance')).toBe(true);
    run(w, 40, () => [idle]);
    const n = w.items.length;
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(w.items.filter((i) => WEAPONS[i.def]!.id === 'service-lance')).toHaveLength(1);
    expect(w.items.length).toBeGreaterThanOrEqual(n);
  });

  test("heroes' strikes never open protected property; hostile cases break open", () => {
    const w = room();
    const tote = at(w, 'harvest-tote');
    const h = place(w, tote.x / 256 - 80, tote.z / 256);
    h.facing = 1;
    for (let i = 0; i < 8; i += 1) {
      run(w, 1, () => [press(ActionBit.Attack)]);
      run(w, 30, () => [idle]);
    }
    expect(tote.opened).toBe(false);
    const caseC = at(w, 'raider-case');
    const h2 = place(w, caseC.x / 256 - 80, caseC.z / 256);
    h2.facing = 1;
    for (let i = 0; i < 12 && !caseC.opened; i += 1) {
      run(w, 1, () => [press(ActionBit.Attack)]);
      run(w, 30, () => [idle]);
    }
    expect(caseC.opened).toBe(true);
    expect(w.items.some((i) => WEAPONS[i.def]!.id === 'six-round-sidearm')).toBe(true);
    expect(w.greenhouse!.record.broken).toBe(1);
  });
});

describe('Preservation Ledger', () => {
  test('damage is bounded per event and guarded for a moment', () => {
    const w = room();
    const bed = asset(w, 'bed-west');
    expect(damageAsset(w, bed, 999)).toBe(G.rules.maxHit);
    expect(damageAsset(w, bed, 10)).toBe(0);
    run(w, G.rules.guard, () => [idle]);
    expect(damageAsset(w, bed, 10)).toBe(10);
    expect(bed.state).toBe(AssetState.Damaged);
  });

  test('holding Interact repairs a damaged asset step by step', () => {
    const w = room();
    const bed = asset(w, 'bed-west');
    bed.condition = 40;
    bed.state = AssetState.Damaged;
    place(w, bed.x / 256, bed.z / 256 - 40);
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(hero(w).state).toBe(MoveState.Channel);
    expect(w.greenhouse!.channel[0]!.kind).toBe(GhChannel.Repair);
    run(w, 400, () => [hold(ActionBit.Interact)]);
    expect(bed.condition).toBe(100);
    expect(bed.state).toBe(AssetState.Sound);
    expect(w.greenhouse!.record.repairs).toBe(1);
  });

  test('releasing Interact stops the repair', () => {
    const w = room();
    const bed = asset(w, 'bed-west');
    bed.condition = 40;
    place(w, bed.x / 256, bed.z / 256 - 40);
    run(w, 1, () => [press(ActionBit.Interact)]);
    run(w, 30, () => [hold(ActionBit.Interact)]);
    const c = bed.condition;
    run(w, 60, () => [idle]);
    expect(bed.condition).toBe(c);
    expect(hero(w).state).toBe(MoveState.Idle);
  });

  test('essential systems fall back safely and can be repaired; a lost crop cannot', () => {
    const w = room();
    const pump = asset(w, 'pump');
    for (let i = 0; i < 10; i += 1) {
      pump.guardUntil = 0;
      damageAsset(w, pump, 999);
    }
    expect(pump.state).toBe(AssetState.Fallback);
    const bed = asset(w, 'bed-east');
    for (let i = 0; i < 10; i += 1) {
      bed.guardUntil = 0;
      damageAsset(w, bed, 999);
    }
    expect(bed.state).toBe(AssetState.Lost);
    place(w, bed.x / 256, bed.z / 256 - 40);
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(hero(w).state).not.toBe(MoveState.Channel);
  });

  test('with the pump down aquatic assets drain to a floor; the redirect stabilises them', () => {
    const w = room();
    const pump = asset(w, 'pump');
    pump.condition = 0;
    pump.state = AssetState.Fallback;
    const fish = asset(w, 'fish');
    run(w, G.rules.drain.every * 200, () => [idle]);
    const k = G.ledger[fish.kind]!;
    expect(fish.condition * 100).toBeLessThanOrEqual(k.condition * G.rules.drain.floor + 100);
    expect(fish.condition).toBeGreaterThan(0);
    expect(fish.state).not.toBe(AssetState.Lost);
  });

  test('grades: untouched is Flourishing; heavy losses fall through the bands', () => {
    const w = room();
    expect(ledgerGrade(w.greenhouse!).grade).toBe('flourishing');
    for (const a of w.greenhouse!.assets) a.condition = Math.trunc(G.ledger[a.kind]!.condition / 2);
    expect(ledgerGrade(w.greenhouse!).grade).toBe('strained');
  });
});

describe('environmental pieces', () => {
  test('an impact on the loading shutter dents its asset', () => {
    const w = room();
    const s = w.environment.surfaces.find((x) => x.id === w.greenhouse!.shutterId)!;
    expect(s).toBeDefined();
    s.impacts += 1;
    step(w, [idle]);
    expect(asset(w, 'shutter').condition).toBeLessThan(
      G.ledger[asset(w, 'shutter').kind]!.condition,
    );
  });

  test('the rack loosens, topples onto enemies, drops its rail once, and is righted by holding', () => {
    const w = room();
    const r = ROOM.rack!;
    const e = enemy(w, r.x / 256 + 100, r.z / 256);
    const seed = asset(w, 'seedlings');
    // Nearly toppled already; a body knocked into the rack finishes it.
    w.greenhouse!.rack!.power = r.topple - 5;
    const t = enemy(w, r.x / 256, r.z / 256);
    t.state = MoveState.Launched;
    t.vx = fx(6);
    t.y = 10;
    t.vy = fx(1);
    step(w, [idle]);
    expect(w.greenhouse!.rack!.state).toBe(RackState.Toppled);
    expect(e.state).toBe(MoveState.Launched);
    expect(seed.condition).toBeLessThan(G.ledger[seed.kind]!.condition);
    expect(w.items.filter((i) => WEAPONS[i.def]!.id === 'support-rail')).toHaveLength(1);
    // The enemies leave; clear of the fallen rail (an Interact next to it would pick it up first).
    w.bodies = w.bodies.filter((b) => b.team === 'hero');
    place(w, r.x / 256 - 40, r.z / 256 + 20);
    run(w, 1, () => [press(ActionBit.Interact)]);
    run(w, r.right + 2, () => [hold(ActionBit.Interact)]);
    expect(w.greenhouse!.rack!.state).toBe(RackState.Secure);
    expect(w.greenhouse!.record.rights).toBe(1);
  });

  test('the purge jet warns, then pushes everyone in its lane; only enemies are hurt', () => {
    const w = room();
    const j = ROOM.jet!;
    const lane = j.lanes[0]!;
    const e = enemy(w, 1300, (lane.z0 + lane.z1) / 2 / 256);
    const hp = e.health;
    place(w, j.x / 256, j.z / 256 + 30);
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(w.greenhouse!.jet!.phase).toBe(JetPhase.Warn);
    run(w, j.warn - 2, () => [idle]);
    // The enemy stands in the lane as the jet fires.
    e.x = fx(1300);
    e.z = Math.trunc((lane.z0 + lane.z1) / 2);
    e.state = MoveState.Idle;
    run(w, 5, () => [idle]);
    expect(w.greenhouse!.record.purges).toBe(1);
    expect(e.health).toBeLessThan(hp);
    expect(e.vx).toBeGreaterThan(0);
    run(w, j.active + 1, () => [idle]);
    expect(w.greenhouse!.jet!.phase).toBe(JetPhase.Cooldown);
  });

  test('the redirect: one hero needs the solo time, two heroes the cooperative time', () => {
    const rd = ROOM.redirect!;
    const solo = room();
    place(solo, rd.x / 256, rd.z / 256 + 30);
    run(solo, 1, () => [press(ActionBit.Interact)]);
    run(solo, rd.coop + 5, () => [hold(ActionBit.Interact)]);
    expect(solo.greenhouse!.record.redirects).toBe(0);
    run(solo, rd.solo, () => [hold(ActionBit.Interact)]);
    expect(solo.greenhouse!.record.redirects).toBe(1);
    expect(solo.greenhouse!.jet!.lane).toBe(1);
    expect(solo.greenhouse!.stableUntil).toBeGreaterThan(solo.frame);

    const duo = room(['river', 'wind']);
    place(duo, rd.x / 256 - 20, rd.z / 256 + 30, 0);
    place(duo, rd.x / 256 + 20, rd.z / 256 + 30, 1);
    run(duo, 1, () => [press(ActionBit.Interact), press(ActionBit.Interact)]);
    run(duo, rd.coop + 2, () => [hold(ActionBit.Interact), hold(ActionBit.Interact)]);
    expect(duo.greenhouse!.record.coopRedirects).toBe(1);
  });

  test('the cargo restraint lashes an enemy in the bay, then needs re-lashing', () => {
    const w = room();
    const r = ROOM.restraint!;
    const e = enemy(w, r.zx / 256, r.zz / 256);
    place(w, r.x / 256, r.z / 256 - 10);
    run(w, 1, () => [press(ActionBit.Interact)]);
    expect(w.greenhouse!.record.lashes).toBe(1);
    expect(e.state).toBe(MoveState.Hitstun);
    const x = e.x;
    run(w, 60, () => [idle]);
    expect(e.x).toBe(x);
    run(w, r.frames, () => [idle]);
    expect(w.greenhouse!.restraint!.target).toBe(0);
    run(w, 30, () => [press(ActionBit.Interact)]);
    expect(w.greenhouse!.record.lashes).toBe(1);
  });
});

describe('determinism', () => {
  test('the same inputs give the same hash; a snapshot continues identically', () => {
    const make = () => createWorld(11, { greenhouse: ROOM.id, heroes: ['wind', 'fire'] });
    const a = make();
    const b = make();
    const f = (i: number) => [
      inp({ moveX: i % 200 < 100 ? 1 : -1, pressed: i % 23 === 0 ? ActionBit.Attack : 0 }),
      inp({ moveZ: i % 90 < 45 ? 1 : -1, pressed: i % 31 === 0 ? ActionBit.Interact : 0 }),
    ];
    run(a, 900, f);
    run(b, 900, f);
    expect(hashWorld(a)).toBe(hashWorld(b));
    const c = restoreWorld(snapshotWorld(a));
    for (let i = 900; i < 1500; i += 1) {
      step(a, f(i));
      step(c, f(i));
    }
    expect(hashWorld(c)).toBe(hashWorld(a));
    expect(c.greenhouse).toEqual(a.greenhouse);
  });
});
