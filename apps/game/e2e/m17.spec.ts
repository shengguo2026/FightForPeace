import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

async function startPursuit(page: Page, query = '') {
  await page.goto(`/?pursuit=perimeter-pursuit${query}`);
  await page.waitForFunction(() => (window.__ffp?.pursuit()?.riders.length ?? 0) > 0);
}

test('the greybox pursuit rides solo: steering, progress and mounted hints', async ({ page }) => {
  await startPursuit(page);
  const start = (await page.evaluate(() => window.__ffp!.pursuit()!))!;
  expect(start.corridor).toBe('perimeter-pursuit');
  expect(start.riders).toHaveLength(1);
  await expect(page.getByTestId('hint-p1')).toContainText("Mason's Reach");
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyD');
  const after = await page.evaluate(() => window.__ffp!.pursuit()!);
  expect(after.riders[0]!.x).toBeGreaterThan(start.riders[0]!.x);
  expect(after.camX).toBeGreaterThanOrEqual(start.camX);
  await page.screenshot({ path: 'test-results/m17-solo.png' });
});

test('co-op: Player 2 joins on the second bike; both reach the Response Record', async ({
  page,
}) => {
  await startPursuit(page);
  await page.keyboard.press('Numpad4');
  await page.waitForFunction(() => window.__ffp!.pursuit()!.riders.length === 2);
  const p = await page.evaluate(() => window.__ffp!.pursuit()!);
  expect(new Set(p.riders.map((r) => r.hero)).size).toBe(2);
  await page.evaluate(() => window.__ffp!.rideTo(29000));
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__ffp!.pursuit()!.phase === 2, null, {
    timeout: 30_000,
  });
  await page.keyboard.up('KeyD');
  const done = await page.evaluate(() => window.__ffp!.pursuit()!);
  expect(done.grades.map((g) => g.id)).toEqual([
    'response',
    'protection',
    'control',
    'stability',
    'assistance',
  ]);
  for (const g of done.grades) expect(['S', 'A', 'B', 'C']).toContain(g.grade);
  await page.screenshot({ path: 'test-results/m17-record.png' });
});

test('STEADYRIDE keeps Stability and marks the run Cheat-Assisted', async ({ page }) => {
  await startPursuit(page);
  await page.evaluate(() =>
    window.__ffp!.startPursuit('perimeter-pursuit', { steady: true, difficulty: 'hard' }),
  );
  await page.waitForFunction(() => window.__ffp!.pursuit()?.cheatAssisted === true);
  await page.evaluate(() => window.__ffp!.rideTo(14200));
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(3000);
  await page.keyboard.up('KeyD');
  const p = await page.evaluate(() => window.__ffp!.pursuit()!);
  expect(p.riders[0]!.stability).toBe(100);
  expect(p.cheatAssisted).toBe(true);
});
