import { expect, type Page } from '@playwright/test';

export type Actor = 'A_ADMIN' | 'B_ADMIN' | 'A_STAFF' | 'B_STAFF';

/** Collects failed Supabase calls and page errors. Paths only, no query strings or bodies. */
export function watch(page: Page) {
  const failures: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', e => pageErrors.push(e.message.slice(0, 200)));
  page.on('response', r => {
    const u = new URL(r.url());
    if (u.hostname.endsWith('.supabase.co') && r.status() >= 400) {
      failures.push(`${r.request().method()} ${u.pathname} -> ${r.status()}`);
    }
  });
  return { failures, pageErrors };
}

export async function signIn(page: Page, actor: Actor) {
  const email = process.env[`E2E_${actor}_EMAIL`];
  const password = process.env[`E2E_${actor}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing credentials for ${actor} in .env.e2e.local`);
  await page.goto('/auth/signin');
  await page.getByPlaceholder('you@church.org').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 30_000 });
}

export const CANARY_TAG = process.env.PW_CANARY_TAG || `QA-CANARY-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
