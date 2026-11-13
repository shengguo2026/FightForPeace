import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 150_000 });

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

type P = {
  campaign: { completed: string[]; whatsNewSeen: string[] };
  museum: { unlocked: Record<string, number>; viewed: string[] };
  progress: { credits: number; owned: string[] };
};
const profile = async (page: Page) =>
  (await page.evaluate(() => window.__ffp!.shell.profile())) as P;

/** Village → Play → solo → stage select on Easy. */
async function toStageSelect(page: Page) {
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('stage-select')).toBeVisible();
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
}

test('Stage 2 is locked until Stage 1 is completed, then opens from stage select', async ({
  page,
}) => {
  await open(page);
  await toStageSelect(page);
  await expect(page.getByTestId('stage-pick')).toHaveAttribute('data-value', 'stage1');
  await expect(page.getByTestId('stage-locked-stage2')).toContainText('The Broken Water Pact');
  // Stage 1 played to the end from the shell completes it (results say Stage 2 opened).
  await page.getByTestId('stage-next').click();
  await page.keyboard.press('KeyT');
  await page.getByTestId('intro-skip').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'fields');
  await page.evaluate(() => window.__ffp!.shell.finishStage());
  await expect(page.getByTestId('ending')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('ending-skip').click();
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('results-completion').first()).toContainText(
    'New stage open: Prosperity Under Siege',
  );
  await page.screenshot({ path: 'test-results/m21-results-open.png' });
  await page.getByTestId('results-village').click();
  expect((await profile(page)).campaign.completed).toEqual(['stage1']);

  // Stage 2 from stage select: What's New once, its own briefing, then the stage.
  await toStageSelect(page);
  await expect(page.getByTestId('stage-locked-stage2')).toHaveCount(0);
  await page.getByTestId('stage-pick').click();
  await expect(page.getByTestId('stage-pick')).toHaveAttribute('data-value', 'stage2');
  await page.getByTestId('stage-next').click();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('whats-new')).toBeVisible();
  await expect(page.getByTestId('whats-new-title')).toHaveText('The twin guardians');
  await page.screenshot({ path: 'test-results/m21-whats-new.png' });
  for (let i = 0; i < 6; i += 1) await page.getByTestId('whats-new-next').click();
  await expect(page.getByTestId('briefing')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('briefing-objective')).toContainText('Prosperity Greenhouses');
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  expect(await page.evaluate(() => window.__ffp!.shell.stageId())).toBe('stage2');
  expect((await profile(page)).campaign.whatsNewSeen).toEqual(['stage2']);
});

test('the Museum shows open stages only, and Stage 2 entries after Stage 1', async ({ page }) => {
  await open(page);
  await page.getByTestId('menu-museum').click();
  await expect(page.getByTestId('museum')).toBeVisible();
  await expect(page.getByTestId('museum-entry-picture.keyart-title')).toBeVisible();
  await expect(page.getByTestId('museum-locked-picture.s1-end-01')).toBeVisible();
  await expect(page.getByTestId('museum-entry-picture.select-wind')).toHaveCount(0);
  await page.getByTestId('museum-entry-picture.keyart-title').click();
  await expect(page.getByTestId('museum-picture')).toBeVisible();
  await page.getByTestId('museum-section-investigation').click();
  await expect(page.getByTestId('museum-investigation')).toContainText('No findings yet');
  await page.getByTestId('museum-back').click();

  await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
  await page.getByTestId('menu-museum').click();
  await expect(page.getByTestId('museum-entry-picture.select-wind')).toBeVisible();
  await page.getByTestId('museum-section-collection').click();
  await expect(page.getByTestId('museum-entry-collection.brass-gears')).toBeVisible();
  await expect(page.getByTestId('museum-locked-collection.sealed-weapon-crate')).toBeVisible();
  await page.getByTestId('museum-entry-collection.brass-gears').click();
  await expect(page.getByTestId('museum-collection-desc')).toContainText('sluice');
  await page.getByTestId('museum-section-music').click();
  await page.getByTestId('museum-entry-music.stage1.river-before-silence').click();
  await page.getByTestId('museum-listen').click();
  await expect(page.getByTestId('museum-listen')).toHaveText(/Stop/);
  await page.getByTestId('museum-section-investigation').click();
  await expect(page.getByTestId('dossier-fact')).toHaveCount(1);
  await expect(page.getByTestId('dossier-theory')).toContainText('outside the valley');
  await expect(page.getByTestId('research-quarantine-provenance')).toContainText('not yet');
  await page.screenshot({ path: 'test-results/m21-museum.png' });
  await page.evaluate(() => window.__ffp!.shell.flush());
  const p = await profile(page);
  expect(p.museum.viewed).toContain('collection.brass-gears');
});

test('Stage 2 outfits and the twins’ techniques in the Store, with a Preview', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__ffp!.shell.grantCredits(5000));
  await page.getByTestId('menu-store').click();
  await page.getByTestId('store-group-wardrobe').click();
  await expect(page.getByTestId('store-item-greenhouse-builder')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('village')).toBeVisible();
  await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
  await page.getByTestId('menu-store').click();
  await page.getByTestId('store-group-wardrobe').click();
  await page.getByTestId('store-item-greenhouse-builder').click();
  await expect(page.getByTestId('store-status-greenhouse-builder')).toContainText('Owned');
  await page.getByTestId('store-group-technique').click();
  await page.getByTestId('store-item-crosswind-arc').focus();
  await expect(page.getByTestId('store-purpose')).toContainText('anti-air');
  await page.screenshot({ path: 'test-results/m21-store.png' });
  await page.getByTestId('store-preview-move').click();
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'preview');
  await page.waitForFunction(() => window.__ffp!.shell.preview()?.landed[0] === true, null, {
    timeout: 30_000,
  });
  await page.getByTestId('preview-back').click();
  await expect(page.getByTestId('store')).toBeVisible();
});

test('Move Preview loops a showcase with the step highlight, then Try it', async ({ page }) => {
  await open(page);
  await page.getByTestId('menu-academy').click();
  await page.getByTestId('academy-movelist').click();
  await expect(page.getByTestId('movelist')).toBeVisible();
  const hero = page.getByTestId('movelist-hero');
  for (let i = 0; i < 4 && (await hero.getAttribute('data-value')) !== 'fire'; i += 1)
    await hero.click();
  await page.getByTestId('preview-showcase-furnace-crucible').click();
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'preview');
  await expect(page.getByTestId('preview')).toBeVisible();
  await expect(page.locator('[data-testid="route-step"][data-current]')).toHaveCount(1);
  // The route plays to the end and loops.
  await page.waitForFunction(() => (window.__ffp!.shell.preview()?.plays ?? 0) >= 1, null, {
    timeout: 60_000,
  });
  await page.screenshot({ path: 'test-results/m21-preview.png' });
  await page.getByTestId('preview-half').click();
  await expect(page.getByTestId('preview-mode')).toContainText('half speed');
  await page.getByTestId('preview-try').click();
  await expect(page.getByTestId('preview-mode')).toHaveAttribute('data-mode', 'try');
  expect(await page.evaluate(() => window.__ffp!.shell.preview()!.landed.some(Boolean))).toBe(
    false,
  );
  await page.getByTestId('preview-back').click();
  await expect(page.getByTestId('movelist')).toBeVisible();
});

test("a Stage 2 Academy lesson and What's New from the Academy", async ({ page }) => {
  await open(page);
  await page.getByTestId('menu-academy').click();
  await expect(page.getByTestId('academy-stage2-locked')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('village')).toBeVisible();
  await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
  await page.getByTestId('menu-academy').click();
  await page.getByTestId('academy-whats-new').click();
  await expect(page.getByTestId('whats-new')).toBeVisible();
  await page.getByTestId('whats-new-skip').click();
  await expect(page.getByTestId('academy')).toBeVisible();
  await page.getByTestId('lesson-handoff').click();
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'lesson');
  await expect(page.getByTestId('lesson-phase')).toHaveAttribute('data-phase', 'demo');
  await page.screenshot({ path: 'test-results/m21-lesson.png' });
  // Both twins are on the yard: the demonstration partner joins the player's hero.
  expect(await page.evaluate(() => window.__ffp!.hero(1) !== undefined)).toBe(true);
});
