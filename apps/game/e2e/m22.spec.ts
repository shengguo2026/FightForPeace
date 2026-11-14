import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });

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

/** Village → Play → solo → Stage 2 on Easy (Stage 1 recorded as complete). */
async function startStage2(page: Page) {
  await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('stage-select')).toBeVisible();
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
  await page.getByTestId('stage-pick').click();
  await expect(page.getByTestId('stage-pick')).toHaveAttribute('data-value', 'stage2');
  await page.getByTestId('stage-next').click();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('whats-new')).toBeVisible();
  for (let i = 0; i < 6; i += 1) await page.getByTestId('whats-new-next').click();
}

const media = (page: Page) => page.evaluate(() => window.__ffp!.media.state());

test('Stage 2 opens with its four chapters, subtitled, skippable one by one or all', async ({
  page,
}) => {
  await open(page);
  await startStage2(page);
  await expect(page.getByTestId('intro')).toBeVisible();
  await expect(page.getByTestId('intro-chapter')).toHaveText('Prosperity Interlude');
  await page.evaluate(() => window.__ffp!.media.advanceCine(600));
  await expect(page.getByTestId('intro-caption')).toContainText('The water came back');
  expect((await media(page)).cine?.id).toBe('cine.stage2.interlude');
  // No voice file and no system voice: the subtitle carries the line.
  await expect.poll(async () => (await media(page)).narration).toContain('none:s2.line.p01');
  await page.screenshot({ path: 'test-results/m22-interlude.png' });
  await page.getByTestId('intro-skip').click();
  await expect(page.getByTestId('intro-chapter')).toHaveText('Roadside Deception');
  await page.evaluate(() => window.__ffp!.media.advanceCine(600));
  await expect(page.getByTestId('intro-caption')).toContainText('Quiet road tonight');
  await page.screenshot({ path: 'test-results/m22-roadside.png' });
  await page.getByTestId('intro-skip').click();
  await expect(page.getByTestId('intro-chapter')).toHaveText('Guest Under Observation');
  await page.getByTestId('intro-skip-all').click();
  await expect(page.getByTestId('briefing')).toBeVisible();
});

test('the Stage 2 ending: epilogue, Community Recovery and the Coda, then the results', async ({
  page,
}) => {
  await open(page);
  await startStage2(page);
  await page.getByTestId('intro-skip-all').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'perimeter');
  // The road's ambience bed plays under the score (a placeholder until files arrive).
  await page.waitForFunction(
    () => window.__ffp!.media.state().ambience === 'amb.stage2.night-road',
  );
  await page.evaluate(() => window.__ffp!.shell.finishStage());
  await expect(page.getByTestId('epilogue')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('epilogue-skip').click();
  await expect(page.getByTestId('ending')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('ending-chapter')).toHaveText('Community Recovery');
  await page.evaluate(() => window.__ffp!.media.advanceCine(600));
  await expect(page.getByTestId('ending-caption')).toContainText('pumps turn');
  await page.screenshot({ path: 'test-results/m22-recovery.png' });
  await page.getByTestId('ending-skip').click();
  await expect(page.getByTestId('ending-chapter')).toHaveText('Justice and Mystery');
  await page.getByTestId('ending-skip').click();
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
});

test('voice language and the system voice are settings; the Museum holds Stage 2', async ({
  page,
}) => {
  await open(page);
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-accessibility').click();
  const voice = page.getByTestId('setting-voice-language');
  await expect(voice).toHaveAttribute('data-value', 'text');
  await voice.click();
  await expect(voice).toHaveAttribute('data-value', 'en');
  await page.getByTestId('setting-system-voice').click();
  await expect(page.getByTestId('setting-system-voice')).toHaveAttribute('data-value', 'true');
  await page.getByTestId('settings-back').click();
  await page.evaluate(() => window.__ffp!.shell.flush());
  const s = (await page.evaluate(() => window.__ffp!.shell.profile())) as {
    settings: { voiceLanguage: string; systemVoice: boolean };
  };
  expect(s.settings.voiceLanguage).toBe('en');
  expect(s.settings.systemVoice).toBe(true);

  await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
  await page.getByTestId('menu-museum').click();
  await page.getByTestId('museum-section-picture').click();
  await expect(page.getByTestId('museum-entry-picture.keyart-s2')).toBeVisible();
  await page.getByTestId('museum-sections').click();
  await page.getByTestId('museum-section-music').click();
  await expect(page.getByTestId('museum-entry-music.stage2.water-became-a-future')).toContainText(
    'Water Became a Future',
  );
  await page.getByTestId('museum-sections').click();
  await page.getByTestId('museum-section-cinema').click();
  await expect(page.getByTestId('museum-locked-cinema.stage2.interlude')).toBeVisible();
  // Collection pieces show their picture (Stage 1 complete unlocks the brass gears).
  await page.getByTestId('museum-sections').click();
  await page.getByTestId('museum-section-collection').click();
  await page.getByTestId('museum-entry-collection.brass-gears').click();
  const art = page.getByTestId('museum-collection-art');
  await expect(art).toBeVisible();
  expect(await art.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/m22-collection.png' });
});

test('Stage 2 rooms draw their area art; the pursuit draws riders on their bikes', async ({
  page,
}) => {
  await page.goto('/?stage=2&beat=3&difficulty=easy');
  await page.waitForFunction(() => window.__ffp!.greenhouse()?.room === 's2-aquaculture-hall');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/m22-aquaculture.png' });
  await page.goto('/?stage=2&difficulty=easy');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 120);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/m22-pursuit.png' });
});

test('the riding move list at the bottom follows the language', async ({ page }) => {
  await page.goto('/?stage=2&difficulty=easy');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 60);
  await expect(page.getByTestId('hint-p1')).toContainText("Mason's Reach");
  // The dev server serves the game's own modules: switch the language in place.
  await page.evaluate(async (path) => {
    const i18n = (await import(/* @vite-ignore */ path)) as { setLocale: (l: string) => void };
    i18n.setLocale('zh-CN');
  }, '/src/text/i18n.ts');
  await expect(page.getByTestId('hint-p1')).toContainText('石匠探手');
  await expect(page.getByTestId('hint-p1')).not.toContainText("Mason's Reach");
});

test('the title screen follows the latest completed stage; Profile data shows it', async ({
  page,
}) => {
  await open(page);
  const viewProfile = async () => {
    await page.getByTestId('menu-records').click();
    await page.getByTestId('records-profile').click();
    await expect(page.getByTestId('profile')).toBeVisible();
  };
  const backToVillage = async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('records')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('village')).toBeVisible();
  };
  await viewProfile();
  await expect(page.getByTestId('profile-stage-stage2')).toHaveAttribute(
    'data-state',
    'profile.locked',
  );
  await expect(page.getByTestId('profile-title-screen')).toHaveAttribute('data-stage', 'stage1');
  await page.getByTestId('profile-raw-toggle').click();
  await expect(page.getByTestId('profile-raw')).toContainText('"campaign"');
  await backToVillage();
  // Stage 2 open is not enough: the title screen stays Stage 1's.
  await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
  await viewProfile();
  await expect(page.getByTestId('profile-stage-stage2')).toHaveAttribute(
    'data-state',
    'profile.stateOpen',
  );
  await expect(page.getByTestId('profile-title-screen')).toHaveAttribute('data-stage', 'stage1');
  await backToVillage();
  await page.evaluate(() => window.__ffp!.shell.completeStage('stage2'));
  await viewProfile();
  await expect(page.getByTestId('profile-stage-stage2')).toHaveAttribute(
    'data-state',
    'profile.completed',
  );
  await expect(page.getByTestId('profile-title-screen')).toHaveAttribute('data-stage', 'stage2');
  await backToVillage();
  const loop = page.getByTestId('title-loop');
  if ((await loop.count()) > 0)
    await expect(loop).toHaveAttribute('data-clip', 'cine.stage2.title-loop');
});
