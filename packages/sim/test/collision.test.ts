import { BODY_HALF_W, ON_FOOT } from '../src/movement/profile';
import { fx } from '../src/math/fixed';
import { hashWorld, step } from '../src/world/world';
import { hero, idle, inp, repeat, run, world } from './helpers';

test('overlapping heroes separate gently and can walk through each other', () => {
  const w = world();
  step(w, [idle, idle]); // spawn P2
  const p1 = hero(w, 0);
  const p2 = hero(w, 1);
  p2.x = p1.x + fx(10);
  p2.z = p1.z;
  step(w, [idle, idle]);
  expect(p2.x - p1.x).toBe(fx(12)); // 1 px each
  // P1 walks right through P2 and comes out on the other side.
  for (let i = 0; i < 60; i += 1) step(w, [inp({ moveX: 1 }), idle]);
  expect(p1.x).toBeGreaterThan(p2.x);
});

test('a hero walking diagonally into a dummy slides along it', () => {
  const w = world({ dummies: 1 });
  const h = hero(w);
  const d = w.bodies.find((b) => b.id === 101)!;
  h.x = d.x - fx(100);
  h.z = d.z - fx(10);
  const z0 = h.z;
  run(w, repeat(inp({ moveX: 1, moveZ: -1 }), 60));
  expect(h.z).toBeLessThan(z0 - fx(40)); // kept moving in depth
  expect(h.x).toBeGreaterThan(d.x - fx(100)); // and got past the corner
});

test('walking straight into a dummy pushes it at a quarter of the speed', () => {
  const w = world({ dummies: 1 });
  const h = hero(w);
  const d = w.bodies.find((b) => b.id === 101)!;
  h.x = d.x - 2 * BODY_HALF_W;
  h.z = d.z;
  const dx0 = d.x;
  run(w, repeat(inp({ moveX: 1 }), 40));
  expect(d.x).toBeGreaterThan(dx0);
  expect(d.x - h.x).toBeGreaterThanOrEqual(2 * BODY_HALF_W - ON_FOOT.walkX);
  expect(h.passEnemies).toBe(false);
});

function pinned() {
  const w = world({ dummies: 2, dummiesChase: true });
  const h = hero(w);
  h.x = fx(30);
  h.z = fx(800);
  const [a, b] = w.bodies.filter((x) => x.team === 'enemy');
  a!.x = fx(110);
  a!.z = fx(790);
  b!.x = fx(110);
  b!.z = fx(815);
  run(w, repeat(idle, 30)); // dummies close in
  return { w, h };
}

test('a pinned hero walks out sideways in depth within a second (Review Focus 5)', () => {
  const { w, h } = pinned();
  const z0 = h.z;
  run(w, repeat(inp({ moveZ: 1 }), 60));
  expect(h.z - z0).toBeGreaterThan(fx(60));
});

test('a hero held by a pushing crowd passes through after the anti-trap delay', () => {
  const { w, h } = pinned();
  let passed = false;
  for (let i = 0; i < 90; i += 1) {
    run(w, [inp({ moveX: 1 })]);
    passed ||= h.passEnemies;
  }
  expect(passed).toBe(true);
  expect(h.x).toBeGreaterThan(fx(150));
});

test('collision order is stable: body array order does not change the hash', () => {
  const make = (reverse: boolean) => {
    const w = world({ dummies: 2, dummiesChase: true });
    step(w, [idle, idle]);
    if (reverse) w.bodies.reverse();
    for (let i = 0; i < 120; i += 1) step(w, [inp({ moveX: 1 }), inp({ moveX: 1, moveZ: -1 })]);
    return hashWorld(w);
  };
  expect(make(true)).toBe(make(false));
});
