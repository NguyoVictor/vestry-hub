import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const allMigrations = () => readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => source(`supabase/migrations/${name}`))
  .join('\n');

describe('P1 A8 Dashboard + Reports canonical metrics', () => {
  it('uses one tenant-authorized canonical analytics RPC on Dashboard and Reports', () => {
    const dashboard = source('src/pages/Dashboard.tsx');
    const reports = source('src/pages/analytics/Reports.tsx');
    const metrics = source('src/lib/analyticsMetrics.ts');
    const migrations = allMigrations();
    expect(metrics).toContain("rpc('get_canonical_analytics_metrics'");
    expect(dashboard).toContain('fetchCanonicalAnalyticsMetrics');
    expect(reports).toContain('fetchCanonicalAnalyticsMetrics');
    expect(migrations).toContain('create or replace function private.can_read_analytics');
    expect(migrations).toContain('create or replace function private.get_canonical_analytics_metrics');
    expect(migrations).toContain('create or replace function public.get_canonical_analytics_metrics');
    expect(migrations).toMatch(/public\.get_canonical_analytics_metrics[\s\S]*?security invoker/);
  });

  it('defines active members, confirmed giving, published events and active groups canonically', () => {
    const migrations = allMigrations();
    expect(migrations).toMatch(/members[\s\S]*?status = 'active'/);
    expect(migrations).toMatch(/giving_records[\s\S]*?payment_status::text = 'confirmed'[\s\S]*?voided_at is null/);
    expect(migrations).toMatch(/events[\s\S]*?is_published = true/);
    expect(migrations).toMatch(/groups[\s\S]*?is_active = true/);
  });

  it('uses canonical attendance, visitor conversion, volunteering and engagement range metrics', () => {
    const migrations = allMigrations();
    expect(migrations).toContain('service_attendance');
    expect(migrations).toContain('converted_visitors');
    expect(migrations).toContain('volunteer_hours');
    expect(migrations).toContain('engagement_actions');
  });

  it('keeps report giving confirmed/non-voided and attendance backed by service attendance', () => {
    const reports = source('src/pages/analytics/Reports.tsx');
    expect(reports).toContain('.eq("payment_status", "confirmed")');
    expect(reports).toContain('.is("voided_at", null)');
    expect(reports).toContain('TABLES.SERVICE_ATTENDANCE');
    expect(reports).toContain('service_type');
    expect(reports).not.toContain('.select("id, title, event_type, event_date, attendance_count, rsvp_count, is_published")');
  });

  it('uses schema-correct event/group columns and selected report date buckets', () => {
    const reports = source('src/pages/analytics/Reports.tsx');
    expect(reports).toContain('monthBuckets(fromStr, toStr)');
    expect(reports).toContain('.select("id, title, type, event_date, is_published")');
    expect(reports).toContain('.select("id, name, type, leader_id, is_active, created_at")');
    expect(reports).toContain('TABLES.EVENT_RSVPS');
    expect(reports).toContain('TABLES.GROUP_MEMBERS');
  });

  it('removes Dashboard debug/sample-data paths and derives headline metrics from canonical data', () => {
    const dashboard = source('src/pages/Dashboard.tsx');
    expect(dashboard).not.toContain('createSampleMember');
    expect(dashboard).not.toContain('All Recent Giving Records Debug');
    expect(dashboard).not.toContain('Dashboard Stats Debug');
    expect(dashboard).toContain('snapshot.active_members');
    expect(dashboard).toContain('dashboard.giving_today');
    expect(dashboard).toContain('dashboard.upcoming_events_7d');
    expect(dashboard).toContain('snapshot.active_groups');
  });
});
