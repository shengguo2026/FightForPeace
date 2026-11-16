import { expect, test, type Page } from '@playwright/test';

/**
 * M26 Mission Hub: a Lab profile opens the Hub with locked entries and their clues, Not
 * installed packages and open Lab packages; a Lab Chronicle is played to its results
 * (Record Authenticated, its Remix opens); the Run Archive replays a story stage (kept to
 * short passes: the browser jobs are near the CI limit).
 */
test.describe.configure({ timeout: 240_000 });

async function hub(page: Page, preset: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?hublab=${preset}`);
  await page.waitForFunction(() => window.__ffp?.shell.screen() === 'missions');
  return errors;
}

test('the Hub shows locked entries with clues, Not installed and open entries', async ({
  page,
}, testInfo) => {
  const errors = await hub(page, 'stage2');
  await expect(page.getByTestId('hub-lab')).toBeVisible();
  // Character Chronicles: the Lab Chronicle is open, The Bell Before Dawn locked with a clue.
  const bell = page.getByTestId('hub-entry-chronicle.bell-before-dawn');
  await expect(bell).toHaveAttribute('data-state', 'locked');
  await expect(bell).toContainText('Sealed Archive record');
  await expect(bell.getByTestId('entry-clue')).toContainText('Complete Stage 5');
  await expect(page.getByTestId('hub-entry-chronicle.lab-founders-record')).toHaveAttribute(
    'data-state',
    'open',
  );
  // Curated: Storm is locked before Stage 3; the Lab case (version 2) is open with a Legacy record.
  await page.getByTestId('hub-family-curated').click();
  const storm = page.getByTestId('hub-entry-curated.storm-over-qinglan');
  await expect(storm).toHaveAttribute('data-state', 'locked');
  await expect(storm.getByTestId('entry-clue')).toContainText('Complete Stage 3');
  const drill = page.getByTestId('hub-entry-curated.lab-captive-drill');
  await expect(drill).toHaveAttribute('data-state', 'open');
  await expect(drill).toContainText('Legacy record');
  await page.screenshot({ path: `test-results/m26-hub-${testInfo.project.name}.png` });
  // Random Operations: the board is open after Stage 1, its generator not yet.
  await page.getByTestId('hub-family-operation').click();
  await expect(page.getByTestId('hub-entry-operation.defeat')).toHaveAttribute(
    'data-state',
    'notInstalled',
  );
  await page.getByTestId('hub-entry-operation.defeat').click();
  await expect(page.getByTestId('operations')).toBeVisible();
  await expect(page.getByTestId('ops-stages')).toContainText('Prosperity');
  await expect(page.getByTestId('ops-generate')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('missions')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Stage 3 opens Curated cases as Not installed; a locked card shows only its clue', async ({
  page,
}) => {
  const errors = await hub(page, 'stage3');
  await page.getByTestId('hub-family-curated').click();
  await expect(page.getByTestId('hub-entry-curated.storm-over-qinglan')).toHaveAttribute(
    'data-state',
    'notInstalled',
  );
  await page.getByTestId('hub-entry-curated.medicine-road').click();
  await expect(page.getByTestId('mission-card')).toBeVisible();
  await expect(page.getByTestId('card-title')).toHaveText('Sealed case file');
  await expect(page.getByTestId('card-clue')).toContainText('Complete Stage 5');
  await expect(page.getByTestId('card-play-solo')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('a Lab Chronicle is authenticated by its first clear and opens its Remix', async ({
  page,
}) => {
  const errors = await hub(page, 'stage2');
  await expect(page.getByTestId('hub-entry-remix.lab-founders-record')).toHaveCount(0);
  await page.getByTestId('hub-family-remix').click();
  await expect(page.getByTestId('hub-entry-remix.lab-founders-record')).toHaveAttribute(
    'data-state',
    'locked',
  );
  await page.getByTestId('hub-family-chronicle').click();
  await page.getByTestId('hub-entry-chronicle.lab-founders-record').click();
  await expect(page.getByTestId('card-canon')).toHaveText('Canonical');
  await expect(page.getByTestId('card-heroes')).toContainText('Fixed participants');
  await page.getByTestId('card-play-solo').click();
  await expect(page.getByTestId('lobby-card-p1')).toBeVisible();
  await page.getByTestId('lobby-ready-p1').click();
  await expect(page.getByTestId('setup-mission')).toContainText('Founders');
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-name-p1')).toHaveText('Mountain Guardian');
  await page.keyboard.press('ArrowRight'); // fixed participant: no other hero
  await expect(page.getByTestId('hero-name-p1')).toHaveText('Mountain Guardian');
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('ready')).toBeVisible();
  await expect(page.getByTestId('ready-content')).toContainText('Founders');
  await page.getByTestId('ready-start').click();
  await page.waitForFunction(() => window.__ffp!.encounter()?.arena === 'lab-m25-objectives');
  await page.evaluate(() => window.__ffp!.shell.endEncounter(true));
  await page.waitForFunction(() => window.__ffp!.shell.screen() === 'missionResults');
  await expect(page.getByTestId('results-outcome')).toHaveText('Cleared');
  await expect(page.getByTestId('results-authenticated')).toBeVisible();
  await expect(page.getByTestId('results-opened')).toContainText('Lab Remix');
  const profile = (await page.evaluate(() => window.__ffp!.shell.profile())) as {
    chronicles: Record<string, number>;
    runArchive: Record<string, unknown>[];
  } | null;
  expect(profile!.chronicles['chronicle.lab-founders-record']).toBeGreaterThan(0);
  expect(profile!.runArchive[0]).toMatchObject({
    contentId: 'chronicle.lab-founders-record',
    mode: 'chronicle',
    canon: 'canonical',
    outcome: 'cleared',
    heroes: ['mountain'],
  });
  await page.getByTestId('results-hub').click();
  await page.getByTestId('hub-family-remix').click();
  await expect(page.getByTestId('hub-entry-remix.lab-founders-record')).toHaveAttribute(
    'data-state',
    'open',
  );
  expect(errors).toEqual([]);
});

test('the Run Archive replays a story stage with its difficulty and heroes', async ({ page }) => {
  const errors = await hub(page, 'stage2');
  await page.getByTestId('hub-archive').click();
  await expect(page.getByTestId('archive')).toBeVisible();
  const rows = page.getByTestId('archive-run');
  await expect(rows).toHaveCount(4);
  await expect(page.getByTestId('archive-legacy')).toHaveCount(1);
  await expect(page.getByTestId('archive-label').first()).toBeVisible();
  // The Stage 1 run on Hard with River Scout (Cheat-Assisted, labelled).
  const run = rows.filter({ hasText: 'Cheat-Assisted' });
  await run.getByTestId('archive-replay').click();
  await expect(page.getByTestId('lobby-card-p1')).toBeVisible();
  await page.getByTestId('lobby-ready-p1').click();
  await expect(page.getByTestId('stage-pick')).toHaveAttribute('data-value', 'stage1');
  await expect(page.getByTestId('stage-difficulty')).toHaveAttribute('data-value', 'hard');
  await page.getByTestId('stage-next').click();
  await expect(page.getByTestId('hero-name-p1')).toHaveText('River Scout');
  expect(errors).toEqual([]);
});
