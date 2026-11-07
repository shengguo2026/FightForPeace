import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { DebugNet } from '../src/global';

// M15 network phase 2: two copies of the game play Stage 1 through the dev server's LAN
// room with prediction and rollback (no input delay), and recover from a pulled cable, a
// closed guest page and a closed host page. Every wait is on game state.
test.describe.configure({ timeout: 300_000 });

const open: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(open.splice(0).map((c) => c.close()));
});

async function player(browser: Browser, name: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  open.push(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`${name}: ${e.message}`));
  await page.goto('/?shell');
  await page.waitForFunction(() => window.__ffp?.shell.screen() === 'setup');
  await page.evaluate((n) => window.__ffp!.net.quickSetup(n), name);
  await expect(page.getByTestId('village')).toBeVisible();
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-wifi').click();
  await expect(page.getByTestId('wifi')).toBeVisible();
  return page;
}

const net = (page: Page) => page.evaluate(() => window.__ffp!.net.state()) as Promise<DebugNet>;

async function waitNet(page: Page, test: string, arg?: unknown) {
  try {
    await page.waitForFunction(
      ([src, a]) => {
        const s = window.__ffp!.net.state();
        return new Function('s', 'a', `return (${src});`)(s, a) as boolean;
      },
      [test, arg] as const,
      { timeout: 150_000 },
    );
  } catch (err) {
    const s = await net(page).catch(() => null);
    const brief = s && { ...s, hashes: s.hashes.length, lobby: null, log: s.log.slice(-12) };
    throw new Error(`waiting for ${test}: ${(err as Error).message}\n${JSON.stringify(brief)}`);
  }
}

async function join(page: Page, port: number, code: string) {
  await page.getByTestId('wifi-join').click();
  await page.getByTestId('wifi-address').fill('127.0.0.1');
  await page.getByTestId('wifi-port').fill(String(port));
  await page.getByTestId('wifi-code').fill(code);
  await page.getByTestId('wifi-connect').click();
}

async function startTogether(browser: Browser) {
  const h = await player(browser, 'Host');
  const g = await player(browser, 'Guest');
  await h.getByTestId('wifi-host').click();
  await expect(h.getByTestId('wifi-host-code')).toHaveText(/^[A-Z2-9]{4}$/);
  const room = (await net(h)).room!;
  await join(g, room.port, room.code);
  await expect(g.getByTestId('net-lobby')).toBeVisible();
  await h.getByTestId('net-ready').click();
  await g.getByTestId('net-ready').click();
  await waitNet(h, "s.status === 'playing' && s.frame > 30");
  await waitNet(g, "s.status === 'playing' && s.frame > 30");
  return { h, g, room };
}

/** Both games compare at least `n` more equal hashes from now on. */
async function inStep(h: Page, g: Page, n = 2) {
  const [a, b] = [await net(h), await net(g)];
  await waitNet(h, `s.matched >= ${a.matched + n}`);
  await waitNet(g, `s.matched >= ${b.matched + n}`);
  const [x, y] = [await net(h), await net(g)];
  const common = x.hashes.filter(([f]) => y.hashes.some(([gf]) => gf === f));
  expect(common.length).toBeGreaterThan(0);
  for (const [f, hash] of common) expect(y.hashes.find(([gf]) => gf === f)![1]).toBe(hash);
}

test('no input delay: a pulled cable on the guest, the host plays on, the guest is back in', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium only (two games at once)');
  const { h, g } = await startTogether(browser);
  const hs = await net(h);
  // (Quality monitoring may raise it a little when a slow machine keeps waiting.)
  // A home network starts with none; a busy test machine may measure a slow lobby round
  // trip and start with a little (chooseDelay is covered by the unit tests).
  expect(hs.startDelay).toBeLessThanOrEqual(3);
  expect(hs.delay).toBeLessThanOrEqual(3);
  expect(hs.authority).toBe(true);
  await expect(h.getByTestId('net-badge')).toContainText('rollbacks');
  // Both walk: this computer's input applies at once, the partner's is predicted.
  await h.keyboard.down('KeyD');
  await g.keyboard.down('KeyA');
  await inStep(h, g, 3);
  await h.keyboard.up('KeyD');
  await g.keyboard.up('KeyA');

  // The guest's cable is pulled for a few seconds: nothing gets through either way.
  await g.evaluate(() => window.__ffp!.net.cutFor(4500));
  await waitNet(g, '!s.linkUp');
  await expect(g.getByTestId('net-reconnecting')).toBeVisible();
  // (The guest's game reconnects on its own within seconds, so the host's notice may be
  // short-lived; the closed-page test checks the notices.)
  await waitNet(h, "s.partnerAbsent || s.log.some((e) => e.ev === 'absent')");
  const at = (await net(h)).frame;
  // The host never waits for the missing player.
  await waitNet(h, 's.frame > a + 120', at);
  await h.screenshot({ path: 'test-results/m15-host-partner-missing.png' });
  // The cable is back: the guest learns it was out, asks to come back and takes its hero
  // over at the next safe moment.
  await waitNet(g, "s.log.some((e) => e.ev === 'returned') && s.phase === 'run'");
  await waitNet(h, '!s.partnerAbsent');
  await inStep(h, g);
  const log = (await net(h)).log.map((e) => e.ev);
  expect(log).toContain('absent');
  expect(log).toContain('back');
  expect((await net(g)).authority).toBe(false);
});

test('a closed guest page: the survival proxy keeps the hero safe until the guest rejoins from a new page', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium only (two games at once)');
  const { h, g, room } = await startTogether(browser);
  await inStep(h, g);
  await g.context().close();
  await waitNet(h, 's.partnerAbsent');
  await expect(h.getByTestId('net-partner-grace')).toBeVisible();
  // After the recovery grace the proxy plays the hero (guard, follow, basic attacks).
  await expect(h.getByTestId('net-partner-proxy')).toBeVisible({ timeout: 60_000 });
  await h.screenshot({ path: 'test-results/m15-proxy.png' });
  // The guest opens the game again and joins the same room with the same code.
  const g2 = await player(browser, 'Guest');
  await join(g2, room.port, room.code);
  await waitNet(g2, "s.status === 'playing' && s.phase === 'run' && s.slot === 1");
  await waitNet(h, '!s.partnerAbsent');
  await inStep(h, g2);
  const hero = await g2.evaluate(() => window.__ffp!.hero(1)?.hero);
  expect(hero).toBeTruthy();
  await g2.screenshot({ path: 'test-results/m15-guest-rejoined.png' });
});

test('a closed host page: the guest takes over, and the host comes back through the guest’s room', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium only (two games at once)');
  const { h, g } = await startTogether(browser);
  await inStep(h, g);
  await h.context().close();
  await waitNet(g, 's.authority && s.partnerAbsent');
  const at = (await net(g)).frame;
  await waitNet(g, 's.frame > a + 120', at);
  // The guest's game opened a room of its own for the host to come back through.
  await waitNet(g, 's.standby !== null');
  await expect(g.getByTestId('net-standby')).toBeVisible();
  await expect(g.getByTestId('net-badge')).toContainText('this computer leads');
  await g.screenshot({ path: 'test-results/m15-guest-took-over.png' });
  const standby = (await net(g)).standby!;
  const h2 = await player(browser, 'Host');
  await join(h2, standby.port, standby.code);
  await waitNet(h2, "s.status === 'playing' && s.phase === 'run' && s.slot === 0");
  const back = await net(h2);
  expect(back.authority).toBe(false);
  await waitNet(g, '!s.partnerAbsent');
  await inStep(g, h2);
  expect((await net(g)).authority).toBe(true);
  const log = (await net(g)).log.map((e) => e.ev);
  expect(log).toContain('promoted');
  expect(log).toContain('back');
});
