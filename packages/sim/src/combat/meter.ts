import type { ComboContext, Fighter, World } from '../world/types';
import type { ActionDef } from './types';

/**
 * Attack meter (F&D §6.6 Authored Per-Action Gain with Independent Combo Decay). The meter
 * is kept in tenths of a percent so the gain bands stay exact in integers.
 */
export const METER = {
  /** A full bar: 100 %. */
  max: 1000,
  /** Internal units per percent. */
  unit: 10,
  /** Meter-gain budget points of a fresh combo context. */
  budget: 100,
  /** Guarded contact earns this share of the authored gain, in percent. */
  guardShare: 25,
  /** Each extra unique enemy hit by the same action: this share, while the total stays ≤ 150 %. */
  crowdShare: 25,
  crowdCap: 150,
} as const;

/** Gain band (percent) for the meter-gain budget left before an action. */
export function gainBand(budget: number): number {
  if (budget > 70) return 100;
  if (budget > 30) return 60;
  if (budget > 0) return 25;
  return 0;
}

/** Crowd share (percent) of the `nth` unique target (0-based) of one action. */
export function crowdShare(nth: number): number {
  if (nth === 0) return 100;
  const before = 100 + (nth - 1) * METER.crowdShare;
  return Math.max(0, Math.min(METER.crowdShare, METER.crowdCap - before));
}

/** Ultimates and cinematic actions never feed the meter they spend. */
function earnsMeter(a: ActionDef): boolean {
  return a.category !== 'ultimate';
}

/**
 * Meter for the first hit of an action on a target with an open context: the authored
 * gain × the crowd share × the context's band; the context's budget pays the action's
 * decay cost once. Returns the gain (internal units).
 */
export function awardHitMeter(
  world: World,
  owner: Fighter,
  a: ActionDef,
  ctx: ComboContext,
  nth: number,
): number {
  if (!earnsMeter(a)) return 0;
  const band = gainBand(ctx.meterBudget);
  ctx.meterBudget = Math.max(0, ctx.meterBudget - a.meterDecay);
  const gain = Math.trunc((a.meterGain * METER.unit * crowdShare(nth) * band) / 10000);
  return addMeter(world, owner, gain);
}

/** A guarded contact earns a quarter of the authored gain (no context, no decay). */
export function awardGuardMeter(world: World, owner: Fighter, a: ActionDef): number {
  if (!earnsMeter(a)) return 0;
  return addMeter(world, owner, Math.trunc((a.meterGain * METER.unit * METER.guardShare) / 100));
}

export function addMeter(world: World, f: Fighter, gain: number): number {
  f.meter = Math.min(METER.max, f.meter + gain);
  if (world.infiniteMeter) f.meter = METER.max;
  return gain;
}

/** Meter shown as a whole percentage. */
export function meterPercent(f: Fighter): number {
  return Math.trunc(f.meter / METER.unit);
}
