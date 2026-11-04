import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC = `${ROOT}apps/game/public/`;

interface Manifest {
  assets: Record<string, { url: string; sheet?: unknown }>;
}

test('every manifest sheet ships with the game, and every shipped sheet is in the manifest', () => {
  const manifest = JSON.parse(
    readFileSync(`${ROOT}packages/platform/src/assets/manifest.json`, 'utf8'),
  ) as Manifest;
  const urls = Object.values(manifest.assets)
    .filter((a) => a.sheet)
    .map((a) => a.url);
  for (const url of urls) expect(existsSync(PUBLIC + url), url).toBe(true);
  const files = readdirSync(`${PUBLIC}art`).map((f) => `art/${f}`);
  expect(files.sort()).toEqual([...urls].sort());
});
