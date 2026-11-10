import { expect, test } from 'vitest';
import { enemyKitIndex } from '../src/enemies/data';
import { newEncounter } from '../src/enemies/encounter';
import { spawnEnemy } from '../src/enemies/boss';
import { fx } from '../src/math/fixed';
import { MoveState } from '../src/world/types';
import { createWorld } from '../src/world/world';

test('a new lock never reuses the id of an enemy still kneeling from an earlier lock', () => {
  const w = createWorld(1, { stage: 'stage1', difficulty: 'easy', heroes: ['river', 'mountain'] });
  const kneeling = spawnEnemy(w, enemyKitIndex('recruit'), fx(1000), fx(800));
  kneeling.state = MoveState.Surrender;
  // The next lock starts a fresh encounter, whose id sequence begins at the base again.
  w.encounter = newEncounter(w.encounter!.arena, 0, w.frame);
  const fresh = [0, 1, 2].map(() => spawnEnemy(w, enemyKitIndex('shield'), fx(3000), fx(800)));
  const ids = w.bodies.map((b) => b.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(fresh.map((f) => f.id)).not.toContain(kneeling.id);
});
