import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

const BUTTONS = 17;
function pad(press: string[] = []) {
  const names = [
    'South',
    'East',
    'West',
    'North',
    'LB',
    'RB',
    'LT',
    'RT',
    'Back',
    'Start',
    'LS',
    'RS',
    'DpadUp',
    'DpadDown',
    'DpadLeft',
    'DpadRight',
    'Home',
  ];
  return {
    id: 'Xbox Wireless Controller (Vendor: 045e Product: 0b13)',
    index: 0,
    connected: true,
    mapping: 'standard',
    buttons: Array.from({ length: BUTTONS }, (_, i) => press.includes(names[i]!)),
    axes: [0, 0, 0, 0],
  };
}

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

type Progress = {
  progress: {
    credits: number;
    owned: string[];
    equipped: Record<string, { outfit: string | null; techniques: string[] }>;
    academy: Record<string, string>;
    combos: { name: string; steps: string[] }[];
    badge: string | null;
  };
};
const profile = async (page: Page) =>
  (await page.evaluate(() => window.__ffp!.shell.profile())) as Progress;

/** Village → Play → solo → Stage 1 on Easy → Mountain → briefing → readiness → the stage. */
async function playStage(page: Page, beforeReady?: () => Promise<void>) {
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await page.keyboard.press('KeyT');
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  await page.keyboard.press('KeyT');
  await page.getByTestId('intro-skip').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('briefing-summary')).toBeVisible();
  if (beforeReady) await beforeReady();
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'fields');
}

test('a finished stage pays Credits once, shown on the results with score and rank', async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId('menu-credits')).toContainText('Credits: 0');
  await playStage(page);
  await page.evaluate(() => window.__ffp!.shell.finishStage());
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('results-points')).toContainText('/ 100');
  await expect(page.getByTestId('results-score')).toContainText('Standard Loadout');
  await expect(page.getByTestId('results-payout-p1')).toContainText('Credits earned');
  await page.screenshot({ path: 'test-results/m11-results.png' });
  await page.evaluate(() => window.__ffp!.shell.flush());
  const p = await profile(page);
  // Completion 300 + first clear 1000 + the story achievement 150 at least.
  expect(p.progress.credits).toBeGreaterThanOrEqual(1450);
  await page.getByTestId('results-village').click();
  await expect(page.getByTestId('menu-credits')).toContainText(`Credits: ${p.progress.credits}`);
});

test('the Village Store sells the slice items; owned techniques make the briefing an Open Loadout', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => window.__ffp!.shell.grantCredits(3000));
  await page.getByTestId('menu-store').click();
  await expect(page.getByTestId('store-credits')).toContainText('3000');
  // The Ultimates appear only after the first clear.
  await expect(page.getByTestId('store-item-skybreak-column')).toBeVisible();
  await expect(page.getByTestId('store-item-still-mountain')).toHaveCount(0);
  await page.getByTestId('store-item-skybreak-column').click();
  await expect(page.getByTestId('store-status-skybreak-column')).toContainText('Owned');
  await page.getByTestId('store-item-skybreak-column').click(); // equip
  await expect(page.getByTestId('store-status-skybreak-column')).toContainText('Equipped');
  await page.getByTestId('store-group-wardrobe').click();
  await page.getByTestId('store-item-millwright').click();
  await page.getByTestId('store-item-millwright').click();
  await page.getByTestId('store-group-training').click();
  await expect(page.getByTestId('store-empty')).toContainText('No combat styles yet');
  await page.getByTestId('store-group-collection').click();
  await page.getByTestId('store-item-village-lantern').click();
  await page.getByTestId('store-item-village-lantern').click();
  // The second badge waits for its achievement.
  await expect(page.getByTestId('store-status-open-sluice')).toContainText('Locked');
  await page.screenshot({ path: 'test-results/m11-store.png' });
  await page.evaluate(() => window.__ffp!.shell.flush());
  const p = await profile(page);
  expect(p.progress.credits).toBe(3000 - 800 - 800 - 300);
  expect(p.progress.equipped.mountain!.techniques).toEqual([
    'store.technique.mountain.skybreak-column',
  ]);
  expect(p.progress.equipped.mountain!.outfit).toBe('store.wardrobe.mountain.millwright');
  expect(p.progress.badge).toBe('store.collection.badge.village-lantern');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('menu-profile')).toContainText('Village Lantern');
  await playStage(page, async () => {
    await expect(page.getByTestId('loadout-kind-p1')).toHaveText('Open Loadout');
    await expect(page.getByTestId('loadout-p1')).toContainText('Skybreak Column');
  });
});

test('an Academy lesson follows the current bindings and devices, and certifies', async ({
  page,
}) => {
  await open(page);
  // Rebind Attack to the R key first.
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-controls').click();
  await page.getByTestId('setting-remap').click();
  await page.getByTestId('remap-Attack').click();
  await page.keyboard.press('KeyR');
  await page.getByTestId('remap-apply').click();
  await expect(page.getByTestId('remap-note')).toHaveText('Saved.');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('village')).toBeVisible();

  await page.getByTestId('menu-academy').click();
  await expect(page.getByTestId('academy')).toBeVisible();
  await page.getByTestId('lesson-chain').click();
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'lesson');
  await expect(page.getByTestId('lesson-phase')).toHaveAttribute('data-phase', 'demo');
  expect(await page.evaluate(() => window.__ffp!.shell.pilotActive())).toBe(true);
  // The demonstration hint and the step list show the new key.
  await expect(page.getByTestId('lesson-demo').locator('[data-prompt="key"]')).toHaveText('R');
  await expect(page.getByTestId('lesson-steps')).toContainText('R');
  await page.screenshot({ path: 'test-results/m11-lesson-demo.png' });
  // A gamepad takes over: the prompts switch to its buttons.
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.waitForTimeout(50);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad(['DpadRight']));
  await expect(
    page.getByTestId('lesson-demo').locator('[data-prompt="pad"]').first(),
  ).toBeVisible();
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.screenshot({ path: 'test-results/m11-lesson-pad.png' });
  // Attack (on the keyboard again: R) starts the guided practice.
  await page.keyboard.press('KeyR');
  await expect(page.getByTestId('lesson-phase')).toHaveAttribute('data-phase', 'guided');
  await expect(page.getByTestId('lesson-goal-recipe')).toHaveAttribute('data-met', 'no');
  // Leave through the pause menu; the Academy shows the lesson state.
  await page.keyboard.press('Escape');
  await page.getByTestId('pause-lessonLeave').click();
  await expect(page.getByTestId('academy')).toBeVisible();
});

test('the move lesson is certified by moving, jumping and dashing, and pays once', async ({
  page,
}) => {
  await open(page);
  await page.getByTestId('menu-academy').click();
  await page.getByTestId('lesson-move').click();
  await expect(page.getByTestId('lesson-phase')).toHaveAttribute('data-phase', 'guided');
  const act = async () => {
    // Away from the dummy (it stands to the right).
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(2500);
    await page.keyboard.up('KeyA');
    await page.keyboard.press('KeyY');
    await page.waitForTimeout(900);
    for (let i = 0; i < 2; i += 1) {
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(40);
      await page.keyboard.up('KeyD');
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(400);
  };
  await act();
  const seen = await page.evaluate(() => window.__ffp!.shell.lesson());
  expect(seen?.phase, JSON.stringify(seen)).toBe('trial');
  await act();
  await expect(page.getByTestId('lesson-phase')).toHaveAttribute('data-phase', 'mastery');
  await page.evaluate(() => window.__ffp!.shell.flush());
  const p = await profile(page);
  expect(p.progress.academy['academy.first-steps.move']).toBe('certified');
  // Certificate 100 + the First Lesson achievement 100.
  expect(p.progress.credits).toBe(200);
});

test('Free Practice records a combo into My Combos, which plays it back', async ({ page }) => {
  await open(page);
  await page.getByTestId('menu-academy').click();
  await page.getByTestId('academy-practice').click();
  await page.getByTestId('practice-start').click();
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'practice');
  await page.evaluate(() => window.__ffp!.place(0, -70, 0));
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('KeyT');
    await page.waitForTimeout(220);
  }
  await page.waitForFunction(
    () => (window.__ffp!.shell.lastCombo()?.steps.length ?? 0) >= 2,
    null,
    {
      timeout: 10_000,
    },
  );
  await expect(page.getByTestId('practice-last')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByTestId('pause-saveCombo').click();
  await page.getByTestId('pause-practiceLeave').click();
  await page.getByTestId('academy-combos').click();
  await expect(page.getByTestId('combo')).toHaveCount(1);
  await expect(page.getByTestId('combo-name')).toHaveText('Combo 1');
  await expect(page.getByTestId('combo-step').first()).toContainText('T');
  await page.getByTestId('combo-rename').click();
  await page.getByTestId('combo-rename-input').fill('Mill chain');
  await page.getByTestId('combo-rename-save').click();
  await expect(page.getByTestId('combo-name')).toHaveText('Mill chain');
  await page.getByTestId('combo-watch').click();
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'practice');
  await expect(page.getByTestId('practice-hud')).toContainText('Mill chain');
  await expect(page.getByTestId('practice-your-turn')).toBeVisible({ timeout: 15_000 });
});

test('Elder’s Secrets: exact codes, a preset, consent, and the Cheat-Assisted mark', async ({
  page,
}) => {
  await open(page);
  await page.getByTestId('menu-guide').click();
  await page.getByTestId('guide-search').fill('secret');
  await page.getByTestId('guide-chapter-secrets').click();
  await expect(page.getByTestId('guide-cheat-SAFEHEART')).toBeVisible();
  await page.getByTestId('guide-open-secrets').click();
  await page.getByTestId('secrets-code').fill('safe hart');
  await page.getByTestId('secrets-enter').click();
  await expect(page.getByTestId('secrets-msg')).toContainText('not a code');
  await page.getByTestId('secrets-code').fill(' strong-hands ');
  await page.getByTestId('secrets-enter').click();
  await expect(page.getByTestId('secrets-p1-STRONGHANDS')).toContainText('✓');
  await page.getByTestId('secrets-preset-CALMBATTLE').click();
  await expect(page.getByTestId('secrets-s-QUIETCROWD')).toContainText('✓');
  await page.getByTestId('secrets-done').click();
  await expect(page.getByTestId('secrets-msg')).toContainText('accept');
  await page.getByTestId('secrets-accept-p1').click();
  await page.getByTestId('secrets-done').click();
  await expect(page.getByTestId('guide')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('village')).toBeVisible();
  await playStage(page);
  const c = await page.evaluate(() => window.__ffp!.shell.cheats());
  expect(c.marked).toBe(true);
  expect(c.hero[0]).toEqual(['SOFTERBLOWS', 'STEADYRIDE']);
  expect(c.session).toEqual(['QUIETCROWD', 'FULLPANTRY', 'HOMECOMING']);
  await expect(page.getByTestId('hud-cheat')).toBeVisible();
  await page.screenshot({ path: 'test-results/m11-cheat-hud.png' });
  await page.evaluate(() => window.__ffp!.shell.finishStage());
  await expect(page.getByTestId('results-cheat')).toBeVisible();
  await expect(page.getByTestId('results-payout-p1')).toContainText('Credits earned: 0');
  await page.evaluate(() => window.__ffp!.shell.flush());
  expect((await profile(page)).progress.credits).toBe(0);
});

test('a solo run can switch Elder’s Secrets on from the pause menu', async ({ page }) => {
  await open(page);
  await playStage(page);
  await page.keyboard.press('Escape');
  await page.getByTestId('pause-secrets').click();
  await page.getByTestId('secrets-p1-SAFEHEART').click();
  await page.getByTestId('secrets-accept-p1').click();
  await page.getByTestId('secrets-done').click();
  await expect(page.getByTestId('pause-cheat')).toBeVisible();
  const c = await page.evaluate(() => window.__ffp!.shell.cheats());
  expect(c.hero[0]).toEqual(['SAFEHEART']);
  expect(c.marked).toBe(true);
});
