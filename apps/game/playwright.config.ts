import { defineConfig, devices } from '@playwright/test';

const ci = process.env.CI === 'true';
// Test-only port; the game itself never assumes one.
const port = Number(process.env.E2E_PORT ?? 4317);

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/artifacts',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  // CI runners draw WebGL in software, so uploading sprite sheets holds the page's main
  // thread and screens can appear later than the default 5 s. Since 2026-11-22 sheets load
  // per hero and enemy when first drawn (artLoader.ts), which shortens this a lot
  // (lessons_learned.md M1).
  expect: { timeout: ci ? 20_000 : 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    ...(ci
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !ci,
  },
});
