import { describe, expect, test } from 'vitest';
import { STAGES, clock, stagePreservation, stageResponse, stageResults } from '../src/stage/run';
import type { GradeCategoryDef, StageDef } from '../src/combat/types';
import { RunPhase, type StageRun, type World } from '../src/world/types';
import { createWorld, step } from '../src/world/world';
import { gradeOf as recordLetter } from '../src/mounted/pursuit';
import { stageBotInput } from './stageBot';

/**
 * M25 rule 1: Stage 1 and Stage 2 results through the shared grade module give exactly what
 * the M24 formulas gave. The M24 code is copied here as the reference and compared on bot
 * runs and on many synthetic run records.
 */
const M24_LETTERS = ['C', 'B', 'A', 'S'];
function m24Rank(percent: number, ranks: readonly number[]): string {
  if (percent >= ranks[0]!) return 'S';
  if (percent >= ranks[1]!) return 'A';
  if (percent >= ranks[2]!) return 'B';
  return 'C';
}
function m24Measure(c: GradeCategoryDef, run: StageRun, def: StageDef) {
  const s = run.stats;
  const ratio = (n: number, of: number) =>
    of === 0 ? 100 : Math.trunc((Math.min(n, of) * 100) / of);
  switch (c.measure) {
    case 'workers':
      return {
        pct: ratio(s.workersFreed, run.workersTotal),
        value: `${s.workersFreed}/${run.workersTotal}`,
      };
    case 'clues': {
      const found = s.clues + s.evidence;
      return { pct: ratio(found, run.cluesTotal), value: `${found}/${run.cluesTotal}` };
    }
    case 'continues':
      return {
        pct: Math.trunc((Math.max(0, c.allowance - run.continuesUsed) * 100) / c.allowance),
        value: `${run.continuesUsed}`,
      };
    case 'time': {
      const secs = Math.trunc(s.frames / 60);
      const par = def.timePar;
      const pct = secs <= par[0]! ? 100 : secs <= par[1]! ? 75 : secs <= par[2]! ? 50 : 25;
      return { pct, value: clock(s.frames) };
    }
    case 'preservation': {
      const pct = stagePreservation(run)?.percent ?? 100;
      return { pct, value: `${pct}%` };
    }
    case 'response': {
      const pct = stageResponse(run)?.percent ?? 100;
      return { pct, value: `${pct}%` };
    }
    default:
      // M28 Stage 3 measures have no M24 reference (Stages 1 and 2 never use them).
      throw new Error(`no M24 reference for measure ${c.measure}`);
  }
}
function m24Results(w: World) {
  const run = w.run!;
  const def = STAGES[run.stage]!;
  const g = def.grade;
  const grades = g.categories.map((c) => {
    const m = m24Measure(c, run, def);
    return {
      id: c.id,
      value: m.value,
      grade: m24Rank(m.pct, g.ranks),
      points: Math.trunc((c.weight * m.pct) / 100),
      weight: c.weight,
    };
  });
  const points = grades.reduce((n, x) => n + x.points, 0);
  let overall = m24Rank(points, g.ranks);
  let capped: string | null = null;
  for (const cap of g.caps) {
    const x = grades.find((e) => e.id === cap.category);
    if (!x || x.points * 100 >= cap.below * x.weight) continue;
    if (M24_LETTERS.indexOf(cap.rank) < M24_LETTERS.indexOf(overall)) {
      overall = cap.rank;
      capped = cap.category;
    }
  }
  return { grades, points, overall, capped };
}
const mine = (w: World) => {
  const r = stageResults(w)!;
  return { grades: r.grades, points: r.points, overall: r.overall, capped: r.capped };
};

/** A small deterministic generator for the synthetic records. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
}

describe('M25: Stage 1 and Stage 2 grades on the shared module', () => {
  test('both stages keep their M24 grade data; no condition caps, Cheat-Assisted runs graded', () => {
    // M28: Stage 3 grades no Cheat-Assisted run (spec §22.2).
    for (const s of STAGES.filter((x) => x.id !== 'stage3')) expect(s.grade.cheat).toBe('grade');
  });

  test.each(['stage1', 'stage2'])('%s: synthetic records grade exactly as in M24', (stage) => {
    const w = createWorld(5, { stage, difficulty: 'medium' });
    const rnd = lcg(stage.length * 7919);
    const run = w.run!;
    for (let i = 0; i < 400; i += 1) {
      run.stats.workersFreed = rnd(run.workersTotal + 1);
      run.stats.clues = rnd(3);
      run.stats.evidence = rnd(2);
      run.continuesUsed = rnd(5);
      run.stats.frames = rnd(60 * 60 * 40);
      run.response = rnd(2)
        ? [{ beat: 1, scores: [rnd(101), rnd(101), rnd(101)], rewinds: 0, mastery: false }]
        : [];
      run.ledger = rnd(2)
        ? [{ beat: 2, name: 'pump', kind: 0, condition: rnd(101), state: rnd(5) }]
        : [];
      w.cheats.marked = rnd(2) === 1;
      expect(mine(w)).toEqual(m24Results(w));
    }
  });

  test.each(['stage1', 'stage2'])('%s: a bot run grades exactly as in M24', (stage) => {
    const w = createWorld(7, { stage, difficulty: 'easy' });
    for (let i = 0; i < 20000 && w.run!.phase !== RunPhase.Complete; i += 1) {
      step(w, [stageBotInput(w, 0)]);
      if (i % 2500 === 0) expect(mine(w)).toEqual(m24Results(w));
    }
    expect(mine(w)).toEqual(m24Results(w));
  });

  test('the Response Record letters keep their thresholds', () => {
    const m24 = (n: number) => (n >= 90 ? 'S' : n >= 75 ? 'A' : n >= 55 ? 'B' : 'C');
    for (let n = 0; n <= 100; n += 1) expect(recordLetter(n)).toBe(m24(n));
  });
});
