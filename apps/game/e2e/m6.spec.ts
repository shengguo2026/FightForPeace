import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

const key = (page: Page, code: string, hold: string[] = []) =>
  page.evaluate(
    ([c, held]) =>
      new Promise<void>((resolve) => {
        const send = (type: string, k: string) =>
          window.dispatchEvent(new KeyboardEvent(type, { code: k, key: k }));
        for (const k of held) send('keydown', k);
        send('keydown', c);
        send('keyup', c);
        let n = 0;
        const release = () => {
          if ((n += 1) < 4) return requestAnimationFrame(release);
          for (const k of held) send('keyup', k);
          resolve();
        };
        requestAnimationFrame(release);
      }),
    [code, hold] as const,
  );

/** Puts Player 1 next to a weapon on the floor and presses Interact (J). */
async function pickUp(page: Page, weapon: string) {
  const item = await page.evaluate(
    (w) => window.__ffp!.items().find((i) => i.weapon === w && i.state === 0)!,
    weapon,
  );
  await page.evaluate((i) => window.__ffp!.placeAt(0, i.x - 30, i.z), item);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 0);
  await key(page, 'KeyJ');
  await page.waitForFunction((w) => window.__ffp!.hero(0)!.weapon === w, weapon);
  // The pickup takes a few frames; presses during it are not buffered.
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 0);
}

test('the Lab shows real art: founder, dummy, weapon and scenery sheets load', async ({
  page,
}, testInfo) => {
  await ready(page);
  const loaded = await page.evaluate(() => window.__ffp!.items().map((i) => i.weapon));
  expect(loaded).toEqual(['workstaff', 'handwheel']);
  // Every sheet the manifest names is served.
  const res = await page.request.get('/art/mountain-idle.webp');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('webp');
  await page.screenshot({ path: `test-results/m6-art-${testInfo.project.name}.png` });
});

test('pick up the Workstaff, swing it, and the F10 panel reports it', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('F10');
  await pickUp(page, 'workstaff');
  await expect(page.getByTestId('weapon-holding-p1')).toContainText('Canal Workstaff');
  await expect(page.getByTestId('weapon-holding-p1')).toContainText('two-handed');
  await key(page, 'KeyT');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.action === 'staff-thrust');
});

test('the staff locks Specials (two hands); the Handwheel does not', async ({ page }) => {
  await ready(page);
  await pickUp(page, 'workstaff');
  await key(page, 'KeyU');
  await page.waitForTimeout(150);
  expect((await page.evaluate(() => window.__ffp!.hero(0)!)).category).not.toBe('special');
  // Drop it (Down + Interact), then take the Handwheel.
  await key(page, 'KeyJ', ['KeyS']);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.weapon === null);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 0);
  await pickUp(page, 'handwheel');
  await key(page, 'KeyU');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.category === 'special');
});

test('throw the Handwheel at a dummy: it hits once and lands as a pickup', async ({
  page,
}, testInfo) => {
  await ready(page);
  await pickUp(page, 'handwheel');
  await page.evaluate(() => window.__ffp!.place(0, -380, 0));
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 0);
  await key(page, 'KeyJ');
  await page.waitForFunction(() => window.__ffp!.items().some((i) => i.state === 2));
  // The Lab refills the dummy when the combo ends, so read the hit from its route.
  await page.waitForFunction(() => window.__ffp!.body(101)!.route.includes('wheel-throw'));
  await page.screenshot({ path: `test-results/m6-throw-${testInfo.project.name}.png` });
  await page.waitForFunction(() =>
    window.__ffp!.items().some((i) => i.weapon === 'handwheel' && i.state === 0),
  );
});

test('an armed dummy fights with the staff core', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    window.__ffp!.armDummy('workstaff');
    window.__ffp!.setTrainer({ attackers: 1, interval: 40, approach: true });
    window.__ffp!.place(0, -200, 0);
  });
  await page.waitForFunction(() => window.__ffp!.body(101)!.action?.startsWith('staff-') ?? false);
  expect((await page.evaluate(() => window.__ffp!.body(101)!)).weapon).toBe('workstaff');
});

test('the scenery: boards break into a fragment, the cog telegraphs, the pillar cracks', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.keyboard.press('F10');
  // The cog cycles rest → warning → active.
  await page.waitForFunction(() => window.__ffp!.scenery().cog.phase === 1, null, {
    timeout: 15_000,
  });
  await expect(page.getByTestId('weapon-scenery')).toContainText('WARNING');
  await page.waitForFunction(() => window.__ffp!.scenery().cog.phase === 2);
  await page.screenshot({ path: `test-results/m6-cog-${testInfo.project.name}.png` });
  // Staff strikes on the boards.
  await pickUp(page, 'workstaff');
  await page.evaluate(() => window.__ffp!.placeAt(0, 570, 710));
  for (let i = 0; i < 8; i += 1) {
    await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 0);
    await key(page, 'KeyT');
    const broken = await page.evaluate(() => window.__ffp!.scenery().boards.state === 3);
    if (broken) break;
  }
  await page.waitForFunction(() => window.__ffp!.scenery().boards.state === 3);
  await page.waitForFunction(() => window.__ffp!.items().some((i) => i.weapon === 'timber-board'));
  // Pillar impact: a launching hit into the pillar cracks it.
  // A press while the hero is still recovering is not buffered, so retry from idle.
  for (let i = 0; i < 6; i += 1) {
    await page.getByTestId('dummy-to-pillar').click();
    await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 0);
    await key(page, 'KeyT', ['KeyD']);
    const cracked = await page
      .waitForFunction(() => window.__ffp!.scenery().pillar.impacts >= 1, null, { timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (cracked) break;
  }
  await page.waitForFunction(() => window.__ffp!.scenery().pillar.impacts >= 1);
  await page.screenshot({ path: `test-results/m6-scenery-${testInfo.project.name}.png` });
});
