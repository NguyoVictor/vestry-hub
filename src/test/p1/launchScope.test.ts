// Phase 6 launch-scope contract. Every server function the browser calls must
// be (a) deployed + reviewed for launch, (b) in a DEFERRED area (guarded by
// src/lib/functionGuard.ts), or (c) owned by the payments phase (IntaSend,
// Phase 9). A new, unclassified call fails this test until it is classified.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FUNCTION_FEATURE, deferredFeatureForFunction, deferredFeatureForPath } from '@/config/launchFlags';
import { DEFAULT_MODULE_CONFIG, isAdminPathEnabled, isMemberPathEnabled } from '@/config/modules';

// Deployed on staging after Phase 1B.2–6 security review.
const DEPLOYED_REVIEWED = new Set([
  'send-invitation', 'update-user-role', 'member-provision-access', 'member-otp-request', 'member-login',
  'member-session-context', 'member-register', 'member-logout', 'member-profile-update', 'sync-member-profile',
  'member-portal-feed', 'get-active-sessions', 'get-security-access-log', 'generate-church-code', 'fetch-og-metadata',
  'platform-admin-overview', 'process-stk-push',
]);
// Payments are rebuilt on IntaSend in Phase 9/10 (memory: payments-intasend).
const PAYMENTS_PHASE = new Set([
  'initiate-subscription-stk', 'payment-webhook', 'register-c2b-urls', 'register-credentials',
  'register-payment-channel', 'get-payhero-banks', 'get-supported-banks',
]);
// Reviewed-but-not-yet-deployed admin tooling (super admin console).
const PENDING_REVIEW = new Set<string>([]);

const root = resolve(__dirname, '../../..');
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? (n === 'test' || n === 'integrations' ? [] : walk(p)) : /\.(ts|tsx)$/.test(n) ? [p] : [];
});

describe('launch scope (Phase 6)', () => {
  it('every browser-called function is classified', () => {
    const called = new Set<string>();
    for (const f of walk(resolve(root, 'src'))) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/functions\.invoke\(\s*['"`]([a-z0-9-]+)/g)) called.add(m[1]);
      for (const m of s.matchAll(/\/functions\/v1\/([a-z0-9-]+)/g)) called.add(m[1]);
    }
    const unclassified = [...called].filter((n) => !DEPLOYED_REVIEWED.has(n) && !FUNCTION_FEATURE[n] && !PAYMENTS_PHASE.has(n) && !PENDING_REVIEW.has(n));
    expect(unclassified).toEqual([]);
  });

  it('deferred functions short-circuit; launch functions do not', () => {
    for (const n of Object.keys(FUNCTION_FEATURE)) expect(deferredFeatureForFunction(n), n).not.toBeNull();
    for (const n of DEPLOYED_REVIEWED) expect(deferredFeatureForFunction(n), n).toBeNull();
  });

  it('deferred pages are hidden for admins and members; launch pages stay', () => {
    const cfg = { ...DEFAULT_MODULE_CONFIG };
    for (const p of ['/ai-tools', '/graphics-studio', '/song-library', '/church-media', '/sermons', '/sermon-preparation', '/livestreaming', '/settings/livestreaming']) {
      expect(deferredFeatureForPath(p), p).not.toBeNull();
      expect(isAdminPathEnabled(p, cfg), p).toBe(false);
    }
    for (const p of ['/member/church-media', '/member/sermons', '/member/livestreaming']) expect(isMemberPathEnabled(p, cfg), p).toBe(false);
    for (const p of ['/training/quizzes', '/training/host/abc', '/dashboard', '/members', '/families', '/facility-booking', '/incident-management', '/asset-management', '/bible-explorer', '/settings/general', '/giving-records'])
      expect(isAdminPathEnabled(p, cfg), p).toBe(true);
    for (const p of ['/member/profile', '/member/requests', '/member/bible']) expect(isMemberPathEnabled(p, cfg), p).toBe(true);
  });

  it('Church Studio is removed (product decision, Phase 7) — shared studio_media data is kept', () => {
    const nav = readFileSync(resolve(root, 'src/config/navigation.ts'), 'utf8');
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
    expect(nav).not.toMatch(/church-studio|Church Studio/);
    expect(app).not.toMatch(/ChurchStudio|church-studio/);
    expect(readdirSync(resolve(root, 'src/pages/media'))).not.toContain('ChurchStudio.tsx');
    // studio_media stays: member sermons/home still read it.
    expect(readFileSync(resolve(root, 'src/pages/member/MemberHome.tsx'), 'utf8')).toMatch(/STUDIO_MEDIA/);
  });
});
