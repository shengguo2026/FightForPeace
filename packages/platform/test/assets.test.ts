import { HEROES } from '@ffp/sim';
import { AssetRegistry, familyOf } from '../src/assets/registry';

test('every hero action resolves to a placeholder of its own category (Review Focus 6)', () => {
  const reg = new AssetRegistry();
  for (const hero of HEROES) {
    for (const a of hero.actions) {
      const r = reg.resolve(a.pose);
      expect(r.kind).toBe('placeholder');
      if (r.kind === 'placeholder') expect(r.family).toBe(a.category);
    }
  }
});

test('aerial actions, and only aerial actions, use the aerial placeholder', () => {
  const aerial = HEROES.flatMap((h) => h.actions).filter((a) => familyOf(a.pose) === 'aerial');
  expect(aerial.map((a) => a.id).sort()).toEqual(
    [
      'bank-switch-arc',
      'cornerstone-sweep',
      'current-chase',
      'ebbturn-heel',
      'rafter-palm',
      'reedwing-tap',
      'stonefall-knee',
    ].sort(),
  );
});

test('a manifest entry replaces the placeholder; candidates do not', () => {
  const reg = new AssetRegistry({
    version: 1,
    assets: {
      'hero.mountain.pose.aerial.rafter-palm': { url: 'assets/rafter.png' },
      'hero.river.pose.low.undertow-slide': { url: 'assets/slide.png', status: 'candidate' },
    },
  });
  expect(reg.resolve('hero.mountain.pose.aerial.rafter-palm')).toEqual({
    kind: 'approved',
    id: 'hero.mountain.pose.aerial.rafter-palm',
    url: 'assets/rafter.png',
  });
  expect(reg.resolve('hero.river.pose.low.undertow-slide').kind).toBe('placeholder');
  expect(reg.resolve('sfx.hit.light.01')).toMatchObject({ kind: 'placeholder', family: 'sound' });
});
