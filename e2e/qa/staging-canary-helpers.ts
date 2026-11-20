import { expect, type Page } from '@playwright/test';

export type Actor = 'A_ADMIN' | 'B_ADMIN' | 'A_STAFF' | 'B_STAFF';

/** Collects failed Supabase calls and page errors. Paths only, no query strings or bodies. */
export function watch(page: Page) {
  const failures: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', e => pageErrors.push(e.message.slice(0, 200)));
  page.on('response', async r => {
    const u = new URL(r.url());
    if (u.hostname.endsWith('.supabase.co') && r.status() >= 400) {
      // Error code/message only (PostgREST/Storage error envelopes); never bodies of successful calls.
      let why = '';
      try {
        const j = await r.json();
        why = [j.code ?? j.statusCode ?? j.error, j.message ?? j.msg].filter(Boolean).join(': ').slice(0, 160);
      } catch { /* non-JSON */ }
      failures.push(`${r.request().method()} ${u.pathname} -> ${r.status()}${why ? ` (${why})` : ''}`);
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
