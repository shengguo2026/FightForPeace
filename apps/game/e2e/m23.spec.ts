import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * M23 Stage 2 acceptance in the browser (spec §18): the Stage 2 screens in German and
 * Chinese (layout, overflow, fallback text, axe), Stage 2 in play and its results in both
 * languages, a cheat chosen with the gamepad only, and (Chromium) a crowded Stage 2 room on
 * a throttled CPU. The headless parts are packages/sim/test/m23-*.test.ts.
 */
test.describe.configure({ timeout: 180_000 });

type Lang = 'de' | 'zh-CN';

async function firstLaunch(page: Page, lang: Lang | 'en') {
  await page.goto('/?shell');
  await page.waitForFunction(() => window.__ffp?.shell.screen() !== 'boot');
  await page.getByTestId(`setup-language-${lang}`).click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId(lang === 'de' ? 'setup-layout-qwertz' : 'setup-layout-qwerty').click();
  await page.keyboard.press('Enter');
  await page.getByTestId('setup-name').fill('Guo');
  await page.getByTestId('setup-finish').click();
  await expect(page.getByTestId('village')).toBeVisible();
}

/** Text boxes cut off or running out of the window, inside `scope` (CSS selector). */
async function overflowing(page: Page, scope: string): Promise<string[]> {
  return page.evaluate((scope) => {
    const out: string[] = [];
    const vw = window.innerWidth;
    const sel = [
      '.ffp-btn',
      '.ffp-title',
      'h1',
      'h2',
      '.ffp-hint',
      'th',
      'td',
      '[data-testid^="results-"]',
      '[data-testid^="hint-"]',
      '[data-testid^="epilogue"]',
    ]
      .map((s) => `${scope} ${s}`)
      .join(', ');
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const cut = el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto';
      const outside = r.right > vw + 2 || r.left < -2;
      if (cut || outside)
        out.push(`${el.dataset.testid ?? el.className}: "${el.innerText.slice(0, 60)}"`);
    }
    return out;
  }, scope);
}

async function axeProblems(page: Page, name: string): Promise<string[]> {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('canvas')
    .analyze();
  const aria = r.incomplete.filter((v) => v.id.startsWith('aria-'));
  return [...r.violations, ...aria]
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${name}: ${v.id} (${v.impact}) ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
    );
}

async function fallbacks(page: Page, lang: Lang): Promise<string[]> {
  const d = await page.evaluate(() => window.__ffp!.shell.diagnostics());
  return d.filter((x) => x.startsWith(`${lang}:`) || x.startsWith('missing:'));
}

const MUSEUM = ['picture', 'cinema', 'music', 'collection', 'investigation'];

test.describe('Stage 2 screens in German and Chinese', () => {
  for (const lang of ['de', 'zh-CN'] as const)
    test(`${lang}: stage select, Museum, Store and Records fit; no English fallback`, async ({
      page,
      browserName,
    }, info) => {
      await firstLaunch(page, lang);
      await page.evaluate(() => window.__ffp!.shell.completeStage('stage1'));
      const problems: string[] = [];
      const check = async (name: string) => {
        for (const o of await overflowing(page, '.ffp-shell')) problems.push(`${name}: ${o}`);
        // axe once per engine is enough; its rules do not depend on the font.
        if (browserName === 'chromium') problems.push(...(await axeProblems(page, name)));
      };
      await page.getByTestId('menu-museum').click();
      await expect(page.getByTestId('museum')).toBeVisible();
      await check('museum');
      for (const s of MUSEUM) {
        await page.getByTestId(`museum-section-${s}`).click();
        await check(`museum ${s}`);
        await page.getByTestId('museum-sections').click();
      }
      await page.getByTestId('museum-back').click();
      for (const [item, screen] of [
        ['store', 'store'],
        ['records', 'records'],
      ] as const) {
        await page.getByTestId(`menu-${item}`).click();
        await page.waitForFunction((s) => window.__ffp!.shell.screen() === s, screen);
        await check(screen);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('village')).toBeVisible();
      }
      await page.getByTestId('menu-play').click();
      await page.getByTestId('mode-solo').click();
      await page.keyboard.press('KeyT');
      await expect(page.getByTestId('stage-select')).toBeVisible();
      await page.getByTestId('stage-pick').click();
      await expect(page.getByTestId('stage-pick')).toHaveAttribute('data-value', 'stage2');
      await check('stage select (Stage 2)');
      await page.screenshot({ path: `test-results/m23-${lang}-stage2-${info.project.name}.png` });
      expect(problems).toEqual([]);
      expect(await fallbacks(page, lang)).toEqual([]);
    });
});

/** Opens a Stage 2 beat directly and switches the interface language in place. */
async function stage2(page: Page, query: string, lang: Lang) {
  await page.goto(`/?stage=2&difficulty=easy${query}`);
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 30);
  await page.evaluate(
    async ([path, l]) => {
      const i18n = (await import(/* @vite-ignore */ path!)) as {
        setLocale: (l: string) => void;
      };
      i18n.setLocale(l!);
    },
    ['/src/text/i18n.ts', lang],
  );
}

test.describe('Stage 2 in play, in German and Chinese', () => {
  for (const lang of ['de', 'zh-CN'] as const)
    test(`${lang}: the pursuit, a room, the epilogue and the results fit`, async ({
      page,
      browserName,
    }, info) => {
      const problems: string[] = [];
      await stage2(page, '', lang);
      await expect(page.getByTestId('hint-p1')).toBeVisible();
      for (const o of await overflowing(page, 'body')) problems.push(`pursuit: ${o}`);

      await stage2(page, '&beat=3', lang);
      await page.waitForFunction(() => window.__ffp!.greenhouse()?.room === 's2-aquaculture-hall');
      for (const o of await overflowing(page, 'body')) problems.push(`room: ${o}`);
      await page.screenshot({ path: `test-results/m23-${lang}-room-${info.project.name}.png` });

      await stage2(page, '&beat=14', lang);
      for (let i = 0; i < 60; i += 1) {
        await page.evaluate(() => window.__ffp!.clearEnemies());
        if (await page.evaluate(() => window.__ffp!.run()!.evidence === 1)) break;
        await page.waitForTimeout(400);
      }
      const ev = await page.evaluate(() => window.__ffp!.run()!.evidenceAt!);
      await page.evaluate(([x, z]) => window.__ffp!.moveHeroes(x! - 60, z), [ev.x, ev.z] as const);
      await page.keyboard.down('KeyJ');
      await page.waitForFunction(() => window.__ffp!.run()!.evidence === 2, null, {
        timeout: 20_000,
      });
      await page.keyboard.up('KeyJ');
      await expect(page.getByTestId('epilogue')).toBeVisible({ timeout: 30_000 });
      for (const o of await overflowing(page, 'body')) problems.push(`epilogue: ${o}`);
      await page.getByTestId('epilogue-skip').click();
      await expect(page.getByTestId('results')).toBeVisible();
      await expect(page.getByTestId('results-grade')).toHaveCount(4);
      for (const o of await overflowing(page, 'body')) problems.push(`results: ${o}`);
      if (browserName === 'chromium') problems.push(...(await axeProblems(page, 'results')));
      await page.screenshot({ path: `test-results/m23-${lang}-results-${info.project.name}.png` });
      // No English left on the results (names of places are translated too).
      const text = await page.getByTestId('results').innerText();
      expect(text).not.toMatch(/Preservation|Response|Seed Reserve Bay/);
      expect(problems).toEqual([]);
      expect(await fallbacks(page, lang)).toEqual([]);
    });
});

function pad(press: string[] = []) {
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
    id: 'Xbox Wireless Controller (Vendor: 045e Product: 0b13)',
    index: 0,
    connected: true,
    mapping: 'standard',
    buttons: names.map((n) => press.includes(n)),
    axes: [0, 0, 0, 0],
  };
}

/** One button press on the fake gamepad (down for a few frames, then up). */
async function tap(page: Page, button: string) {
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad([button]));
  await page.waitForTimeout(80);
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.waitForTimeout(80);
}

/** Moves menu focus with the D-pad until `testId` has it, then presses South. */
async function padChoose(page: Page, testId: string) {
  const focused = () =>
    page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? '');
  const trail: string[] = [];
  for (const dir of ['DpadDown', 'DpadRight', 'DpadDown', 'DpadLeft', 'DpadUp']) {
    for (let i = 0; i < 24; i += 1) {
      trail.push(await focused());
      if ((await focused()) === testId) {
        await tap(page, 'South');
        return;
      }
      await tap(page, dir);
    }
  }
  throw new Error(`the D-pad never reached ${testId} (trail: ${trail.join(' ')})`);
}

test('a Stage 2 cheat (STEADYRIDE) is chosen with the gamepad only', async ({ page }) => {
  await firstLaunch(page, 'en');
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-solo').click();
  await page.keyboard.press('KeyT');
  const difficulty = page.getByTestId('stage-difficulty');
  for (let i = 0; i < 4 && (await difficulty.getAttribute('data-value')) !== 'easy'; i += 1)
    await difficulty.click();
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  await page.keyboard.press('KeyT');
  await page.getByTestId('intro-skip').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('briefing-continue').click();
  await page.keyboard.press('KeyT');
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'game');
  // From here on only the gamepad: South takes Player 1 over (Start on a new pad would
  // join Player 2), Start pauses, the D-pad and South choose.
  await page.evaluate((p) => window.__ffp!.fakePads([p]), pad());
  await page.waitForTimeout(100);
  await tap(page, 'South');
  await page.waitForFunction(() => window.__ffp!.slots()[0]!.device === 'pad:0');
  await page.waitForTimeout(400);
  await tap(page, 'Start');
  await expect(page.getByTestId('pause-secrets')).toBeVisible();
  await padChoose(page, 'pause-secrets');
  await expect(page.getByTestId('secrets-p1-STEADYRIDE')).toBeVisible();
  await padChoose(page, 'secrets-p1-STEADYRIDE');
  await padChoose(page, 'secrets-accept-p1');
  await padChoose(page, 'secrets-done');
  await expect(page.getByTestId('pause-cheat')).toBeVisible();
  const c = await page.evaluate(() => window.__ffp!.shell.cheats());
  expect(c.hero[0]).toEqual(['STEADYRIDE']);
  expect(c.marked).toBe(true);
});

test.describe('performance', () => {
  test('a crowded Stage 2 room on Ultimate, throttled, keeps the simulation in real time', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling needs the Chromium DevTools protocol');
    // Filtration Control: the Saboteur's breach, the grenade, the Enforcer, the Signalman.
    await page.goto('/?stage=2&beat=10&difficulty=ultimate&caps=-webgl');
    await page.waitForFunction(() => window.__ffp?.run()?.beatId === 'filtration');
    await page.waitForFunction(() => (window.__ffp!.encounter()?.enemies.length ?? 0) >= 3, null, {
      timeout: 60_000,
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
    const keepAlive = setInterval(
      () => void page.evaluate(() => window.__ffp?.setHealth(0, 1000)).catch(() => undefined),
      500,
    );
    try {
      await page.waitForTimeout(8000);
      await page.evaluate(() => window.__ffp!.system.resetPerf());
      const f0 = await page.evaluate(() => window.__ffp!.frame());
      const t0 = Date.now();
      await page.waitForTimeout(6000);
      const seconds = (Date.now() - t0) / 1000;
      const steps = (await page.evaluate(() => window.__ffp!.frame())) - f0;
      const perf = await page.evaluate(() => window.__ffp!.system.perf());
      const quality = await page.evaluate(() => window.__ffp!.quality());
      mkdirSync('test-results', { recursive: true });
      writeFileSync(
        'test-results/m23-performance.json',
        JSON.stringify({ throttle: 2, renderer: 'canvas', seconds, steps, perf, quality }, null, 2),
      );
      expect(perf.stepMs).toBeLessThan(4);
      expect(steps / seconds).toBeGreaterThan(50);
    } finally {
      clearInterval(keepAlive);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });
});
