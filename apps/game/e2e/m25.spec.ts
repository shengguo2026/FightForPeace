import { expect, test, type Page } from '@playwright/test';

/**
 * M25 objective and grade framework: the Lab test room starts, draws the captive, the
 * evidence case and the grade panel, and its objective state follows the enemies (kept to
 * one short pass: the browser jobs are near the CI limit).
 */
test.describe.configure({ timeout: 240_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

test('the M25 test room starts, draws and grades', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.evaluate(() => window.__ffp!.startArena('lab-m25-objectives', 'medium'));
  await page.waitForFunction(() => window.__ffp!.encounter()?.arena === 'lab-m25-objectives');
  const o = await page.evaluate(() => window.__ffp!.objectives());
  expect(o).not.toBeNull();
  expect(o!.units).toEqual([{ phase: 0, count: 0, locked: false, condition: 0 }]);
  expect(o!.cases).toEqual([{ state: 0, outcome: 'missing' }]);
  // Secure captive, case not collected yet: 70 of 100 points, rank B.
  expect(o!.grade).toEqual({ points: 70, overall: 'B', capped: null });
  await page.evaluate(() => window.__ffp!.m25Action('checkpoint'));
  const start = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForFunction((f) => window.__ffp!.frame() > f + 30, start, { timeout: 45_000 });
  await page.screenshot({ path: `test-results/m25-room-${testInfo.project.name}.png` });
  await page.evaluate(() => window.__ffp!.m25Action('restore'));
  expect(errors).toEqual([]);
});
