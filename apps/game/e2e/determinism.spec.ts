import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { ReplayLog } from '@ffp/sim';

const log = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../tests/replays/walk-square.json', import.meta.url)),
    'utf8',
  ),
) as ReplayLog;

test('the golden replay produces the same hash in this browser', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__ffp !== undefined);
  const hash = await page.evaluate((l) => window.__ffp!.runReplay(l), log);
  expect(hash).toBe(log.expectedHash);
});
