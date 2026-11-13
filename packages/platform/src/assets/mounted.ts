/**
 * M22 mounted art: which cell of the Stage 2 mounted sheets (2x2 grids of rider and bike)
 * a hero rider, a Road Rider or Marek on his bike shows. Pure, so the choice is tested
 * without a renderer; the corridor's greybox bike is drawn only where no sheet exists.
 *
 * Hero sheets (per hero): `mount-ride` (cruise, steer up, steer down, brake),
 * `mount-attack` (Passing Palm wind-up and strike, kick wind-up and strike),
 * `mount-defense` (hop up, hop landing, lean, lean held), `mount-special` and
 * `mount-ultimate` (four steps each), `mount-stability` (low Stability, skid, dismounted,
 * rescue reach). Road Rider: `mount-ride` (ride, Brake-Fade, Cutoff Line, Breakaway),
 * `mount-attack` (Parallel Check and Passing Boot, wind-up and strike each),
 * `mount-stability` (brace, critical, safe crash, down). Marek: `mounted` (ride, aim,
 * arrival, cut-in) and `mounted-break` (critical, crash, dismounted twice).
 */
import { EnemyState, MountedSlot, RiderState } from '@ffp/sim';

export interface MountPick {
  sheet: string;
  cell: number;
}

/** Hero rider state the picker needs (a subset of the simulation's HeroRider). */
export interface HeroRideView {
  state: number;
  critical: boolean;
  /** Mounted slot of the running action (-1 none). */
  slot: number;
  /** Frames since the action began, and its whole length. */
  actionAge: number;
  actionLength: number;
  /** Signed lane change still to make (pixels; negative is up the screen). */
  steer: number;
  /** Below cruising speed (braking or slowed). */
  braking: boolean;
  /** Frames since the state began. */
  stateAge: number;
}

const STEER_DEADZONE = 12;

/** The hero's mounted cell (null: dismounted at the corridor's end, drawn on foot). */
export function heroMountCell(hero: string, r: HeroRideView): MountPick | null {
  const sheet = (k: string) => `hero.${hero}.sheet.mount-${k}`;
  if (r.state === RiderState.Done || r.state === RiderState.Out) return null;
  if (r.state === RiderState.Crash) return { sheet: sheet('stability'), cell: 1 };
  if (r.state === RiderState.Downed) return { sheet: sheet('stability'), cell: 2 };
  if (r.state === RiderState.Action && r.slot >= 0) {
    const t = r.actionLength > 0 ? Math.min(0.999, r.actionAge / r.actionLength) : 0;
    const step = Math.floor(t * 4);
    switch (r.slot) {
      case MountedSlot.Neutral:
        return { sheet: sheet('attack'), cell: t < 0.35 ? 1 : 0 };
      case MountedSlot.Directional:
        return { sheet: sheet('attack'), cell: t < 0.35 ? 3 : 2 };
      case MountedSlot.Hop:
        return { sheet: sheet('defense'), cell: t < 0.6 ? 0 : 1 };
      case MountedSlot.Lean:
        return { sheet: sheet('defense'), cell: t < 0.3 ? 2 : 3 };
      case MountedSlot.Special:
        return { sheet: sheet('special'), cell: step };
      case MountedSlot.Ultimate:
        return { sheet: sheet('ultimate'), cell: step };
    }
  }
  if (r.critical) return { sheet: sheet('stability'), cell: 0 };
  if (r.steer < -STEER_DEADZONE) return { sheet: sheet('ride'), cell: 1 };
  if (r.steer > STEER_DEADZONE) return { sheet: sheet('ride'), cell: 2 };
  if (r.braking) return { sheet: sheet('ride'), cell: 3 };
  return { sheet: sheet('ride'), cell: 0 };
}

/** Road Rider or Marek state the picker needs. */
export interface EnemyRideView {
  boss: boolean;
  state: number;
  critical: boolean;
  /** Rider action index (0 Parallel Check, 1 Passing Boot). */
  attack: number;
}

/** A Road Rider's or Marek's mounted cell. */
export function enemyMountCell(e: EnemyRideView): MountPick {
  if (e.boss) {
    const ride = 'enemy.marek.sheet.mounted';
    const brk = 'enemy.marek.sheet.mounted-break';
    switch (e.state) {
      case EnemyState.Crash:
        return { sheet: brk, cell: 1 };
      case EnemyState.Down:
      case EnemyState.Leave:
        return { sheet: brk, cell: 2 };
      case EnemyState.Enter:
        return { sheet: ride, cell: 2 };
      case EnemyState.Windup:
      case EnemyState.Strike:
        return { sheet: ride, cell: 1 };
      case EnemyState.Cutoff:
        return { sheet: ride, cell: 3 };
    }
    return e.critical ? { sheet: brk, cell: 0 } : { sheet: ride, cell: 0 };
  }
  const ride = 'enemy.rider.sheet.mount-ride';
  const atk = 'enemy.rider.sheet.mount-attack';
  const stab = 'enemy.rider.sheet.mount-stability';
  const pair = e.attack === 1 ? 2 : 0;
  switch (e.state) {
    case EnemyState.Windup:
      return { sheet: atk, cell: pair + 1 };
    case EnemyState.Strike:
      return { sheet: atk, cell: pair };
    case EnemyState.Recover:
      return { sheet: stab, cell: 0 };
    case EnemyState.Cutoff:
      return { sheet: ride, cell: 2 };
    case EnemyState.Fade:
      return { sheet: ride, cell: 1 };
    case EnemyState.Leave:
      return { sheet: ride, cell: 3 };
    case EnemyState.Crash:
      return { sheet: stab, cell: 2 };
    case EnemyState.Down:
      return { sheet: stab, cell: 3 };
  }
  return e.critical ? { sheet: stab, cell: 1 } : { sheet: ride, cell: 0 };
}
