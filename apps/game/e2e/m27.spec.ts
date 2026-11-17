import { expect, test, type Page } from '@playwright/test';

/**
 * M27 Stage 3 systems: every Stage 3 Lab room (the roles, the quarry rooms and Garran's
 * phases) starts in the browser and draws without a page error, and the Horse Test Track
 * starts (one short pass: the browser jobs are near the CI limit).
 */
test.describe.configure({ timeout: 300_000 });

const ROOMS = [
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
];
const SHOTS = new Set(['lab-m27-scaffold', 'lab-m27-raider', 'lab-m27-garran']);

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

test('every M27 room starts, runs and draws; the horse track starts', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  for (const arena of ROOMS) {
    await page.evaluate((a) => window.__ffp!.startArena(a, 'medium'), arena);
    await page.waitForFunction((a) => window.__ffp!.encounter()?.arena === a, arena);
    const start = await page.evaluate(() => window.__ffp!.frame());
    await page.waitForFunction((f) => window.__ffp!.frame() > f + 30, start, { timeout: 45_000 });
    if (SHOTS.has(arena))
      await page.screenshot({ path: `test-results/m27-${arena}-${testInfo.project.name}.png` });
  }
  expect(errors).toEqual([]);
  await page.evaluate(() =>
    window.__ffp!.startPursuit('horse-test-track', { difficulty: 'medium' }),
  );
  const start = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForFunction((f) => window.__ffp!.frame() > f + 60, start, { timeout: 45_000 });
  await page.screenshot({ path: `test-results/m27-horse-track-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});
