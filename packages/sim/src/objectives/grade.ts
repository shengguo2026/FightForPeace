/**
 * M25 shared grade module (campaign review G13): one 100-point grade for every stage and
 * mission. A grade is a list of weighted categories, each given a share (0–100 percent) by
 * the caller's measure; points are `weight × share / 100` (truncated), the rank comes from
 * the total on the rank thresholds, then category caps (a category below a share of its
 * weight) and condition caps (an authored state reached, e.g. any group Critical) lower it.
 * A stage may give Cheat-Assisted runs no grade. The letter and band helpers every results
 * screen uses live here too.
 */

/** Rank letters from lowest to highest. */
export const RANK_LETTERS = ['C', 'B', 'A', 'S'] as const;
/** The rank shown when a run receives no grade (Cheat-Assisted where the stage says so). */
export const NO_RANK = '-';

/** The letter for a percentage on rank thresholds [S, A, B] (below B is C). */
export function rankFor(percent: number, ranks: readonly number[]): string {
  if (percent >= ranks[0]!) return 'S';
  if (percent >= ranks[1]!) return 'A';
  if (percent >= ranks[2]!) return 'B';
  return 'C';
}

/** The first band (ordered from the highest `min`) a percentage reaches; else the last. */
export function bandFor<T extends { min: number }>(percent: number, bands: readonly T[]): T {
  return bands.find((b) => percent >= b.min) ?? bands.at(-1)!;
}

/** Share (0–100) of `n` out of `of`; nothing to do counts as full. */
export function ratio(n: number, of: number): number {
  return of === 0 ? 100 : Math.trunc((Math.min(n, of) * 100) / of);
}

/** One measured category: its id, weight, share (0–100) and the value text shown. */
export interface GradeInput {
  id: string;
  weight: number;
  share: number;
  value: string;
}

export interface GradeRules {
  /** Rank thresholds on the 100-point total: S, A, B. */
  ranks: readonly number[];
  /** A category below `below` percent of its weight caps the rank at `rank`. */
  caps: readonly { category: string; below: number; rank: string }[];
}

/** A condition cap that applies (its reason id, e.g. `rescue.critical`) and its rank. */
export interface ConditionCap {
  reason: string;
  rank: string;
}

export interface GradeLine {
  id: string;
  value: string;
  /** S, A, B or C (the category's share on the rank thresholds). */
  grade: string;
  points: number;
  weight: number;
}

export interface GradeOutcome {
  lines: GradeLine[];
  points: number;
  /** S, A, B, C, or NO_RANK when the run receives no grade. */
  overall: string;
  /** The cap that lowered the rank (a category id or a condition reason), or null. */
  capped: string | null;
}

/** Lowers `overall` to `rank` when that is lower. */
function lower(overall: string, rank: string): boolean {
  return (
    RANK_LETTERS.indexOf(rank as never) < RANK_LETTERS.indexOf(overall as never) &&
    RANK_LETTERS.includes(rank as never)
  );
}

/**
 * The 100-point grade. `conditions` are the condition caps that apply this run (the caller
 * decides from its data which states were reached); `noGrade` gives NO_RANK.
 */
export function grade100(
  rules: GradeRules,
  inputs: readonly GradeInput[],
  conditions: readonly ConditionCap[] = [],
  noGrade = false,
): GradeOutcome {
  const lines: GradeLine[] = inputs.map((c) => ({
    id: c.id,
    value: c.value,
    grade: rankFor(c.share, rules.ranks),
    points: Math.trunc((c.weight * c.share) / 100),
    weight: c.weight,
  }));
  const points = lines.reduce((n, x) => n + x.points, 0);
  if (noGrade) return { lines, points, overall: NO_RANK, capped: null };
  let overall = rankFor(points, rules.ranks);
  let capped: string | null = null;
  for (const cap of rules.caps) {
    const x = lines.find((e) => e.id === cap.category);
    if (!x || x.points * 100 >= cap.below * x.weight) continue;
    if (lower(overall, cap.rank)) {
      overall = cap.rank;
      capped = cap.category;
    }
  }
  for (const cap of conditions) {
    if (lower(overall, cap.rank)) {
      overall = cap.rank;
      capped = cap.reason;
    }
  }
  return { lines, points, overall, capped };
}
