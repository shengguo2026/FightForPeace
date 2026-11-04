import {
  ENEMIES,
  type Fighter,
  HEROES,
  ItemState,
  type Item,
  MoveState,
  WEAPONS,
  type ActionDef,
  conditionOf,
  fx,
  kitOf,
  phaseOf,
} from '@ffp/sim';
import type { AssetRegistry, SheetMeta } from './registry';

/**
 * Sprite-sheet poses (M6 first real art). Every sheet is a 3x2 grid of square cells, cell
 * 0 top left, drawn facing right; the renderer mirrors for facing left and stands each
 * cell's lowest opaque row (`foot`) on the fighter's ground point. This module only
 * picks a sheet and a cell from simulation state; it never changes the simulation.
 */
export interface SpriteFrame {
  /** Logical asset id of the sheet (a manifest key). */
  sheet: string;
  cell: number;
}

type Phased = readonly [startup: number, active: number, recovery: number];

/** Weapon core actions on the founders' weapon sheets. */
const WEAPON_POSES: Record<string, { sheet: string; cells: Phased }> = {
  'staff-thrust': { sheet: 'staff-a', cells: [2, 3, 3] },
  'staff-sweep': { sheet: 'staff-a', cells: [2, 4, 4] },
  'staff-overhead': { sheet: 'staff-a', cells: [0, 5, 5] },
  'staff-lunge': { sheet: 'staff-a', cells: [2, 3, 3] },
  'staff-hook': { sheet: 'staff-a', cells: [3, 4, 0] },
  'staff-rise': { sheet: 'staff-b', cells: [2, 0, 0] },
  'staff-low': { sheet: 'staff-a', cells: [2, 4, 4] },
  'staff-air': { sheet: 'staff-b', cells: [1, 1, 1] },
  'staff-ground': { sheet: 'staff-b', cells: [0, 2, 2] },
  'staff-dash': { sheet: 'staff-a', cells: [2, 3, 3] },
  'staff-throw': { sheet: 'staff-b', cells: [4, 4, 4] },
  'weir-brace': { sheet: 'staff-b', cells: [3, 3, 3] },
  'vault-kick': { sheet: 'staff-b', cells: [3, 3, 3] },
  'board-swing': { sheet: 'staff-a', cells: [2, 4, 4] },
  'board-throw': { sheet: 'staff-b', cells: [4, 4, 4] },
  'wheel-throw': { sheet: 'handwheel', cells: [1, 2, 2] },
};

/** Shared-sheet poses for actions without a sheet of their own. */
const CATEGORY_POSES: Partial<Record<string, { sheet: string; cells: Phased }>> = {
  counter: { sheet: 'exact-counter', cells: [2, 3, 4] },
  grab: { sheet: 'grab-throw', cells: [0, 0, 1] },
  grabStrike: { sheet: 'grab-throw', cells: [1, 1, 1] },
  throw: { sheet: 'grab-throw', cells: [2, 2, 5] },
};

/** The training dummy (Pressed Recruit) attack sheet: raise, contact, recover; rush. */
const RUSH = new Set(['two-step', 'barrage']);

const PHASE_INDEX = { startup: 0, active: 1, recovery: 2 } as const;

function phase(f: Fighter, a: ActionDef): 0 | 1 | 2 {
  return PHASE_INDEX[phaseOf(a, f.stateFrame + 1).phase];
}

/** Filled cells of a sheet, in order. */
function filled(meta: SheetMeta): number[] {
  return meta.cells.flatMap((c, i) => (c ? [i] : []));
}

/** A cell of a looping animation (`fps` cells per second at 60 Hz). */
function loop(meta: SheetMeta | undefined, frame: number, fps: number, cells?: number[]): number {
  const list = cells ?? (meta ? filled(meta) : [0]);
  if (list.length === 0) return 0;
  return list[Math.floor((frame * fps) / 60) % list.length]!;
}

export class SpritePicker {
  constructor(private readonly assets: AssetRegistry) {}

  /** Sheet and cell for a fighter on simulation frame `frame`, or null (no art: greybox). */
  fighter(f: Fighter, frame: number): SpriteFrame | null {
    return f.team === 'hero' ? this.hero(f, frame) : this.enemy(f, frame);
  }

  private has(id: string): SheetMeta | undefined {
    return this.assets.sheet(id)?.sheet;
  }

  private hero(f: Fighter, frame: number): SpriteFrame | null {
    const hero = HEROES[f.hero];
    if (!hero) return null;
    const base = `hero.${hero.id}`;
    const s = (key: string, cell: number): SpriteFrame | null =>
      this.has(`${base}.sheet.${key}`) ? { sheet: `${base}.sheet.${key}`, cell } : null;
    const meta = (key: string) => this.has(`${base}.sheet.${key}`);
    const weapon = f.wkit >= 0 ? WEAPONS[f.wkit] : undefined;
    const staff = weapon?.melee === true;
    const wheel = weapon !== undefined && !staff;
    switch (f.state) {
      case MoveState.Attack: {
        const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
        if (!a) return s('idle', 0);
        const p = phase(f, a);
        const wp = WEAPON_POSES[a.id];
        if (wp && a.pose.startsWith('weapon.')) return s(wp.sheet, wp.cells[p]);
        const own = this.has(a.pose);
        if (own) {
          const cells = filled(own);
          const cell =
            p === 0
              ? cells[0]!
              : p === 2
                ? cells[cells.length - 1]!
                : cells[Math.min(1, cells.length - 1)]!;
          return { sheet: a.pose, cell };
        }
        const shared = CATEGORY_POSES[a.category];
        if (shared) return s(shared.sheet, shared.cells[p]);
        return s('idle', 0);
      }
      case MoveState.Idle:
        if (staff) return s('staff-a', 0);
        if (wheel) return s('handwheel', 0);
        return s('idle', loop(meta('idle'), frame, 6));
      case MoveState.Walk:
        if (staff) return s('staff-a', 1);
        if (wheel) return s('handwheel', 0);
        return s('walk', loop(meta('walk'), frame, 10));
      case MoveState.Dash:
        return s('dash', f.stateFrame < 3 ? 0 : 1 + (Math.floor(f.stateFrame / 5) % 2));
      case MoveState.Air:
        return s('jump', f.vy > fx(3) ? 1 : f.vy < -fx(3) ? 3 : 2);
      case MoveState.Landing:
        return s('jump', 4);
      case MoveState.Guard:
        if (frame - f.defFrame < 10 && f.defEvent === 2 /* Exact */) return s('exact-counter', 0);
        return s('guard', f.guardZ > 0 ? 2 : f.guardX !== f.facing ? 3 : 0);
      case MoveState.Blockstun:
        return s('guard', 1);
      case MoveState.GuardCrush:
        return s('guard', f.stateFrame < f.stun / 2 ? 4 : 5);
      case MoveState.Counter:
        return s('exact-counter', 2);
      case MoveState.CounterMiss:
        return s('guard', 5);
      case MoveState.Breaker:
        return s('breaker-pickup', f.stateFrame < 10 ? 0 : 1);
      case MoveState.Pickup:
        return s('breaker-pickup', f.stateFrame < f.stun / 2 ? 3 : 4);
      case MoveState.Grabbing:
        return s('grab-throw', 1);
      default:
        return this.reaction(f, s);
    }
  }

  private reaction(
    f: Fighter,
    s: (key: string, cell: number) => SpriteFrame | null,
  ): SpriteFrame | null {
    switch (f.state) {
      case MoveState.Hitstun:
      case MoveState.Recoil:
      case MoveState.Grabbed:
      case MoveState.Restrained:
        return s('hurt', f.stun > 20 ? 1 : 0);
      case MoveState.Launched:
        return s('hurt', f.vy > fx(1) ? 3 : f.vy < -fx(4) ? 5 : 4);
      case MoveState.Down:
        return s('knockdown', f.stateFrame < 6 ? 0 : 2);
      case MoveState.GetUp:
        return s('knockdown', f.stateFrame < f.stun / 2 ? 4 : 5);
      case MoveState.Recover:
        return s('jump', 4);
      default:
        return s('idle', 0);
    }
  }

  private enemy(f: Fighter, frame: number): SpriteFrame | null {
    const kit = ENEMIES[f.hero];
    if (!kit) return null;
    const base = `enemy.${kit.id}.sheet`;
    const s = (key: string, cell: number): SpriteFrame | null =>
      this.has(`${base}.${key}`) ? { sheet: `${base}.${key}`, cell } : null;
    switch (f.state) {
      case MoveState.Idle:
      case MoveState.Pickup:
        return s('idle-walk', loop(undefined, frame, 3, [0, 1]));
      case MoveState.Walk:
        return s('idle-walk', loop(undefined, frame, 8, [2, 3, 4, 5]));
      case MoveState.Attack:
      case MoveState.Grabbing: {
        const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
        const p = a ? phase(f, a) : 1;
        return s('attack', (a && RUSH.has(a.id) ? 3 : 0) + p);
      }
      case MoveState.Hitstun:
      case MoveState.Recoil:
      case MoveState.Blockstun:
      case MoveState.GuardCrush:
        return s('react', f.stun > 20 ? 1 : 0);
      case MoveState.Launched:
        return s('react', 2);
      case MoveState.Down:
        return s('react', 3);
      case MoveState.GetUp:
      case MoveState.Recover:
        return s('react', f.stateFrame < f.stun / 2 ? 4 : 5);
      default:
        return s('idle-walk', 0);
    }
  }

  /** Sheet and cell for a loose or flying weapon (held weapons are part of the pose art). */
  item(item: Item, frame: number): SpriteFrame | null {
    const def = WEAPONS[item.def];
    if (!def || item.state === ItemState.Held || item.state === ItemState.Gone) return null;
    const flying = item.state === ItemState.Flying;
    const cond = conditionOf(def, item.integrity);
    if (def.id === 'workstaff' && this.has('prop.workstaff'))
      return { sheet: 'prop.workstaff', cell: flying ? 0 : [0, 2, 3][cond]! };
    if (def.id === 'handwheel' && this.has('prop.handwheel'))
      return {
        sheet: 'prop.handwheel',
        cell: flying ? loop(undefined, frame, 20, [1, 2, 3]) : [0, 4, 5][cond]!,
      };
    if (def.id === 'timber-board' && this.has('prop.sluiceboards'))
      return { sheet: 'prop.sluiceboards', cell: 4 };
    return null;
  }
}
