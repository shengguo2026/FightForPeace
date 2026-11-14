import { expect, test, type Page } from '@playwright/test';

/**
 * M24 Combat Constitution audit: each Lab test scene starts in the browser and draws
 * without a page error (kept to one short pass: the browser jobs are near the CI limit).
 */
test.describe.configure({ timeout: 120_000 });

const SCENES = [
  'lab-m24-hazards',
  'lab-m24-platform',
  'lab-m24-gear',
  'lab-m24-marshal',
  'lab-m24-riders',
  'lab-m24-rivals',
  'lab-m24-weapons',
  'lab-m24-handover',
  'lab-m24-robot',
];

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

test('every M24 Lab scene starts, runs and draws', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  for (const arena of SCENES) {
    await page.evaluate((a) => window.__ffp!.startArena(a, 'medium'), arena);
    await page.waitForFunction((a) => window.__ffp!.encounter()?.arena === a, arena);
    const start = await page.evaluate(() => window.__ffp!.frame());
    await page.waitForFunction((f) => window.__ffp!.frame() > f + 120, start, { timeout: 30_000 });
    if (arena === 'lab-m24-hazards' || arena === 'lab-m24-riders')
      await page.screenshot({ path: `test-results/m24-${arena}-${testInfo.project.name}.png` });
  }
  expect(errors).toEqual([]);
  // The mount catalogue corridor (Lab pursuit) starts too.
  await page.evaluate(() =>
    window.__ffp!.startPursuit('pursuit-m24-mounts', { difficulty: 'easy' }),
  );
  const start = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForFunction((f) => window.__ffp!.frame() > f + 120, start);
  expect(errors).toEqual([]);
});
