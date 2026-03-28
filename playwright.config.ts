import { defineConfig, devices } from '@playwright/test';

const nodeBin = '/Users/geraldolumide/.nvm/versions/node/v20.19.4/bin';
const nextPort = 3100;
const apiPort = 4100;

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${nextPort}`,
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      channel: 'chrome',
    },
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
  webServer: [
    {
      command: `${nodeBin}/node ./scripts/mock-qa-api.mjs`,
      url: `http://127.0.0.1:${apiPort}/healthz`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command:
        `PATH=${nodeBin}:$PATH ` +
        `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:${apiPort} ` +
        `NEXT_PUBLIC_APP_URL=http://localhost:${nextPort} ` +
        `NEXT_PUBLIC_ROOT_DOMAIN=localhost ` +
        `${nodeBin}/node ./node_modules/next/dist/bin/next dev -p ${nextPort}`,
      url: `http://127.0.0.1:${nextPort}`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
