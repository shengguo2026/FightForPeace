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
 * Plays cues in the page, one per animation frame at most: each waits for its condition,
 * then presses its keys (holding `hold` for a few frames around the press).
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

/** Pause / resume (Escape), waiting until the pause state has flipped. */
async function esc(page: Page) {
  const before = await page.evaluate(() => window.__ffp!.paused());
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape' }));
  });
  await page.waitForFunction((b) => window.__ffp!.paused() !== b, before);
}

const JAB = 0;
const CLUB = 1;

/** Arms Dummy 1 with one attack and waits until it stands in range of Player 1. */
async function arm(page: Page, pattern: number) {
  await page.evaluate(
    (p) => window.__ffp!.setTrainer({ attackers: 1, pattern: p, interval: 40, approach: true }),
    pattern,
  );
  await page.keyboard.press('F6'); // slow motion: presses land on exact frames
}

test('Exact Block: Guard pressed just before the jab connects', async ({ page }, testInfo) => {
  await ready(page);
  await arm(page, JAB);
  // Straight Jab: 14 startup frames; contact on the dummy's action frame 15.
  await play(page, [
    { when: "d.action === 'jab' && d.stateFrame >= 11 && d.stateFrame <= 12", keys: ['KeyG'] },
  ]);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.defEvent !== 0);
  const h = await page.evaluate(() => window.__ffp!.hero(0)!);
  expect(h.defEvent).toBe(2); // DefEvent.Exact
  expect(h.health).toBe(1000);
  await expect(page.getByTestId('defense-log-p1')).toContainText('Exact Block ✓');
  await expect(page.getByTestId('defense-log-p1')).toContainText('before contact (window 5 f)');
  await page.screenshot({ path: `test-results/m4-exact-block-${testInfo.project.name}.png` });
});

test('Counter: toward the attacker and Guard together, just before contact', async ({ page }) => {
  await ready(page);
  await arm(page, JAB);
  await play(page, [
    {
      when: "d.action === 'jab' && d.stateFrame >= 11 && d.stateFrame <= 12",
      keys: ['KeyG'],
      hold: ['KeyD'],
    },
  ]);
  await page.waitForFunction(() => window.__ffp!.hero(0)!.defEvent !== 0);
  const h = await page.evaluate(() => window.__ffp!.hero(0)!);
  expect(h.defEvent).toBe(5); // DefEvent.Counter
  await page.waitForFunction(() => window.__ffp!.body(101)!.route.includes('bedrock-return'));
  await expect(page.getByTestId('defense-log-p1')).toContainText('Counter ✓');
});

test('Guard Crush: a held guard against the club at low Defense', async ({ page }, testInfo) => {
  await ready(page);
  await page.evaluate(() => window.__ffp!.setDefense(0, 30));
  await arm(page, CLUB);
  await page.keyboard.down('KeyG');
  await page.waitForFunction(() => window.__ffp!.hero(0)!.defEvent !== 0, null, {
    timeout: 30_000,
  });
  await page.keyboard.up('KeyG');
  const h = await page.evaluate(() => window.__ffp!.hero(0)!);
  expect(h.defEvent).toBe(4); // DefEvent.GuardCrush
  expect(h.defense).toBe(0);
  await expect(page.getByTestId('defense-meter-p1')).toHaveText('0');
  await page.screenshot({ path: `test-results/m4-guard-crush-${testInfo.project.name}.png` });
});

test('the training enemy settings and the Defense panel are in the Lab', async ({ page }) => {
  await ready(page);
  await expect(page.getByTestId('lab-defense')).toBeVisible();
  await page.keyboard.press('F2');
  await page.getByTestId('set-attackers').selectOption('Dummy 1');
  await page.getByTestId('set-pattern').selectOption('Overhead Club');
  await page.keyboard.press('F2');
  await expect(page.getByTestId('lab-defense')).toContainText('Overhead Club · every');
  await page.keyboard.press('F8');
  await expect(page.getByTestId('lab-defense')).toBeHidden();
});
