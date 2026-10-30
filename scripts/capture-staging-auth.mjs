/**
 * Manually capture a verified staging browser session for Playwright.
 * Usage: node scripts/capture-staging-auth.mjs qa-member|qa-admin
 * The session file contains login credentials. Keep it out of version control.
 */
import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdirSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.umask(0o077);

const actor = process.argv[2];
if (!['qa-member', 'qa-admin'].includes(actor)) {
  console.error('Usage: node scripts/capture-staging-auth.mjs qa-member|qa-admin');
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
const allowedOrigin = new URL(baseURL).origin;
const outputDir = path.join(root, 'playwright', '.auth');
const outputPath = path.join(outputDir, `${actor}.json`);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext(); // Clean context: do not load an admin storage state.
const page = await context.newPage();
const rl = createInterface({ input, output });

async function inspectMember(candidate) {
  try {
    if (new URL(candidate.url()).origin !== allowedOrigin) return null;
    const result = await candidate.evaluate(() => {
      const raw = localStorage.getItem('member_session');
      if (!raw) return null;
      let session;
      try { session = JSON.parse(raw); } catch { return null; }
      const required = ['memberId', 'tenantId', 'sessionToken', 'expiresAt'];
      if (!required.every(key => typeof session[key] === 'string' && session[key])) return null;
      if (!Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) return null;
      if (!location.pathname.startsWith('/member') || location.pathname === '/member/login') return null;
      return { pathname: location.pathname };
    });
    return result ? { page: candidate, pathname: result.pathname } : null;
  } catch { return null; }
}

async function inspectAdmin(candidate) {
  try {
    if (new URL(candidate.url()).origin !== allowedOrigin) return null;
    const result = await candidate.evaluate(() => {
      if (!location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/onboarding')) return null;
      const hasAuth = Object.keys(localStorage).some(key => {
        if (!/^sb-.*-auth-token$/.test(key)) return false;
        try {
          const token = JSON.parse(localStorage.getItem(key) || '{}');
          return Boolean(token.access_token && token.user?.id);
        } catch { return false; }
      });
      return hasAuth ? { pathname: location.pathname } : null;
    });
    return result ? { page: candidate, pathname: result.pathname } : null;
  } catch { return null; }
}

try {
  await page.goto(new URL(actor === 'qa-member' ? '/member/login' : '/auth/signin', baseURL).toString());
  console.log(`Capturing ${actor} from ${allowedOrigin}.`);
  console.log(actor === 'qa-member'
    ? 'Sign in as the STAGING MEMBER. Complete the magic link in this Playwright browser, not a separate Chrome profile.'
    : 'Sign in as the DISPOSABLE STAGING administrator.');
  console.log('Return to this terminal and press Enter AFTER the authenticated portal appears.');

  let saved = false;
  for (let attempts = 0; attempts < 5 && !saved; attempts++) {
    await rl.question('Press Enter to validate and capture (Ctrl+C to cancel): ');
    let match = null;
    for (const candidate of context.pages()) {
      match = actor === 'qa-member' ? await inspectMember(candidate) : await inspectAdmin(candidate);
      if (match) break;
    }
    if (!match) {
      console.error(actor === 'qa-member'
        ? 'No valid member_session found on an authenticated /member page. No file saved. Complete member login in this browser.'
        : 'No verified admin session found on /dashboard or /onboarding. No file saved.');
      continue;
    }

    const storage = await context.storageState();
    if (actor === 'qa-member' && !storage.origins.some(o => o.origin === allowedOrigin && o.localStorage.some(kv => kv.name === 'member_session'))) {
      console.error('The storage state did not contain member_session. No file saved.');
      continue;
    }
    mkdirSync(outputDir, { recursive: true, mode: 0o700 });
    const temp = `${outputPath}.tmp-${process.pid}`;
    writeFileSync(temp, JSON.stringify(storage, null, 2) + '\n', { mode: 0o600 });
    chmodSync(temp, 0o600);
    renameSync(temp, outputPath);
    console.log(`Verified ${actor} session at ${match.pathname}.`);
    console.log(`Saved ${outputPath}`);
    saved = true;
  }
  if (!saved) process.exitCode = 1;
} finally {
  rl.close();
  await browser.close();
}
