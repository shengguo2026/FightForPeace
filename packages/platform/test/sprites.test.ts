import {
  ENEMIES,
  type Fighter,
  HEROES,
  ItemState,
  MoveState,
  WEAPONS,
  claim,
  createWorld,
  heroOf,
  kitOf,
  spawnItem,
  startAction,
  totalFrames,
  weaponIndex,
} from '@ffp/sim';
import { AssetRegistry } from '../src/assets/registry';
import { SpritePicker, WORKER_RUN_CELL, workerFlip } from '../src/assets/sprites';

const reg = new AssetRegistry();
const pick = new SpritePicker(reg);

function hero(id: string): Fighter {
  const w = createWorld(1, { heroes: [id, 'river'] });
  return heroOf(w, 0)!;
}

/** The picked cell exists in the sheet and is not empty. */
function expectDrawable(f: Fighter, frame = 0): void {
  const s = pick.fighter(f, frame);
  expect(s, `state ${f.state} action ${f.action}`).not.toBeNull();
  const meta = reg.sheet(s!.sheet)!.sheet;
  expect(meta.cells[s!.cell], `${s!.sheet} cell ${s!.cell}`).toBeTruthy();
}

test('Stage 1 founder, dummy, weapon and prop sheets are in the manifest', () => {
  const ids = reg.sheets().map((s) => s.id);
  for (const h of ['mountain', 'river'])
    for (const k of [
      'idle',
      'walk',
      'jump',
      'hurt',
      'knockdown',
      'guard',
      'staff-a',
      'staff-b',
      'handwheel',
    ])
      expect(ids).toContain(`hero.${h}.sheet.${k}`);
  for (const k of ['idle-walk', 'attack', 'react'])
    expect(ids).toContain(`enemy.trainer.sheet.${k}`);
  for (const p of ['workstaff', 'handwheel', 'sluiceboards', 'impact-hazard'])
    expect(ids).toContain(`prop.${p}`);
});

/** M22: Stage 2 mounted hero sheets and the bikes are 2x2 grids (wide 576 px mounted cells). */
const TWO_BY_TWO =
  /^(hero\.\w+\.sheet\.mount-|prop\.s2-bike-|enemy\.rider\.sheet\.mount-|enemy\.marek\.sheet\.mounted)/;

test('every sheet is a 3x2 grid of 384 px cells (M13 effect sheets: 256 px)', () => {
  for (const s of reg.sheets()) {
    if (TWO_BY_TWO.test(s.id)) {
      expect([s.sheet.cols, s.sheet.rows]).toEqual([2, 2]);
      continue;
    }
    expect([s.sheet.cols, s.sheet.rows, s.sheet.cell]).toEqual([
      3,
      2,
      s.id.startsWith('vfx.') ? 256 : 384,
    ]);
  }
});

test('character sheets share one ground line (aerial sheets are drawn in the air)', () => {
  for (const s of reg.sheets()) {
    if (s.id.startsWith('prop.') || s.id.startsWith('vfx.') || s.id.includes('.pose.aerial.'))
      continue;
    // The twins' sheets were drawn a few pixels higher (Rising Cast stands on 317).
    expect(s.sheet.ground, s.id).toBeGreaterThan(310);
    // River's walk (v3, v4) stands lower in its cells (375 of 384); the renderer stands every
    // sheet on its own ground line, so only feet touching the cell edge would be wrong.
    expect(s.sheet.ground, s.id).toBeLessThan(380);
  }
});

test('every movement and reaction state of every hero has a drawable pose', () => {
  for (const h of HEROES) {
    const f = hero(h.id);
    for (const state of Object.values(MoveState)) {
      f.state = state;
      f.stateFrame = 0;
      f.action = -1;
      f.stun = 20;
      for (const frame of [0, 7, 31, 59]) expectDrawable(f, frame);
    }
  }
});

test('every action of every hero, with and without a weapon, is drawable in every phase', () => {
  for (const h of HEROES) {
    for (const weapon of [-1, ...WEAPONS.map((_, i) => i)]) {
      const w = createWorld(1, { heroes: [h.id, 'river'] });
      const f = heroOf(w, 0)!;
      if (weapon >= 0) claim(w, f, spawnItem(w, weapon, f.x, f.z));
      const kit = kitOf(f)!;
      kit.actions.forEach((a, i) => {
        startAction(f, i);
        for (let n = 0; n < totalFrames(a); n += 1) {
          f.stateFrame = n;
          expectDrawable(f);
        }
      });
    }
  }
});

test('a back throw is drawn as a turn toward the back, not the forward throw', () => {
  const backs: Record<string, [forward: string, back: string]> = {
    mountain: ['sluicegate-toss', 'turning-weir'],
    river: ['downstream-fling', 'eddy-swing'],
    wind: ['clear-path-cast', 'clear-path-turn'],
    fire: ['foundry-reap', 'foundry-turn'],
  };
  for (const [id, [fwd, back]] of Object.entries(backs)) {
    const f = hero(id);
    const kit = kitOf(f)!;
    const frames = (actionId: string) => {
      const i = kit.actions.findIndex((a) => a.id === actionId);
      expect(i, actionId).toBeGreaterThanOrEqual(0);
      startAction(f, i);
      const a = kit.actions[i]!;
      const seen: string[] = [];
      for (let n = 0; n < totalFrames(a); n += 1) {
        f.stateFrame = n;
        const s = pick.fighter(f, 0)!;
        seen.push(`${s.sheet}#${s.cell}`);
      }
      return seen;
    };
    const forward = new Set(frames(fwd));
    const backward = frames(back);
    // The release (active) frame of the back throw never repeats a forward-throw pose.
    const release = backward[a(kit, back).startup]!;
    expect(forward.has(release), `${id} ${release}`).toBe(false);
  }
  // Wind plays the whole BT01 back-throw sheet: pivot, load, release, follow-through, recovery.
  const w = hero('wind');
  const kit = kitOf(w)!;
  const i = kit.actions.findIndex((x) => x.id === 'clear-path-turn');
  startAction(w, i);
  const cells = new Set<number>();
  for (let n = 0; n < totalFrames(kit.actions[i]!); n += 1) {
    w.stateFrame = n;
    const s = pick.fighter(w, 0)!;
    expect(s.sheet).toBe('hero.wind.sheet.back-throw');
    cells.add(s.cell);
  }
  expect([...cells].sort()).toEqual([1, 2, 3, 4, 5]);
});

function a(kit: NonNullable<ReturnType<typeof kitOf>>, id: string) {
  return kit.actions.find((x) => x.id === id)!;
}

test('the training dummy uses the recruit sheets', () => {
  const w = createWorld(1, { dummies: 1 });
  const d = w.bodies.find((b) => b.team === 'enemy')!;
  expect(ENEMIES[d.hero]!.id).toBe('trainer');
  expect(pick.fighter(d, 0)!.sheet).toBe('enemy.trainer.sheet.idle-walk');
  for (const state of Object.values(MoveState)) {
    d.state = state;
    d.action = state === MoveState.Attack ? 0 : -1;
    expectDrawable(d);
  }
});

test('an armed founder stands with the staff; loose weapons show their condition', () => {
  const w = createWorld(1);
  const f = heroOf(w, 0)!;
  const staff = spawnItem(w, weaponIndex('workstaff'), f.x, f.z);
  expect(pick.item(staff, 0)).toEqual({ sheet: 'prop.workstaff', cell: 0 });
  staff.integrity = 20;
  expect(pick.item(staff, 0)!.cell).toBe(3);
  claim(w, f, staff);
  expect(pick.item(staff, 0)).toBeNull();
  expect(pick.fighter(f, 0)).toEqual({ sheet: 'hero.mountain.sheet.staff-a', cell: 0 });
  const wheel = spawnItem(w, weaponIndex('handwheel'), f.x, f.z);
  wheel.state = ItemState.Flying;
  expect([1, 2, 3]).toContain(pick.item(wheel, 5)!.cell);
});

test('every hero holds the Stage 1 weapons in its own poses (no placeholder prop)', () => {
  for (const h of HEROES) {
    for (const [weapon, sheet] of [
      ['workstaff', 'staff-a'],
      ['handwheel', 'handwheel'],
    ] as const) {
      const w = createWorld(1, { heroes: [h.id] });
      const f = heroOf(w, 0)!;
      claim(w, f, spawnItem(w, weaponIndex(weapon), f.x, f.z));
      expect(pick.heldProp(f)).toBeNull();
      expect(pick.fighter(f, 0)).toEqual({ sheet: `hero.${h.id}.sheet.${sheet}`, cell: 0 });
    }
  }
});

test('an armed founder steps while walking instead of sliding on one cell', () => {
  const w = createWorld(1);
  const f = heroOf(w, 0)!;
  claim(w, f, spawnItem(w, weaponIndex('workstaff'), f.x, f.z));
  f.state = MoveState.Walk;
  // Mountain has a drawn staff walk cycle.
  const cells = new Set([0, 6, 12, 18, 24, 30].map((t) => pick.fighter(f, t)!.cell));
  expect(pick.fighter(f, 0)!.sheet).toBe('hero.mountain.sheet.staff-walk');
  expect(cells.size).toBe(6);
  // River too.
  const rw = createWorld(1, { heroes: ['river', 'mountain'] });
  const r = heroOf(rw, 0)!;
  claim(rw, r, spawnItem(rw, weaponIndex('workstaff'), r.x, r.z));
  r.state = MoveState.Walk;
  expect(pick.fighter(r, 0)!.sheet).toBe('hero.river.sheet.staff-walk');
});

test('M22: a hero walking with a Stage 2 weapon steps through its armed walk sheet', () => {
  for (const hero of ['wind', 'fire', 'mountain', 'river'])
    for (const [weapon, sheet] of [
      ['service-lance', 'lance-walk'],
      ['six-round-sidearm', 'revolver-walk'],
      ['support-gun', 'heavy-walk'],
    ] as const) {
      const w = createWorld(1, { heroes: [hero] });
      const f = heroOf(w, 0)!;
      claim(w, f, spawnItem(w, weaponIndex(weapon), f.x, f.z));
      f.state = MoveState.Walk;
      const cells = new Set([0, 6, 12, 18, 24, 30].map((t) => pick.fighter(f, t)!.cell));
      expect(pick.fighter(f, 0)!.sheet).toBe(`hero.${hero}.sheet.${sheet}`);
      expect(cells.size, `${hero} ${weapon}`).toBe(6);
      // The weapon is in the drawing: no separate prop.
      expect(pick.heldProp(f)).toBeNull();
    }
});

test('M22: Stage 2 enemies flee on a six-pose run; the rider, disarmed Marauder and Scorched Marek walk', () => {
  const enemy = (id: string, state: number) => {
    const w = createWorld(1, { heroes: ['mountain'] });
    const f = heroOf(w, 0)!;
    f.team = 'enemy';
    f.hero = ENEMIES.findIndex((e) => e.id === id);
    f.wkit = -1;
    f.item = 0;
    f.state = state as MoveState;
    return f;
  };
  for (const id of [
    'claimhand',
    'glassrunner',
    'reaver',
    'marauder',
    'saboteur',
    'rider',
    'enforcer2',
    'signalman',
  ]) {
    const f = enemy(id, MoveState.Flee);
    const cells = new Set([0, 5, 10, 15, 20, 25].map((t) => pick.fighter(f, t)!.cell));
    expect(pick.fighter(f, 0)!.sheet, id).toBe(`enemy.${id}.sheet.flee`);
    expect(pick.fighter(f, 0)!.drawnLeft, id).toBeFalsy();
    expect(cells.size, id).toBe(6);
  }
  expect(pick.fighter(enemy('rider', MoveState.Walk), 0)!.sheet).toBe('enemy.rider.sheet.walk');
  expect(pick.fighter(enemy('marauder', MoveState.Walk), 0)!.sheet).toBe(
    'enemy.marauder.sheet.disarmed-walk',
  );
  const marek = enemy('marek', MoveState.Walk);
  const boss = { id: marek.id, phase: 2, look: 3, shift: 0, shiftFrames: 1, stagger: 0 };
  expect(pick.fighter(marek, 0, boss as never)!.sheet).toBe('enemy.marek.sheet.scorched-walk');
  for (const id of ['npc.s2-worker.walk', 'npc.s2-researcher.walk'])
    expect(reg.sheet(id)?.sheet.cols, id).toBe(3);
});

test('an enemy walks on its own walk sheet once delivered, else on its idle-walk poses', () => {
  // Guo, 14 Nov: the Stage 2 IDLE-WALK walk poses never swap the legs; EW01-EW08 add walk
  // sheets for the approach. Stage 1 kits keep their idle-walk poses, which do alternate.
  const enemy = (id: string) => {
    const f = heroOf(createWorld(1, { heroes: ['mountain'] }), 0)!;
    f.team = 'enemy';
    f.hero = ENEMIES.findIndex((e) => e.id === id);
    f.wkit = -1;
    f.state = MoveState.Walk;
    return f;
  };
  for (const [id, art] of [
    ['claimhand', 'claimhand'],
    ['reaver', 'reaver'],
    ['saboteur', 'saboteur'],
    ['signalman', 'signalman'],
    ['recruit', 'trainer'],
  ] as const) {
    const own = reg.sheet(`enemy.${art}.sheet.walk`) ? 'walk' : 'idle-walk';
    const cells = new Set<number>();
    for (let fr = 0; fr < 60; fr++) {
      const got = pick.fighter(enemy(id), fr)!;
      expect(got.sheet, art).toBe(`enemy.${art}.sheet.${own}`);
      cells.add(got.cell);
    }
    expect(cells.size, art).toBeGreaterThanOrEqual(4);
  }
});

test('weapon sheets are drawn at the same figure size as the idle sheet', () => {
  // The founders' staff sheets were drawn about 12 % smaller than their idle sheets.
  const size = (id: string) => reg.sheet(id)!.sheet.scale ?? 1;
  expect(size('hero.mountain.sheet.staff-a')).toBeGreaterThan(1.1);
  expect(size('hero.mountain.sheet.staff-b')).toBeGreaterThan(1.1);
  expect(size('hero.river.sheet.walk')).toBeLessThan(0.9);
  // Action poses drawn larger than idle are scaled down, so a hero keeps its size when it hits.
  expect(size('hero.river.pose.standing.reed-tap')).toBeLessThan(0.9);
  expect(size('hero.mountain.pose.ground.settling-palm')).toBeLessThan(0.8);
  for (const s of reg.sheets()) {
    const k = s.sheet.scale ?? 1;
    expect(k, s.id).toBeGreaterThan(0.7);
    expect(k, s.id).toBeLessThan(1.3);
  }
});

test('a fleeing enemy is drawn running the way it moves (Stage 1 and Stage 2 exit sheets)', () => {
  // Stage 1 exit sheets draw the flee run facing left, the M19 sheets facing right: the
  // renderer flips by drawnLeft, so the run faces the fighter's facing either way.
  const flee = (id: string) => {
    const w = createWorld(1, { heroes: ['mountain'] });
    const f = w.bodies.find((b) => b.team === 'enemy') ?? heroOf(w, 0)!;
    f.team = 'enemy';
    f.hero = ENEMIES.findIndex((e) => e.id === id);
    f.state = MoveState.Flee;
    return pick.fighter(f, 0);
  };
  // M22: the Pressed Recruit's six-pose flee run (S1W01) replaces its two Stage 1 cells.
  expect(flee('recruit')?.sheet).toBe('enemy.trainer.sheet.flee');
  expect(flee('recruit')?.drawnLeft).toBeFalsy();
  for (const id of ['npc.worker-a.run', 'npc.worker-b.run'])
    expect(reg.sheet(id)?.sheet.cells.filter(Boolean)).toHaveLength(6);
  for (const id of ['claimhand', 'marauder', 'saboteur', 'signalman', 'enforcer2'])
    expect(flee(id)?.drawnLeft, id).toBe(false);
});

test('a rescued worker running home is drawn running left, the way it moves', () => {
  // Workers run home leftward; the running-home cell is already drawn running left.
  expect(workerFlip(WORKER_RUN_CELL, -1)).toBe(false);
  expect(workerFlip(WORKER_RUN_CELL, 1)).toBe(true);
  // Standing poses (drawn facing right) are not mirrored while the worker stands still.
  for (const cell of [0, 1, 2, 3, 4]) expect(workerFlip(cell, 0)).toBe(false);
});
