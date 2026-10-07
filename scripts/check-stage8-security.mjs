import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261005110415_p1_supabase_security_closeout.sql', 'utf8');
const config = readFileSync('supabase/config.toml', 'utf8');
const memberContext = readFileSync('supabase/functions/member-session-context/index.ts', 'utf8');

const checks = [
  ['server-only automation_settings', /revoke all on table public\.automation_settings from public, anon, authenticated/i.test(migration)],
  ['server-only member_login_challenges', /revoke all on table public\.member_login_challenges from public, anon, authenticated/i.test(migration)],
  ['server-only staff_invitations', /revoke all on table public\.staff_invitations from public, anon, authenticated/i.test(migration)],
  ['server-only tenant_payment_credentials', /revoke all on table public\.tenant_payment_credentials from public, anon, authenticated/i.test(migration)],
  ['server-only webhook_events', /revoke all on table public\.webhook_events from public, anon, authenticated/i.test(migration)],
  ['trigger function lockdown', /revoke execute on function private\.enforce_event_rsvp_capacity\(\) from public, anon, authenticated/i.test(migration)],
  ['member session context config', /\[functions\.member-session-context\][\s\S]*?verify_jwt\s*=\s*false/i.test(config)],
  ['member session validates token', /\.eq\("session_token", String\(sessionToken\)\)/.test(memberContext)],
  ['member session validates tenant', /\.eq\("tenant_id", String\(tenantId\)\)/.test(memberContext)],
  ['member session validates expiry', /\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)/.test(memberContext)],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`FAIL: ${name}`);
  process.exit(1);
}
console.log(`Stage 8 security contract: PASS (${checks.length}/${checks.length})`);
