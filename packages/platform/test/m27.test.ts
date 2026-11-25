import {
  ENEMIES,
  EnemyState,
  type Fighter,
  HEROES,
  MountedSlot,
  MoveState,
  PassPhase,
  RiderState,
  WEAPONS,
  claim,
  createWorld,
  heroOf,
  kitOf,
  spawnEnemy,
  spawnItem,
  startAction,
  step,
  totalFrames,
  weaponIndex,
} from '@ffp/sim';
import { AssetRegistry } from '../src/assets/registry';
import { SpritePicker } from '../src/assets/sprites';
import { heroMountCell, raiderHorseCell } from '../src/assets/mounted';
import { STAGE3_SFX } from '../src/media/codedSfx';
import {
  ACTION_ACTIVE,
  ACTION_START,
  Stage3SoundTracker,
  type Stage3Snapshot,
} from '../src/media/stage3Sounds';

const reg = new AssetRegistry();
const pick = new SpritePicker(reg);
const S3_ROLES = ['ambusher', 'bruiser', 'trapper', 'raider', 'stalker', 'captain', 'garran'];
const IDLE = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 } as const;

function drawable(f: Fighter, frame = 0): string {
  const s = pick.fighter(f, frame);
  expect(s, `${ENEMIES[f.hero]?.id ?? 'hero'} state ${f.state} action ${f.action}`).not.toBeNull();
  const meta = reg.sheet(s!.sheet)!.sheet;
  expect(meta.cells[s!.cell], `${s!.sheet} cell ${s!.cell}`).toBeTruthy();
  return s!.sheet;
}

describe('M27 art', () => {
  test('every Stage 3 role and Garran draw every action and state from their own sheets', () => {
    for (const id of S3_ROLES) {
      const w = createWorld(1, { arena: 'lab-m27-ambusher' });
      const kit = ENEMIES.findIndex((k) => k.id === id);
      const f = spawnEnemy(w, kit, heroOf(w, 0)!.x + 400, heroOf(w, 0)!.z);
      if (f.ext?.rider) f.ext.rider.phase = 3; // on foot
      const art = ENEMIES[kit]!.art ?? id;
      const own = `enemy.${art}.sheet.`;
      kitOf(f)!.actions.forEach((a, i) => {
        startAction(f, i);
        for (let n = 0; n < totalFrames(a); n += 1) {
          f.stateFrame = n;
          expect(drawable(f), `${id} ${a.id}`).toMatch(own);
        }
      });
      for (const state of [
        MoveState.Idle,
        MoveState.Walk,
        MoveState.Hitstun,
        MoveState.Launched,
        MoveState.Down,
        MoveState.GetUp,
        MoveState.Flee,
        MoveState.Surrender,
        MoveState.Guard,
        MoveState.Blockstun,
      ]) {
        f.state = state;
        f.action = -1;
        f.stateFrame = 5;
        f.stun = 20;
        for (const frame of [0, 13, 40]) expect(drawable(f, frame), `${id} ${state}`).toMatch(own);
      }
    }
  });

  test('heroes hold the Stage 3 weapons in their own poses and walk with them', () => {
    for (const h of HEROES) {
      if (!reg.sheet(`hero.${h.id}.sheet.hike`)) continue;
      for (const [weapon, sheet] of [
        ['hiking-staff', 'hike'],
        ['wood-axe', 'axe'],
        ['quarry-hammer', 'hammer'],
      ] as const) {
        const w = createWorld(1, { heroes: [h.id, 'river'] });
        const f = heroOf(w, 0)!;
        claim(w, f, spawnItem(w, weaponIndex(weapon), f.x, f.z));
        f.state = MoveState.Idle;
        expect(drawable(f)).toBe(`hero.${h.id}.sheet.${sheet}`);
        f.state = MoveState.Walk;
        expect(drawable(f, 10)).toBe(`hero.${h.id}.sheet.${sheet}-walk`);
        expect(pick.heldProp(f)).toBeNull();
        kitOf(f)!.actions.forEach((a, i) => {
          if (!a.pose.startsWith('weapon.')) return;
          startAction(f, i);
          f.stateFrame = 1;
          expect(drawable(f), a.id).toBe(`hero.${h.id}.sheet.${sheet}`);
        });
      }
    }
  });

  test('in the Stage 3 outfit, heroes stay in it with and without a Stage 3 weapon', () => {
    const s3 = new SpritePicker(reg);
    s3.setOutfit('s3');
    const dressed = (f: Fighter, frame = 0) => {
      const s = s3.fighter(f, frame)!;
      expect(reg.sheet(s.sheet)!.sheet.cells[s.cell], `${s.sheet} ${s.cell}`).toBeTruthy();
      return s.sheet;
    };
    for (const h of HEROES) {
      if (!reg.sheet(`hero.${h.id}.s3.sheet.idle`)) continue;
      const w = createWorld(1, { heroes: [h.id, 'river'] });
      const f = heroOf(w, 0)!;
      f.state = MoveState.Idle;
      expect(dressed(f)).toBe(`hero.${h.id}.s3.sheet.idle`);
      f.state = MoveState.Walk;
      expect(dressed(f, 10)).toBe(`hero.${h.id}.s3.sheet.walk`);
      // Every action pose with an S3 redraw uses it.
      kitOf(f)!.actions.forEach((a, i) => {
        startAction(f, i);
        f.stateFrame = 1;
        const sheet = dressed(f);
        if (reg.sheet(sheet.replace(`hero.${h.id}.`, `hero.${h.id}.s3.`)))
          throw new Error(`${a.id} draws ${sheet} though its S3 redraw exists`);
      });
      // A Stage 3 weapon: its own sheets (drawn in the S3 outfit).
      claim(w, f, spawnItem(w, weaponIndex('wood-axe'), f.x, f.z));
      f.state = MoveState.Walk;
      expect(dressed(f, 10)).toBe(`hero.${h.id}.sheet.axe-walk`);
      // The revolver: the S3 revolver poses; its Stage 2 walk is not redrawn, so the S3
      // walk with the revolver drawn in hand.
      const g = createWorld(1, { heroes: [h.id, 'river'] });
      const r = heroOf(g, 0)!;
      claim(g, r, spawnItem(g, weaponIndex('bandit-revolver'), r.x, r.z));
      r.state = MoveState.Idle;
      if (reg.sheet(`hero.${h.id}.s3.sheet.revolver`))
        expect(dressed(r)).toBe(`hero.${h.id}.s3.sheet.revolver`);
      r.state = MoveState.Walk;
      expect(dressed(r, 10)).toBe(`hero.${h.id}.s3.sheet.walk`);
      expect(s3.heldProp(r)).not.toBeNull();
    }
  });

  test('every S3 outfit sheet has a pose wherever its original has one', () => {
    let n = 0;
    for (const id of reg.ids()) {
      const m = /^hero\.([a-z]+)\.s3\.(.+)$/.exec(id);
      if (!m) continue;
      n += 1;
      const orig = reg.sheet(`hero.${m[1]}.${m[2]}`)!.sheet;
      const twin = reg.sheet(id)!.sheet;
      orig.cells.forEach((c, i) => {
        if (c) expect(twin.cells[i], `${id} cell ${i}`).toBeTruthy();
      });
    }
    expect(n).toBeGreaterThan(120);
  });

  test('loose Stage 3 weapons and food draw from the Stage 3 prop sheets', () => {
    const w = createWorld(1, {});
    for (const id of [
      'hiking-staff',
      'wood-axe',
      'quarry-hammer',
      'bandit-revolver',
      'quarry-hookstaff',
      'trail-rice',
      'vegetable-broth',
      'seed-cake',
      'camp-meal',
    ]) {
      const it = spawnItem(w, weaponIndex(id), 0, 0);
      expect(pick.item(it, 0)?.sheet, id).toMatch(/^prop\.s3-(weapons|food)$/);
    }
  });

  test('the horse corridor draws the horse sheets; the bandit horse its own', () => {
    const base = {
      state: RiderState.Ride,
      critical: false,
      slot: -1,
      actionAge: 0,
      actionLength: 0,
      steer: 0,
      braking: false,
      stateAge: 0,
    };
    expect(heroMountCell('wind', base, true)).toEqual({
      sheet: 'hero.wind.sheet.horse-ride',
      cell: 0,
    });
    const kick = heroMountCell(
      'fire',
      {
        ...base,
        state: RiderState.Action,
        slot: MountedSlot.Directional,
        actionAge: 30,
        actionLength: 40,
      },
      true,
    )!;
    expect(kick).toEqual({ sheet: 'hero.fire.sheet.horse-attack', cell: 3 });
    for (const h of HEROES)
      for (const k of ['ride', 'attack', 'defense', 'special', 'ultimate', 'stability'])
        if (reg.sheet(`hero.${h.id}.sheet.mount-ride`))
          expect(reg.sheet(`hero.${h.id}.sheet.horse-${k}`), `${h.id} ${k}`).toBeDefined();
    for (const state of Object.values(EnemyState)) {
      const c = raiderHorseCell({ boss: false, state, critical: false, attack: 0 });
      expect(reg.sheet(c.sheet)!.sheet.cells[c.cell], `${state}`).toBeTruthy();
    }
  });

  test('2026-11-18: riding plays the four-frame GALLOP loop where it is loaded', () => {
    const base = {
      state: RiderState.Ride,
      critical: false,
      slot: -1,
      actionAge: 0,
      actionLength: 0,
      steer: 0,
      braking: false,
      stateAge: 0,
    };
    for (const h of HEROES) {
      if (!reg.sheet(`hero.${h.id}.sheet.horse-ride`)) continue;
      const seen = new Set<number>();
      for (let frame = 0; frame < 24; frame += 1) {
        const c = heroMountCell(h.id, { ...base, frame, gallop: true }, true)!;
        expect(c.sheet).toBe(`hero.${h.id}.sheet.horse-gallop`);
        expect(reg.sheet(c.sheet)!.sheet.cells[c.cell], `${h.id} ${c.cell}`).toBeTruthy();
        seen.add(c.cell);
      }
      expect([...seen].sort()).toEqual([0, 1, 2, 3]);
      // M28: changing lanes keeps the gallop going (the legs never stop); braking halts.
      expect(heroMountCell(h.id, { ...base, frame: 5, gallop: true, steer: 40 }, true)!.sheet).toBe(
        `hero.${h.id}.sheet.horse-gallop`,
      );
      expect(heroMountCell(h.id, { ...base, frame: 5, gallop: true, braking: true }, true)).toEqual(
        { sheet: `hero.${h.id}.sheet.horse-ride`, cell: 3 },
      );
    }
    const ride = raiderHorseCell({
      boss: false,
      state: EnemyState.Approach,
      critical: false,
      attack: 0,
      frame: 13,
      gallop: true,
    });
    expect(ride.sheet).toBe('enemy.rider3.sheet.mount-gallop');
    expect(reg.sheet(ride.sheet)!.sheet.cells[ride.cell]).toBeTruthy();
  });
});

describe('M27 sounds', () => {
  const ids = new Set(STAGE3_SFX.map((d) => d.id));

  test('every Stage 3 sound the game triggers exists as a recipe', () => {
    for (const id of [...Object.values(ACTION_START), ...Object.values(ACTION_ACTIVE)])
      expect(ids.has(id), id).toBe(true);
    const src = [
      'sfx.horse.disengage',
      'sfx.horse.stumble',
      'sfx.horse.strike',
      'sfx.horse.whinny',
      'sfx.horse.snort',
      'sfx.horse.gallop',
      'sfx.horse.stability-low',
      'sfx.horse.dismount',
      'sfx.horse.mount',
      'sfx.horse.return',
    ];
    for (const id of src) expect(ids.has(id), id).toBe(true);
  });

  /** Runs a room with the test inputs and collects the Stage 3 sounds it plays. */
  function sounds(arena: string, frames: number, inputs = () => [IDLE]): Set<string> {
    const w = createWorld(27, { arena, difficulty: 'medium' });
    const t = new Stage3SoundTracker();
    const out = new Set<string>();
    const snap = (): Stage3Snapshot => {
      const b = w.encounter?.boss;
      return {
        frame: w.frame,
        generation: 1,
        fighters: w.bodies,
        items: w.items,
        shared: w.shared ?? null,
        breakables: w.environment.breakables,
        boss: b ? { id: b.id, phase: b.phase, capture: b.capture, stagger: b.stagger } : null,
      };
    };
    t.update(snap());
    for (let i = 0; i < frames; i += 1) {
      step(w, inputs());
      for (const s of t.update(snap())) {
        expect(ids.has(s.id), s.id).toBe(true);
        out.add(s.id);
      }
    }
    return out;
  }

  test('quarry rooms sound their bandits, carts and Garran', () => {
    expect(sounds('lab-m27-cart-rails', 900).has('sfx.cart.roll')).toBe(true);
    const winch = sounds('lab-m27-garran-winch', 3000);
    expect(winch.has('sfx.winch.crank')).toBe(true);
    expect(winch.has('sfx.winch.release')).toBe(true);
    const bruiser = sounds('lab-m27-bruiser', 1500);
    expect(bruiser.has('sfx.bruiser.windup')).toBe(true);
  });

  test('a repeated snapshot plays nothing twice', () => {
    const w = createWorld(27, { arena: 'lab-m27-cart-rails', difficulty: 'medium' });
    const t = new Stage3SoundTracker();
    const snap = (): Stage3Snapshot => ({
      frame: w.frame,
      generation: 1,
      fighters: w.bodies,
      items: w.items,
      shared: w.shared ?? null,
      breakables: w.environment.breakables,
      boss: null,
    });
    t.update(snap());
    let total = 0;
    for (let i = 0; i < 600; i += 1) {
      step(w, [IDLE]);
      total += t.update(snap()).length;
      expect(t.update(snap())).toEqual([]);
    }
    expect(total).toBeGreaterThan(0);
    void WEAPONS;
  });
});

test('the Mounted Raider gallops with moving legs while it crosses the arena', () => {
  const w = createWorld(3, { arena: 'lab-m27-raider', heroes: ['mountain'] });
  const cells = new Set<string>();
  for (let i = 0; i < 2400; i += 1) {
    step(w, [IDLE]);
    const r = w.bodies.find((b) => b.team === 'enemy' && b.ext?.rider);
    if (!r || r.ext!.rider!.phase !== PassPhase.Pass) continue;
    const s = pick.fighter(r, w.frame)!;
    cells.add(`${s.sheet}#${s.cell}`);
  }
  expect([...cells].sort()).toEqual(
    [0, 1, 2, 3].map((c) => `enemy.rider3.sheet.mount-gallop#${c}`),
  );
});
