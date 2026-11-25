import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MUSEUM, STORE } from '../../packages/platform/src/index';

/**
 * M28: every Stage 3 shell picture the Museum, the Sponsor Dossier and the Store show is in
 * the build (art/shell/<name>.webp).
 */
const SHELL = join(__dirname, '../../apps/game/public/art/shell');
const has = (name: string) => existsSync(join(SHELL, `${name}.webp`));

test('the Stage 3 Museum pictures and artifacts are in the build', () => {
  for (const m of MUSEUM.filter((x) => x.stage === 'stage3')) {
    if (m.section === 'collection') expect(has(`artifact-${m.asset}`), m.id).toBe(true);
    if (m.section === 'picture') expect(has(m.asset), m.id).toBe(true);
  }
  expect(has('s3-invoice')).toBe(true);
  for (const name of ['keyart-s3', 'menu-bg-s3', 'badge-silvermist', 'badge-ridge-unhooked'])
    expect(has(name), name).toBe(true);
});

test('each Coming-soon outfit has its preview render', () => {
  const items = STORE.filter((s) => /mountain-rescue|highland-festival/.test(s.id));
  expect(items).toHaveLength(8);
  for (const s of items) {
    const [, , hero, kind] = s.id.split('.');
    expect(has(`outfit-${hero}-${kind}`), s.id).toBe(true);
  }
});
