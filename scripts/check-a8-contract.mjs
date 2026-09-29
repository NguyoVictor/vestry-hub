import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const migrations = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).map(f => read(`supabase/migrations/${f}`)).join('\n');
const dashboard = read('src/pages/Dashboard.tsx');
const reports = read('src/pages/analytics/Reports.tsx');
const metrics = (() => { try { return read('src/lib/analyticsMetrics.ts'); } catch { return ''; } })();

const checks = [
  ['canonical client helper', metrics.includes("rpc('get_canonical_analytics_metrics'")],
  ['Dashboard uses canonical helper', dashboard.includes('fetchCanonicalAnalyticsMetrics')],
  ['Reports uses canonical helper', reports.includes('fetchCanonicalAnalyticsMetrics')],
  ['tenant-authorized analytics helper', migrations.includes('create or replace function private.can_read_analytics')],
  ['canonical analytics function', migrations.includes('create or replace function private.get_canonical_analytics_metrics')],
  ['confirmed/non-voided report giving', reports.includes('.eq("payment_status", "confirmed")') && reports.includes('.is("voided_at", null)')],
  ['service attendance source', reports.includes('TABLES.SERVICE_ATTENDANCE')],
  ['date-window month buckets', reports.includes('monthBuckets(fromStr, toStr)')],
  ['schema-correct event source', reports.includes('.select("id, title, type, event_date, is_published")')],
  ['schema-correct group source', reports.includes('.select("id, name, type, leader_id, is_active, created_at")')],
  ['Dashboard debug/sample paths removed', !dashboard.includes('createSampleMember') && !dashboard.includes('All Recent Giving Records Debug') && !dashboard.includes('Dashboard Stats Debug')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`${checks.length - failed}/${checks.length} A8 contract checks passed`);
process.exitCode = failed ? 1 : 0;
