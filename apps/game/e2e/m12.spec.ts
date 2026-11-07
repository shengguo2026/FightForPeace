import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { DebugNet } from '../src/global';

// Two copies of the game in two browser contexts play Stage 1 together through the dev
// server's LAN room (the guest joins 127.0.0.1, as a second computer joins the host's
// address). Every wait is on game state, never on wall-clock time: CI browsers are slow.
test.describe.configure({ timeout: 240_000 });

// Each test opens two contexts; they are closed after it so no hidden game keeps rendering.
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
  // The first-launch screens are covered by the M10 tests; here only the result counts.
  await page.evaluate((n) => window.__ffp!.net.quickSetup(n), name);
  await expect(page.getByTestId('village')).toBeVisible();
  await page.getByTestId('menu-play').click();
  await page.getByTestId('mode-wifi').click();
  await expect(page.getByTestId('wifi')).toBeVisible();
  return page;
}

const net = (page: Page) => page.evaluate(() => window.__ffp!.net.state()) as Promise<DebugNet>;

async function waitNet(page: Page, test: string, arg?: unknown) {
  await page.waitForFunction(
    ([src, a]) => {
      const s = window.__ffp!.net.state();
      return new Function('s', 'a', `return (${src});`)(s, a) as boolean;
    },
    [test, arg] as const,
    { timeout: 120_000 },
  );
}

/** Host opens a room; returns its port and code. */
async function host(page: Page) {
  await page.getByTestId('wifi-host').click();
  await expect(page.getByTestId('wifi-host-code')).toHaveText(/^[A-Z2-9]{4}$/);
  await expect(page.getByTestId('wifi-firewall')).toContainText('Windows Firewall');
  const s = await net(page);
  return { port: s.room!.port, code: s.room!.code };
}

async function join(page: Page, port: number, code: string) {
  await page.getByTestId('wifi-join').click();
  await page.getByTestId('wifi-address').fill('127.0.0.1');
  await page.getByTestId('wifi-port').fill(String(port));
  await page.getByTestId('wifi-code').fill(code);
  await page.getByTestId('wifi-connect').click();
}

/** Both players in the lobby, ready, and the stage running on both. */
async function startTogether(browser: Browser, courtesyMs: number | null = null) {
  const h = await player(browser, 'Host');
  const g = await player(browser, 'Guest');
  // A long courtesy hold keeps this M12 scenario a hold on slow CI runners (M15 tests the
  // recovery that follows a short one).
  for (const p of [h, g]) await p.evaluate((ms) => window.__ffp!.net.setCourtesy(ms), courtesyMs);
  const room = await host(h);
  await join(g, room.port, room.code);
  await expect(g.getByTestId('net-lobby')).toBeVisible();
  await expect(h.getByTestId('net-name-p2')).toHaveText('Guest');
  await expect(g.getByTestId('net-name-p1')).toHaveText('Host');
  // Unique heroes: the guest got the hero the host did not take.
  const hostHero = await h.getByTestId('net-hero').getAttribute('data-value');
  const guestHero = await g.getByTestId('net-hero').getAttribute('data-value');
  expect(hostHero).not.toBe(guestHero);
  await h.getByTestId('net-ready').click();
  await g.getByTestId('net-ready').click();
  await waitNet(h, "s.status === 'playing' && s.frame > 30");
  await waitNet(g, "s.status === 'playing' && s.frame > 30");
  return { h, g };
}

test('two games join over the room server and play Stage 1 in lockstep', async ({
  browser,
  browserName,
}) => {
  // Two games rendering at once: in CI, Firefox and WebKit run out of runner resources
  // (the runner shut down twice when Firefox started this test). Chromium runs it; the
  // golden replays prove the same simulation hashes in every browser.
  test.skip(browserName !== 'chromium', 'Chromium only (two games at once)');
  const { h, g } = await startTogether(browser);
  await expect(h.getByTestId('net-badge')).toContainText('Wi-Fi');
  const hs = await net(h);
  // M15: prediction and rollback, so a home network plays with no input delay.
  // (Quality monitoring may raise it a little when a slow machine keeps waiting.)
  expect(hs.startDelay).toBe(0);
  expect(hs.delay).toBeLessThanOrEqual(3);
  // Walk both heroes right for a while so the worlds have something to agree on.
  await h.keyboard.down('KeyD');
  await g.keyboard.down('KeyD');
  await waitNet(h, 's.matched >= 3');
  await waitNet(g, 's.matched >= 3');
  await h.keyboard.up('KeyD');
  await g.keyboard.up('KeyD');
  const [a, b] = [await net(h), await net(g)];
  expect(a.resyncs).toBe(0);
  expect(b.resyncs).toBe(0);
  // The same hash on the same frame on both computers.
  const common = a.hashes.filter(([f]) => b.hashes.some(([gf]) => gf === f));
  expect(common.length).toBeGreaterThan(1);
  for (const [f, hash] of common) expect(b.hashes.find(([gf]) => gf === f)![1]).toBe(hash);
  // Both heroes are on screen in both games: slot 0 and slot 1.
  const heroes = await g.evaluate(() => [window.__ffp!.hero(0)?.hero, window.__ffp!.hero(1)?.hero]);
  expect(heroes[0]).toBeTruthy();
  expect(heroes[1]).toBeTruthy();
  await h.screenshot({ path: 'test-results/m12-host.png' });
  await g.screenshot({ path: 'test-results/m12-guest.png' });
});

// The longer scenarios run in Chromium only, to keep the CI job inside its time limit;
// all M12 two-game tests run in Chromium only.
test('a courtesy hold stops both games on one frame, resumes after readiness, a desync is repaired, and the end is safe', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium only (CI time)');
  const { h, g } = await startTogether(browser, 120_000);
  // The guest leaves the window: both games hold.
  await g.evaluate(() => window.__ffp!.net.loseFocus());
  await expect(h.getByTestId('net-hold')).toBeVisible();
  await expect(h.getByTestId('net-title')).toHaveText('Player 2 left the game window.');
  await expect(g.getByTestId('net-title')).toHaveText('You left the game window.');
  await expect(h.getByTestId('net-ready-state-p1')).toContainText('ready');
  await waitNet(h, "s.phase === 'hold'");
  // Both stop on the same frame and stay there.
  await waitNet(g, "s.phase === 'hold'");
  let stoppedH = -1;
  await expect
    .poll(
      async () => {
        const f = (await net(h)).frame;
        const same = f === stoppedH;
        stoppedH = f;
        return same;
      },
      { intervals: [400] },
    )
    .toBe(true);
  await g.waitForFunction((f) => window.__ffp!.frame() === f, stoppedH);
  await h.screenshot({ path: 'test-results/m12-hold.png' });
  // The guest confirms: a countdown on both, then play again.
  await g.getByTestId('net-confirm').click();
  await waitNet(h, "s.phase === 'countdown' || s.phase === 'run'");
  await waitNet(h, "s.phase === 'run' && s.frame > a + 20", stoppedH);
  await waitNet(g, "s.phase === 'run' && s.frame > a + 20", stoppedH);

  // The guest's world goes wrong: the host's snapshot repairs it.
  await g.evaluate(() => window.__ffp!.net.corrupt());
  await waitNet(g, 's.resyncs >= 1');
  const after = (await net(g)).matched;
  await waitNet(g, 's.matched >= a + 2', after);
  await waitNet(h, 's.resyncs >= 1');

  // An explicit pause on the host needs both players to continue.
  await h.keyboard.press('Escape');
  await expect(g.getByTestId('net-title')).toHaveText('Player 1 paused the game.');
  await h.getByTestId('net-confirm').click();
  await expect(h.getByTestId('net-ready-state-p1')).toContainText('ready');
  await expect(g.getByTestId('net-confirm')).toBeVisible();
  // The guest ends the session instead: both games explain it and keep nothing to continue.
  await g.getByTestId('net-end').click();
  await expect(g.getByTestId('village')).toBeVisible();
  await expect(h.getByTestId('net-ended')).toBeVisible();
  await expect(h.getByTestId('net-ended-reason')).toHaveText('Player 2 left the session.');
  await h.getByTestId('net-to-village').click();
  await expect(h.getByTestId('village')).toBeVisible();
  const profile = (await h.evaluate(() => window.__ffp!.shell.profile())) as {
    checkpoint: unknown;
  };
  expect(profile.checkpoint).toBeNull();
});

test('the lobby refuses a different game version, and a wrong room code says so', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium only (CI time)');
  const h = await player(browser, 'Host');
  const g = await player(browser, 'Guest');
  const room = await host(h);
  const wrong = room.code === 'ZZZZ' ? 'YYYY' : 'ZZZZ';
  await join(g, room.port, wrong);
  await expect(g.getByTestId('wifi-error')).toContainText('room code is not right');
  await g.evaluate(() => window.__ffp!.net.fakeVersion('0.0.1-old'));
  await g.getByTestId('wifi-code').fill(room.code);
  await g.getByTestId('wifi-connect').click();
  await expect(g.getByTestId('wifi-error')).toContainText('different versions');
  // The host is still waiting for a guest; nobody joined.
  expect((await net(h)).status).toBe('hosting');
  // With the same version the guest gets in.
  await g.evaluate(() => window.__ffp!.net.fakeVersion(null));
  await g.getByTestId('wifi-connect').click();
  await expect(g.getByTestId('net-lobby')).toBeVisible();
  // A shared rule changed by the host clears readiness.
  await g.getByTestId('net-ready').click();
  await expect(h.getByTestId('net-ready-p2')).toContainText('Ready');
  await h.getByTestId('net-difficulty').click();
  await expect(h.getByTestId('net-ready-p2')).toContainText('Not ready');
  await expect(g.getByTestId('net-difficulty-guest')).not.toContainText('Medium');
});
