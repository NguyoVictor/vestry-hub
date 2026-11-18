import { defineConfig, devices } from '@playwright/test';
import { requireStagingReadOnlyEnv } from './scripts/qa/staging-readonly-guard.mjs';

// No webServer, no credentials, no test hooks that mutate Supabase data.
const { baseURL } = requireStagingReadOnlyEnv();
export default defineConfig({
  testDir: './e2e/qa',
  testMatch: 'staging-readonly.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/staging-readonly', open: 'never' }]],
  use: { baseURL, serviceWorkers: 'block', trace: process.env.VERCEL_OIDC_TOKEN ? 'off' : 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
