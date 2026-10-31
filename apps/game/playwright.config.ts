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
