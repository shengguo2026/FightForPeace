import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

async function ready(page: Page, query: string) {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 30);
}

/** Clears the room's raiders until its lock is done (debug hook; the director may refill). */
async function clearRoom(page: Page, until: () => boolean) {
  for (let i = 0; i < 60; i += 1) {
    await page.evaluate(() => window.__ffp!.clearEnemies());
    if (await page.evaluate(until)) return;
    await page.waitForTimeout(400);
  }
  throw new Error('the room did not clear');
}

test('Stage 2 opens on the Perimeter Pursuit as its first beat', async ({ page }, testInfo) => {
  await ready(page, '?stage=2&difficulty=easy');
  const run = (await page.evaluate(() => window.__ffp!.run()))!;
  expect(run.beatId).toBe('perimeter');
  expect(run.branches).toHaveLength(14);
  expect((await page.evaluate(() => window.__ffp!.pursuit()))?.corridor).toBe('perimeter-pursuit');
  await page.screenshot({ path: `test-results/m20-pursuit-${testInfo.project.name}.png` });
});

test('leaving the Aquaculture Hall on the upper lane takes the optional Annex', async ({
  page,
}, testInfo) => {
  await ready(page, '?stage=2&beat=3&difficulty=easy');
  await page.waitForFunction(() => window.__ffp!.greenhouse()?.room === 's2-aquaculture-hall');
  await clearRoom(page, () => {
    const r = window.__ffp!.run()!;
    return r.phase !== 1 && r.locksDone >= r.locks;
  });
  const width = await page.evaluate(() => window.__ffp!.run()!.width);
  await page.evaluate((w) => window.__ffp!.moveHeroes(w - 300, 680), width);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `test-results/m20-lanes-${testInfo.project.name}.png` });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__ffp!.run()!.beatId === 'aeration-annex', null, {
    timeout: 30_000,
  });
  await page.keyboard.up('KeyD');
  await page.waitForFunction(() => window.__ffp!.greenhouse()?.room === 's2-aeration-annex');
});

test('the Dispatch Yard evidence ends Stage 2 with the epilogue and the Ledger', async ({
  page,
}, testInfo) => {
  await ready(page, '?stage=2&beat=14&difficulty=easy');
  await clearRoom(page, () => window.__ffp!.run()!.evidence === 1);
  const ev = await page.evaluate(() => window.__ffp!.run()!.evidenceAt!);
  await page.evaluate(([x, z]) => window.__ffp!.moveHeroes(x! - 60, z), [ev.x, ev.z] as const);
  await page.keyboard.down('KeyJ');
  await page.waitForFunction(() => window.__ffp!.run()!.evidence === 2, null, { timeout: 20_000 });
  await page.keyboard.up('KeyJ');
  await expect(page.getByTestId('epilogue')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('epilogue')).toContainText('1/');
  await page.screenshot({ path: `test-results/m20-epilogue-${testInfo.project.name}.png` });
  await page.getByTestId('epilogue-next').click();
  await expect(page.getByTestId('epilogue')).toContainText('2/');
  await page.getByTestId('epilogue-skip').click();
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('results-grade')).toHaveCount(4);
  await expect(page.getByTestId('results')).toContainText('Preservation');
  await expect(page.getByTestId('results-section')).toHaveCount(2);
  await expect(page.getByTestId('results')).toContainText('Seed Reserve Bay: skipped');
  await page.screenshot({ path: `test-results/m20-results-${testInfo.project.name}.png` });
});
