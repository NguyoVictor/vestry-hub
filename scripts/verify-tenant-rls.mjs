import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_PROJECT = 'xwbajophstetbnnemsyq';
const EXPECTED_ADMIN = '4cb0c021-06c8-4b0c-ba52-ff2128a24344';
const TENANT_A = '20d06ab3-5183-4b0b-b1af-ca009480503b';
const TENANT_B = 'db75d0c0-ec9c-406e-a386-a690725b654f';
const tables = ['members', 'events', 'services', 'giving_records', 'expenses', 'announcements', 'messages', 'appointments', 'testimonies'];
const checks = [];
const record = (label, outcome, note = '') => {
  checks.push({ label, outcome, note });
  console.log(`${outcome.padEnd(11)} ${label}${note ? ` - ${note}` : ''}`);
};
const fail = (message) => { record('Setup/security prerequisite', 'FAIL', message); };
function envFile(name) {
  if (!fs.existsSync(name)) return {};
  const values = {};
  for (const line of fs.readFileSync(name, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}
const env = { ...envFile('.env.local'), ...envFile('.env.development.local') };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_KEY;
const stateFile = process.env.PW_STAGING_ADMIN_STORAGE_STATE || 'playwright/.auth/staging-admin.json';
const resultsPath = process.env.RLS_RESULT_FILE || 'reports/e2e-automation/tenant-rls.json';
try {
  if (!url || new URL(url).hostname !== `${EXPECTED_PROJECT}.supabase.co`) throw new Error('Expected staging project URL missing or mismatched');
  if (!key) throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY (or anon key)');
  if (!fs.existsSync(stateFile)) throw new Error('Authenticated staging-admin Playwright storage state missing');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const storage = state.origins?.find(o => o.origin === 'http://127.0.0.1:4173')?.localStorage || [];
  const entry = storage.find(s => s.name === `sb-${EXPECTED_PROJECT}-auth-token`);
  if (!entry) throw new Error('Staging Supabase auth storage entry missing');
  const session = JSON.parse(entry.value);
  if (!session.access_token) throw new Error('Access token missing');
  const config = { auth: { persistSession: false, autoRefreshToken: false } };
  const authentication = createClient(url, key, config);
  const verified = await authentication.auth.getUser(session.access_token);
  if (verified.error || verified.data.user?.id !== EXPECTED_ADMIN) throw new Error('Backend JWT check failed or user is not the expected Tenant A administrator');
  record('Backend JWT + administrator identity', 'PASS');
  const actor = createClient(url, key, {
    ...config,
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  // Positive control: the known staging Tenant A has one member.
  const own = await actor.from('members').select('id,tenant_id').eq('tenant_id', TENANT_A).limit(5);
  if (own.error || !own.data?.length || own.data.some(row => row.tenant_id !== TENANT_A)) {
    record('Own-tenant members positive control', 'FAIL', own.error?.message || 'No own-tenant member visible; cannot trust negative test');
  } else {
    record('Own-tenant members positive control', 'PASS', `${own.data.length} visible`);
  }
  // In previous read-only SQL audit Tenant B had one member. This is a prerequisite for the negative control.
  const other = await actor.from('members').select('id,tenant_id').eq('tenant_id', TENANT_B).limit(5);
  if (other.error || (other.data?.length || 0) > 0) {
    record('Cross-tenant members denied', 'FAIL', other.error?.message || 'Tenant B records returned');
  } else if (checks.find(x => x.label === 'Own-tenant members positive control')?.outcome !== 'PASS') {
    record('Cross-tenant members denied', 'UNVERIFIED', 'No passing positive control');
  } else {
    record('Cross-tenant members denied', 'PASS', 'Tenant B member known to exist from prior staging SQL audit');
  }
  // No claim of enforcement for other tables without confirmed seeded Tenant B rows.
  for (const table of tables.filter(x => x !== 'members')) {
    const res = await actor.from(table).select('id,tenant_id').eq('tenant_id', TENANT_B).limit(5);
    if (res.error) record(`${table} cross-tenant SELECT`, 'UNVERIFIED', `API error: ${res.error.message}`);
    else if (res.data?.length) record(`${table} cross-tenant SELECT`, 'FAIL', 'Tenant B rows visible');
    else record(`${table} cross-tenant SELECT`, 'UNVERIFIED', 'No known seeded Tenant B rows; empty result is not conclusive');
  }
} catch (error) { fail(error.message); }
const counts = Object.fromEntries(['PASS', 'FAIL', 'UNVERIFIED'].map(s => [s, checks.filter(c => c.outcome === s).length]));
fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
fs.writeFileSync(resultsPath, JSON.stringify({ checks, counts }, null, 2));
console.log(`RLS result counts: ${JSON.stringify(counts)}`);
if (counts.FAIL > 0 || !checks.some(x => x.label === 'Cross-tenant members denied' && x.outcome === 'PASS')) process.exitCode = 1;
