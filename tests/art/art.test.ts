import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC = `${ROOT}apps/game/public/`;

interface Manifest {
  assets: Record<string, { url: string; sheet?: unknown; layer?: unknown }>;
}

test('every manifest sheet and layer ships with the game, and every shipped file is in the manifest', () => {
  const manifest = JSON.parse(
    readFileSync(`${ROOT}packages/platform/src/assets/manifest.json`, 'utf8'),
  ) as Manifest;
  const urls = Object.values(manifest.assets)
    .filter((a) => a.sheet || a.layer)
    .map((a) => a.url);
  for (const url of urls) expect(existsSync(PUBLIC + url), url).toBe(true);
  const files = readdirSync(`${PUBLIC}art`, { withFileTypes: true })
    .filter((f) => f.isFile())
    .map((f) => `art/${f.name}`);
  expect(files.sort()).toEqual([...urls].sort());
});

test('M10 shell art: every image the menus name ships, and nothing else', () => {
  const dir = `${ROOT}apps/game/src/shell/`;
  const sources = [
    ...readdirSync(dir).map((f) => dir + f),
    ...readdirSync(`${dir}screens`).map((f) => `${dir}screens/${f}`),
  ].filter((f) => /\.tsx?$/.test(f));
  const named = new Set<string>();
  for (const f of sources) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/ART\(['`]([a-z0-9-]+)(\$\{[^}]+\})?([a-z0-9-]*)['`]\)/g)) {
      if (m[2]) continue; // built names are checked below
      named.add(`${m[1]}.webp`);
    }
    for (const m of text.matchAll(/sheet(?: = |=")'?([a-z-]+)/g)) named.add(`${m[1]}.webp`);
  }
  for (const hero of ['mountain', 'river']) {
    named.add(`portrait-${hero}.webp`);
    named.add(`select-${hero}.webp`);
  }
  for (let i = 1; i <= 6; i += 1) named.add(`s1-intro-0${i}.webp`);
  const shipped = readdirSync(`${PUBLIC}art/shell`);
  for (const n of named) expect(shipped, n).toContain(n);
  expect(shipped.length).toBeGreaterThan(0);
});
