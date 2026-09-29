import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('P1 Events/RSVP contract',()=>{
 it('tenant-scopes Admin event mutations',()=>{
  const events=source('src/pages/operations/Events.tsx');
  expect(events).toMatch(/\.eq\("id", editingEvent!\.id\)[\s\S]*?\.eq\("tenant_id", tenantId!\)/);
  expect(events).toMatch(/delete\(\)\.eq\("id", id\)\.eq\("tenant_id", tenantId!\)/);
  expect(events).toMatch(/update\(\{ status, is_published: status === "published" \} as any\)[\s\S]*?\.eq\("tenant_id", tenantId!\)/);
 });
 it('respects event/service self-service flags in member UI',()=>{
  const member=source('src/pages/member/MemberEvents.tsx');
  expect(member).toContain('selfServiceEnabled: e.allow_rsvp !== false');
  expect(member).toContain('selfServiceEnabled: s.allow_attendance !== false');
  expect(member).toContain('{isEvent && item.selfServiceEnabled && (');
  expect(member).toContain('{!isEvent && item.selfServiceEnabled && (');
 });
 it('enforces duplicate, capacity, and feature flags in the database',()=>{
  const base=source('supabase/migrations/20260923092507_p1_operations_reconciliation.sql');
  const flags=source('supabase/migrations/20260923124104_p1_operations_self_service_flags.sql');
  expect(base).toContain('event_rsvps_member_unique');
  expect(base).toContain('event_rsvp_capacity_guard');
  expect(flags).toContain('e.allow_rsvp=true');
  expect(flags).toContain('s.allow_attendance=true');
 });
});
