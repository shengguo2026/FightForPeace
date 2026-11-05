import { describe, expect, it } from 'vitest';
import { createWorld, hashWorld, step } from '../src/world/world';
import { cheatRegistryHash, restoreWorld, rulesHash, snapshotWorld } from '../src/net/snapshot';
import { stageBotInput } from './stageBot';

describe('M12 world snapshots', () => {
  it('a restored snapshot continues exactly like the original (co-op Stage 1)', () => {
    const a = createWorld(7, { stage: 'stage1', difficulty: 'medium' });
    for (let f = 0; f < 1500; f += 1) step(a, [stageBotInput(a, 0), stageBotInput(a, 1)]);
    const snap = snapshotWorld(a);
    const b = restoreWorld(snap);
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(b.frame).toBe(1500);
    for (let f = 0; f < 1500; f += 1) {
      step(a, [stageBotInput(a, 0), stageBotInput(a, 1)]);
      step(b, [stageBotInput(b, 0), stageBotInput(b, 1)]);
    }
    expect(hashWorld(b)).toBe(hashWorld(a));
    // A LAN snapshot stays small enough to send at once.
    expect(snap.world.length).toBeLessThan(1_000_000);
  });

  it('refuses a damaged snapshot or one from other rules', () => {
    const w = createWorld(1, { stage: 'stage1' });
    const s = snapshotWorld(w);
    expect(() => restoreWorld({ ...s, rules: 'm0' })).toThrow();
    expect(() =>
      restoreWorld({ ...s, world: s.world.replace('"frame":0', '"frame":1') }),
    ).toThrow();
  });

  it('has stable rules and cheat registry hashes', () => {
    expect(rulesHash()).toBe(rulesHash());
    expect(rulesHash()).toBeGreaterThan(0);
    expect(cheatRegistryHash()).toBeGreaterThan(0);
  });
});
