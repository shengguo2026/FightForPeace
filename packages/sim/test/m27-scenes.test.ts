import { createWorld, hashWorld, step } from '../src/world/world';
import { ARENAS } from '../src/enemies/data';
import { CORRIDORS, setupPursuit } from '../src/mounted/pursuit';
import { botInput } from './arenaBot';

/**
 * Every M27 Lab room (the Stage 3 roles, the quarry rooms and every Garran phase) runs
 * headless with the test bot, solo and co-op, at Medium and Ultimate, without an exception
 * and deterministically. The Horse Test Track runs solo and co-op.
 */
const ROOMS = ARENAS.filter((a) => a.id.startsWith('lab-m27-')).map((a) => a.id);

test('every M27 room is in the Lab', () => {
  expect(ROOMS).toEqual([
    'lab-m27-ambusher',
    'lab-m27-bruiser',
    'lab-m27-trapper',
    'lab-m27-raider',
    'lab-m27-stalker',
    'lab-m27-captain',
    'lab-m27-scaffold',
    'lab-m27-hammer-line',
    'lab-m27-cart-rails',
    'lab-m27-outer-fence',
    'lab-m27-garran-hook',
    'lab-m27-garran-clinch',
    'lab-m27-garran-winch',
    'lab-m27-garran',
  ]);
});

const CASES = ROOMS.flatMap((arena) =>
  (['medium', 'ultimate'] as const).flatMap((difficulty) =>
    [false, true].map((coop) => [arena, difficulty, coop] as const),
  ),
);

test.each(CASES)('%s at %s (co-op %s) runs 30 s deterministically', (arena, difficulty, coop) => {
  const run = () => {
    const w = createWorld(27, { arena, difficulty });
    for (let i = 0; i < 1800 && w.encounter!.result === 0; i += 1)
      step(w, coop ? [botInput(w, 0), botInput(w, 1)] : [botInput(w)]);
    return w;
  };
  const a = run();
  expect(hashWorld(a)).toBe(hashWorld(run()));
  expect(a.frame).toBeGreaterThan(300);
});

test.each([false, true])('the Horse Test Track runs (co-op %s)', (coop) => {
  const w = createWorld(3, { difficulty: 'medium' });
  setupPursuit(
    w,
    CORRIDORS.findIndex((c) => c.id === 'horse-test-track'),
    1,
  );
  const ride = { moveX: 1 as const, moveZ: 0 as const, pressed: 0, held: 0, dirPressed: 0 };
  for (let i = 0; i < 5000 && w.pursuit!.phase === 0; i += 1) step(w, coop ? [ride, ride] : [ride]);
  expect(w.pursuit!.phase).not.toBe(0);
  if (coop) expect(w.pursuit!.riders.length).toBe(2);
});
