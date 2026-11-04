import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

async function ready(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

/** Holds Interact (Player 1's J) until the condition holds. */
async function holdInteract(page: Page, done: () => boolean) {
  await page.keyboard.down('KeyJ');
  await page.waitForFunction(done, null, { timeout: 20_000 });
  await page.keyboard.up('KeyJ');
}

test('the Stage 1 journey starts from the arena panel with the version shown', async ({
  page,
}, testInfo) => {
  await ready(page);
  await expect(page.getByTestId('version')).toContainText(/v\d+\.\d+\.\d+/);
  await page.getByTestId('arena-difficulty').selectOption('Easy');
  await page.getByTestId('arena-start').click();
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'fields');
  const run = await page.evaluate(() => window.__ffp!.run()!);
  expect(run.continues).toBe(5);
  expect(run.locks).toBe(2);
  await expect(page.getByTestId('arena-diagnostics')).toContainText('The Broken Water Pact');
  // Walking right reaches the first camera lock.
  await page.keyboard.press('F1');
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__ffp!.run()!.phase === 1, null, { timeout: 30_000 });
  await page.keyboard.up('KeyD');
  const locked = await page.evaluate(() => window.__ffp!.run()!);
  expect(locked.bounds.maxX - locked.bounds.minX).toBe(1920);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/m9-lock-${testInfo.project.name}.png` });
});

test('worker rescue: hold Interact frees a worker, both open the cache and the exit', async ({
  page,
}, testInfo) => {
  await ready(page, '?stage=1&beat=3&difficulty=easy');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'rescue');
  // The "Checkpoint saved" notice only shows for 2.5 s of game time, which a slow CI
  // machine can spend loading the page; the checkpoint itself is what counts.
  expect(await page.evaluate(() => window.__ffp!.run()!.checkpointBeat)).toBe(2);
  // The camera lock first (its fight would interrupt the hold), then the workers.
  await page.evaluate(() => window.__ffp!.moveHeroes(900));
  for (let i = 0; i < 20; i += 1) {
    await page.evaluate(() => window.__ffp!.clearEnemies());
    if ((await page.evaluate(() => window.__ffp!.run()!.locksDone)) === 1) break;
    await page.waitForTimeout(500);
  }
  for (let i = 0; i < 2; i += 1) {
    const w = await page.evaluate((n) => window.__ffp!.run()!.workers[n]!, i);
    await page.evaluate(([x, z]) => window.__ffp!.moveHeroes(x! - 60, z), [w.x, w.z] as const);
    await expect(page.getByTestId('stage-prompt-p1')).toContainText('to free the worker');
    if (i === 0) {
      // The bar only lives for the 0.75 s hold: look for it on every animation frame.
      await page.keyboard.down('KeyJ');
      await page.waitForFunction(
        () => document.querySelector('[data-testid="stage-progress-p1"]') !== null,
        null,
        { polling: 'raf', timeout: 10_000 },
      );
      await page.screenshot({ path: `test-results/m9-rescue-${testInfo.project.name}.png` });
      await page.keyboard.up('KeyJ');
    }
    await page.keyboard.down('KeyJ');
    await page.waitForFunction(
      (n) => window.__ffp!.run()!.workers.filter((k) => k.state !== 0).length > n,
      i,
      { timeout: 20_000 },
    );
    await page.keyboard.up('KeyJ');
  }
  expect(await page.evaluate(() => window.__ffp!.run()!.stats.workersFreed)).toBe(2);
  // Walk to the exit: the next beat is the Working Mill.
  await page.evaluate(() => window.__ffp!.moveHeroes(3100));
  await page.waitForFunction(() => window.__ffp!.run()!.beatId === 'mill', null, {
    timeout: 30_000,
  });
});

test('defeat spends a continue and restores the checkpoint', async ({ page }) => {
  await ready(page, '?stage=1&beat=5&difficulty=hard');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'investigation');
  expect(await page.evaluate(() => window.__ffp!.run()!.continues)).toBe(2);
  await page.evaluate(() => window.__ffp!.setHealth(0, 0));
  await page.waitForFunction(() => window.__ffp!.run()!.phase === 3);
  await page.waitForFunction(() => window.__ffp!.run()!.continuesUsed === 1, null, {
    timeout: 30_000,
  });
  const run = await page.evaluate(() => window.__ffp!.run()!);
  expect(run.beatId).toBe('investigation');
  expect(run.continues).toBe(1);
  expect((await page.evaluate(() => window.__ffp!.hero(0)!))?.health).toBe(1000);
});

test('the sponsor evidence ends the stage on the results screen', async ({ page }, testInfo) => {
  await ready(page, '?stage=1&beat=8&difficulty=easy');
  await page.waitForFunction(() => window.__ffp!.run()?.phase === 1);
  for (let i = 0; i < 30; i += 1) {
    await page.evaluate(() => window.__ffp!.clearEnemies());
    if ((await page.evaluate(() => window.__ffp!.run()!.evidence)) === 1) break;
    await page.waitForTimeout(400);
  }
  const ev = await page.evaluate(() => window.__ffp!.run()!.evidenceAt!);
  await page.evaluate(([x, z]) => window.__ffp!.moveHeroes(x! - 60, z), [ev.x, ev.z] as const);
  await expect(page.getByTestId('stage-prompt-p1')).toContainText('secure the evidence');
  await holdInteract(page, () => window.__ffp!.run()!.evidence === 2);
  await expect(page.getByTestId('stage-story')).toContainText('machined brass gears');
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('results-grade')).toHaveCount(4);
  await expect(page.getByTestId('results')).toContainText('practice run from beat 8');
  await page.screenshot({ path: `test-results/m9-results-${testInfo.project.name}.png` });
  await page.getByTestId('results-lab').click();
  await page.waitForFunction(() => window.__ffp!.run() === null);
  await expect(page.getByTestId('results')).toHaveCount(0);
});
