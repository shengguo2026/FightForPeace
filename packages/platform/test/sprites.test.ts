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
import { SpritePicker } from '../src/assets/sprites';

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

test('every sheet is a 3x2 grid of 384 px cells (M13 effect sheets: 256 px)', () => {
  for (const s of reg.sheets())
    expect([s.sheet.cols, s.sheet.rows, s.sheet.cell]).toEqual([
      3,
      2,
      s.id.startsWith('vfx.') ? 256 : 384,
    ]);
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

test('weapon sheets are drawn at the same figure size as the idle sheet', () => {
  // The founders' staff sheets were drawn about 12 % smaller than their idle sheets.
  const size = (id: string) => reg.sheet(id)!.sheet.scale ?? 1;
  expect(size('hero.mountain.sheet.staff-a')).toBeGreaterThan(1.1);
  expect(size('hero.mountain.sheet.staff-b')).toBeGreaterThan(1.1);
  expect(size('hero.river.sheet.walk')).toBeLessThan(0.9);
  for (const s of reg.sheets()) {
    const k = s.sheet.scale ?? 1;
    expect(k, s.id).toBeGreaterThan(0.8);
    expect(k, s.id).toBeLessThan(1.2);
  }
});
