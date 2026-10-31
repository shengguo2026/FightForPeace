import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { ReplayLog } from '@ffp/sim';

const load = (name: string) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../../tests/replays/${name}.json`, import.meta.url)),
      'utf8',
    ),
  ) as ReplayLog;

for (const name of ['walk-square', 'dash-jump', 'crowd', 'combo-routes']) {
  test(`golden replay ${name} produces the same hash in this browser`, async ({ page }) => {
    const log = load(name);
    await page.goto('/');
    await page.waitForFunction(() => window.__ffp !== undefined);
    const hash = await page.evaluate((l) => window.__ffp!.runReplay(l), log);
    expect(hash).toBe(log.expectedHash);
  });
}
