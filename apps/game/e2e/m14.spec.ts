import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * M14 slice hardening in the browser: capability gates and the System check, the
 * accessibility audit (axe-core) and the localization sweep over the shell screens, the
 * first-launch reduced-motion default, and (Chromium) performance under CPU throttling.
 * CI runs this file in Chromium, Firefox and WebKit, and its smoke test in Edge on Windows.
 */
test.describe.configure({ timeout: 180_000 });

type Lang = 'en' | 'de' | 'zh-CN';

async function open(page: Page, query = '') {
  await page.goto(`/?shell${query}`);
  await page.waitForFunction(() => window.__ffp?.shell.screen() !== 'boot');
}

/** First launch with the keyboard only, in a language. */
async function firstLaunch(page: Page, lang: Lang = 'en') {
  await expect(page.getByTestId('setup-step-1')).toBeVisible();
  await page.getByTestId(`setup-language-${lang}`).click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId(lang === 'de' ? 'setup-layout-qwertz' : 'setup-layout-qwerty').click();
  await page.keyboard.press('Enter');
  await page.getByTestId('setup-name').fill('Guo');
  await page.getByTestId('setup-finish').click();
  await expect(page.getByTestId('village')).toBeVisible();
}

const SETTINGS = [
  'gameplay',
  'controls',
  'accessibility',
  'audio',
  'display',
  'language',
  'profile',
  'system',
] as const;

/** Visits every shell screen reachable without playing, calling `check` on each. */
async function sweep(page: Page, check: (name: string) => Promise<void>) {
  await check('village');
  for (const [item, screen] of [
    ['academy', 'academy'],
    ['store', 'store'],
    ['records', 'records'],
    ['guide', 'guide'],
  ] as const) {
    await page.getByTestId(`menu-${item}`).click();
    await page.waitForFunction((s) => window.__ffp!.shell.screen() === s, screen);
    await check(screen);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('village')).toBeVisible();
  }
  await page.getByTestId('menu-settings').click();
  for (const c of SETTINGS) {
    await page.getByTestId(`settings-${c}`).click();
    await check(`settings-${c}`);
  }
  await page.getByTestId('settings-back').click();
  await expect(page.getByTestId('village')).toBeVisible();
  await page.getByTestId('menu-play').click();
  await check('mode');
  await page.getByTestId('mode-solo').click();
  await expect(page.getByTestId('lobby-card-p1')).toBeVisible();
  await check('lobby');
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('stage-select')).toBeVisible();
  await check('stage');
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-panel-p1')).toBeVisible();
  await check('heroes');
}

/** Labels and buttons whose text is cut off or runs out of their box or the window. */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = window.innerWidth;
    for (const el of document.querySelectorAll<HTMLElement>(
      '.ffp-shell .ffp-btn, .ffp-shell .ffp-title, .ffp-shell h1, .ffp-shell h2, .ffp-shell .ffp-hint, .ffp-shell th, .ffp-shell td',
    )) {
      if (el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const cut = el.scrollWidth > el.clientWidth + 2;
      const outside = r.right > vw + 2 || r.left < -2;
      if (cut || outside)
        out.push(`${el.dataset.testid ?? el.className}: "${el.innerText.slice(0, 60)}"`);
    }
    return out;
  });
}

test.describe('capability gates', () => {
  test('this browser passes the Tier 1 gate; the capability table is recorded', async ({
    page,
    browserName,
  }, info) => {
    await open(page);
    await page.waitForFunction(() => window.__ffp !== undefined);
    const caps = await page.evaluate(() => window.__ffp!.system.capabilities());
    expect(caps.blocking).toEqual([]);
    expect(['webgl', 'canvas']).toContain(caps.renderer);
    mkdirSync('test-results', { recursive: true });
    writeFileSync(
      `test-results/m14-capabilities-${info.project.name}.json`,
      JSON.stringify({ browser: browserName, ...caps }, null, 2),
    );
    await firstLaunch(page);
    await page.getByTestId('menu-settings').click();
    await page.getByTestId('settings-system').click();
    await expect(page.getByTestId('system-check')).toBeVisible();
    await expect(page.getByTestId('system-cap-renderer')).toHaveAttribute('data-ok', 'true');
    await expect(page.getByTestId('system-cap-storage')).toHaveAttribute('data-ok', 'true');
    await page.screenshot({ path: `test-results/m14-system-check-${info.project.name}.png` });
  });

  test('missing video, sound, gamepads and Wi-Fi switch off only their own features', async ({
    page,
  }) => {
    await open(page, '&caps=-video,-audio,-gamepad,-network');
    const caps = await page.evaluate(() => window.__ffp!.system.capabilities());
    expect(caps.blocking).toEqual([]);
    expect(caps.disabled.sort()).toEqual(['gamepadPlay', 'sound', 'videoCinematics', 'wifiCoop']);
    await firstLaunch(page);
    // No title clip: the still menu picture.
    await expect(page.getByTestId('title-loop')).toHaveCount(0);
    await page.getByTestId('menu-settings').click();
    await page.getByTestId('settings-system').click();
    for (const id of ['video', 'audio', 'gamepad', 'network'])
      await expect(page.getByTestId(`system-cap-${id}`)).toHaveAttribute('data-ok', 'false');
    await expect(page.getByTestId('system-cap-video')).toContainText('still pictures');
    await expect(page.getByTestId('system-cap-renderer')).toHaveAttribute('data-ok', 'true');
    await page.screenshot({ path: 'test-results/m14-system-check-missing.png' });
    await page.getByTestId('settings-back').click();
    // Wi-Fi co-op says why it is unavailable; solo still plays, with the intro as stills.
    await page.getByTestId('menu-play').click();
    await expect(page.getByTestId('mode-wifi')).toBeDisabled();
    await expect(page.getByTestId('mode-wifi')).toContainText('not available in this browser');
    await page.getByTestId('mode-solo').click();
    await page.keyboard.press('KeyT');
    await page.getByTestId('stage-next').click();
    await page.keyboard.press('KeyT');
    await expect(page.getByTestId('intro')).toHaveAttribute('data-mode', 'still');
    const media = await page.evaluate(() => window.__ffp!.media.state());
    expect(media.audioRunning).toBe(false);
  });

  test('without storage the game plays as a temporary profile and says so', async ({ page }) => {
    await open(page, '&caps=-storage');
    await firstLaunch(page);
    expect(await page.evaluate(() => window.__ffp!.shell.storage())).toBe('memory');
    await expect(page.getByTestId('village')).toContainText('kept');
    await page.getByTestId('menu-settings').click();
    await page.getByTestId('settings-system').click();
    await expect(page.getByTestId('system-cap-storage')).toHaveAttribute('data-ok', 'false');
  });

  test('a browser that cannot draw gets an explanation instead of a broken game', async ({
    page,
  }) => {
    await page.goto('/?shell&caps=-renderer');
    await expect(page.getByTestId('blocked')).toBeVisible();
    await expect(page.getByTestId('blocked-renderer')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/m14-blocked.png' });
  });
});

test.describe('accessibility audit (axe-core, WCAG 2.1 A/AA rules)', () => {
  for (const lang of ['en', 'de'] as const)
    test(`no serious or critical problems on the shell screens (${lang})`, async ({ page }) => {
      await open(page);
      await firstLaunch(page, lang);
      const problems: string[] = [];
      await sweep(page, async (name) => {
        const r = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // The game canvas is decorative for screen readers (the HUD carries the text).
          .exclude('canvas')
          .analyze();
        // Also the "needs review" results for ARIA misuse (contrast over pictures stays manual).
        const aria = r.incomplete.filter((v) => v.id.startsWith('aria-'));
        for (const v of [...r.violations, ...aria])
          if (v.impact === 'serious' || v.impact === 'critical')
            problems.push(
              `${name}: ${v.id} (${v.impact}) ${v.nodes
                .slice(0, 3)
                .map((n) => n.target.join(' '))
                .join(' | ')}`,
            );
      });
      expect(problems).toEqual([]);
    });

  test('first launch follows the system "reduce motion" preference', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await open(page);
    await page.getByTestId('setup-language-en').click();
    await expect(page.getByTestId('setup-reduced-flashing')).toHaveAttribute('data-value', 'true');
    await page.getByTestId('setup-next').click();
    await page.getByTestId('setup-layout-qwerty').click();
    await page.keyboard.press('Enter');
    await page.getByTestId('setup-finish').click();
    await expect(page.getByTestId('village')).toBeVisible();
    const p = (await page.evaluate(() => window.__ffp!.shell.profile())) as {
      settings: { reducedFlashing: boolean; reducedShake: boolean };
    };
    expect(p.settings.reducedFlashing).toBe(true);
    expect(p.settings.reducedShake).toBe(true);
    await context.close();
  });
});

test.describe('localization QA', () => {
  for (const lang of ['de', 'zh-CN'] as const)
    test(`${lang}: every shell screen fits, and no text falls back to English`, async ({
      page,
    }, info) => {
      await open(page);
      await firstLaunch(page, lang);
      const problems: string[] = [];
      await sweep(page, async (name) => {
        for (const o of await overflowing(page)) problems.push(`${name}: ${o}`);
        if (name === 'settings-system' || name === 'heroes')
          await page.screenshot({
            path: `test-results/m14-${lang}-${name}-${info.project.name}.png`,
          });
      });
      expect(problems).toEqual([]);
      const fallbacks = await page.evaluate(() => window.__ffp!.shell.diagnostics());
      expect(fallbacks.filter((d) => d.startsWith(`${lang}:`) || d.startsWith('missing:'))).toEqual(
        [],
      );
    });

  test('spoken prompts and key names follow the language', async ({ page }) => {
    await open(page);
    await firstLaunch(page, 'de');
    await page.getByTestId('menu-guide').click();
    await page.waitForFunction(() => window.__ffp!.shell.screen() === 'guide');
    const labels = await page
      .locator('[data-prompt="key"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
    expect(labels.length).toBeGreaterThan(0);
    for (const l of labels) expect(l).toMatch(/^Taste /);
  });
});

test.describe('performance', () => {
  test('a crowded beat on a throttled CPU keeps the simulation in real time', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling needs the Chromium DevTools protocol');
    // Canvas 2D, so the throttled CPU does all the drawing (CI has no GPU; its software
    // WebGL would measure the emulator, not the game).
    await page.goto('/?stage=stage1&beat=7&difficulty=medium&caps=-webgl');
    await page.waitForFunction(() => window.__ffp?.run()?.beatId === 'courtyard');
    expect((await page.evaluate(() => window.__ffp!.system.capabilities())).renderer).toBe(
      'canvas',
    );
    // Into the courtyard lock: the first group arrives.
    await page.evaluate(() => window.__ffp!.moveHeroes(1500));
    await page.waitForFunction(() => (window.__ffp!.encounter()?.enemies.length ?? 0) >= 3, null, {
      timeout: 60_000,
    });
    const cdp = await page.context().newCDPSession(page);
    // About a low-end laptop: half of a CI core.
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
    // Auto Quality steps down while frames are slow, to the reduced resolution at worst.
    const keepAlive = setInterval(
      () => void page.evaluate(() => window.__ffp?.setHealth(0, 1000)).catch(() => undefined),
      500,
    );
    try {
      await page.waitForFunction(() => window.__ffp!.quality().level !== 'high', null, {
        timeout: 30_000,
      });
      await page.waitForTimeout(7000);
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
        'test-results/m14-performance.json',
        JSON.stringify({ throttle: 2, renderer: 'canvas', seconds, steps, perf, quality }, null, 2),
      );
      expect(perf.frames).toBeGreaterThan(30);
      // The simulation's cost per step stays a small part of the 16.7 ms frame.
      expect(perf.stepMs).toBeLessThan(4);
      // Fixed simulation (spec §18.3): about 60 steps per second of wall time.
      expect(steps / seconds).toBeGreaterThan(50);
    } finally {
      clearInterval(keepAlive);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });
});
