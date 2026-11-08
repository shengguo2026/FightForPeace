import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

async function openRoom(page: Page) {
  await page.goto('/?greenhouse=greenhouse-test-room');
  await page.waitForFunction(() => window.__ffp?.greenhouse()?.room === 'greenhouse-test-room');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

/** Waits until Player 1 can act (standing, no action running). */
async function ready(page: Page) {
  await page.waitForFunction(() => {
    const h = window.__ffp!.hero(0);
    return !window.__ffp!.paused() && !!h && h.state <= 1 && h.action === null;
  });
}

test('the greenhouse test room opens with its Ledger, containers and grade', async ({ page }) => {
  await openRoom(page);
  const gh = (await page.evaluate(() => window.__ffp!.greenhouse()))!;
  expect(gh.assets.map((a) => a.name)).toContain('pump');
  expect(gh.assets.every((a) => a.condition === a.max)).toBe(true);
  expect(gh.containers.length).toBeGreaterThanOrEqual(8);
  expect(gh.grade).toBe('flourishing');
  expect(gh.score).toBe(100);
  await page.screenshot({ path: 'test-results/m18-room.png' });
});

test('Interact opens a protected container (Clinic Cabinet)', async ({ page }) => {
  await openRoom(page);
  const cab = (await page.evaluate(() =>
    window.__ffp!.greenhouse()!.containers.find((c) => c.kind === 'clinic-cabinet'),
  ))!;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.evaluate(({ x, z }) => window.__ffp!.moveHeroes(x + 40, z + 40), cab);
    await ready(page);
    await page.keyboard.press('KeyJ');
    try {
      await page.waitForFunction(
        () =>
          window.__ffp!.greenhouse()!.containers.find((c) => c.kind === 'clinic-cabinet')!.opened,
        null,
        { timeout: 2000 },
      );
      break;
    } catch {
      /* an enemy interrupted: try again */
    }
  }
  const gh = (await page.evaluate(() => window.__ffp!.greenhouse()))!;
  expect(gh.containers.find((c) => c.kind === 'clinic-cabinet')!.opened).toBe(true);
  expect(gh.record.opened).toBeGreaterThanOrEqual(1);
});

test('holding Interact repairs a damaged crop bed', async ({ page }) => {
  await openRoom(page);
  await page.evaluate(() => window.__ffp!.damageAsset('bed-west', 25));
  const bed = (await page.evaluate(() =>
    window.__ffp!.greenhouse()!.assets.find((a) => a.name === 'bed-west'),
  ))!;
  expect(bed.condition).toBe(bed.max - 25);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.evaluate(({ x, z }) => window.__ffp!.moveHeroes(x, z - 40), bed);
    await ready(page);
    await page.keyboard.down('KeyJ');
    try {
      await page.waitForFunction(
        (c) =>
          window.__ffp!.greenhouse()!.assets.find((a) => a.name === 'bed-west')!.condition >=
          c + 10,
        bed.condition,
        { timeout: 4000 },
      );
      await page.keyboard.up('KeyJ');
      break;
    } catch {
      await page.keyboard.up('KeyJ');
    }
  }
  const after = (await page.evaluate(() =>
    window.__ffp!.greenhouse()!.assets.find((a) => a.name === 'bed-west'),
  ))!;
  expect(after.condition).toBeGreaterThanOrEqual(bed.condition + 10);
  await page.screenshot({ path: 'test-results/m18-repair.png' });
});
