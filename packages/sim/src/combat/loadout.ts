import type { Fighter } from '../world/types';
import { Dir, type HeroDef } from './types';

/**
 * Five-slot Special and Ultimate loadouts (spec §9). Slots are indexed by Dir (Neutral,
 * Forward, Backward, Up, Down); Special slots are 0–4 and Ultimate slots 5–9 of the
 * loadout array. Neutral slots hold the fixed signatures; empty slots (-1) never fall back.
 */
export const SLOTS = 5;
export type LoadoutKind = 'special' | 'ultimate';

const base = (kind: LoadoutKind) => (kind === 'special' ? 0 : SLOTS);

/** An empty loadout (enemies). */
export function emptyLoadout(): number[] {
  return Array.from({ length: SLOTS * 2 }, () => -1);
}

/** The default loadout of a kit: every non-catalogue Special and Ultimate in its input slot. */
export function defaultLoadout(kit: HeroDef | undefined): number[] {
  const out = emptyLoadout();
  if (!kit) return out;
  kit.actions.forEach((a, i) => {
    if ((a.context === 'special' || a.context === 'ultimate') && !a.catalogue) {
      if (a.dir >= 0 && a.dir < SLOTS) out[base(a.context) + a.dir] = i;
    }
  });
  return out;
}

/** The move in a slot (dir is a Dir code 0–4), or -1. */
export function loadoutAction(f: Fighter, kind: LoadoutKind, dir: number): number {
  if (dir < 0 || dir >= SLOTS) return -1;
  return f.loadout[base(kind) + dir] ?? -1;
}

/** Why an equip request was refused. */
export type EquipResult = 'ok' | 'fixed' | 'incompatible' | 'unknown';

/** Moves of a kit that may go into a slot (owned: in the Lab every move is owned). */
export function compatibleMoves(kit: HeroDef, kind: LoadoutKind, dir: number): number[] {
  const out: number[] = [];
  kit.actions.forEach((a, i) => {
    if (a.context === kind && a.slots.includes(dir)) out.push(i);
  });
  return out;
}

/**
 * Puts a move (action index, or -1 to empty the slot) into a slot of `loadout`. The
 * neutral slots are fixed; a move only goes into a slot it lists; a move already in
 * another slot of the same kind moves (that slot becomes empty).
 */
export function equipMove(
  loadout: number[],
  kit: HeroDef,
  kind: LoadoutKind,
  dir: number,
  action: number,
): EquipResult {
  if (dir < 0 || dir >= SLOTS) return 'unknown';
  if (dir === Dir.Neutral) return 'fixed';
  const b = base(kind);
  if (action >= 0) {
    const a = kit.actions[action];
    if (!a) return 'unknown';
    if (a.context !== kind || !a.slots.includes(dir)) return 'incompatible';
    for (let i = 0; i < SLOTS; i += 1) if (loadout[b + i] === action) loadout[b + i] = -1;
  }
  loadout[b + dir] = action;
  return 'ok';
}
