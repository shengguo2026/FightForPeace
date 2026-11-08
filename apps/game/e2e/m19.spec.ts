import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

async function openRoom(page: Page, query: string, room: string) {
  await page.goto(`/?${query}`);
  await page.waitForFunction((r) => window.__ffp?.greenhouse()?.room === r, room);
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

test('the Signalman trial room opens with its Stage 2 roles', async ({ page }) => {
  await openRoom(page, 'greenhouse=trial-signalman&difficulty=extreme', 'trial-signalman');
  await page.waitForFunction(() => (window.__ffp!.encounter()?.enemies.length ?? 0) > 0, null, {
    timeout: 30_000,
  });
  const enc = (await page.evaluate(() => window.__ffp!.encounter()))!;
  expect(enc.difficulty).toBe('extreme');
  await page.screenshot({ path: 'test-results/m19-signalman.png' });
});

test('Marek’s yard after a broken intercept: armed command, half Resolve, Tomas', async ({
  page,
}) => {
  await openRoom(page, 'greenhouse=boss-marek&intercept=1', 'boss-marek');
  await page.waitForFunction(() => !!window.__ffp!.encounter()?.boss, null, { timeout: 30_000 });
  const enc = (await page.evaluate(() => window.__ffp!.encounter()))!;
  expect(enc.boss!.phase).toBe(0);
  expect(enc.boss!.intercept).toBe(1);
  expect(enc.boss!.capture).toBe(0);
  expect(enc.enemies.some((e) => e.kit === 'marek')).toBe(true);
  await page.screenshot({ path: 'test-results/m19-marek.png' });
});

test('the mounted intercept brings Marek in on his own bike', async ({ page }) => {
  await page.goto('/?pursuit=marek-intercept');
  await page.waitForFunction(() => window.__ffp?.pursuit()?.corridor === 'marek-intercept');
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__ffp!.pursuit()!.enemies.some((e) => e.boss), null, {
    timeout: 60_000,
  });
  await page.keyboard.up('KeyD');
  expect((await page.evaluate(() => window.__ffp!.pursuit()))!.marek).toBe(3);
  await page.screenshot({ path: 'test-results/m19-intercept.png' });
});
