import {
  ENEMIES,
  EnemyState,
  type Fighter,
  HEROES,
  MountedSlot,
  MoveState,
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
        ['quarry-hookstaff', 'hike'],
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
