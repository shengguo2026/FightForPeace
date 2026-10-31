import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

test('the game serves a byte-identical copy of the repo favicon', () => {
  expect(readFileSync(root('apps/game/public/favicon.svg'))).toEqual(
    readFileSync(root('favicon.svg')),
  );
});

test('index.html sets the tab title and favicon', () => {
  const html = readFileSync(root('apps/game/index.html'), 'utf8');
  expect(html).toContain('<title>Fight For Peace</title>');
  expect(html).toContain('href="/favicon.svg"');
});

test('no game source hard-codes a localhost origin or port', () => {
  const sources = ['main.ts', 'game.ts', 'debug.ts', 'scenes/StageScene.ts', 'ui/LabOverlay.tsx'];
  for (const s of sources) {
    expect(readFileSync(root(`apps/game/src/${s}`), 'utf8')).not.toMatch(/localhost|127\.0\.0\.1/);
  }
});
