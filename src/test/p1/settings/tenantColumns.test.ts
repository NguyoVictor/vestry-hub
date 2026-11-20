// Phase 5 (E5) contract: browser code may never read provider secrets.
// tenants / sms_settings / branches use column-level SELECT grants
// (migration 20261120200000), so select("*") fails and the safe column list
// must match the generated schema exactly (minus the secrets).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TENANT_PUBLIC_COLUMNS, TENANT_SAFE_COLUMNS, TENANT_SECRET_COLUMNS } from '@/lib/tenantColumns';

const root = resolve(__dirname, '../../../..');
const types = readFileSync(resolve(root, 'src/integrations/supabase/types.ts'), 'utf8');
function rowColumns(table: string): string[] {
  const start = types.indexOf(`\n      ${table}: {\n        Row: {`, types.indexOf('public: {'));
  const rowStart = types.indexOf('Row: {', start);
  const rowEnd = types.indexOf('\n        }', rowStart);
  return [...types.slice(rowStart, rowEnd).matchAll(/^\s{10}(\w+)\??:/gm)].map((m) => m[1]);
}
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'integrations' || n === 'test' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

describe('tenant secret columns (E5)', () => {
  it('safe list = every tenants column except the secrets', () => {
    const all = rowColumns('tenants');
    const safe = TENANT_SAFE_COLUMNS.split(',');
    expect(new Set(safe)).toEqual(new Set(all.filter((c) => !(TENANT_SECRET_COLUMNS as readonly string[]).includes(c))));
    for (const s of TENANT_SECRET_COLUMNS) {
      expect(safe).not.toContain(s);
      expect(TENANT_PUBLIC_COLUMNS.split(',')).not.toContain(s);
    }
  });

  it('no browser code reads all columns of tenants / sms_settings / branches or a secret column', () => {
    const offenders: string[] = [];
    for (const f of walk(resolve(root, 'src'))) {
      const s = readFileSync(f, 'utf8');
      if (/\.from\(\s*(?:["'`](?:tenants|sms_settings|branches)["'`]|TABLES\.(?:TENANTS|SMS_SETTINGS|BRANCHES))\s*\)\s*\.select\(\s*["'`]\s*\*/.test(s)) offenders.push(`${f}: select(*)`);
      if (/tenants!?[a-z_]*\(\s*\*/.test(s)) offenders.push(`${f}: tenants(*) embed`);
      for (const m of s.matchAll(/\.select\(\s*["'`]([^"'`]*)["'`]/g)) {
        if (/\b(at_api_key|daraja_consumer_secret|daraja_passkey|daraja_consumer_key|whatsapp_access_token|payhero_credential_id|branch_password_hash)\b/.test(m[1])) offenders.push(`${f}: selects a secret`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
