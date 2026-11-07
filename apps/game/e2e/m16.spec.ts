import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

async function joinP2(page: Page) {
  await page.keyboard.press('Numpad4');
  await page.waitForFunction(() => window.__ffp!.hero(1) !== undefined);
}

/** Opens the game shell (automated browsers otherwise open the Lab directly). */
async function openShell(page: Page) {
  await page.goto('/?shell');
  await page.waitForFunction(() => window.__ffp?.shell.screen() !== 'boot');
}

async function firstLaunch(page: Page) {
  await expect(page.getByTestId('setup-step-1')).toBeVisible();
  await page.getByTestId('setup-language-en').click();
  await expect(page.getByTestId('setup-step-2')).toBeVisible();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-layout-qwerty').click();
  await expect(page.getByTestId('setup-device-prompt')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByTestId('setup-name').fill('Guo');
  await page.getByTestId('setup-finish').click();
  await expect(page.getByTestId('village')).toBeVisible();
}

test('hero selection offers all four heroes and wraps round', async ({ page }) => {
  await openShell(page);
  await firstLaunch(page);
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await expect(page.getByTestId('lobby-card-p1')).toBeVisible();
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('stage-select')).toBeVisible();
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  const names: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    names.push((await page.getByTestId('hero-name-p1').textContent())!.trim());
    await page.keyboard.press('KeyD'); // next hero
    await page.waitForTimeout(50);
  }
  expect(new Set(names.slice(0, 4)).size).toBe(4);
  expect(names).toEqual(expect.arrayContaining(['Wind Sentinel', 'Fire Warden']));
  expect(names[4]).toBe(names[0]); // wraps round
  await page.screenshot({ path: 'test-results/m16-heroes.png' });
});

test('the Lab plays both twins; their Team Attack is the Accord', async ({ page }, testInfo) => {
  await ready(page);
  await page.keyboard.press('F2');
  await page.getByTestId('set-hero-p1').selectOption('wind');
  await expect(page.getByTestId('lab-p1-hero')).toHaveText('Wind Sentinel');
  await joinP2(page);
  await page.getByTestId('set-hero-p2').selectOption('fire');
  await page.keyboard.press('F2');
  await page.waitForFunction(() => window.__ffp!.hero(1)?.hero === 'fire');
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
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(100);
  await page.keyboard.press('Numpad0');
  await page.waitForFunction(() => window.__ffp!.coop().finishers === 1, null, {
    timeout: 10_000,
  });
  const route = await page.evaluate(() => window.__ffp!.body(101)?.route ?? []);
  expect(route).toContain('twin-accord');
  expect(route).not.toContain('confluence-strike');
  await page.screenshot({ path: `test-results/m16-accord-${testInfo.project.name}.png` });
});
