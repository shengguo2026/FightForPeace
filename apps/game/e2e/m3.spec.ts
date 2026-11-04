import { expect, test, type Page } from '@playwright/test';
import { cuesDone, play, startCues } from './cues';

test.describe.configure({ timeout: 90_000 });

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window.__ffp?.frame() ?? 0) > 10);
}

/** Pause / resume (Escape), waiting until the pause state has flipped. */
async function esc(page: Page) {
  const before = await page.evaluate(() => window.__ffp!.paused());
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape' }));
  });
  await page.waitForFunction((b) => window.__ffp!.paused() !== b, before);
}

test('the aerial conversion recipe is ticked off in the recipe panel (F7)', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.keyboard.press('F7');
  await page.getByTestId('practise-p1-aerial-conversion').click();
  await play(page, [
    { when: 'h.state === 0', keys: ['KeyT'], hold: ['KeyW'] },
    { when: "h.action === 'high-bank-lift' && h.contactAt >= 0", keys: ['KeyY'] },
    { when: 'h.state === 3 && h.stateFrame > 2 && d.y > 0', keys: ['KeyT'] },
    { when: "h.action === 'rafter-palm' && h.contactAt >= 0", keys: ['KeyT'], hold: ['KeyD'] },
  ]);
  await expect(page.getByTestId('recipe-count-p1-aerial-conversion')).toHaveText('1');
  const d = await page.evaluate(() => window.__ffp!.body(101)!);
  expect(d.route).toEqual(['high-bank-lift', 'rafter-palm', 'stonefall-knee']);
  await expect(page.getByTestId('lab-target-juggle')).not.toHaveText('100');
  await page.screenshot({ path: `test-results/m3-recipes-${testInfo.project.name}.png` });
});

test('low to ground: counter-trip, ground window marker, extension and finisher', async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.keyboard.press('F7');
  await page.getByTestId('practise-p1-low-to-ground').click();
  await page.keyboard.press('F2');
  await expect(page.getByTestId('set-counter')).toBeChecked();
  await page.keyboard.press('F2');
  // Dash with a double tap, then Attack + Guard together: Faultline Reap. Pause the moment
  // the ground window opens, for the screenshot.
  await play(page, [
    { when: 'h.state === 0', keys: ['KeyD'] },
    { when: 'since >= 2', keys: ['KeyD'] },
    { when: 'h.state === 2', keys: ['KeyT', 'KeyG'] },
    { when: 'd.state === 7 && d.groundWindow > 0 && h.action === null', keys: ['Pause'] },
  ]);
  await page.waitForFunction(() => window.__ffp!.paused());
  await page.waitForTimeout(150);
  await page.screenshot({ path: `test-results/m3-ground-window-${testInfo.project.name}.png` });
  // The extension cues are in place before the game resumes, so none of the window is lost.
  await startCues(page, [
    { when: 'h.state <= 1 && h.action === null', keys: ['KeyT'] },
    { when: "h.action === 'settling-palm' && h.contactAt >= 0", keys: ['KeyT'], hold: ['KeyD'] },
  ]);
  await esc(page);
  await cuesDone(page);
  await expect(page.getByTestId('recipe-count-p1-low-to-ground')).toHaveText('1');
  const d = await page.evaluate(() => window.__ffp!.body(101)!);
  expect(d.route).toEqual(['faultline-reap', 'settling-palm', 'lockgate-press']);
  await expect(page.getByTestId('lab-target-ground')).toContainText('finisher used');
});

test('Gatepost Hammer next to the wall rebounds the dummy once', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('F2');
  await page.getByTestId('dummy-to-wall').click();
  await page.keyboard.press('F2');
  await play(page, [
    { when: 'h.state === 0', keys: ['KeyT'] },
    { when: "h.action === 'masons-touch' && h.contactAt >= 0", keys: ['KeyT'] },
    { when: "h.action === 'brace-elbow' && h.contactAt >= 0", keys: ['KeyT'] },
    { when: "h.action === 'gatepost-hammer' && h.contactAt >= 0", keys: [] },
  ]);
  await page.waitForFunction(() => window.__ffp!.body(101)!.wallBounceUsed);
  await expect(page.getByTestId('lab-target-bounces')).toContainText('wall rebound used');
});
