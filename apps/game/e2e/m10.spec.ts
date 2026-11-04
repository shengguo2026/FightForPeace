import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

/** Opens the game shell (automated browsers otherwise open the Lab directly). */
async function open(page: Page, query = '') {
  await page.goto(`/?shell${query}`);
  await page.waitForFunction(() => window.__ffp?.shell.screen() !== 'boot');
}

/** First launch with the keyboard only: language, defaults, layout, device and name. */
async function firstLaunch(page: Page, name = 'Guo') {
  await expect(page.getByTestId('setup-step-1')).toBeVisible();
  await page.getByTestId('setup-language-en').click();
  await expect(page.getByTestId('setup-step-2')).toBeVisible();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-layout-qwerty').click();
  await expect(page.getByTestId('setup-device-prompt')).toBeVisible();
  // "Press any key or button": the first key names the first device.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('setup-device')).toContainText('Keyboard');
  await page.getByTestId('setup-name').fill(name);
  await page.getByTestId('setup-finish').click();
  await expect(page.getByTestId('village')).toBeVisible();
}

test('first launch leads to the village, and the profile is there after a reload', async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId('setup')).toBeVisible();
  await page.screenshot({ path: 'test-results/m10-setup.png' });
  await firstLaunch(page);
  await expect(page.getByTestId('title-logo')).toHaveText('Fight For Peace');
  await expect(page.getByTestId('menu-profile')).toContainText('Guo');
  await expect(page.getByTestId('menu-storage')).toContainText('this browser');
  // No checkpoint yet: Continue is not offered and Play has the focus.
  await expect(page.getByTestId('menu-continue')).toHaveCount(0);
  await expect(page.getByTestId('menu-play')).toBeFocused();
  await page.screenshot({ path: 'test-results/m10-village.png' });
  await page.evaluate(() => window.__ffp!.shell.flush());
  await page.reload();
  await page.waitForFunction(() => window.__ffp?.shell.screen() === 'village');
  await expect(page.getByTestId('menu-profile')).toContainText('Guo');
});

test('the menus work with the keyboard alone: arrows move, Enter confirms, Esc goes back', async ({
  page,
}) => {
  await open(page);
  await firstLaunch(page);
  await page.keyboard.press('ArrowDown'); // Academy
  await page.keyboard.press('ArrowDown'); // Store
  await page.keyboard.press('ArrowDown'); // Records
  await expect(page.getByTestId('menu-records')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('records')).toBeVisible();
  await expect(page.getByTestId('record-stage1')).toContainText('Not cleared yet');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('village')).toBeVisible();
});

test('the play flow runs mode, lobby, stage, heroes, intro, briefing and readiness into Stage 1', async ({
  page,
}) => {
  await open(page);
  await firstLaunch(page);
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await expect(page.getByTestId('lobby-card-p1')).toBeVisible();
  await page.keyboard.press('KeyT'); // Player 1's Attack confirms readiness
  await expect(page.getByTestId('stage-select')).toBeVisible();
  // Easy, then on to the heroes.
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
  await expect(difficulty).toHaveAttribute('data-value', 'easy');
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  const first = await page.getByTestId('hero-name-p1').textContent();
  await page.keyboard.press('KeyD'); // next hero
  await expect(page.getByTestId('hero-name-p1')).not.toHaveText(first!);
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('intro')).toBeVisible();
  await page.screenshot({ path: 'test-results/m10-intro.png' });
  await page.getByTestId('intro-skip').click();
  await expect(page.getByTestId('briefing')).toBeVisible();
  await page.keyboard.press('Escape'); // skips to the summary
  await expect(page.getByTestId('briefing-summary')).toBeVisible();
  await page.screenshot({ path: 'test-results/m10-briefing.png' });
  await page.getByTestId('briefing-continue').click();
  await expect(page.getByTestId('ready')).toBeVisible();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'fields');
  const run = await page.evaluate(() => window.__ffp!.run()!);
  expect(run.continues).toBe(5); // Easy
  expect(await page.evaluate(() => window.__ffp!.hero(0)!.hero)).toBe('river');
  await expect(page.getByTestId('hud-p1')).toBeVisible();
  await expect(page.getByTestId('hud-p2')).toHaveCount(0);
  await expect(page.getByTestId('hud-continues')).toContainText('5');
  await page.screenshot({ path: 'test-results/m10-hud.png' });
  // Esc opens the pause menu; Return to Village asks first.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-hint')).toContainText('Press Esc to continue');
  await page.getByTestId('pause-howTo').focus();
  await expect(page.getByTestId('pause-detail-howto')).toBeVisible();
  await page.screenshot({ path: 'test-results/m10-pause.png' });
  await page.getByTestId('pause-village').click();
  await page.getByTestId('pause-confirm-yes').click();
  await expect(page.getByTestId('village')).toBeVisible();
});

test('settings: language switches the menus at once and is kept for the device', async ({
  page,
}) => {
  await open(page);
  await firstLaunch(page);
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-language').click();
  await page.getByTestId('setting-language-zh-CN').click();
  await expect(page.getByTestId('settings-language')).toHaveText('语言');
  await page.screenshot({ path: 'test-results/m10-settings-zh.png' });
  await page.getByTestId('setting-language-de').click();
  await expect(page.getByTestId('settings-language')).toHaveText('Sprache');
  await page.getByTestId('settings-back').click();
  await expect(page.getByTestId('title-logo')).toHaveText('Fight For Peace');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.evaluate(() => window.__ffp!.shell.flush());
  await page.reload();
  await page.waitForFunction(() => window.__ffp?.shell.screen() === 'village');
  await expect(page.getByTestId('menu-settings')).toContainText('Einstellungen');
});

test('remapping: a conflict offers Replace and Swap, and the new key plays', async ({ page }) => {
  await open(page);
  await firstLaunch(page);
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-controls').click();
  await page.getByTestId('setting-remap').click();
  await page.getByTestId('remap-Attack').click();
  await expect(page.getByTestId('remap-listening')).toBeVisible();
  await page.keyboard.press('KeyY'); // Jump's key
  await expect(page.getByTestId('remap-conflict')).toContainText('Jump');
  await page.getByTestId('remap-swap').click();
  await page.getByTestId('remap-apply').click();
  await expect(page.getByTestId('remap-note')).toHaveText('Saved.');
  // The live tester shows what a key does without playing.
  await page.getByTestId('remap-tester').click();
  await page.keyboard.down('KeyY');
  await expect(page.getByTestId('remap-tester-active')).toHaveText('Attack');
  await page.keyboard.up('KeyY');
  await page.evaluate(() => window.__ffp!.shell.flush());
  const profile = (await page.evaluate(() => window.__ffp!.shell.profile())) as {
    bindings: { keyboard: { codes: Record<string, string[]> } };
  };
  expect(profile.bindings.keyboard.codes.Attack).toEqual(['KeyY']);
  expect(profile.bindings.keyboard.codes.Jump).toEqual(['KeyT']);
});

test('profile data: export makes a .ffpsave, import previews it and merges a copy', async ({
  page,
}) => {
  await open(page);
  await firstLaunch(page, 'Exported');
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-profile').click();
  const downloading = page.waitForEvent('download');
  await page.getByTestId('profile-export').click();
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/\.ffpsave$/);
  const path = await file.path();
  await page.getByTestId('profile-import-file').setInputFiles(path);
  await expect(page.getByTestId('profile-import-preview')).toContainText('Exported');
  await expect(page.getByTestId('profile-import-preview')).toContainText(
    'already on this computer',
  );
  await page.getByTestId('profile-import-merge').click();
  await expect(page.getByTestId('profile-message')).toContainText('Imported');
  await expect(page.locator('[data-testid^="profile-row-"]')).toHaveCount(2);
});
