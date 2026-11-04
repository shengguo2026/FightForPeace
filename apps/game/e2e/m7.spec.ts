import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

test('the arena panel starts a trial on a Stage 1 backdrop, and End returns to the Lab', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.getByTestId('arena-start').click();
  await page.waitForFunction(() => (window.__ffp!.encounter()?.enemies.length ?? 0) > 0);
  const enc = await page.evaluate(() => window.__ffp!.encounter()!);
  expect(enc.difficulty).toBe('medium');
  expect(enc.enemies.map((e) => e.kit)).toEqual(['recruit', 'recruit', 'recruit']);
  const res = await page.request.get('/art/bg-fields-far.webp');
  expect(res.ok()).toBe(true);
  // The recruits walk in and the director lets some of them commit, inside the budget.
  await page.waitForFunction(() => window.__ffp!.encounter()!.threat > 0, null, {
    timeout: 30_000,
  });
  const live = await page.evaluate(() => window.__ffp!.encounter()!);
  expect(live.threat).toBeLessThanOrEqual(live.budget);
  await expect(page.getByTestId('arena-diagnostics')).toContainText('threat');
  await page.screenshot({ path: `test-results/m7-trial-${testInfo.project.name}.png` });
  await page.keyboard.press('End');
  await page.waitForFunction(() => window.__ffp!.encounter() === null);
  const items = await page.evaluate(() => window.__ffp!.items().map((i) => i.weapon));
  expect(items).toEqual(['workstaff', 'handwheel']);
});

test('the Sluice Commander fights on the Sluice plate with Resolve and three phases', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.evaluate(() => window.__ffp!.startArena('boss-commander', 'easy'));
  await page.waitForFunction(() => window.__ffp!.encounter()?.boss !== null);
  const enc = await page.evaluate(() => window.__ffp!.encounter()!);
  expect(enc.arena).toBe('boss-commander');
  expect(enc.boss).toEqual({ phase: 0, resolve: 240, stagger: 0, pending: false });
  expect((await page.request.get('/art/bg-sluice-plate.webp')).ok()).toBe(true);
  expect((await page.request.get('/art/commander-phase.webp')).ok()).toBe(true);
  await page.keyboard.press('F1');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/m7-boss-${testInfo.project.name}.png` });
  // Home restarts the picked arena (a fresh world: the frame count starts again).
  const before = await page.evaluate(() => window.__ffp!.frame());
  await page.keyboard.press('Home');
  await page.waitForFunction((f) => window.__ffp!.frame() < f, before);
  expect(await page.evaluate(() => window.__ffp!.encounter()!.arena)).toBe('boss-commander');
});
