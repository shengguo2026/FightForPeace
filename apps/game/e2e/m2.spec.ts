import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

const hero = (page: Page, slot = 0) => page.evaluate((s) => window.__ffp!.hero(s)!, slot);

/** Waits for an action of this pose category to reach its active frames; returns its id. */
async function waitCategory(page: Page, category: string): Promise<string> {
  const handle = await page.waitForFunction(
    (c) => {
      const h = window.__ffp!.hero(0)!;
      return h.category === c && h.stateFrame >= 4 ? h.action : null;
    },
    category,
    { polling: 'raf' },
  );
  return (await handle.jsonValue()) as string;
}

test('Player 1 is the Mountain Guardian; F2 switches to the River Scout', async ({ page }) => {
  await ready(page);
  await expect(page.getByTestId('lab-p1-hero')).toHaveText('Mountain Guardian');
  await page.keyboard.press('F5');
  await expect(page.getByTestId('movelist-p1')).toContainText("Mason's Touch");
  await page.keyboard.press('F2');
  await page.getByTestId('set-hero-p1').selectOption('river');
  await expect(page.getByTestId('lab-p1-hero')).toHaveText('River Scout');
  await expect(page.getByTestId('movelist-p1')).toContainText('Reed Tap');
  expect((await hero(page)).hero).toBe('river');
});

test('three Attack presses on a dummy give a three-hit string', async ({ page }, testInfo) => {
  await ready(page);
  await page.evaluate(() => window.__ffp!.place(0, -80, 0));
  // Press Attack once to start, then again right after each hit lands (inside the window).
  const best = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const tap = () => {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't' }));
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyT', key: 't' }));
        };
        let seen = 0;
        let max = 0;
        let frames = 0;
        tap();
        const tick = () => {
          const hits = window.__ffp!.body(101)!.combo.hits;
          if (hits > seen) tap();
          seen = hits;
          max = Math.max(max, hits);
          frames += 1;
          if (frames < 150) requestAnimationFrame(tick);
          else resolve(max);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(best).toBe(3);
  await expect(page.getByTestId('lab-target-hits')).toHaveText('3');
  const damage = Number(await page.getByTestId('lab-target-damage').textContent());
  expect(damage).toBeGreaterThan(100);
  await page.screenshot({ path: `test-results/m2-string-${testInfo.project.name}.png` });
});

/** In-page: dispatches a key press once `when` holds for hero 0, then resolves. */
async function pressWhen(page: Page, code: string, key: string, when: string) {
  await page.waitForFunction(
    ([c, k, w]) => {
      const h = window.__ffp!.hero(0)!;
      const frame = window.__ffp!.frame();
      if (!new Function('h', 'frame', `return ${w}`)(h, frame)) return false;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: k }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: k }));
      return true;
    },
    [code, key, when] as const,
    { polling: 'raf' },
  );
}

test('standing, low and aerial attacks use three different poses', async ({ page }, testInfo) => {
  await ready(page);
  await page.keyboard.press('F6'); // slow motion, so the screenshots catch the active frames
  const name = testInfo.project.name;
  await pressWhen(page, 'KeyT', 't', 'h.state === 0');
  expect(await waitCategory(page, 'standing')).toBe('masons-touch');
  await page.screenshot({ path: `test-results/m2-pose-standing-${name}.png` });

  await pressWhen(page, 'KeyY', 'y', 'h.state === 0');
  await pressWhen(page, 'KeyT', 't', 'h.y > 40 * 256');
  expect(await waitCategory(page, 'aerial')).toBe('rafter-palm');
  await page.screenshot({ path: `test-results/m2-pose-aerial-${name}.png` });

  // Low Attack via the chord: dash (double-tap Right), then Attack and Guard together.
  await pressWhen(page, 'KeyD', 'd', 'h.state === 0');
  const tapped = await page.evaluate(() => window.__ffp!.frame());
  await pressWhen(page, 'KeyD', 'd', `frame >= ${tapped + 2}`);
  await page.waitForFunction(
    () => {
      if (window.__ffp!.hero(0)!.state !== 2) return false;
      for (const [code, key] of [
        ['KeyT', 't'],
        ['KeyG', 'g'],
      ]) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, key }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key }));
      }
      return true;
    },
    null,
    { polling: 'raf' },
  );
  expect(await waitCategory(page, 'low')).toBe('faultline-reap');
  await page.screenshot({ path: `test-results/m2-pose-low-${name}.png` });
});

test('F3 shows hitboxes on active frames', async ({ page }, testInfo) => {
  await ready(page);
  await page.evaluate(() => window.__ffp!.place(0, -80, 0));
  await page.keyboard.press('F3');
  await page.keyboard.press('F6');
  await page.keyboard.press('KeyT');
  // Pause on the first active frame (Esc), so the screenshot shows the red hitbox.
  await page.waitForFunction(
    () => {
      const h = window.__ffp!.hero(0)!;
      if (h.action !== 'masons-touch' || h.stateFrame < 5) return false;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
      return true;
    },
    null,
    { polling: 'raf' },
  );
  expect((await hero(page)).stateFrame).toBeLessThanOrEqual(7);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `test-results/m2-hitboxes-${testInfo.project.name}.png` });
});

test('a rejected press shows its reason in the Lab', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('KeyT');
  // Press again during the whiffed starter's recovery: there is no hit to cancel from.
  await page.waitForFunction(
    () => {
      const h = window.__ffp!.hero(0)!;
      if (h.action !== 'masons-touch' || h.stateFrame < 9) return false;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyT', key: 't' }));
      return true;
    },
    null,
    { polling: 'raf' },
  );
  await expect(page.getByTestId('lab-p1-verdict')).toContainText('needs a hit');
});
