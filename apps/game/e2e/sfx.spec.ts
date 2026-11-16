import { expect, test } from '@playwright/test';

/** Sound effects made in code: the Lab panel plays them through the game mix. */
test('the Lab plays the coded sound effects of every stage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
  await expect(page.getByTestId('lab-sfx')).toContainText('Sound effects (145)');
  await page.getByTestId('sfx-sfx.hit.heavy').click();
  await page.getByTestId('sfx-group').selectOption('stage1');
  await page.getByTestId('sfx-sfx.run.river-restored').click();
  await page.getByTestId('sfx-group').selectOption('greenhouse');
  await page.getByTestId('sfx-sfx.crush.blast').click();
  await page.getByTestId('sfx-group').selectOption('garran');
  await page.getByTestId('sfx-sfx.hookstaff.disarm').click();
  // Headless Firefox and WebKit may keep Web Audio suspended (autoplay policy): the
  // sounds are then checked only where audio runs, as in the M13 audio test.
  const running = await page.evaluate(() => window.__ffp!.media.state().audioRunning);
  if (running)
    await expect
      .poll(() => page.evaluate(() => window.__ffp!.media.state().played))
      .toEqual(
        expect.arrayContaining([
          'sfx:sfx.hit.heavy',
          'sfx:sfx.run.river-restored',
          'sfx:sfx.crush.blast',
          'sfx:sfx.hookstaff.disarm',
        ]),
      );
  expect(errors).toEqual([]);
});
