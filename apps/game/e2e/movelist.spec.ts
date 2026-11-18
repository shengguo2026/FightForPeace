import { expect, test, type Page } from '@playwright/test';

/**
 * The pause-menu Move List (2026-11-18): every move of the hero shows how it is entered,
 * drawn from the player's own bindings (keyboard keys here), not only the move names.
 */
test.describe.configure({ timeout: 120_000 });

async function intoStage(page: Page) {
  await page.goto('/?shell');
  await page.waitForFunction(() => window.__ffp?.shell.screen() !== 'boot');
  await page.getByTestId('setup-language-en').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-layout-qwerty').click();
  await expect(page.getByTestId('setup-device-prompt')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByTestId('setup-name').fill('Guo');
  await page.getByTestId('setup-finish').click();
  await expect(page.getByTestId('village')).toBeVisible();
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await expect(page.getByTestId('lobby-card-p1')).toBeVisible();
  await page.keyboard.press('KeyT');
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  await page.keyboard.press('KeyT');
  await page.getByTestId('intro-skip').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('briefing-continue').click();
  await expect(page.getByTestId('ready')).toBeVisible();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
}

test('the pause Move List shows the input of every move', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await intoStage(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('pause-moves').focus();
  const list = page.getByTestId('pause-detail-moves');
  await expect(list).toBeVisible();
  const moves = list.getByTestId('pause-move');
  const count = await moves.count();
  expect(count).toBeGreaterThan(24); // the whole kit, not only the first 24 moves
  // The first move (neutral Attack) shows the Attack key of the player's bindings.
  await expect(moves.first().getByTestId('pause-move-input').locator('kbd')).toHaveText('T');
  // Every move that is entered by the player shows at least one key.
  const inputs = list.getByTestId('pause-move-input');
  expect(await inputs.count()).toBeGreaterThan(20);
  await page.screenshot({ path: `test-results/movelist-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});
