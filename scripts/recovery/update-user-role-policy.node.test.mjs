// Phase 5: update-user-role authorization rules (pure). Run:
//   node --experimental-strip-types --test scripts/recovery/update-user-role-policy.node.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../../supabase/functions/update-user-role/policy.ts';

const T = 'tenant-a';
const owner = { id: 'o', tenant_id: T, role: 'super_admin', status: 'active' };
const admin = { id: 'a', tenant_id: T, role: 'church_admin', status: 'active' };
const staff = { id: 's', tenant_id: T, role: 'staff', status: 'active' };
const leader = { id: 'l', tenant_id: T, role: 'staff_leader', status: 'active' };
const noCustom = () => false;

test('only active super_admin / church_admin may manage users', () => {
  assert.equal(decide(staff, { ...admin, id: 'x', role: 'staff' }, { action: 'update_role', role: 'pastor' }, noCustom).ok, false);
  assert.equal(decide(leader, { ...staff, id: 'x' }, { action: 'update_role', role: 'pastor' }, noCustom).ok, false);
  assert.equal(decide({ ...admin, status: 'inactive' }, { ...staff, id: 'x' }, { action: 'update_role', role: 'pastor' }, noCustom).ok, false);
  assert.equal(decide(null, staff, { action: 'deactivate' }, noCustom).ok, false);
  assert.equal(decide(admin, staff, { action: 'update_role', role: 'pastor' }, noCustom).ok, true);
});

test('cross-church targets and self-modification are refused', () => {
  const d1 = decide(admin, { ...staff, tenant_id: 'tenant-b' }, { action: 'deactivate' }, noCustom);
  assert.deepEqual([d1.ok, d1.ok ? 0 : d1.code], [false, 404]);
  assert.equal(decide(admin, { ...admin }, { action: 'update_role', role: 'pastor' }, noCustom).ok, false);
});

test('church_admin can never grant or touch elevated roles; super_admin can', () => {
  for (const role of ['super_admin', 'church_admin']) {
    const d = decide(admin, staff, { action: 'update_role', role }, noCustom);
    assert.deepEqual([d.ok, d.ok ? 0 : d.code], [false, 403], role);
    assert.equal(decide(admin, staff, { action: 'reactivate', role }, noCustom).ok, false, `reactivate ${role}`);
    assert.equal(decide(owner, staff, { action: 'update_role', role }, noCustom).ok, true, `owner grants ${role}`);
  }
  assert.equal(decide(admin, { ...owner, id: 'o2' }, { action: 'deactivate' }, noCustom).ok, false);
  assert.equal(decide(admin, { ...admin, id: 'a2' }, { action: 'update_role', role: 'staff' }, noCustom).ok, false);
  assert.equal(decide(owner, { ...admin, id: 'a2' }, { action: 'update_role', role: 'staff' }, noCustom).ok, true);
});

test('roles and statuses are validated (custom roles allowed)', () => {
  assert.equal(decide(admin, staff, { action: 'update_role', role: 'god_mode' }, noCustom).ok, false);
  assert.equal(decide(admin, staff, { action: 'update_role', role: 'Worship Lead' }, r => r === 'Worship Lead').ok, true);
  assert.equal(decide(admin, staff, { action: 'update_role', role: 'pastor', status: 'banned' }, noCustom).ok, false);
  assert.equal(decide(admin, staff, { action: 'update_role' }, noCustom).ok, false);
  assert.equal(decide(admin, staff, { action: 'drop_table' }, noCustom).ok, false);
  const r = decide(admin, staff, { action: 'reactivate' }, noCustom);
  assert.deepEqual(r, { ok: true, action: 'reactivate', role: null, status: null });
});
