import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Staging CANARY config (recovery phases). Runs against an explicitly named
 * Vercel *Preview* of the recovery branch, signed in as the dedicated QA
 * canary accounts in .env.e2e.local (git-ignored). Writes are limited to
 * clearly tagged "QA-CANARY" records in the QA churches A/B on staging.
 * Never points at vestryhub.com or Production. Secrets are never logged.
 */
function loadEnvFile(path: string) {
  let text = '';
  try { text = readFileSync(path, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnvFile('.env.e2e.local');

const baseURL = process.env.PW_CANARY_BASE_URL?.trim() ?? '';
const host = (() => { try { return new URL(baseURL).hostname; } catch { return ''; } })();
if (!/^vestry-[a-z0-9-]+-nguyovictors-projects\.vercel\.app$/.test(host)) {
  throw new Error('Refusing canary: PW_CANARY_BASE_URL must be a nguyovictors-projects Vercel Preview URL.');
}
if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  throw new Error('Refusing canary: VERCEL_AUTOMATION_BYPASS_SECRET missing from .env.e2e.local.');
}

export default defineConfig({
  testDir: './e2e/qa',
  testMatch: /staging-canary-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results/staging-canary',
  reporter: [['list']],
  use: {
    baseURL,
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': 'true',
    },
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
