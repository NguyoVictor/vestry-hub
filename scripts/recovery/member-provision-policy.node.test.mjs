// Phase 5 (E4). node --experimental-strip-types --test scripts/recovery/member-provision-policy.node.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mayProvision } from '../../supabase/functions/member-provision-access/policy.ts';
const T = 't-a';
test('mirrors can_write_permission(member_management)', () => {
  assert.equal(mayProvision({ tenant_id: T, role: 'super_admin', status: 'active' }, T, 'read_only'), true);
  assert.equal(mayProvision({ tenant_id: T, role: 'church_admin', status: 'active' }, T, null), true);
  assert.equal(mayProvision({ tenant_id: T, role: 'staff', status: 'active' }, T, null), true);
  assert.equal(mayProvision({ tenant_id: T, role: 'staff', status: 'active' }, T, 'full_access'), true);
  assert.equal(mayProvision({ tenant_id: T, role: 'staff', status: 'active' }, T, 'read_only'), false);
  assert.equal(mayProvision({ tenant_id: T, role: 'member', status: 'active' }, T, null), false);
  assert.equal(mayProvision({ tenant_id: T, role: 'staff', status: 'inactive' }, T, null), false);
  assert.equal(mayProvision({ tenant_id: 't-b', role: 'super_admin', status: 'active' }, T, null), false);
  assert.equal(mayProvision(null, T, null), false);
});
