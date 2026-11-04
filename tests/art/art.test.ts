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
  const files = readdirSync(`${PUBLIC}art`).map((f) => `art/${f}`);
  expect(files.sort()).toEqual([...urls].sort());
});
