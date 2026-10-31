import { expect, test, type Page } from '@playwright/test';

const BUTTONS = 17;
function pad(
  press: string[] = [],
  id = 'Xbox Wireless Controller (Vendor: 045e Product: 0b13)',
  index = 0,
) {
  const names = [
    'South',
    'East',
    'West',
    'North',
    'LB',
    'RB',
    'LT',
    'RT',
    'Back',
    'Start',
    'LS',
    'RS',
    'DpadUp',
    'DpadDown',
    'DpadLeft',
    'DpadRight',
    'Home',
  ];
  return {
    id,
    index,
    connected: true,
    mapping: 'standard',
    buttons: Array.from({ length: BUTTONS }, (_, i) => press.includes(names[i]!)),
    axes: [0, 0, 0, 0],
  };
}

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

const heroState = (page: Page, slot = 0) =>
  page.evaluate((s) => window.__ffp!.hero(s)?.state, slot);

test('double-tapping D dashes', async ({ page }) => {
  await ready(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(40);
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 2, null, { timeout: 2000 });
  await page.keyboard.up('KeyD');
});

test('Jump (physical KeyY) jumps and lands', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('KeyY');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.y > 0);
  await page.waitForFunction(
    () => window.__ffp!.hero(0)!.y === 0 && window.__ffp!.hero(0)!.state === 0,
  );
});

test('Attack shows the attack pose; the hint bar names the key', async ({ page }, testInfo) => {
  await ready(page);
  await expect(page.getByTestId('hint-p1')).toContainText('Attack T');
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 4);
  await page.screenshot({ path: `test-results/m1-attack-${testInfo.project.name}.png` });
});

test('keyboard layout pick: Jump shows Z on QWERTZ, Y on QWERTY', async ({ page }) => {
  await ready(page);
  await expect(page.getByTestId('hint-p1')).toContainText('Jump Y');
  await page.keyboard.press('F2');
  await page.getByTestId('set-layout').selectOption('qwertz');
  await expect(page.getByTestId('hint-p1')).toContainText('Jump Z');
  await page.getByTestId('set-layout').selectOption('qwerty');
  await expect(page.getByTestId('hint-p1')).toContainText('Jump Y');
});

test('rebinding Attack to K changes the prompt without a reload', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('F2');
  await page.getByTestId('rebind-attack').click();
  await page.keyboard.press('KeyK');
  await expect(page.getByTestId('hint-p1')).toContainText('Attack K');
  await page.keyboard.press('KeyK');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.state === 4);
  await page.getByTestId('reset-bindings').click();
  await expect(page.getByTestId('hint-p1')).toContainText('Attack T');
});

test('Num 4 joins Player 2 on the split keyboard', async ({ page }, testInfo) => {
  await ready(page);
  expect(await heroState(page, 1)).toBeUndefined();
  await page.keyboard.press('Numpad4');
  await page.waitForFunction(() => window.__ffp!.hero(1) !== undefined);
  await expect(page.getByTestId('hint-p2')).toContainText('Attack Num 4');
  const x0 = await page.evaluate(() => window.__ffp!.hero(1)!.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__ffp!.hero(1)!.x)).toBeGreaterThan(x0);
  await page.keyboard.press('F3');
  await page.screenshot({ path: `test-results/m1-two-heroes-${testInfo.project.name}.png` });
});

test('single-player: a gamepad takes over Player 1 and shows its glyphs', async ({ page }) => {
  await ready(page);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.waitForTimeout(50);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad(['South']));
  await page.waitForFunction(() => window.__ffp!.hero(0)!.y > 0);
  await expect(page.getByTestId('lab-p1-device')).toContainText('gamepad 0 (xbox)');
  await expect(page.getByTestId('hint-p1')).toContainText('Jump A');
  await page.keyboard.press('F2');
  await page.getByTestId('set-prompt-style').selectOption('playstation');
  await expect(page.getByTestId('hint-p1')).toContainText('Jump ✕');
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
});

test('co-op: unplugging Player 2’s pad pauses, plugging it back resumes', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.waitForTimeout(50);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad(['Start']));
  await page.waitForFunction(() => window.__ffp!.slots()[1]!.joined);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__ffp!.paused())).toBe(false);

  // A second, new pad does not take over anyone.
  await page.evaluate(
    (ps) => window.__ffp!.fakePads(ps),
    [pad(), pad(['South'], 'DualSense (Vendor: 054c)', 1)],
  );
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__ffp!.slots().map((s) => s.device))).toEqual([
    'kb:p1',
    'pad:0',
  ]);

  await page.evaluate(() => window.__ffp!.fakePads([]));
  await expect(page.getByTestId('pause-controller-lost')).toBeVisible();
  const f0 = await page.evaluate(() => window.__ffp!.frame());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ffp!.frame())).toBe(f0);
  await page.screenshot({ path: `test-results/m1-controller-lost-${testInfo.project.name}.png` });

  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad([], undefined, 3));
  await expect(page.getByTestId('pause-overlay')).toBeHidden();
  await page.waitForFunction((f) => window.__ffp!.frame() > f + 5, f0);
});

test('Esc pauses and resumes', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  await expect(page.getByTestId('pause-overlay')).toContainText('Press Esc to continue');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-overlay')).toBeHidden();
});

test('Dash, then T and G together, performs the low attack', async ({ page }) => {
  await ready(page);
  // Real key events, sent from inside the page the moment the dash is seen, so the chord
  // lands within the 14-frame dash even when a slow CI browser renders at a low rate.
  const key = (type: 'keydown' | 'keyup', code: string, key: string) =>
    page.evaluate(
      ([t, c, k]) => window.dispatchEvent(new KeyboardEvent(t!, { code: c, key: k })),
      [type, code, key],
    );
  await key('keydown', 'KeyD', 'd');
  await key('keyup', 'KeyD', 'd');
  await page.waitForTimeout(40);
  await key('keydown', 'KeyD', 'd');
  const kind = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const send = (code: string, k: string) =>
          window.dispatchEvent(new KeyboardEvent('keydown', { code, key: k }));
        const waitDash = () => {
          if (window.__ffp!.hero(0)!.state !== 2) return requestAnimationFrame(waitDash);
          send('KeyT', 't');
          send('KeyG', 'g');
          const waitAttack = () => {
            const h = window.__ffp!.hero(0)!;
            if (h.state !== 4) return requestAnimationFrame(waitAttack);
            resolve(h.attackKind);
          };
          waitAttack();
        };
        waitDash();
      }),
  );
  for (const [c, k] of [
    ['KeyD', 'd'],
    ['KeyT', 't'],
    ['KeyG', 'g'],
  ] as const)
    await key('keyup', c, k);
  expect(kind).toBe(256);
});
