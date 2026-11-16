import { expect, test } from '@playwright/test';

/** Stage 3 sounds made in code: the Lab panel plays them through the game mix. */
test('the Lab plays the Stage 3 sounds', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
  await expect(page.getByTestId('lab-sfx3')).toContainText('Stage 3 sounds (89)');
  await page.getByTestId('sfx3-sfx.horse.gallop').click();
  await page.getByTestId('sfx3-group').selectOption('garran');
  await page.getByTestId('sfx3-sfx.hookstaff.disarm').click();
  await page.getByTestId('sfx3-group').selectOption('weapons');
  await page.getByTestId('sfx3-sfx.revolver.shot').click();
  await expect
    .poll(() => page.evaluate(() => window.__ffp!.media.state().played))
    .toEqual(
      expect.arrayContaining([
        'sfx:sfx.horse.gallop',
        'sfx:sfx.hookstaff.disarm',
        'sfx:sfx.revolver.shot',
      ]),
    );
  expect(errors).toEqual([]);
});
