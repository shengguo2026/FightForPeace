import { type ComboContext, GroundTag } from '../world/types';

/** Candidate budget sizes (Features_Decisions §10.2, spec §7.7). */
export const STUN_BUDGET = 100;
export const JUGGLE_BUDGET = 100;
export const METER_BUDGET = 30;
export const DAMAGE_FLOOR = 30;

export function emptyContext(): ComboContext {
  return {
    open: false,
    actions: 0,
    hits: 0,
    damage: 0,
    scale: 100,
    stunBudget: STUN_BUDGET,
    juggleBudget: JUGGLE_BUDGET,
    meterBudget: METER_BUDGET,
    bridgeUsed: false,
    exhausted: false,
    groundTag: GroundTag.None,
    lastDamage: 0,
  };
}

/** Hit-stun multiplier (percent) for the budget remaining before an action. */
export function stunBand(budget: number): number {
  if (budget > 70) return 100;
  if (budget > 30) return 75;
  return 50;
}

/** Scaled hit-stun, rounded down, at least one frame. */
export function scaledHitstun(hitstun: number, budget: number): number {
  return Math.max(1, Math.trunc((hitstun * stunBand(budget)) / 100));
}

/** Damage of hit `i` (0-based) out of `n` for a move whose total is scaled once. */
export function splitDamage(base: number, scale: number, i: number, n: number): number {
  const total = Math.trunc((base * Math.max(scale, DAMAGE_FLOOR)) / 100);
  return Math.trunc((total * (i + 1)) / n) - Math.trunc((total * i) / n);
}
