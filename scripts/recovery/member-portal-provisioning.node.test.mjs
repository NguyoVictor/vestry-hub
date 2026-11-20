// Finding 1 behavioral tests for member portal provisioning (zero network).
// Run: node --experimental-strip-types --test scripts/recovery/member-portal-provisioning.node.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  provisionMemberPortalAccess,
  MEMBER_PORTAL_PROVISIONING_MARKER,
} from '../../supabase/functions/_shared/member-portal-provisioning.ts';

const A = '20d06ab3-5183-4b0b-b1af-ca009480503b';
const B = 'db75d0c0-ec9c-406e-a386-a690725b654f';

// In-memory model of the tables, RPCs and Auth trigger semantics in
// supabase/migrations/20261120052702_p2_member_portal_provisioning.sql (GoTrue
// writes user_metadata at INSERT; app_metadata only afterwards, unseen by the trigger).
const sha256 = (v) => createHash('sha256').update(v, 'utf8').digest('hex');
function fakeDb({ members = [], authUsers = [], links = [], marker = MEMBER_PORTAL_PROVISIONING_MARKER, createFails = null } = {}) {
  const state = { members, authUsers, links, challenges: [], emailsSent: 0, createCalls: [] };
  let seq = 0;
  const findMember = (id, tenant) => state.members.find(m => m.id === id && m.tenant_id === tenant);

  function table(name) {
    const filters = [];
    let op = 'select';
    let payload = null;
    const rows = () => ({
      members: state.members,
      member_login_challenges: state.challenges,
      member_auth_memberships: state.links,
    })[name];
    const match = row => filters.every(([k, v, kind]) => kind === 'is' ? (row[k] ?? null) === v : row[k] === v);
    const builder = {
      select() { return builder; },
      eq(k, v) { filters.push([k, v, 'eq']); return builder; },
      is(k, v) { filters.push([k, v, 'is']); return builder; },
      insert(value) { op = 'insert'; payload = value; return builder; },
      delete() { op = 'delete'; return builder; },
      async maybeSingle() { return { data: rows().find(match) ?? null, error: null }; },
      async single() {
        if (op === 'insert') {
          const row = { id: `chal-${++seq}`, consumed_at: null, ...payload };
          state.challenges.push(row);
          return { data: { id: row.id }, error: null };
        }
        return { data: rows().find(match) ?? null, error: null };
      },
      then(resolve) {
        if (op === 'delete') {
          const keep = rows().filter(r => !match(r));
          rows().splice(0, rows().length, ...keep);
        }
        resolve({ data: null, error: null });
      },
    };
    return builder;
  }

  function linkExisting({ p_tenant_id, p_member_id, p_auth_user_id }) {
    const member = findMember(p_member_id, p_tenant_id);
    if (!member) return 'member_not_found';
    const user = state.authUsers.find(u => u.id === p_auth_user_id);
    if (!user || user.email.toLowerCase() !== String(member.email).trim().toLowerCase()) return 'email_mismatch';
    const existing = state.links.find(l => l.member_id === p_member_id);
    if (existing) return existing.auth_user_id === p_auth_user_id ? 'already_provisioned' : 'member_linked_to_other_identity';
    if (state.links.some(l => l.auth_user_id === p_auth_user_id && l.tenant_id === p_tenant_id)) return 'identity_linked_to_other_member';
    state.links.push({ auth_user_id: p_auth_user_id, tenant_id: p_tenant_id, member_id: p_member_id });
    return 'provisioned_existing_identity';
  }

  return {
    state,
    async rpc(name, args) {
      if (name === 'member_portal_provisioning_version') {
        return marker ? { data: marker, error: null } : { data: null, error: { code: 'PGRST202' } };
      }
      if (name === 'member_portal_find_auth_user') {
        const u = state.authUsers.find(x => x.email.toLowerCase() === args.p_email.trim().toLowerCase());
        return { data: u ? u.id : null, error: null };
      }
      if (name === 'member_portal_link_existing_identity') return { data: linkExisting(args), error: null };
      throw new Error(`unexpected rpc ${name}`);
    },
    from: table,
    auth: { admin: {
      async createUser(args) {
        state.createCalls.push(args);
        if (createFails) return { data: { user: null }, error: createFails };
        if ('app_metadata' in args) throw new Error('app_metadata is applied after INSERT; the trigger cannot see it');
        if (state.authUsers.some(u => u.email === args.email)) {
          return { data: { user: null }, error: { code: 'email_exists', status: 422, message: 'already registered' } };
        }
        // Trigger semantics: insert-time user_metadata challenge id + secret whose
        // SHA-256 matches the server-stored hash; otherwise fail closed.
        const um = args.user_metadata ?? {};
        const chal = state.challenges.find(c => c.id === um.member_provisioning_challenge_id &&
          !c.consumed_at && c.email_normalized === args.email && c.binding_secret_hash &&
          typeof um.member_provisioning_secret === 'string' &&
          c.binding_secret_hash === sha256(um.member_provisioning_secret));
        if (!chal) return { data: { user: null }, error: { code: 'unexpected_failure', status: 500, message: 'Database error' } };
        const user = { id: `auth-${++seq}`, email: args.email };
        state.authUsers.push(user);
        state.links.push({ auth_user_id: user.id, tenant_id: chal.tenant_id, member_id: chal.member_id });
        chal.consumed_at = 'now';
        return { data: { user }, error: null };
      },
      inviteUserByEmail() { state.emailsSent++; throw new Error('invitations are forbidden by Finding 1'); },
      generateLink() { state.emailsSent++; throw new Error('magic links are forbidden by Finding 1'); },
    } },
  };
}

const member = (id, tenant, email, extra = {}) => ({ id, tenant_id: tenant, email, status: 'inactive', membership_status: 'Pending Approval', ...extra });

test('new member with email is provisioned immediately, with no invitation and regardless of status', async () => {
  const db = fakeDb({ members: [member('m1', A, ' New.Member@Example.Test ')] });
  const result = await provisionMemberPortalAccess(db, A, 'm1');
  assert.deepEqual(result, { ok: true, status: 'provisioned' });
  assert.equal(db.state.emailsSent, 0);
  assert.equal(db.state.authUsers.length, 1);
  assert.deepEqual(db.state.links, [{ auth_user_id: db.state.authUsers[0].id, tenant_id: A, member_id: 'm1' }]);
  assert.equal(db.state.createCalls[0].email, 'new.member@example.test');
  assert.equal(db.state.createCalls[0].email_confirm, true);
  const um = db.state.createCalls[0].user_metadata;
  assert.equal(um.member_provisioning_challenge_id, db.state.challenges[0].id);
  assert.match(um.member_provisioning_secret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(db.state.challenges[0].binding_secret_hash, sha256(um.member_provisioning_secret));
  assert.ok(!('app_metadata' in db.state.createCalls[0]));
  assert.equal(db.state.challenges[0].consumed_at, 'now');
});

test('retry is idempotent: no duplicate identities or associations', async () => {
  const db = fakeDb({ members: [member('m1', A, 'm@example.test')] });
  assert.equal((await provisionMemberPortalAccess(db, A, 'm1')).status, 'provisioned');
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm1'), { ok: true, status: 'already_provisioned' });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm1'), { ok: true, status: 'already_provisioned' });
  assert.equal(db.state.authUsers.length, 1);
  assert.equal(db.state.links.length, 1);
  assert.equal(db.state.createCalls.length, 1);
});

test('existing Auth identity (e.g. staff in another church) is associated, not re-created', async () => {
  const db = fakeDb({ members: [member('m1', B, 'staff@example.test')], authUsers: [{ id: 'auth-staff', email: 'staff@example.test' }] });
  assert.deepEqual(await provisionMemberPortalAccess(db, B, 'm1'), { ok: true, status: 'provisioned_existing_identity' });
  assert.equal(db.state.createCalls.length, 0);
  assert.deepEqual(db.state.links, [{ auth_user_id: 'auth-staff', tenant_id: B, member_id: 'm1' }]);
});

test('never overwrites an existing member-to-identity association', async () => {
  const db = fakeDb({
    members: [member('m1', A, 'm@example.test')],
    authUsers: [{ id: 'auth-new', email: 'm@example.test' }],
    links: [{ auth_user_id: 'auth-old', tenant_id: A, member_id: 'm1' }],
  });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm1'), { ok: false, error: 'member_linked_to_other_identity' });
  assert.deepEqual(db.state.links, [{ auth_user_id: 'auth-old', tenant_id: A, member_id: 'm1' }]);
});

test('identity already used by another member of the same church is refused', async () => {
  const db = fakeDb({
    members: [member('m1', A, 'family@example.test'), member('m2', A, 'family@example.test')],
    authUsers: [{ id: 'auth-f', email: 'family@example.test' }],
    links: [{ auth_user_id: 'auth-f', tenant_id: A, member_id: 'm1' }],
  });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm2'), { ok: false, error: 'identity_linked_to_other_member' });
  assert.equal(db.state.links.length, 1);
});

test('cross-tenant: a Church A member id cannot be provisioned under Church B', async () => {
  const db = fakeDb({ members: [member('m1', A, 'm@example.test')] });
  assert.deepEqual(await provisionMemberPortalAccess(db, B, 'm1'), { ok: false, error: 'member_not_found' });
  assert.equal(db.state.createCalls.length, 0);
  assert.equal(db.state.links.length, 0);
});

test('member without email or with invalid email is reported, not silently skipped', async () => {
  const db = fakeDb({ members: [member('m1', A, null), member('m2', A, 'not-an-email')] });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm1'), { ok: false, error: 'member_email_missing' });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm2'), { ok: false, error: 'invalid_member_email' });
});

test('missing database patch marker fails closed before creating anything', async () => {
  const db = fakeDb({ members: [member('m1', A, 'm@example.test')], marker: null });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm1'), { ok: false, error: 'provisioning_unavailable' });
  assert.equal(db.state.createCalls.length, 0);
  assert.equal(db.state.challenges.length, 0);
});

test('Auth creation failure keeps member record and removes the unused challenge', async () => {
  const db = fakeDb({ members: [member('m1', A, 'm@example.test')], createFails: { code: 'unexpected_failure', status: 500, message: 'boom' } });
  assert.deepEqual(await provisionMemberPortalAccess(db, A, 'm1'), { ok: false, error: 'identity_creation_failed' });
  assert.equal(db.state.members.length, 1);
  assert.equal(db.state.challenges.length, 0);
  assert.equal(db.state.links.length, 0);
});
