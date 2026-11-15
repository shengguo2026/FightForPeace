/**
 * M25: what the objective state means for results: a unit's condition on its ladder, a
 * case's outcome, and an arena's live 100-point grade on the shared grade module.
 */
import type { World } from '../world/types';
import { ARENAS } from '../enemies/data';
import { type ConditionCap, type GradeInput, type GradeOutcome, grade100 } from './grade';
import { stepChannels } from './channels';
import { stepUnits } from './units';
import { CaseState, type EvidenceCase, ladderOf, objectiveDefs, outcomeOf } from './state';

/** Once per frame after hits and collision: channels, then units. */
export function stepObjectives(world: World): void {
  if (!world.objectives) return;
  stepChannels(world);
  stepUnits(world);
}

/** Index of the ladder state a unit is in (its hostile-action count on its ladder). */
export function unitCondition(world: World, unit: number): number {
  const d = objectiveDefs(world)!.units[unit]!;
  const count = world.objectives!.units[unit]!.count;
  const states = ladderOf(d.ladder).states;
  let s = 0;
  states.forEach((x, i) => {
    if (count >= x.at) s = i;
  });
  return s;
}

/** Outcome ids, from best to worst. */
export type CaseOutcome = 'documented' | 'recovered' | 'disturbed' | 'missing';

/**
 * A case's outcome as it stands: never disturbed and collected (or sealed) is Documented;
 * disturbed and then recovered (or sealed again) is Recovered; still disturbed is
 * Disturbed; never collected is Missing.
 */
export function caseOutcome(c: EvidenceCase): CaseOutcome {
  if (c.state === CaseState.Present) return 'missing';
  if (c.state === CaseState.Disturbed) return 'disturbed';
  return c.disturbed ? 'recovered' : 'documented';
}

export interface ObjectiveGrade extends GradeOutcome {
  /** The arena's id. */
  arena: string;
}

/** The live grade of an arena with its own `grade` (null: none). */
export function objectiveGrade(world: World): ObjectiveGrade | null {
  const o = world.objectives;
  const defs = objectiveDefs(world);
  const g = o ? ARENAS[o.arena]?.grade : null;
  if (!o || !defs || !g) return null;
  const avg = (shares: number[]) =>
    shares.length === 0 ? 100 : Math.trunc(shares.reduce((n, x) => n + x, 0) / shares.length);
  const inputs: GradeInput[] = g.categories.map((c) => {
    if (c.measure === 'units') {
      const shares = o.units.map(
        (_, i) => ladderOf(defs.units[i]!.ladder).states[unitCondition(world, i)]!.share,
      );
      const share = avg(shares);
      return { id: c.id, weight: c.weight, share, value: `${share}%` };
    }
    const shares = o.cases.map((k, i) => outcomeOf(defs.cases[i]!.outcome)[caseOutcome(k)]);
    const share = avg(shares);
    return { id: c.id, weight: c.weight, share, value: `${share}%` };
  });
  const conditions: ConditionCap[] = g.conditionCaps.flatMap((cap) => {
    const states = ladderOf(cap.ladder).states;
    const at = states.findIndex((s) => s.id === cap.state);
    const hit = o.units.some(
      (_, i) => defs.units[i]!.ladder === cap.ladder && unitCondition(world, i) >= at,
    );
    return hit ? [{ reason: `${cap.ladder}.${cap.state}`, rank: cap.rank }] : [];
  });
  const noGrade = g.cheat === 'none' && world.cheats.marked;
  return { arena: ARENAS[o.arena]!.id, ...grade100(g, inputs, conditions, noGrade) };
}
