import { expect, test, type Page } from '@playwright/test';
import { startCues } from './cues';

test.describe.configure({ timeout: 120_000 });

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

/** Village → Play → solo → Stage 1 on Easy → hero → the intro cinematic. */
async function toIntro(page: Page) {
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await page.keyboard.press('KeyT');
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('intro')).toBeVisible();
}

const media = (page: Page) => page.evaluate(() => window.__ffp!.media.state());

test('the intro cinematic plays its shots with subtitles, pauses, steps and skips', async ({
  page,
}) => {
  await open(page);
  // The village menu plays the title state of River Before Silence.
  await page.waitForFunction(() => window.__ffp!.media.state().music?.state === 'title');
  await toIntro(page);
  const intro = page.getByTestId('intro');
  await expect(intro).toHaveAttribute('data-shot', 'motif.village.peace');
  await page.evaluate(() => window.__ffp!.media.advanceCine(1000));
  await expect(page.getByTestId('intro-caption')).toContainText('the river');
  await page.screenshot({ path: 'test-results/m13-intro.png' });
  // Pause holds the cinematic's clock.
  await page.getByTestId('intro-pause').click();
  await expect(intro).toHaveAttribute('data-paused', 'true');
  const t0 = (await media(page)).cine!.time;
  await page.waitForTimeout(400);
  expect((await media(page)).cine!.time).toBe(t0);
  await page.getByTestId('intro-pause').click();
  await expect(intro).toHaveAttribute('data-paused', 'false');
  // Next goes to the second shot; its clock moves the shot along by itself.
  await page.getByTestId('intro-next').click();
  await expect(intro).toHaveAttribute('data-shot', 'shot.stage1.intro.02');
  await page.evaluate(() => window.__ffp!.media.advanceCine(6600));
  await expect(intro).toHaveAttribute('data-shot', 'shot.stage1.intro.03');
  // A language change applies at the next subtitle, never inside one.
  await page.evaluate(() => window.__ffp!.media.advanceCine(1000));
  await expect(page.getByTestId('intro-caption')).toHaveAttribute('data-locale', 'en');
  await page.getByTestId('intro-skip').click();
  await expect(page.getByTestId('briefing')).toBeVisible();
  expect((await media(page)).cine).toBeNull();
});

test('still pictures replace the clips with the same shots and subtitles', async ({ page }) => {
  await open(page);
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-accessibility').click();
  const cine = page.getByTestId('setting-cinematics');
  await cine.click();
  await expect(cine).toHaveAttribute('data-value', 'stills');
  await page.getByTestId('settings-back').click();
  await expect(page.getByTestId('title-loop')).toHaveCount(0);
  await toIntro(page);
  const intro = page.getByTestId('intro');
  await expect(intro).toHaveAttribute('data-mode', 'still');
  await expect(page.getByTestId('intro-stills')).toBeVisible();
  await expect(page.getByTestId('intro-video')).toHaveCount(0);
  await page.evaluate(() => window.__ffp!.media.advanceCine(1000));
  await expect(page.getByTestId('intro-caption')).toContainText('the river');
  // Still mode plays the cinematic's own score: the intro state.
  await page.waitForFunction(() => window.__ffp!.media.state().music?.state === 'intro');
  await page.screenshot({ path: 'test-results/m13-intro-stills.png' });
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('KeyT'); // Attack: next shot
  await expect(page.getByTestId('briefing')).toBeVisible();
});

test('the stage score follows beats and fights, effects and sounds follow combat, and the ending opens the results', async ({
  page,
}) => {
  await open(page);
  await toIntro(page);
  await page.getByTestId('intro-skip').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  await page.waitForFunction(() => window.__ffp!.run()?.beatId === 'fields');
  await page.waitForFunction(
    () => window.__ffp!.media.state().music?.cue === 'mus.stage1.fields-without-water',
  );
  // A dash raises a presentation event: its dust core and its mixed sound.
  await startCues(page, [
    { when: 'true', keys: ['KeyD'] },
    { when: 'since >= 3', keys: ['KeyD'] },
  ]);
  await page.evaluate(() => (window as unknown as { __cues: Promise<void> }).__cues);
  await page.waitForFunction(() => (window.__ffp!.media.state().effects.cores ?? 0) > 0);
  const m = await media(page);
  expect(m.effects.events).toBeGreaterThan(0);
  // Sounds are scheduled once the browser runs audio (every desktop browser after a key press).
  if (m.audioRunning) {
    expect(m.played.some((p) => p.startsWith('music:mus.stage1.fields-without-water'))).toBe(true);
    expect(m.played).toContain('sfx:sfx.dash.step');
  }
  await page.screenshot({ path: 'test-results/m13-fight.png' });
  // Finish the stage: the ending cinematic plays before the results.
  await page.evaluate(() => window.__ffp!.shell.finishStage());
  await expect(page.getByTestId('ending')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('results')).toHaveCount(0);
  await expect(page.getByTestId('ending')).toHaveAttribute('data-shot', 'shot.stage1.end.01');
  await page.evaluate(() => window.__ffp!.media.advanceCine(9000));
  // Not every worker was freed in this shortcut run: the "still waiting" variant.
  await expect(page.getByTestId('ending')).toHaveAttribute('data-shot', 'shot.stage1.end.02.some');
  await page.screenshot({ path: 'test-results/m13-ending.png' });
  await page.getByTestId('ending-skip').click();
  await expect(page.getByTestId('results')).toBeVisible();
  await page.waitForFunction(
    () => window.__ffp!.media.state().music?.cue === 'mus.stage1.river-returned',
  );
  expect(
    (await media(page)).musicLog.some((l) => l === 'start mus.stage1.river-returned/victory'),
  ).toBe(true);
});

test('the audio settings list every channel and show what is playing', async ({ page }) => {
  await open(page);
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-audio').click();
  for (const k of [
    'volumeMaster',
    'volumeMusic',
    'volumeEffects',
    'volumeVoice',
    'volumeAmbience',
    'volumeInterface',
  ])
    await expect(page.getByTestId(`setting-${k}`)).toBeVisible();
  await expect(page.getByTestId('now-playing')).toContainText('River Before Silence');
  await page.getByTestId('settings-accessibility').click();
  await expect(page.getByTestId('setting-particles')).toBeVisible();
  await page.screenshot({ path: 'test-results/m13-settings.png' });
});
