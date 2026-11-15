import { createWorld, hashWorld, step } from '../src/world/world';
import { ARENAS } from '../src/enemies/data';
import { CORRIDORS, setupPursuit } from '../src/mounted/pursuit';
import { botInput } from './arenaBot';

/**
 * Every M24 Lab test scene runs headless with the test bot (solo and co-op) for its scripted
 * length without an exception, deterministically, and ends with M24 state in the world.
 */
const SCENES = ARENAS.filter((a) => a.id.startsWith('lab-m24-')).map((a) => a.id);

test('there is a Lab scene for every engine feature', () => {
  expect(SCENES).toEqual([
    'lab-m24-hazards',
    'lab-m24-platform',
    'lab-m24-gear',
    'lab-m24-marshal',
    'lab-m24-riders',
    'lab-m24-rivals',
    'lab-m24-weapons',
    'lab-m24-handover',
    'lab-m24-robot',
  ]);
});

test.each(SCENES)('%s runs 40 s solo and co-op, deterministically', (arena) => {
  for (const coop of [false, true]) {
    const run = () => {
      const w = createWorld(11, { arena, difficulty: 'medium' });
      for (let i = 0; i < 2400 && w.encounter!.result === 0; i += 1)
        step(w, coop ? [botInput(w, 0), botInput(w, 1)] : [botInput(w)]);
      return w;
    };
    const a = run();
    expect(hashWorld(a)).toBe(hashWorld(run()));
    // Item-only scenes create M24 state only once a feature is used.
    if (!['lab-m24-weapons', 'lab-m24-handover'].includes(arena)) expect(a.shared).toBeDefined();
    expect(a.frame).toBeGreaterThan(300);
  }
});

test('the mount catalogue corridor runs to its end', () => {
  const w = createWorld(2, { difficulty: 'easy' });
  setupPursuit(
    w,
    CORRIDORS.findIndex((c) => c.id === 'pursuit-m24-mounts'),
    0,
  );
  const idle = { moveX: 1 as const, moveZ: 0 as const, pressed: 0, held: 0, dirPressed: 0 };
  for (let i = 0; i < 4000 && w.pursuit!.phase === 0; i += 1) step(w, [idle]);
  expect(w.pursuit!.phase).not.toBe(0);
});
