import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  retries: 0,
  outputDir: 'test-results/artifacts',
  reporter: [['list'], ['html', { outputFolder: 'test-results/report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1080, height: 1920 },
    screenshot: 'only-on-failure',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'kiosk',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1080, height: 1920 } },
    },
  ],
});
