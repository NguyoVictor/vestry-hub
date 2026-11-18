import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagingInviteOrigin, verifiedStaffInvitation } from '../../supabase/functions/send-invitation/handshake.ts';
import { validateStaffInvite, mayInviteStaff } from '../../supabase/functions/send-invitation/validation.ts';
import { checkStaffInviteHandshake } from './check-staff-invite-handshake.mjs';

const A = '20d06ab3-5183-4b0b-b1af-ca009480503b';
const B = 'db75d0c0-ec9c-406e-a386-a690725b654f';
const email = 'qa-staff@example.test';
const id = 'test-auth-user';
const invitationId = 'test-invitation-id';
const invitation = { id: invitationId, tenant_id:A, email, role:'staff', consumed_at:'2026-11-18T10:00:00Z', auth_user_id:id };
const profile = { id, tenant_id:A, email, role:'staff', status:'active', invitation_sent:true };
const check = (i=invitation,p=profile) => verifiedStaffInvitation(id,invitationId,A,email,'staff',i,p);

test('accepts one correctly linked, tenant-scoped staff invitation', () => assert.equal(check(), true));
test('rejects wrong tenant in DB invitation and staff profile', () => {
  assert.equal(check({ ...invitation, tenant_id:B }), false);
  assert.equal(check(invitation, { ...profile, tenant_id:B }), false);
});
test('rejects mismatched auth identity, wrong invitation ID and wrong role', () => {
  assert.equal(check({ ...invitation, auth_user_id:'somebody-else' }), false);
  assert.equal(check({ ...invitation, id:'some-other-invitation' }), false);
  assert.equal(check(invitation, { ...profile, role:'super_admin' }), false);
});
test('rejects unconsumed invitation, missing profile and uninvited account', () => {
  assert.equal(check({ ...invitation, consumed_at:null }), false);
  assert.equal(check(invitation, null), false);
  assert.equal(check(invitation, { ...profile, invitation_sent:false }), false);
});
test('rejects mismatched email, inactive account', () => {
  assert.equal(check({ ...invitation, email:'other@example.test' }), false);
  assert.equal(check(invitation, { ...profile, status:'inactive' }), false);
});
test('permits email case normalization only when identities match', () => {
  assert.equal(check({ ...invitation, email:'QA-STAFF@EXAMPLE.TEST' }, { ...profile, email:'Qa-Staff@example.test' }), true);
});
test('accepts only a specifically approved HTTPS Vercel Preview origin', () => {
  assert.equal(stagingInviteOrigin('https://specific-recovery.vercel.app'), 'https://specific-recovery.vercel.app');
  for (const bad of [
    '', 'http://specific-recovery.vercel.app',
    'https://vestry-hub.vercel.app', 'https://vestryhub.com',
    'https://foo.vercel.app.evil.example',
    'https://foo.vercel.app/path',
    'https://foo.vercel.app?token=1',
    'https://foo.vercel.app#flag',
    'https://foo.vercel.app:443',
    'https://user:password@foo.vercel.app',
  ]) assert.equal(stagingInviteOrigin(bad), null, bad);
});
test('validates the requested staff role and fixed tenant', () => {
  const result=validateStaffInvite({tenant_id:A,email,role:'staff',first_name:'QA',last_name:'Staff'});
  assert.equal(result.ok,true);
  for (const role of ['super_admin','service_role','authenticated','owner']) {
    assert.equal(validateStaffInvite({tenant_id:A,email,role}).ok,false,role);
  }
});
test('staff cannot invite other staff; tenant-bound super admin can', () => {
  const staff={tenant_id:A,role:'staff',status:'active',is_super_admin:false};
  const admin={tenant_id:A,role:'super_admin',status:'active',is_super_admin:false};
  assert.equal(mayInviteStaff(staff,A),false);
  assert.equal(mayInviteStaff(admin,A),true);
  assert.equal(mayInviteStaff(admin,B),false);
  assert.equal(mayInviteStaff({...admin,status:'suspended'},A),false);
});
test('source contracts require trusted DB invitation and safe local callback', () => {
  assert.deepEqual(checkStaffInviteHandshake(),[]);
});
