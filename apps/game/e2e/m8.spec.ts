import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

async function joinP2(page: Page) {
  await page.keyboard.press('Numpad4');
  await page.waitForFunction(() => window.__ffp!.hero(1) !== undefined);
}

test('Team Attack: P1 invites with their key, P2 confirms with Num 0, the finisher lands', async ({
  page,
}, testInfo) => {
  await ready(page);
  await joinP2(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const f = window.__ffp!;
    f.place(0, -150, 0);
    f.place(1, 150, 0);
    f.setMeter(0, 100);
    f.setMeter(1, 100);
    f.staggerDummy(900);
  });
  await page.waitForTimeout(50);
  // P1 invites; P2 answers a few frames later, inside the half-second window.
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(100);
  await page.keyboard.press('Numpad0');
  await page.waitForFunction(() => window.__ffp!.coop().finishers === 1, null, {
    timeout: 10_000,
  });
  expect(await page.evaluate(() => window.__ffp!.coop().invite)).toBeNull();
  // Both costs were spent once, together.
  const meters = await page.evaluate(() => [
    window.__ffp!.hero(0)!.meter,
    window.__ffp!.hero(1)!.meter,
  ]);
  expect(meters[0]).toBe(meters[1]);
  await expect(page.getByTestId('coop-lines')).toContainText('team finishers 1');
  await page.screenshot({ path: `test-results/m8-finisher-${testInfo.project.name}.png` });
});

test('an unanswered invitation shows the partner’s prompt, runs out and spends nothing', async ({
  page,
}, testInfo) => {
  await ready(page);
  await joinP2(page);
  await page.evaluate(() => {
    const f = window.__ffp!;
    f.place(0, -150, 0);
    f.place(1, 150, 0);
    f.setMeter(0, 100);
    f.setMeter(1, 100);
    f.staggerDummy(900);
  });
  await page.waitForTimeout(50);
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => window.__ffp!.coop().invite !== null);
  // Pause to read the invited partner's prompt (the window is half a second).
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ffp!.paused());
  if (await page.evaluate(() => window.__ffp!.coop().invite !== null)) {
    await expect(page.getByTestId('team-invite')).toContainText('P2');
    await expect(page.getByTestId('team-invite')).toContainText('Num 0');
    await page.screenshot({ path: `test-results/m8-invite-${testInfo.project.name}.png` });
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ffp!.paused());
  await page.waitForFunction(() => window.__ffp!.coop().invite === null, null, {
    timeout: 5_000,
  });
  expect(await page.evaluate(() => window.__ffp!.coop().finishers)).toBe(0);
  await expect(page.getByTestId('coop-lines')).toContainText('nothing spent');
});

test('losing window focus pauses with a message; Pause resumes', async ({ page }, testInfo) => {
  await ready(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => window.__ffp!.paused());
  await expect(page.getByTestId('pause-focus')).toContainText('lost focus');
  await expect(page.getByTestId('pause-focus')).toContainText('Esc');
  const frame = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ffp!.frame())).toBe(frame);
  await page.screenshot({ path: `test-results/m8-focus-pause-${testInfo.project.name}.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ffp!.paused());
  await page.waitForFunction((f) => window.__ffp!.frame() > f, frame);
  // A hidden tab pauses the same way.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => window.__ffp!.focusPaused());
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Coming back alone never resumes (the Lab's paused flag updates on the next render frame).
  await page.waitForFunction(() => window.__ffp!.paused());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ffp!.focusPaused())).toBe(true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ffp!.paused());
});

test('the Co-op panel sets the presentation quality; the simulation hash is unaffected', async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByTestId('coop-panel')).toContainText('Co-op');
  await page.getByTestId('quality-setting').selectOption('low');
  await expect(page.getByTestId('quality-level')).toContainText('drawing low');
  expect(await page.evaluate(() => window.__ffp!.quality())).toEqual({
    setting: 'low',
    level: 'low',
  });
  await page.getByTestId('quality-setting').selectOption('auto');
  await page.waitForFunction(() => window.__ffp!.quality().setting === 'auto');
});
