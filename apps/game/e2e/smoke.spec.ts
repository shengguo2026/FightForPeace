import { expect, test } from '@playwright/test';

test('greybox body moves right while D is held', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page).toHaveTitle('Fight For Peace');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
  const x0 = await page.evaluate(() => window.__ffp!.body(1)!.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const x1 = await page.evaluate(() => window.__ffp!.body(1)!.x);
  expect(x1).toBeGreaterThan(x0);
  await expect(page.getByTestId('lab-frame')).toBeVisible();
  await expect(page.getByTestId('lab-hash')).toHaveText(/^[0-9a-f]{8}$/);
  await expect(page.getByTestId('lab-input')).toContainText('D');
  await page.screenshot({ path: `test-results/m0-greybox-${testInfo.project.name}.png` });
});

test('F1 toggles the Lab overlay', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('lab-frame')).toBeVisible();
  await page.keyboard.press('F1');
  await expect(page.getByTestId('lab-frame')).toBeHidden();
  await page.keyboard.press('F1');
  await expect(page.getByTestId('lab-frame')).toBeVisible();
});

test('losing focus releases held keys', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const xAfterBlur = await page.evaluate(() => window.__ffp!.body(1)!.x);
  await page.waitForTimeout(300);
  const xLater = await page.evaluate(() => window.__ffp!.body(1)!.x);
  expect(xLater).toBe(xAfterBlur);
  await page.keyboard.up('KeyD');
});
