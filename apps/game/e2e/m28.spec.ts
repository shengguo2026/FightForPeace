import { expect, test, type Page } from '@playwright/test';

/**
 * M28 Stage 3 · Shadows over the Herb Mountain in the browser: the What's New cards, the
 * Silvermist chapter and the briefing, the first beat on the switchbacks, the ending
 * (Paths through the Mist) and the results; the Coming-soon outfits and the default
 * evolution in the Store; and the Stage 3 arenas with their area art and captives.
 */
test.describe.configure({ timeout: 300_000 });

async function open(page: Page) {
  await page.goto('/?shell');
  await page.waitForFunction(() => window.__ffp?.shell.screen() !== 'boot');
  await page.getByTestId('setup-language-en').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-layout-qwerty').click();
  await page.keyboard.press('Enter');
  await page.getByTestId('setup-name').fill('Guo');
  await page.getByTestId('setup-finish').click();
  await expect(page.getByTestId('village')).toBeVisible();
}

/** Village → Play → solo → Stage 3 on Easy (Stages 1 and 2 recorded as complete). */
async function startStage3(page: Page) {
  await page.evaluate(() => {
    window.__ffp!.shell.completeStage('stage1');
    window.__ffp!.shell.completeStage('stage2');
  });
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('stage-select')).toBeVisible();
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
  const pick = page.getByTestId('stage-pick');
  for (let i = 0; i < 3 && (await pick.getAttribute('data-value')) !== 'stage3'; i += 1)
    await pick.click();
  await expect(pick).toHaveAttribute('data-value', 'stage3');
  await page.getByTestId('stage-next').click();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('whats-new')).toBeVisible();
  await expect(page.getByTestId('whats-new')).toContainText('Mountain horses');
  for (let i = 0; i < 6; i += 1) await page.getByTestId('whats-new-next').click();
}

test('Stage 3: Silvermist, the briefing, the switchbacks, the ending and the results', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await startStage3(page);
  await expect(page.getByTestId('intro')).toBeVisible();
  await expect(page.getByTestId('intro-chapter')).toHaveText('Silvermist');
  await page.evaluate(() => window.__ffp!.media.advanceCine(600));
  await expect(page.getByTestId('intro-caption')).toContainText('Months of careful work');
  await page.screenshot({ path: 'test-results/m28-silvermist.png' });
  await page.getByTestId('intro-skip-all').click();
  await expect(page.getByTestId('briefing')).toBeVisible();
  await expect(page.getByTestId('briefing')).toContainText('Gao Wen');
  await page.keyboard.press('Escape');
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'switchback-ride');
  const start = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForFunction((f) => window.__ffp!.frame() > f + 60, start, { timeout: 60_000 });
  await page.screenshot({ path: 'test-results/m28-switchback.png' });
  await page.evaluate(() => window.__ffp!.shell.finishStage());
  await expect(page.getByTestId('epilogue')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('epilogue-skip').click();
  await expect(page.getByTestId('ending')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('ending-chapter')).toHaveText('Paths through the Mist');
  await page.evaluate(() => window.__ffp!.media.advanceCine(600));
  await expect(page.getByTestId('ending-caption')).toContainText('something to lose');
  await page.screenshot({ path: 'test-results/m28-paths.png' });
  await page.getByTestId('ending-skip').click();
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('results')).toContainText('Stage 3 complete');
  await expect(page.getByTestId('results')).not.toContainText('Stage 2');
  await expect(page.getByTestId('results')).toContainText('Research record');
  expect(errors).toEqual([]);
});

test('the Store shows the Stage 3 outfits as Coming soon beside the default evolution', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.__ffp!.shell.completeStage('stage1');
    window.__ffp!.shell.completeStage('stage2');
  });
  await page.getByTestId('menu-store').click();
  await page.getByTestId('store-group-wardrobe').click();
  await expect(page.getByTestId('store-evolution')).toBeVisible();
  await expect(page.getByTestId('store-status-mountain-rescue').first()).toHaveText('Coming soon');
  await page.getByTestId('store-item-highland-festival').first().focus();
  await expect(page.getByTestId('store-soon')).toBeVisible();
  await page.screenshot({ path: 'test-results/m28-store.png' });
});

test('Stage 3 arenas draw their area art, captives and the research record', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
  for (const arena of ['s3-mist-beds', 's3-two-voices', 's3-terrace']) {
    await page.evaluate((a) => window.__ffp!.startArena(a, 'medium'), arena);
    await page.waitForFunction((a) => window.__ffp!.encounter()?.arena === a, arena);
    const start = await page.evaluate(() => window.__ffp!.frame());
    await page.waitForFunction((f) => window.__ffp!.frame() > f + 30, start, { timeout: 45_000 });
    await page.screenshot({ path: `test-results/m28-${arena}.png` });
  }
  expect(errors).toEqual([]);
});

test('Mist over the Beds: the hold prompt names the key, holding it collects the record', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?stage=3&beat=7&difficulty=easy');
  await page.waitForFunction(() => window.__ffp?.run()?.beatId === 'mist-beds', null, {
    timeout: 120_000,
  });
  // The simulation starts once the area art is in (it may take a while on a cold server).
  const start = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForFunction((f) => window.__ffp!.frame() > f + 30, start, { timeout: 90_000 });
  await page.evaluate(() => window.__ffp!.clearEnemies());
  await page.waitForFunction(() => window.__ffp!.run()?.phase === 0, null, { timeout: 30_000 });
  const prompt = page.getByTestId('stage-prompt-p1');
  await expect(async () => {
    await page.evaluate(() => window.__ffp!.placeAt(0, 2160, 820));
    await expect(prompt).toContainText('Hold', { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await expect(prompt).toContainText('collect the record');
  await expect(prompt.locator('kbd')).toHaveText('J');
  await page.keyboard.down('KeyJ');
  await expect(page.getByTestId('stage-progress-p1')).toBeVisible();
  await page.waitForFunction(
    () => (window.__ffp!.objectives() as { cases: { state: number }[] }).cases[0]!.state === 1,
  );
  await page.keyboard.up('KeyJ');
  await page.screenshot({ path: 'test-results/m28-mist-collected.png' });
  // Carried food says how to eat it.
  await page.evaluate(() => window.__ffp!.placeAt(0, 1600, 820));
  await page.evaluate(() => window.__ffp!.giveItem(0, 'trail-rice'));
  await expect(prompt).toContainText('eat (heals)');
  // Walking on through the open exit leaves for the next beat.
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__ffp!.run()?.beat === 7, null, {
    timeout: 30_000,
  });
  await page.keyboard.up('KeyD');
  expect(errors).toEqual([]);
});
