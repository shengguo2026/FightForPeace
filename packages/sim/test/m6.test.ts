import { WEAPONS, armedKit, registerWeapon, weaponIndex } from '../src/combat/armory';
import { CLASH, resolveClashes } from '../src/combat/clash';
import { HAZARD, addBreakPower, correctedRest, validRest } from '../src/combat/environment';
import { ITEM, heldItem, spawnItem } from '../src/combat/held';
import { pickupEligible } from '../src/combat/items';
import { HEROES, baseKit, kitOf } from '../src/combat/roster';
import { Reject, type WeaponDef } from '../src/combat/types';
import { startAction } from '../src/combat/actions';
import { fx } from '../src/math/fixed';
import {
  BreakState,
  DefEvent,
  EnvEvent,
  type Fighter,
  type FrameInput,
  HazardPhase,
  type Item,
  ItemState,
  MoveState,
  WeaponEvent,
  type World,
} from '../src/world/types';
import {
  DUMMY_ID_BASE,
  armDummy,
  createWorld,
  hashWorld,
  resetEnvironment,
  step,
  type WorldOptions,
} from '../src/world/world';
import { dummyOf } from './bot';
import { hero, idle, inp, press, run } from './helpers';

const STAFF = weaponIndex('workstaff');
const WHEEL = weaponIndex('handwheel');
const BOARD = weaponIndex('timber-board');

const LAB: WorldOptions = { armory: true, environment: true };

function lab(options: WorldOptions = {}): World {
  return createWorld(1, { dummies: 1, heroes: ['mountain', 'river'], ...LAB, ...options });
}

/** Steps idle frames until `cond` holds (at most `limit`). */
function until(w: World, cond: () => boolean, limit = 240, input: FrameInput = idle): void {
  for (let i = 0; i < limit && !cond(); i += 1) step(w, [input]);
  if (!cond()) throw new Error('condition never held');
}

function itemOf(w: World, def: number): Item {
  const i = w.items.find((x) => x.def === def);
  if (!i) throw new Error(`no item ${def}`);
  return i;
}

/** Puts hero 1 next to an item and presses Interact; returns the item. */
function pickUp(w: World, def: number): Item {
  const h = hero(w);
  const item = itemOf(w, def);
  h.x = item.x - fx(30);
  h.z = item.z;
  h.facing = 1;
  run(w, [press('Interact')]);
  until(w, () => h.state === MoveState.Idle);
  return item;
}

/** Hero 1 `gap` px left of Dummy 1, both on the dummy's spot. */
function face(w: World, gap = 120): { h: Fighter; d: Fighter } {
  const h = hero(w);
  const d = dummyOf(w);
  h.x = d.x - fx(gap);
  h.z = d.z;
  h.facing = 1;
  d.facing = -1;
  return { h, d };
}

const actionId = (f: Fighter) => kitOf(f)?.actions[f.action]?.id;

describe('weapon data and the armed kit', () => {
  test('Stage 1 weapons load with their lifecycle numbers', () => {
    const staff = WEAPONS[STAFF]!;
    expect(staff.hands).toBe(2);
    expect(staff.melee).toBe(true);
    expect(staff.integrity.max).toBe(120);
    expect(staff.gripResistance).toBe(40);
    const wheel = WEAPONS[WHEEL]!;
    expect(wheel.hands).toBe(1);
    expect(wheel.throw.counterReturnable).toBe(true);
    // Catching is carried forward past M6.
    expect(wheel.throw.catchable).toBe(false);
    expect(WEAPONS[BOARD]!.debris).toBe('long');
  });

  test('the armed kit keeps every own action index and appends the core', () => {
    const base = HEROES[0]!;
    const kit = armedKit(base, 'hero:0', STAFF);
    expect(kit.actions.length).toBe(base.actions.length + WEAPONS[STAFF]!.actions.length);
    base.actions.forEach((a, i) => expect(kit.actions[i]!.id).toBe(a.id));
    // A melee core replaces the Attack graph: no own action answers neutral Attack.
    const replaced = ['neutral', 'chain', 'air', 'groundFocus', 'dash', 'dashLow'];
    const own = kit.actions.slice(0, base.actions.length);
    expect(own.some((a) => replaced.includes(a.context))).toBe(false);
  });

  test('hero affinity replaces one branch: Mountain braces, River vaults', () => {
    const m = armedKit(HEROES[0]!, 'hero:0', STAFF);
    const r = armedKit(HEROES[1]!, 'hero:1', STAFF);
    expect(m.actions.some((a) => a.id === 'weir-brace')).toBe(true);
    expect(m.actions.some((a) => a.id === 'staff-lunge')).toBe(false);
    expect(r.actions.some((a) => a.id === 'vault-kick')).toBe(true);
    expect(r.actions.find((a) => a.id === 'vault-kick')!.tags).toContain('sideSwitch');
  });
});

describe('weapon lifecycle', () => {
  test('Interact next to a weapon picks it up; Attack then uses the core', () => {
    const w = lab();
    const item = pickUp(w, STAFF);
    const h = hero(w);
    expect(item.state).toBe(ItemState.Held);
    expect(h.item).toBe(item.id);
    expect(h.wkit).toBe(STAFF);
    expect(h.weaponEvent).toBe(WeaponEvent.Pickup);
    run(w, [press('Attack')]);
    expect(actionId(h)).toBe('staff-thrust');
  });

  test('pickups are explicit: walking over a weapon never takes it', () => {
    const w = lab();
    const h = hero(w);
    const item = itemOf(w, STAFF);
    h.x = item.x - fx(200);
    h.z = item.z;
    run(w, Array.from({ length: 60 }, () => inp({ moveX: 1 })));
    expect(item.state).toBe(ItemState.Ground);
    expect(h.item).toBe(0);
  });

  test('a contested pickup is decided by distance, then depth, never by player number', () => {
    const w = lab();
    step(w, [idle, idle]);
    const p1 = hero(w, 0);
    const p2 = hero(w, 1);
    const item = itemOf(w, STAFF);
    p1.x = item.x - fx(50);
    p1.z = item.z;
    p2.x = item.x + fx(20);
    p2.z = item.z;
    step(w, [press('Interact'), press('Interact')]);
    until(w, () => p1.state === MoveState.Idle && p2.state === MoveState.Idle);
    expect(item.holder).toBe(p2.id);
    expect(p1.weaponEvent).toBe(WeaponEvent.Contested);
    expect(p1.item).toBe(0);
  });

  test('integrity drops per contact and the weapon breaks only after the action resolves', () => {
    const w = lab();
    const item = pickUp(w, STAFF);
    const { h } = face(w, 110);
    item.integrity = 6;
    run(w, [press('Attack')]);
    until(w, () => h.breakPending, 30);
    // Contact emptied it, but the thrust finishes with the staff in hand.
    expect(item.integrity).toBe(0);
    expect(h.state).toBe(MoveState.Attack);
    expect(heldItem(w, h)).toBeDefined();
    until(w, () => h.state !== MoveState.Attack, 60);
    step(w, [idle]);
    expect(h.item).toBe(0);
    expect(h.wkit).toBe(-1);
    expect(w.items.some((i) => i.id === item.id)).toBe(false);
    expect(h.weaponEvent).toBe(WeaponEvent.Break);
  });

  test('a thrown Handwheel hits once, drops and rests as a pickup again', () => {
    const w = lab();
    const item = pickUp(w, WHEEL);
    const { h, d } = face(w, 380);
    const hp = d.health;
    run(w, [press('Interact')]);
    until(w, () => item.state === ItemState.Flying, 30);
    expect(h.weaponEvent).toBe(WeaponEvent.Throw);
    expect(h.item).toBe(0);
    until(w, () => d.health < hp, 60);
    until(w, () => item.state === ItemState.Ground, 120);
    expect(item.holder).toBe(0);
    expect(item.integrity).toBe(WEAPONS[WHEEL]!.integrity.max - WEAPONS[WHEEL]!.integrity.throw);
  });

  test('Down + Interact discards the weapon at the feet', () => {
    const w = lab();
    const item = pickUp(w, STAFF);
    const h = hero(w);
    run(w, [press('Interact', { moveZ: 1 })]);
    expect(h.item).toBe(0);
    expect(h.weaponEvent).toBe(WeaponEvent.Discard);
    until(w, () => item.state === ItemState.Ground, 90);
    expect(Math.abs(item.x - h.x)).toBeLessThan(fx(60));
  });

  test('landing inside scenery is corrected to the first legal spot, deterministically', () => {
    const w = lab();
    const pillar = w.environment.surfaces[0]!;
    expect(validRest(w, pillar.x, pillar.z)).toBe(false);
    const c = correctedRest(w, pillar.x, pillar.z)!;
    expect(c).not.toBeNull();
    expect(validRest(w, c.x, c.z)).toBe(true);
    expect(correctedRest(w, pillar.x, pillar.z)).toEqual(c);
    // Drop an item on top of the pillar's footprint: it settles at that spot.
    const item = spawnItem(w, WHEEL, pillar.x, pillar.z);
    item.state = ItemState.Flying;
    item.y = fx(400);
    until(w, () => item.state === ItemState.Ground, 200);
    expect([item.x, item.z]).toEqual([c.x, c.z]);
    expect(w.environment.log.kind).toBe(EnvEvent.Corrected);
  });
});

describe('disarm and reclaim', () => {
  test('a disarming hit knocks the weapon away; its holder has Short Reclaim Priority', () => {
    const w = lab({ trainer: { attackers: 1, pattern: 8, interval: 1, approach: true } });
    const item = pickUp(w, STAFF);
    const { h, d } = face(w, 110);
    expect(baseKit(d)!.actions[8]!.id).toBe('disarming-swipe');
    until(w, () => h.weaponEvent === WeaponEvent.Disarmed, 200);
    expect(h.item).toBe(0);
    expect(item.disarmed || item.state !== ItemState.Held).toBe(true);
    until(w, () => item.state === ItemState.Ground, 120);
    expect(item.reserveFor).toBe(h.id);
    expect(item.reserveUntil - w.frame).toBeLessThanOrEqual(ITEM.reclaim);
    // Nobody else may take it inside the window; afterwards anyone may.
    expect(pickupEligible(w, d, item)).toBe(false);
    expect(pickupEligible(w, h, item)).toBe(true);
    w.frame = item.reserveUntil;
    expect(pickupEligible(w, d, item)).toBe(true);
  });

  test('a grip that resists the disarmPower keeps the weapon', () => {
    const w = lab();
    const item = pickUp(w, STAFF);
    const h = hero(w);
    const d = dummyOf(w);
    // The jab carries no disarmPower.
    face(w, 90);
    d.facing = -1;
    startAction(d, 0);
    until(w, () => h.state === MoveState.Hitstun || h.state === MoveState.Launched, 40);
    expect(h.item).toBe(item.id);
  });

  test('an armed dummy fights with the staff core and walks back to reclaim it', () => {
    const w = lab({ trainer: { attackers: 1, interval: 20, approach: true, arm: STAFF } });
    const d = dummyOf(w, DUMMY_ID_BASE);
    expect(d.wkit).toBe(STAFF);
    face(w, 200);
    until(w, () => d.state === MoveState.Attack, 200);
    expect(actionId(d)?.startsWith('staff-')).toBe(true);
    armDummy(w, -1);
    expect(d.item).toBe(0);
  });
});

describe('clashes', () => {
  test('equal strength: both recoil; neither hits', () => {
    const w = lab();
    pickUp(w, STAFF);
    armDummy(w, STAFF);
    const { h, d } = face(w, 200);
    const hp = [h.health, d.health];
    const thrust = kitOf(h)!.actions.findIndex((a) => a.id === 'staff-thrust');
    const dThrust = kitOf(d)!.actions.findIndex((a) => a.id === 'staff-thrust');
    startAction(h, thrust);
    startAction(d, dThrust);
    until(w, () => h.state === MoveState.Recoil, 20);
    expect(d.state).toBe(MoveState.Recoil);
    expect(h.weaponEvent).toBe(WeaponEvent.Clash);
    expect([h.health, d.health]).toEqual(hp);
    expect(h.stun).toBe(CLASH.recoil);
    // Both weapons pay the clash cost.
    expect(heldItem(w, h)!.integrity).toBe(120 - WEAPONS[STAFF]!.integrity.clash);
    expect(heldItem(w, d)!.integrity).toBe(120 - WEAPONS[STAFF]!.integrity.clash);
  });

  test('the stronger clash continues and the weaker recoils', () => {
    const w = lab();
    pickUp(w, STAFF);
    armDummy(w, STAFF);
    const { h, d } = face(w, 200);
    const sweep = kitOf(h)!.actions.findIndex((a) => a.id === 'staff-sweep');
    const thrust = kitOf(d)!.actions.findIndex((a) => a.id === 'staff-thrust');
    // Line the active frames up: the sweep starts up two frames slower than the thrust.
    startAction(h, sweep);
    run(w, [idle, idle]);
    startAction(d, thrust);
    until(w, () => d.state === MoveState.Recoil, 20);
    expect(h.state).toBe(MoveState.Attack);
    resolveClashes(w); // the same pair never clashes twice
    expect(h.state).toBe(MoveState.Attack);
  });
});

describe('thrown-weapon responses', () => {
  function throwAt(w: World, gap: number): { h: Fighter; d: Fighter; item: Item } {
    // The dummy throws the Handwheel at the hero.
    armDummy(w, WHEEL);
    const d = dummyOf(w);
    const h = hero(w);
    h.x = d.x - fx(gap);
    h.z = d.z;
    h.facing = 1;
    d.facing = -1;
    const index = kitOf(d)!.actions.findIndex((a) => a.category === 'weaponThrow');
    startAction(d, index);
    return { h, d, item: heldItem(w, d)! };
  }

  test('a normal guard blocks it and it drops', () => {
    const w = lab();
    const { h, item } = throwAt(w, 400);
    const hp = h.health;
    run(w, [press('Guard', { held: 8 })]);
    until(w, () => h.weaponEvent === WeaponEvent.Blocked, 90, inp({ held: 8 }));
    expect(h.defEvent).toBe(DefEvent.Guard);
    // Guarded: at most chip damage, no combo.
    expect(hp - h.health).toBeLessThan(20);
    expect(h.state).toBe(MoveState.Blockstun);
    until(w, () => item.state === ItemState.Ground, 120, inp({ held: 8 }));
  });

  test('an Exact Block deflects it to a neutral landing', () => {
    // Find the contact frame with a held guard, then press Guard two frames before it.
    const probe = lab();
    const p = throwAt(probe, 400);
    let contact = 0;
    while (p.h.weaponEvent === 0 && contact < 120) {
      step(probe, [inp({ held: 8 })]);
      contact += 1;
    }
    const w = lab();
    const { h, d, item } = throwAt(w, 400);
    run(w, Array.from({ length: contact - 3 }, () => idle));
    run(w, [press('Guard', { held: 8 }), inp({ held: 8 }), inp({ held: 8 })]);
    expect(h.weaponEvent).toBe(WeaponEvent.Deflect);
    expect(h.defEvent).toBe(DefEvent.Exact);
    expect(item.owner).toBe(0);
    // The deflected weapon never damages the distant thrower.
    const dhp = d.health;
    until(w, () => item.state === ItemState.Ground, 120);
    expect(d.health).toBe(dhp);
  });

  test('a counter returns a counterReturnable weapon as the hero\'s own attack', () => {
    const probe = lab();
    const p = throwAt(probe, 400);
    let contact = 0;
    while (p.h.weaponEvent === 0 && contact < 120) {
      step(probe, [inp({ held: 8 })]);
      contact += 1;
    }
    const w = lab();
    const { h, d, item } = throwAt(w, 400);
    run(w, Array.from({ length: contact - 3 }, () => idle));
    // Counter towards the thrower (Guard + direction chord, set directly here).
    h.state = MoveState.Counter;
    h.stateFrame = 0;
    h.counterFrame = w.frame;
    h.counterX = 1;
    h.counterZ = 0;
    run(w, [idle, idle, idle]);
    expect(h.weaponEvent).toBe(WeaponEvent.Return);
    expect(h.defEvent).toBe(DefEvent.Counter);
    expect(item.owner).toBe(h.id);
    expect(item.vx).toBeGreaterThan(0);
    const dhp = d.health;
    until(w, () => d.health < dhp, 90);
  });

  test('an unguarded hero takes the hit', () => {
    const w = lab();
    const { h } = throwAt(w, 400);
    const hp = h.health;
    until(w, () => h.health < hp, 90);
    expect(h.ctx.open).toBe(true);
  });
});

describe('guardrails (weapon state carries owner, integrity and finite ammo)', () => {
  test('a two-handed weapon blocks Specials unless the move is marked unchanged', () => {
    const w = lab();
    pickUp(w, STAFF);
    const h = hero(w);
    run(w, [press('Special')]);
    expect(h.verdictReject).toBe(Reject.HandsFull);
    expect(h.state).not.toBe(MoveState.Attack);
  });

  test('a one-handed weapon leaves Specials available', () => {
    const w = lab();
    pickUp(w, WHEEL);
    const h = hero(w);
    run(w, [press('Special')]);
    expect(h.verdictReject).toBe(Reject.None);
  });

  const revolver: WeaponDef = {
    ...WEAPONS[WHEEL]!,
    id: 'test-revolver',
    name: 'Test Revolver',
    class: 'firearm',
    melee: false,
    ammo: 2,
    actions: [
      {
        ...WEAPONS[STAFF]!.actions[0]!,
        id: 'revolver-shot',
        context: 'neutral',
        ammo: 1,
        links: [],
      },
    ],
    affinity: [],
  };

  test('a finite revolver spends ammo and refuses when empty', () => {
    const def = registerWeapon(revolver);
    const w = lab();
    const h = hero(w);
    const item = spawnItem(w, def, h.x + fx(30), h.z);
    run(w, [press('Interact')]);
    until(w, () => h.state === MoveState.Idle);
    expect(h.item).toBe(item.id);
    const fire = () => {
      until(w, () => h.state === MoveState.Idle || h.state === MoveState.Walk, 90);
      run(w, [idle, press('Attack')]);
    };
    fire();
    expect(item.ammo).toBe(1);
    fire();
    expect(item.ammo).toBe(0);
    fire();
    expect(h.verdictReject).toBe(Reject.NoAmmo);
    expect(h.state).not.toBe(MoveState.Attack);
  });

  test('a guard-modifier item scales the normal guard cost', () => {
    const shield = registerWeapon({
      ...WEAPONS[WHEEL]!,
      id: 'test-shield',
      class: 'guardModifier',
      guardCostPercent: 50,
      actions: [],
      affinity: [],
    });
    const plain = lab({ trainer: { attackers: 1, pattern: 1, interval: 1 } });
    const shielded = lab({ trainer: { attackers: 1, pattern: 1, interval: 1 } });
    const hs = hero(shielded);
    const item = spawnItem(shielded, shield, hs.x + fx(30), hs.z);
    run(shielded, [press('Interact')]);
    until(shielded, () => hs.state === MoveState.Idle);
    expect(hs.item).toBe(item.id);
    const costs = [plain, shielded].map((w) => {
      const { h } = face(w, 100);
      const before = h.defense;
      until(w, () => h.defEvent === DefEvent.Guard, 200, inp({ held: 8 }));
      return before - h.defense;
    });
    expect(costs[0]).toBeGreaterThan(0);
    expect(costs[1]).toBe(Math.trunc(costs[0]! / 2));
  });

  test('a hook pulls the target towards the holder', () => {
    const w = lab();
    pickUp(w, STAFF);
    const { h, d } = face(w, 150);
    const hook = kitOf(h)!.actions.findIndex((a) => a.id === 'staff-hook');
    startAction(h, hook);
    until(w, () => d.state === MoveState.Hitstun, 30);
    expect(d.vx).toBeLessThan(0);
  });
});

describe('the environmental slice', () => {
  test('breakPower moves the boards through their states and releases one fragment', () => {
    const w = lab();
    const b = w.environment.breakables[0]!;
    addBreakPower(w, b.id, 40, 1);
    expect(b.state).toBe(BreakState.Loosened);
    addBreakPower(w, b.id, 40, 1);
    expect(b.state).toBe(BreakState.Critical);
    addBreakPower(w, b.id, 40, 1);
    expect(b.state).toBe(BreakState.Broken);
    addBreakPower(w, b.id, 40, 1);
    expect(w.items.filter((i) => i.def === BOARD)).toHaveLength(1);
    until(w, () => itemOf(w, BOARD).state === ItemState.Ground, 120);
    resetEnvironment(w);
    expect(w.environment.breakables[0]!.state).toBe(BreakState.Intact);
  });

  test('a staff strike damages the boards once per action', () => {
    const w = lab();
    pickUp(w, STAFF);
    const h = hero(w);
    const b = w.environment.breakables[0]!;
    h.x = b.x - fx(130);
    h.z = b.z + fx(30);
    h.facing = 1;
    const thrust = kitOf(h)!.actions.findIndex((a) => a.id === 'staff-thrust');
    startAction(h, thrust);
    until(w, () => h.state !== MoveState.Attack, 60);
    expect(b.power).toBe(25);
  });

  test('an eligible hit into the pillar deals one environmental impact per combo', () => {
    const w = lab();
    pickUp(w, STAFF);
    const { h, d } = face(w, 120);
    const pillar = w.environment.surfaces[0]!;
    d.x = pillar.x - pillar.hw - fx(60);
    d.z = pillar.z;
    h.x = d.x - fx(120);
    h.z = d.z;
    const lunge = kitOf(h)!.actions.findIndex((a) => a.id === 'weir-brace');
    startAction(h, lunge);
    until(w, () => w.environment.log.kind === EnvEvent.Impact, 80);
    expect(d.ctx.environmentImpactUsed).toBe(true);
    expect(pillar.cracked).toBe(true);
    expect(pillar.impacts).toBe(1);
  });

  test('the cog telegraphs, hits once and grants anti-trapping safety', () => {
    const w = lab();
    const h = hero(w);
    const cog = w.environment.hazards[0]!;
    h.x = cog.x;
    h.z = cog.z;
    const hp = h.health;
    until(w, () => cog.phase === HazardPhase.Warn, 400);
    until(w, () => cog.phase === HazardPhase.Active, 100);
    until(w, () => h.health < hp, 5);
    expect(hp - h.health).toBe(cog.damage);
    expect(h.hazardSafeUntil - w.frame).toBeGreaterThan(HAZARD.safe - 5);
  });

  test('a normal guard facing the cog blocks it', () => {
    const w = lab();
    const h = hero(w);
    const cog = w.environment.hazards[0]!;
    h.x = cog.x - cog.hw;
    h.z = cog.z;
    h.facing = 1;
    const hp = h.health;
    until(w, () => cog.phase === HazardPhase.Active, 400, inp({ held: 8 }));
    run(w, Array.from({ length: 4 }, () => inp({ held: 8 })));
    expect(h.health).toBe(hp);
  });
});

describe('determinism', () => {
  test('a weapons-and-environment session hashes the same twice and differs from no armory', () => {
    const script: FrameInput[] = [
      ...Array.from({ length: 30 }, () => inp({ moveX: 1 })),
      press('Interact'),
      ...Array.from({ length: 20 }, () => idle),
      press('Attack'),
      ...Array.from({ length: 40 }, () => idle),
      press('Interact'),
      ...Array.from({ length: 120 }, () => idle),
    ];
    const play = (o: WorldOptions) => {
      const w = createWorld(7, { dummies: 2, ...o });
      for (const f of script) step(w, [f]);
      return hashWorld(w);
    };
    expect(play(LAB)).toBe(play(LAB));
    expect(play(LAB)).not.toBe(play({}));
  });
});
