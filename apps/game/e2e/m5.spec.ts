import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

/** One scripted press: when `when` (an expression over h = hero 1, d = dummy 1) holds. */
interface Cue {
  when: string;
  keys: string[];
  hold?: string[];
}

/**
 * Plays cues in the page, one per animation frame at most: each waits for its condition
 * (never a wall-clock delay), then presses its keys, holding `hold` for a few frames.
 */
async function play(page: Page, cues: Cue[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const key = (type: string, code: string) =>
          window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
        let i = 0;
        let frames = 0;
        const tick = () => {
          const h = window.__ffp!.hero(0)!;
          const d = window.__ffp!.body(101)!;
          const c = list[i]!;
          if (new Function('h', 'd', `return ${c.when}`)(h, d)) {
            const held = c.hold ?? [];
            for (const k of held) key('keydown', k);
            for (const k of c.keys) key('keydown', k);
            for (const k of c.keys) key('keyup', k);
            let n = 0;
            const release = () => {
              if ((n += 1) < 4) return requestAnimationFrame(release);
              for (const k of held) key('keyup', k);
            };
            requestAnimationFrame(release);
            i += 1;
            if (i === list.length) return resolve();
          }
          if ((frames += 1) > 2400) return reject(new Error(`cue ${i} timed out: ${c.when}`));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    cues,
  );
}

const routeHas = (page: Page, id: string) =>
  page.waitForFunction((a) => window.__ffp!.body(101)!.route.includes(a), id);

test('Special: neutral Special fires Stonewake Palm', async ({ page }, testInfo) => {
  await ready(page);
  await page.evaluate(() => window.__ffp!.place(0, -80, 0));
  await play(page, [{ when: 'h.state === 0', keys: ['KeyU'] }]);
  await routeHas(page, 'stonewake-palm');
  await page.screenshot({ path: `test-results/m5-special-${testInfo.project.name}.png` });
});

test('Ultimate: a full bar fires Rivergate Oath and spends the whole bar', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    window.__ffp!.place(0, -80, 0);
    window.__ffp!.setMeter(0, 100);
  });
  await play(page, [{ when: 'h.state === 0 && h.meter === 100', keys: ['KeyH'] }]);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.action === 'rivergate-oath');
  expect((await page.evaluate(() => window.__ffp!.hero(0)!)).meter).toBe(0);
  await routeHas(page, 'rivergate-oath');
});

test('Grab and throw: Interact grabs, Interact again throws forward', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.keyboard.press('F9');
  await page.evaluate(() => window.__ffp!.place(0, -60, 0));
  await play(page, [
    { when: 'h.state === 0', keys: ['KeyJ'] },
    { when: 'h.state === 18', keys: ['KeyJ'] }, // MoveState.Grabbing
  ]);
  await routeHas(page, 'sluicegate-toss');
  await expect(page.getByTestId('grab-log-p1')).toContainText('Throw ✓');
  await page.screenshot({ path: `test-results/m5-throw-${testInfo.project.name}.png` });
});

test('Grab escape: Guard while ESCAPE shows frees the hero', async ({ page }, testInfo) => {
  await ready(page);
  await page.keyboard.press('F9');
  await page.keyboard.press('F6'); // slow motion: the 11-frame window spans many render frames
  await page.evaluate(() => {
    window.__ffp!.place(0, -140, 0);
    window.__ffp!.setTrainer({ attackers: 1, pattern: 6, interval: 20, approach: true });
  });
  // Press only once the ESCAPE prompt is on screen and the window is open.
  await play(page, [
    {
      when: "window.__ffp.escapeOpen(0) && (document.querySelector('[data-testid=grab-cue-p1]')?.textContent ?? '').includes('ESCAPE')",
      keys: ['KeyG'],
    },
  ]);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.grabEvent !== 17);
  const h = await page.evaluate(() => window.__ffp!.hero(0)!);
  expect(h.grabEvent).toBe(9); // GrabEvent.Escape
  expect(h.health).toBe(1000);
  await expect(page.getByTestId('grab-log-p1')).toContainText('Grab escape ✓');
  await page.screenshot({ path: `test-results/m5-grab-escape-${testInfo.project.name}.png` });
});

test('Loadout: equip Skybreak Column in the Up slot and fire it with Up + Special', async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press('F2');
  await page.getByTestId('loadout-p1-special-up').selectOption('Skybreak Column');
  await page.keyboard.press('F2');
  await page.waitForFunction(() => (window.__ffp!.hero(0)!.loadout[3] ?? -1) >= 0);
  await page.evaluate(() => window.__ffp!.place(0, -80, 0));
  await play(page, [{ when: 'h.state === 0', keys: ['KeyU'], hold: ['KeyW'] }]);
  await routeHas(page, 'skybreak-column');
});
