// ============================================================
// KIRA RESEARCH — Playwright smoke-test config
// Used by .github/workflows/post-deploy-smoke.yml and `npm run test:smoke`.
// ============================================================

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js$/,

  // Each test should complete quickly — these are smoke tests, not e2e flows.
  timeout: 30_000,
  expect: { timeout: 8_000 },

  fullyParallel: true,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 1 : 0,
  workers:       process.env.CI ? 4 : 2,

  // GitHub-formatted output groups failures by file for the Actions UI.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',

  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'https://kiraresearch.com',
    trace:      'retain-on-failure',
    screenshot: 'only-on-failure',
    video:      'off',
    // SEA visitors testing the live site, mostly mobile and desktop Chrome
    viewport: { width: 1280, height: 800 }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
