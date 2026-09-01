import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },

  fullyParallel: false,       // run sequentially — tests share state
  retries: 0,                 // no retries for clarity during dev
  workers: 1,                 // single worker for UI mode

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:4200',
    headless: false,           // UI mode — see browser
    launchOptions: { slowMo: 200 }, // slow down for visibility
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
