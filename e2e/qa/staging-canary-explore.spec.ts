/** Read-only reconnaissance: sign in as Church A admin and inventory the Phase 3 pages. No clicks except navigation. */
import { test } from '@playwright/test';
import { signIn, watch } from './staging-canary-helpers';

const PAGES = ['/families', '/house-fellowships', '/visitors', '/member-requests', '/board-meetings'];

test('explore phase 3 pages as Church A admin (read-only)', async ({ page }, info) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  console.log('after sign-in:', new URL(page.url()).pathname);
  for (const p of PAGES) {
    await page.goto(p);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    const buttons = (await page.getByRole('button').allInnerTexts()).map(s => s.trim()).filter(Boolean);
    const heading = (await page.locator('h1').first().innerText().catch(() => '')).trim();
    console.log(`\n== ${p} | url=${new URL(page.url()).pathname} | h1="${heading}"`);
    console.log('buttons:', JSON.stringify([...new Set(buttons)].slice(0, 40)));
    await page.screenshot({ path: info.outputPath(`${p.slice(1)}.png`), fullPage: true });
  }
  console.log('\nsupabase failures:', JSON.stringify(w.failures));
  console.log('page errors:', JSON.stringify(w.pageErrors));
});
