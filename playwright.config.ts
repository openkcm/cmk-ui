import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 5,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    testIdAttribute: 'data-testid'
  },
  expect: {
    timeout: 30000,
  },
  timeout: 180000,
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      },
      dependencies: ['setup']
    }
  ]
});
