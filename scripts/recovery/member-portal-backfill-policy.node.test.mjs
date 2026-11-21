// B3 backfill authorization. node --experimental-strip-types --test scripts/recovery/member-portal-backfill-policy.node.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backfillScope, clampLimit } from '../../supabase/functions/member-portal-backfill/policy.ts';
const A = 't-a';
test('church admins: own church only; staff/members/inactive refused; platform admin names a church', () => {
  assert.deepEqual(backfillScope({ tenant_id: A, role: 'church_admin', status: 'active', is_super_admin: false }, undefined), { ok: true, tenantId: A });
  assert.deepEqual(backfillScope({ tenant_id: A, role: 'super_admin', status: 'active', is_super_admin: false }, A), { ok: true, tenantId: A });
  assert.equal(backfillScope({ tenant_id: A, role: 'super_admin', status: 'active', is_super_admin: false }, 't-b').ok, false);
  assert.equal(backfillScope({ tenant_id: A, role: 'staff', status: 'active', is_super_admin: false }, A).ok, false);
  assert.equal(backfillScope({ tenant_id: A, role: 'church_admin', status: 'inactive', is_super_admin: false }, A).ok, false);
  assert.equal(backfillScope(null, A).ok, false);
  assert.deepEqual(backfillScope({ tenant_id: null, role: null, status: 'active', is_super_admin: true }, 't-b'), { ok: true, tenantId: 't-b' });
  assert.equal(backfillScope({ tenant_id: null, role: null, status: 'active', is_super_admin: true }, '').ok, false);
});
test('batch limit is clamped 1..50', () => {
  assert.equal(clampLimit(0), 1); assert.equal(clampLimit(999), 50); assert.equal(clampLimit('x'), 25); assert.equal(clampLimit(10), 10);
});
