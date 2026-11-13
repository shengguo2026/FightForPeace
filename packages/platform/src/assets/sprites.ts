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
  /** The cell is drawn facing left (flee runs): mirror the usual flip. */
  drawnLeft?: boolean;
}

/** Boss state the picker needs (from the encounter; rendering only). */
export interface BossView {
  id: number;
  phase: number;
  stagger: number;
  shift: number;
  shiftFrames: number;
  /** M19 kit look (1 armed, 2 unbound, 3 scorched, 4 captured) and the capture kind. */
  look?: number;
  capture?: number;
  /** Frames since the capture began. */
  captureAge?: number;
}

type Phased = readonly [startup: number, active: number, recovery: number];

/** The lance's reach on the shared lance sheet (heroes without the second lance sheet). */
const LANCE_A_REACH = { sheet: 'lance-a', cells: [1, 2, 2] } as const;

/**
 * Weapon core actions on the weapon sheets (M22: the Stage 2 lance, sidearm, support gun
 * and grenade sheets; `fallback` for heroes with only the shared lance sheet).
 */
const WEAPON_POSES: Record<
  string,
  { sheet: string; cells: Phased; fallback?: { sheet: string; cells: Phased } }
> = {
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
  // M22 Telescoping Service Lance: lance-a (0 pick-up, 1 ready, 2 jab, 3 twist, 4 hook,
  // 5 throw), lance-b (0 thrust, 1 vault, 2 diving reach, 3 low stance, 4 aerial, 5 ground).
  'lance-jab': { sheet: 'lance-a', cells: [1, 2, 2] },
  'lance-twist': { sheet: 'lance-a', cells: [1, 3, 3] },
  'lance-extend': { sheet: 'lance-b', cells: [1, 0, 0], fallback: LANCE_A_REACH },
  'lance-reach': { sheet: 'lance-b', cells: [1, 0, 0], fallback: LANCE_A_REACH },
  'lance-hook': { sheet: 'lance-a', cells: [2, 4, 4] },
  'lance-vault': { sheet: 'lance-b', cells: [1, 1, 2], fallback: LANCE_A_REACH },
  'lance-low': {
    sheet: 'lance-b',
    cells: [3, 3, 3],
    fallback: { sheet: 'lance-a', cells: [1, 3, 3] },
  },
  'lance-air': { sheet: 'lance-b', cells: [4, 4, 4], fallback: LANCE_A_REACH },
  'lance-ground': { sheet: 'lance-b', cells: [5, 5, 5], fallback: LANCE_A_REACH },
  'lance-dash': { sheet: 'lance-b', cells: [0, 0, 0], fallback: LANCE_A_REACH },
  'lance-throw': { sheet: 'lance-a', cells: [5, 5, 5] },
  // Six-round sidearm (revolver: 0 pick-up, 1 aim, 2 recoil, 3 ready, 4 whip, 5 throw).
  'sidearm-shot': { sheet: 'revolver', cells: [1, 2, 3] },
  'sidearm-whip': { sheet: 'revolver', cells: [3, 4, 4] },
  'sidearm-throw': { sheet: 'revolver', cells: [5, 5, 5] },
  // Support gun and grenade (heavy: 0 ready, 1 burst, 2 stock, 3 gun throw, 4 grenade
  // pick-up, 5 grenade throw).
  'support-burst': { sheet: 'heavy', cells: [0, 1, 1] },
  'support-stock': { sheet: 'heavy', cells: [0, 2, 2] },
  'support-throw': { sheet: 'heavy', cells: [3, 3, 3] },
  'grenade-return': { sheet: 'heavy', cells: [4, 5, 5] },
};

/** M22: the ready stance a hero holds a Stage 2 weapon in (idle and walking). */
const WEAPON_STANCE: Record<string, { sheet: string; cell: number; walk: string }> = {
  'service-lance': { sheet: 'lance-a', cell: 1, walk: 'lance-walk' },
  'six-round-sidearm': { sheet: 'revolver', cell: 3, walk: 'revolver-walk' },
  'support-gun': { sheet: 'heavy', cell: 0, walk: 'heavy-walk' },
};

/** M22: how a Stage 2 weapon is carried when no pose art shows it (see heldProp). */
const S2_HELD: Record<
  string,
  SpriteFrame & { scale: number; angle: number; dx: number; dy: number; mirror?: boolean }
> = {
  'service-lance': { sheet: 'prop.s2-lance', cell: 2, scale: 0.8, angle: 0.1, dx: 30, dy: 200 },
  'six-round-sidearm': {
    sheet: 'prop.s2-firearms',
    cell: 0,
    scale: 0.3,
    angle: 0,
    dx: 60,
    dy: 190,
    mirror: true,
  },
  'support-gun': {
    sheet: 'prop.s2-firearms',
    cell: 2,
    scale: 0.55,
    angle: 0,
    dx: 40,
    dy: 185,
    mirror: true,
  },
};

/** Shared-sheet poses for actions without a sheet of their own. */
const CATEGORY_POSES: Partial<Record<string, { sheet: string; cells: Phased }>> = {
  counter: { sheet: 'exact-counter', cells: [2, 3, 4] },
  grab: { sheet: 'grab-throw', cells: [0, 0, 1] },
  grabStrike: { sheet: 'grab-throw', cells: [1, 1, 1] },
  throw: { sheet: 'grab-throw', cells: [2, 2, 5] },
};

/**
 * M16 poses drawn from another sheet or with authored cells: `sheet` is a key under
 * `hero.<id>.` (an action's own pose or a shared sheet), `cells` the startup cell, the
 * active cells (spread evenly over the active frames) and the recovery cell.
 */
type Posed = { sheet: string; cells: readonly [number, readonly number[], number] };
const HERO_POSES: Record<string, Record<string, Posed>> = {
  wind: {
    'open-gate-return': { sheet: 'sheet.exact-counter', cells: [1, [2, 3], 5] },
    'patrol-grip': { sheet: 'sheet.grab-throw', cells: [0, [0], 0] },
    'breeze-turn': { sheet: 'sheet.grab-throw', cells: [1, [1], 1] },
    'clear-path-cast': { sheet: 'sheet.grab-throw', cells: [2, [2], 2] },
    'clear-path-turn': { sheet: 'sheet.grab-throw', cells: [3, [3], 3] },
    'sentinel-heel': { sheet: 'sheet.grab-throw', cells: [4, [4], 4] },
    'four-wind-vigil': { sheet: 'pose.ultimate.four-wind-vigil', cells: [0, [1, 2, 3, 4], 5] },
    'twin-accord': { sheet: 'pose.team.twin-accord', cells: [0, [1, 2, 3], 5] },
    'confluence-strike': { sheet: 'sheet.team-attack', cells: [0, [1, 2, 3], 4] },
  },
  fire: {
    'ember-catch': { sheet: 'sheet.exact-counter', cells: [1, [3], 5] },
    'ember-catch-trip': { sheet: 'sheet.exact-counter', cells: [1, [2], 5] },
    'collar-tie': { sheet: 'sheet.grab-throw', cells: [0, [0], 0] },
    'iron-clinch': { sheet: 'sheet.grab-throw', cells: [1, [1], 1] },
    'foundry-reap': { sheet: 'sheet.grab-throw', cells: [2, [2], 2] },
    'foundry-turn': { sheet: 'sheet.grab-throw', cells: [3, [3], 3] },
    'kiln-door-release': { sheet: 'sheet.grab-throw', cells: [4, [4], 4] },
    'flashpoint-clinch': { sheet: 'pose.special.flashpoint-clinch', cells: [0, [1], 5] },
    'flashpoint-takedown': { sheet: 'pose.special.flashpoint-clinch', cells: [2, [2, 3], 4] },
    'wardens-crucible': { sheet: 'pose.ultimate.wardens-crucible', cells: [0, [1], 5] },
    'crucible-takedown': { sheet: 'pose.ultimate.wardens-crucible', cells: [2, [2, 3, 4], 5] },
    'crucible-braced': { sheet: 'pose.ultimate.wardens-crucible', cells: [1, [1, 2], 5] },
    'twin-accord': { sheet: 'pose.team.twin-accord', cells: [0, [1, 2, 3, 4], 5] },
    'confluence-strike': { sheet: 'sheet.team-attack', cells: [0, [1, 2, 3], 4] },
  },
  mountain: { 'confluence-strike': { sheet: 'sheet.team-attack', cells: [0, [1, 2, 3], 4] } },
  river: { 'confluence-strike': { sheet: 'sheet.team-attack', cells: [0, [1, 2, 3], 4] } },
};

/** The training dummy (Pressed Recruit) attack sheet: raise, contact, recover; rush. */
const RUSH = new Set(['two-step', 'barrage', 'wild-rush']);

/**
 * M7 enemy action poses: sheet suffix and the cells for startup, active and recovery, as
 * delivered in the Stage 1 sheets (codex_prompts_stage1.md).
 */
const ENEMY_POSES: Record<string, Record<string, { sheet: string; cells: Phased }>> = {
  shield: {
    'shield-bash': { sheet: 'attack', cells: [0, 1, 2] },
    'shield-charge': { sheet: 'attack', cells: [3, 4, 5] },
  },
  runner: {
    'palm-lunge': { sheet: 'attack', cells: [0, 1, 4] },
    'slide-kick': { sheet: 'attack', cells: [0, 2, 4] },
    'flying-kick': { sheet: 'air', cells: [0, 1, 4] },
    backflip: { sheet: 'air', cells: [5, 5, 4] },
  },
  overseer: {
    'hook-swing': { sheet: 'attack', cells: [0, 1, 2] },
    'pole-slam': { sheet: 'attack', cells: [3, 4, 5] },
    'rope-snare': { sheet: 'grab', cells: [0, 1, 2] },
    'drag-fling': { sheet: 'grab', cells: [3, 4, 4] },
  },
  lookout: {
    'sling-shot': { sheet: 'attack', cells: [1, 3, 4] },
    'elbow-shove': { sheet: 'attack', cells: [5, 5, 4] },
    backstep: { sheet: 'reposition', cells: [0, 0, 1] },
  },
  enforcer: {
    'gauntlet-punch': { sheet: 'attack-a', cells: [0, 1, 2] },
    'backhand-sweep': { sheet: 'attack-a', cells: [3, 4, 5] },
    'anvil-slam': { sheet: 'attack-b', cells: [0, 1, 2] },
    'iron-hug': { sheet: 'attack-b', cells: [3, 4, 5] },
    'anvil-shove': { sheet: 'attack-b', cells: [0, 1, 2] },
  },
  // --- M19 Stage 2 roles (variants use their base kit's art) ---
  claimhand: {
    'claim-jab': { sheet: 'attack-a', cells: [0, 1, 1] },
    'seizing-cross': { sheet: 'attack-a', cells: [0, 2, 2] },
    'bootline-kick': { sheet: 'attack-a', cells: [3, 4, 5] },
    'cut-in-hook': { sheet: 'attack-b', cells: [0, 1, 5] },
    'taxing-low-kick': { sheet: 'attack-b', cells: [0, 2, 5] },
    'overreach-elbow': { sheet: 'attack-b', cells: [3, 4, 5] },
  },
  glassrunner: {
    'aisle-tap': { sheet: 'attack', cells: [0, 0, 5] },
    'cross-aisle-kick': { sheet: 'attack', cells: [1, 2, 5] },
    'underbench-slide': { sheet: 'attack', cells: [3, 4, 5] },
    'rail-vault': { sheet: 'air', cells: [0, 1, 2] },
    'glassfall-heel': { sheet: 'air', cells: [3, 3, 4] },
    'rebound-exit': { sheet: 'air', cells: [5, 5, 5] },
  },
  reaver: {
    'load-check': { sheet: 'attack', cells: [0, 0, 5] },
    'load-elbow': { sheet: 'attack', cells: [1, 1, 5] },
    'brace-shove': { sheet: 'attack', cells: [2, 2, 5] },
    'load-bearing-sweep': { sheet: 'attack', cells: [3, 4, 5] },
    'dock-clamp': { sheet: 'grab', cells: [0, 2, 1] },
    'aisle-turn': { sheet: 'grab', cells: [4, 4, 4] },
    'pallet-drop': { sheet: 'grab', cells: [5, 5, 5] },
  },
  marauder: {
    'claim-shot': { sheet: 'aim', cells: [1, 2, 5] },
    'retreating-shot': { sheet: 'attack', cells: [0, 1, 2] },
    'close-check': { sheet: 'attack', cells: [5, 3, 5] },
    'claim-jab': { sheet: 'attack', cells: [5, 3, 5] },
    'bootline-kick': { sheet: 'attack', cells: [5, 3, 5] },
    'sidearm-throw': { sheet: 'attack', cells: [4, 4, 5] },
  },
  saboteur: {
    'tool-jab': { sheet: 'attack', cells: [0, 1, 1] },
    'panel-kick': { sheet: 'attack', cells: [2, 2, 3] },
    'covering-shove': { sheet: 'attack', cells: [4, 4, 5] },
    'breach-access': { sheet: 'breach', cells: [0, 0, 0] },
    'breach-tamper': { sheet: 'breach', cells: [1, 1, 1] },
    'breach-commit': { sheet: 'breach', cells: [2, 2, 5] },
    'exit-route': { sheet: 'breach', cells: [4, 4, 4] },
  },
  rider: {
    'claim-jab': { sheet: 'on-foot', cells: [0, 2, 0] },
    'bootline-kick': { sheet: 'on-foot', cells: [0, 3, 0] },
    'taxing-low-kick': { sheet: 'on-foot', cells: [0, 3, 0] },
  },
  enforcer2: {
    'iron-knuckle': { sheet: 'attack-a', cells: [0, 1, 5] },
    'rivet-elbow': { sheet: 'attack-a', cells: [2, 2, 5] },
    'anvil-heel': { sheet: 'attack-a', cells: [3, 4, 5] },
    'blackline-advance': { sheet: 'attack-b', cells: [0, 2, 1] },
    'anvil-sweep': { sheet: 'attack-b', cells: [3, 4, 5] },
    'iron-measure': { sheet: 'stance', cells: [0, 2, 1] },
  },
  signalman: {
    'baton-check': { sheet: 'attack', cells: [0, 1, 3] },
    'command-kick': { sheet: 'attack', cells: [2, 2, 3] },
    'low-marker': { sheet: 'attack', cells: [4, 4, 5] },
    'rearward-order': { sheet: 'exit', cells: [0, 0, 0] },
    'crossfang-call': { sheet: 'calls', cells: [3, 0, 0] },
    'guard-the-claim': { sheet: 'calls', cells: [3, 1, 1] },
    'replace-the-line': { sheet: 'calls', cells: [3, 2, 2] },
    'signal-break': { sheet: 'calls', cells: [4, 5, 5] },
  },
  marek: {
    'jackal-burst': { sheet: 'armed-a', cells: [0, 1, 2] },
    'sweeping-claim': { sheet: 'armed-a', cells: [3, 4, 5] },
    'stock-check': { sheet: 'armed-b', cells: [0, 1, 1] },
    'cover-shift': { sheet: 'armed-b', cells: [2, 3, 3] },
    'command-pressure': { sheet: 'armed-b', cells: [4, 5, 5] },
    'predator-elbow': { sheet: 'unbound-a', cells: [0, 1, 5] },
    'riding-boot': { sheet: 'unbound-a', cells: [3, 3, 5] },
    'claimants-advance': { sheet: 'unbound-b', cells: [2, 3, 5] },
    'road-cutter-sweep': { sheet: 'unbound-b', cells: [4, 4, 5] },
    'spoilsmans-grip': { sheet: 'unbound-c', cells: [0, 1, 2] },
    'carrion-descent': { sheet: 'unbound-c', cells: [3, 3, 5] },
    'carrion-boot': { sheet: 'unbound-c', cells: [4, 4, 5] },
    'jackals-measure': { sheet: 'unbound-b', cells: [0, 1, 5] },
    'scorched-claim': { sheet: 'scorched', cells: [1, 2, 3] },
  },
  commander: {
    'palm-strike': { sheet: 'attack-a', cells: [0, 1, 5] },
    roundhouse: { sheet: 'attack-a', cells: [0, 2, 5] },
    'spin-back-kick': { sheet: 'attack-a', cells: [3, 4, 5] },
    'flying-knee': { sheet: 'attack-b', cells: [1, 3, 4] },
    'double-palm': { sheet: 'attack-c', cells: [0, 0, 5] },
    'rising-knee': { sheet: 'attack-c', cells: [1, 1, 5] },
    'axe-kick': { sheet: 'attack-c', cells: [4, 4, 5] },
    'wheel-throw': { sheet: 'attack-c', cells: [2, 3, 5] },
    'winch-crank': { sheet: 'attack-c', cells: [2, 2, 2] },
    'sluice-parry': { sheet: 'attack-a', cells: [0, 0, 5] },
  },
};

/** Exit sheet cells: surrender (standing), kneeling, and the two flee-run cells (left). */
const EXIT_CELLS: Record<string, { surrender: number; kneel: number; flee: [number, number] }> = {
  trainer: { surrender: 0, kneel: 2, flee: [3, 4] },
  commander: { surrender: 0, kneel: 1, flee: [2, 3] },
  // M19: hesitate, back away, surrender (kneel), surrendered (sit), flee (two cells).
  claimhand: { surrender: 2, kneel: 3, flee: [4, 5] },
  glassrunner: { surrender: 2, kneel: 3, flee: [4, 5] },
  reaver: { surrender: 2, kneel: 3, flee: [4, 5] },
  marauder: { surrender: 2, kneel: 3, flee: [4, 5] },
  saboteur: { surrender: 2, kneel: 3, flee: [4, 5] },
  rider: { surrender: 2, kneel: 3, flee: [4, 5] },
  enforcer2: { surrender: 2, kneel: 3, flee: [4, 5] },
  signalman: { surrender: 4, kneel: 5, flee: [2, 3] },
};
/** M19: kits whose idle and walk come from another sheet (cells: idle pair, walk cycle). */
const IDLE_SHEETS: Record<string, { sheet: string; idle: number[]; walk: number[] }> = {
  glassrunner: { sheet: 'idle-run', idle: [0, 1], walk: [2, 3, 4, 5] },
  rider: { sheet: 'on-foot', idle: [0], walk: [0, 1] },
};
const EXIT_DEFAULT = { surrender: 0, kneel: 1, flee: [2, 3] as [number, number] };
/**
 * The Stage 1 exit sheets draw their flee run facing left; the M19 (Stage 2) exit sheets
 * draw it facing right like every other cell, so they flip as usual.
 */
const FLEE_DRAWN_RIGHT = new Set([
  'claimhand',
  'glassrunner',
  'reaver',
  'marauder',
  'saboteur',
  'rider',
  'enforcer2',
  'signalman',
]);

/**
 * The rescued workers' sheets (npc.worker-a/-b): 0 carrying, 1 burdened walk, 2 cowering,
 * 3 freed, 4 cheering, 5 running home. Cells 0–4 face right; the running-home cell is drawn
 * running left (looking back over the shoulder).
 */
export const WORKER_RUN_CELL = 5;

/** Should a worker's cell be mirrored so it faces the way it moves (vx < 0: left)? */
export function workerFlip(cell: number, vx: number): boolean {
  if (vx === 0) return false;
  const drawnLeft = cell === WORKER_RUN_CELL;
  return vx < 0 ? !drawnLeft : drawnLeft;
}

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
  fighter(f: Fighter, frame: number, boss?: BossView): SpriteFrame | null {
    return f.team === 'hero' ? this.hero(f, frame) : this.enemy(f, frame, boss);
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
    const stance = weapon ? WEAPON_STANCE[weapon.id] : undefined;
    const staff = weapon?.melee === true && weapon.id !== 'service-lance';
    const wheel = weapon !== undefined && !staff && !stance;
    switch (f.state) {
      case MoveState.Attack: {
        const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
        if (!a) return s('idle', 0);
        const p = phase(f, a);
        const wp = WEAPON_POSES[a.id];
        // A hero without Stage 1 weapon sheets (the twins) swings with its neutral starter.
        if (wp && a.pose.startsWith('weapon.'))
          return (
            s(wp.sheet, wp.cells[p]) ??
            (wp.fallback ? s(wp.fallback.sheet, wp.fallback.cells[p]) : null) ??
            this.starter(hero.actions[0]!, p)
          );
        const posed = HERO_POSES[hero.id]?.[a.id];
        if (posed && this.has(`${base}.${posed.sheet}`)) {
          const [start, active, end] = posed.cells;
          let cell = p === 0 ? start : end;
          if (p === 1) {
            const at = phaseOf(a, f.stateFrame + 1);
            cell =
              active[
                Math.min(active.length - 1, Math.floor(((at.at - 1) * active.length) / at.of))
              ]!;
          }
          return { sheet: `${base}.${posed.sheet}`, cell };
        }
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
        if (stance && meta(stance.sheet)) return s(stance.sheet, stance.cell);
        if (staff && meta('staff-a')) return s('staff-a', 0);
        if (wheel && meta('handwheel')) return s('handwheel', 0);
        return s('idle', loop(meta('idle'), frame, 6));
      case MoveState.Walk:
        // Armed walk cycles where delivered; otherwise step between the staff ready stance
        // and its mid-stride cell, and shift the handwheel carry between its two stances.
        // Stage 2 armed walk sheets where delivered; until then the plain walk cycle with
        // the weapon drawn in hand (heldProp), so the legs keep stepping.
        if (stance && meta(stance.walk)) return s(stance.walk, loop(meta(stance.walk), frame, 10));
        if (stance && meta(stance.sheet)) return s('walk', loop(meta('walk'), frame, 10));
        if (staff && meta('staff-walk'))
          return s('staff-walk', loop(meta('staff-walk'), frame, 10));
        if (wheel && meta('handwheel-walk'))
          return s('handwheel-walk', loop(meta('handwheel-walk'), frame, 10));
        if (staff && meta('staff-a')) return s('staff-a', loop(undefined, frame, 5, [0, 1]));
        if (wheel && meta('handwheel')) return s('handwheel', loop(undefined, frame, 5, [0, 3]));
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
      // M9 hold to interact (untying a worker, helping a partner up): the low reach pose.
      case MoveState.Channel:
        return s('breaker-pickup', 4);
      case MoveState.Grabbing:
        return s('grab-throw', 1);
      default:
        return this.reaction(f, s);
    }
  }

  /** The hero's neutral starter pose in a phase (fallback for missing weapon sheets). */
  private starter(a: ActionDef, p: 0 | 1 | 2): SpriteFrame | null {
    const own = this.has(a.pose);
    if (!own) return null;
    const cells = filled(own);
    const cell =
      p === 0
        ? cells[0]!
        : p === 2
          ? cells[cells.length - 1]!
          : cells[Math.min(1, cells.length - 1)]!;
    return { sheet: a.pose, cell };
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
      case MoveState.Defeated:
        return s('knockdown', 2);
      default:
        return s('idle', 0);
    }
  }

  private enemy(f: Fighter, frame: number, boss?: BossView): SpriteFrame | null {
    const kit = ENEMIES[f.hero];
    if (!kit) return null;
    // The Pressed Recruit wears the training dummy's sheets; M19 variants their base kit's.
    const art = kit.id === 'recruit' ? 'trainer' : (kit.art ?? kit.id);
    const base = `enemy.${art}.sheet`;
    const s = (key: string, cell: number, drawnLeft = false): SpriteFrame | null =>
      this.has(`${base}.${key}`) ? { sheet: `${base}.${key}`, cell, drawnLeft } : null;
    const isBoss = boss !== undefined && boss.id === f.id;
    const p2 = isBoss && boss.phase >= 1;
    const react = p2 && this.has(`${base}.react-p2`) ? 'react-p2' : 'react';
    const exitSheet = p2 && this.has(`${base}.exit-p2`) ? 'exit-p2' : 'exit';
    const exit = EXIT_CELLS[art] ?? EXIT_DEFAULT;
    const look = isBoss ? (boss.look ?? 1) : 1;
    const idle =
      look === 3 && this.has(`${base}.scorched`)
        ? { sheet: 'scorched', idle: [0], walk: [1] }
        : look >= 2 && this.has(`${base}.unbound-idle-walk`)
          ? { sheet: 'unbound-idle-walk', idle: [0, 1], walk: [2, 3, 4, 5] }
          : art === 'marauder' && f.item === 0 && this.has(`${base}.disarm`)
            ? { sheet: 'disarm', idle: [3], walk: [3] }
            : (IDLE_SHEETS[art] ?? { sheet: 'idle-walk', idle: [0, 1], walk: [2, 3, 4, 5] });
    if (isBoss && boss.shift > 0) {
      // Phase transition: the PHASE sheet plays through once over the shift.
      const meta = this.has(`${base}.phase`);
      const last = meta ? Math.max(0, filled(meta).length - 1) : 5;
      const n = Math.min(
        last,
        Math.floor(((boss.shiftFrames - boss.shift) * (last + 1)) / boss.shiftFrames),
      );
      return s('phase', Math.max(0, n)) ?? s(idle.sheet, 0);
    }
    if (isBoss && (boss.capture ?? 0) > 0 && f.state === MoveState.Surrender) {
      // M19 capture: the Resolve surrender (kneel, open hands, raise, restrained) or the
      // forced capture (collapse, the short last attempt, spent, restrained).
      const age = boss.captureAge ?? f.stateFrame;
      if (boss.capture === 1) {
        const cell = age < 30 ? 0 : age < 60 ? 1 : age < 120 ? 2 : 3;
        return s('exit-surrender', cell) ?? s(exitSheet, exit.surrender);
      }
      const cell = age < 20 ? 0 : age < 60 ? 1 : age < 80 ? 2 : age < 150 ? 3 : 4;
      return s('exit-capture', cell) ?? s(exitSheet, exit.kneel);
    }
    if (isBoss && boss.stagger > 0 && f.state !== MoveState.Launched && f.state !== MoveState.Down)
      return s('stagger', f.stateFrame < 20 ? 0 : loop(undefined, frame, 3, [1, 2]));
    switch (f.state) {
      case MoveState.Idle:
      case MoveState.Pickup:
        return s(idle.sheet, loop(undefined, frame, 3, idle.idle));
      case MoveState.Walk:
        // M19 Lockstep Escort: the screening steps of the Stage 2 Enforcer.
        if (f.order === 2 && this.has(`${base}.stance`))
          return s('stance', loop(undefined, frame, 4, [3, 4]));
        return s(idle.sheet, loop(undefined, frame, 8, idle.walk));
      case MoveState.Guard:
        return (
          s('guard', 0) ??
          s('armor', 0) ??
          (f.order === 2 ? s('stance', 3) : null) ??
          s('stance', 0) ??
          s(idle.sheet, idle.idle[0]!)
        );
      case MoveState.Attack:
      case MoveState.Grabbing:
      case MoveState.Counter: {
        const a = f.action >= 0 ? kitOf(f)?.actions[f.action] : undefined;
        const p = a ? phase(f, a) : 1;
        const own = a ? ENEMY_POSES[art]?.[a.id] : undefined;
        if (own) {
          // The lookout loads the sling before it aims (the warning pose).
          if (a?.id === 'sling-shot' && p === 0 && f.stateFrame < 12) return s('attack', 0);
          return s(own.sheet, own.cells[p]) ?? s(idle.sheet, 0);
        }
        // M19 visible counter stances (Iron Measure, Jackal's Measure) before an action runs.
        if (f.state === MoveState.Counter)
          return s('stance', 0) ?? s('unbound-b', 0) ?? s('attack', 0);
        if (a && WEAPON_POSES[a.id]) return s('attack-c', [2, 3, 5][p]!) ?? s('attack', p);
        return s('attack', (a && RUSH.has(a.id) ? 3 : 0) + p);
      }
      case MoveState.Blockstun:
        return s('guard', 1) ?? s('armor', 1) ?? s(react, 0);
      case MoveState.GuardCrush:
        return s('guard', f.stateFrame < f.stun / 2 ? 4 : 5) ?? s(react, 1);
      case MoveState.Hitstun:
      case MoveState.Recoil:
      case MoveState.Grabbed:
      case MoveState.Restrained:
        if (art === 'rider') return s('on-foot', 4);
        return s(react, f.stun > 20 ? 1 : 0);
      case MoveState.Launched:
        return s(react, 2) ?? s('on-foot', 5);
      case MoveState.Down:
      case MoveState.Defeated:
        if (art === 'rider') return s('on-foot', 5);
        return s(react, 3);
      case MoveState.GetUp:
      case MoveState.Recover:
        if (art === 'rider') return s('on-foot', 0);
        return s(react, f.stateFrame < f.stun / 2 ? 4 : 5);
      case MoveState.Flee: {
        const cell = loop(undefined, frame, 8, exit.flee);
        return s(exitSheet, cell, !FLEE_DRAWN_RIGHT.has(art)) ?? s('idle-walk', 2);
      }
      case MoveState.Surrender:
        return s(exitSheet, f.stateFrame < 40 ? exit.surrender : exit.kneel) ?? s(react, 3);
      case MoveState.PhaseShift:
        return s('phase', 0) ?? s('idle-walk', 0);
      default:
        return s('idle-walk', 0);
    }
  }

  /**
   * The prop a hero holds when its own sheets have no pose with that weapon (the twins and
   * the Stage 1 workstaff or handwheel): sheet, cell, scale, tilt (radians, toward the
   * facing side) and the hand point (px forward of and above the ground point). Null when
   * the hero's pose art already shows the weapon, or for any other weapon.
   */
  heldProp(
    f: Fighter,
  ):
    | (SpriteFrame & { scale: number; angle: number; dx: number; dy: number; mirror?: boolean })
    | null {
    const hero = HEROES[f.hero];
    const weapon = f.wkit >= 0 ? WEAPONS[f.wkit] : undefined;
    if (f.team !== 'hero' || !hero || !weapon) return null;
    const base = `hero.${hero.id}.sheet`;
    if (weapon.id === 'workstaff' && !this.has(`${base}.staff-a`) && this.has('prop.workstaff'))
      return { sheet: 'prop.workstaff', cell: 1, scale: 0.9, angle: 0.5, dx: 30, dy: 170 };
    if (weapon.id === 'handwheel' && !this.has(`${base}.handwheel`) && this.has('prop.handwheel'))
      return { sheet: 'prop.handwheel', cell: 1, scale: 0.3, angle: 0, dx: 55, dy: 185 };
    // M22: a Stage 2 weapon while walking (no armed walk sheets yet), or always for a hero
    // without that weapon's stance sheet. The firearm pictures point left (mirror).
    const stance = WEAPON_STANCE[weapon.id];
    const walking = f.state === MoveState.Walk && !this.has(`${base}.${stance?.walk}`);
    if (stance && (walking || !this.has(`${base}.${stance.sheet}`))) {
      const held = S2_HELD[weapon.id];
      if (held && this.has(held.sheet)) return held;
    }
    return null;
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
    // M22 Stage 2 weapons: the lance by condition (extended, loose collars, bent), the
    // sidearm (cylinder open when empty), the support gun, the grenade, the support rail.
    const S2_ITEM: Partial<Record<string, SpriteFrame>> = {
      'service-lance': { sheet: 'prop.s2-lance', cell: flying ? 1 : [2, 4, 5][cond]! },
      'six-round-sidearm': { sheet: 'prop.s2-firearms', cell: item.ammo === 0 ? 1 : 0 },
      'support-gun': { sheet: 'prop.s2-firearms', cell: 2 },
      'breaching-grenade': { sheet: 'prop.s2-firearms', cell: 4 },
      'support-rail': { sheet: 'prop.s2-env-b', cell: 1 },
    };
    const s2 = S2_ITEM[def.id];
    if (s2 && this.has(s2.sheet)) return s2;
    return null;
  }
}
