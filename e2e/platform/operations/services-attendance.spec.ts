import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

test.describe('P1 Services/Attendance contracts',()=>{
 test('member feed only exposes published tenant services',async()=>{
  const member=source('src/pages/member/MemberEvents.tsx');
  expect(member).toContain('.eq(COLS.TENANT_ID, member.churchId)');
  expect(member).toContain('.eq("status", "published")');
  expect(member).toContain('.eq("is_published", true)');
 });
 test('attendance is self-owned and tenant-bound',async()=>{
  const member=source('src/pages/member/MemberEvents.tsx');
  const migration=source('supabase/migrations/20260923092507_p1_operations_reconciliation.sql');
  expect(member).toContain('member_id: memberId');
  expect(member).toContain('.eq("tenant_id", churchId)');
  expect(migration).toContain('service_attendance_member_insert');
  expect(migration).toContain('member_id=private.member_session_member_id(tenant_id)');
 });
});
