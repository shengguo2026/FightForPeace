import { describe, expect, test } from 'vitest';
import { STAGES, beatOf, stageResults } from '../src/stage/run';
import { snapshotWorld, restoreWorld } from '../src/net/snapshot';
import { MoveState, RunPhase, type World } from '../src/world/types';
import { createWorld, hashWorld, step } from '../src/world/world';
import { stageBotInput } from './stageBot';

/**
 * M23 outcome coverage (spec §17, §18) that M19/M20 do not already pin: every Stage 2
 * checkpoint resumes deterministically (snapshot and restore, and a continue), a continue
 * later in a segment always returns to that segment's checkpoint with its records, and the
 * last continue spent restarts the stage cleanly (D8). Covered elsewhere, listed in
 * docs/review/09-stage2-acceptance.md: both capture presentations and every Marek phase
 * (m19), every branch outcome and Preservation grade and the Cheat-Assisted path (m20),
 * the clean path (m23-paths).
 */
const STAGE2 = STAGES.find((s) => s.id === 'stage2')!;
const CHECKPOINTS = STAGE2.beats.flatMap((b, i) => (b.checkpoint ? [i] : []));

function play(w: World, n: number, heroes: number): void {
  for (let i = 0; i < n && w.run!.phase !== RunPhase.Complete; i += 1)
    step(
      w,
      Array.from({ length: heroes }, (_, s) => stageBotInput(w, s)),
    );
}

function defeat(w: World): void {
  for (const h of w.bodies.filter((b) => b.team === 'hero')) {
    h.health = 0;
    h.ko = true;
    h.state = MoveState.Defeated;
  }
  const idle = { moveX: 0, moveZ: 0, pressed: 0, held: 0, dirPressed: 0 } as const;
  const n = w.bodies.filter((b) => b.team === 'hero').length;
  for (let i = 0; i < STAGE2.rules.defeatHold + STAGE2.rules.transition + 30; i += 1)
    step(
      w,
      Array.from({ length: n }, () => idle),
    );
}

describe('Stage 2 checkpoints', () => {
  test('there are four, as the spec names them', () => {
    expect(CHECKPOINTS.map((b) => STAGE2.beats[b]!.id)).toEqual([
      'loading-yard',
      'vestibule',
      'production-hall',
      'intercept',
    ]);
  });

  for (const beat of CHECKPOINTS)
    for (const heroes of [['wind'], ['mountain', 'fire']])
      test(`${STAGE2.beats[beat]!.id}, ${heroes.join(' + ')}: a snapshot resumes to the same hash`, () => {
        const w = createWorld(11, { stage: 'stage2', difficulty: 'medium', heroes, beat });
        play(w, 400, heroes.length);
        const copy = restoreWorld(snapshotWorld(w));
        expect(hashWorld(copy)).toBe(hashWorld(w));
        play(w, 900, heroes.length);
        play(copy, 900, heroes.length);
        expect(hashWorld(copy)).toBe(hashWorld(w));
      });

  for (const [n, beat] of CHECKPOINTS.entries()) {
    const id = STAGE2.beats[beat]!.id;
    test(`a continue anywhere after ${id} returns to it with its records`, () => {
      const next = CHECKPOINTS[n + 1] ?? STAGE2.beats.length;
      const w = createWorld(11, { stage: 'stage2', difficulty: 'easy', heroes: ['fire'], beat });
      const saved = JSON.stringify(w.run!.checkpoint);
      // Play on until the run is in a later beat of the segment (or the segment's last).
      for (let i = 0; i < 60 * 60 * 6 && w.run!.beat === beat; i += 1) {
        for (const h of w.bodies) if (h.team === 'hero') h.health = h.maxHealth;
        step(w, [stageBotInput(w, 0)]);
      }
      if (w.run!.beat >= next) return; // a one-beat segment (the intercept): nothing later
      expect(w.run!.checkpoint && JSON.stringify(w.run!.checkpoint)).toBe(saved);
      const used = w.run!.continuesUsed;
      defeat(w);
      expect(w.run!.continuesUsed).toBe(used + 1);
      expect(beatOf(w)!.id).toBe(id);
      expect(JSON.stringify(w.run!.checkpoint)).toBe(saved);
    });
  }

  test('the last continue spent: the stage starts again at the pursuit with fresh continues', () => {
    const w = createWorld(11, {
      stage: 'stage2',
      difficulty: 'medium',
      heroes: ['river'],
      beat: CHECKPOINTS[2],
    });
    const continues = w.run!.continues;
    for (let k = 0; k <= continues; k += 1) defeat(w);
    expect(beatOf(w)!.id).toBe('perimeter');
    expect(w.run!.continues).toBe(continues);
    expect(w.run!.continuesUsed).toBe(0);
    expect(w.run!.ledger).toEqual([]);
    // The restarted run still reaches the results (heroes kept alive: the route only).
    for (let i = 0; i < 60 * 60 * 15 && w.run!.phase !== RunPhase.Complete; i += 1) {
      for (const h of w.bodies) if (h.team === 'hero' && !h.ko) h.health = h.maxHealth;
      step(w, [stageBotInput(w, 0)]);
    }
    expect(w.run!.phase).toBe(RunPhase.Complete);
    expect(stageResults(w)!.capture).not.toBeNull();
  });
});
