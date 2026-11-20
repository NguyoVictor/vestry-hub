/**
 * Phase 2 (Finding 1) behavioral harness — in-process Postgres (PGlite), NO
 * network, NO Supabase project. Replays the real SQL chain on a stub schema:
 *   pre-1B.2 trigger -> 20261119101722 (staff V1) -> 20261120043624 (staff V2)
 *   -> 20261120052702 (member portal provisioning)
 * and simulates GoTrue's real admin createUser order: auth.users INSERT carries
 * user_metadata; app_metadata / email_confirm arrive only in a later UPDATE.
 *
 *   npm install --prefix /some/scratch @electric-sql/pglite@0.2.17
 *   PGLITE_MODULE=/some/scratch/node_modules/@electric-sql/pglite/dist/index.js \
 *     node --test scripts/recovery/p2-member-provisioning-pglite-harness.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to a local @electric-sql/pglite dist/index.js');
const { PGlite } = await import(pathToFileURL(modulePath).href);

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const PRE = read('docs/recovery/rollback/20261119_pre_p1b2_handle_new_user.sql');
const V1 = read('supabase/migrations/20261119101722_p1b2_staff_invite_handshake.sql');
const V2 = read('supabase/migrations/20261120043624_p1b2_staff_invite_insert_binding.sql');
const P2 = read('supabase/migrations/20261120052702_p2_member_portal_provisioning.sql');

const A = '20d06ab3-5183-4b0b-b1af-ca009480503b';
const B = 'db75d0c0-ec9c-406e-a386-a690725b654f';

const STUB = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text, invited_at timestamptz,
  email_confirmed_at timestamptz, deleted_at timestamptz, created_at timestamptz default now(),
  raw_app_meta_data jsonb default '{}'::jsonb, raw_user_meta_data jsonb default '{}'::jsonb);
create table public.tenants (id varchar primary key, slug text, name text, church_code text,
  subscription_plan text, subscription_tier text, subscription_status text,
  onboarding_completed boolean, onboarding_step int, created_at timestamptz, updated_at timestamptz);
create table public.users (id varchar primary key, tenant_id varchar references public.tenants(id),
  email text, first_name text, last_name text, role text, status text, is_super_admin boolean,
  avatar_url text, join_date date, created_at timestamptz, updated_at timestamptz,
  email_verified boolean, invitation_sent boolean default false);
create table public.members (id varchar primary key, tenant_id varchar references public.tenants(id),
  email text, registration_source text);
create table public.staff_invitations (id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id), email varchar not null, role varchar not null,
  first_name varchar, last_name varchar, auth_user_id varchar,
  expires_at timestamptz not null default (now() + interval '24 hours'), consumed_at timestamptz);
create table public.member_login_challenges (id uuid primary key default gen_random_uuid(),
  tenant_id varchar not null, member_id varchar not null, email_normalized text not null,
  created_at timestamptz default now(), expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz, request_count integer default 1);
create table public.member_auth_memberships (id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id), tenant_id varchar not null,
  member_id varchar not null references public.members(id), created_at timestamptz default now(),
  last_used_at timestamptz, unique (member_id), unique (auth_user_id, tenant_id, member_id));
insert into public.tenants(id, name) values ('${A}', 'Church A'), ('${B}', 'Church B');
insert into public.members(id, tenant_id, email) values
  ('mA1', '${A}', 'Ann@Example.test'), ('mA2', '${A}', 'ann@example.test'),
  ('mB1', '${B}', 'ann@example.test'), ('mA3', '${A}', 'bob@example.test');
`;

const hash = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const secret = () => randomBytes(32).toString('base64url');

async function freshDb({ applyP2 = true } = {}) {
  const db = new PGlite();
  await db.exec(STUB);
  await db.exec(PRE);
  await db.exec('create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();');
  await db.exec(V1);
  await db.exec(V2);
  if (applyP2) await db.exec(P2);
  return db;
}
const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const counts = (db) => one(db, `select (select count(*)::int from public.tenants) tenants,
  (select count(*)::int from public.users) users, (select count(*)::int from auth.users) auth_users,
  (select count(*)::int from public.member_auth_memberships) links`);

async function challenge(db, { tenant = A, member = 'mA1', email = 'ann@example.test', s = secret(), expired = false } = {}) {
  const { rows: [{ id }] } = await db.query(
    `insert into public.member_login_challenges(tenant_id, member_id, email_normalized, binding_secret_hash, expires_at)
     values ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval) returning id`,
    [tenant, member, email, s === null ? null : hash(s), expired ? '-1' : '10']);
  return { id, s };
}
// GoTrue adminUserCreate: INSERT with user_metadata; app_metadata applied after.
async function adminCreate(db, email, userMeta = {}, appMeta = null) {
  const { rows: [{ id }] } = await db.query(
    `insert into auth.users(email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, JSON.stringify(userMeta)]);
  if (appMeta) await db.query(`update auth.users set raw_app_meta_data = raw_app_meta_data || $2::jsonb,
    email_confirmed_at = now() where id = $1`, [id, JSON.stringify(appMeta)]);
  return id;
}
const meta = (c) => ({ member_provisioning_challenge_id: c.id, member_provisioning_secret: c.s });

test('bound member identity links atomically: no church, no staff profile, challenge consumed', async () => {
  const db = await freshDb();
  const c = await challenge(db);
  const id = await adminCreate(db, 'ann@example.test', meta(c));
  const link = await one(db, 'select auth_user_id, tenant_id from public.member_auth_memberships where member_id = $1', ['mA1']);
  assert.deepEqual(link, { auth_user_id: id, tenant_id: A });
  assert.equal((await one(db, 'select consumed_at is not null c from public.member_login_challenges where id = $1', [c.id])).c, true);
  assert.deepEqual(await counts(db), { tenants: 2, users: 0, auth_users: 1, links: 1 });
});

test('draft design reproduced: app_metadata-only binding never reached the trigger (would create a church)', async () => {
  const db = await freshDb({ applyP2: false });
  await adminCreate(db, 'ann@example.test', {}, { member_provisioning_challenge_id: '00000000-0000-0000-0000-000000000000' });
  const c = await counts(db);
  assert.equal(c.tenants, 3, 'old order falls through to new-church branch');
  assert.equal((await one(db, `select role from public.users`)).role, 'super_admin');
});

test('self-signup with a challenge id but no/wrong secret fails closed', async () => {
  const db = await freshDb();
  const c = await challenge(db);
  await assert.rejects(adminCreate(db, 'ann@example.test', { member_provisioning_challenge_id: c.id }), /member provisioning challenge/);
  await assert.rejects(adminCreate(db, 'ann@example.test', { ...meta(c), member_provisioning_secret: secret() }), /member provisioning challenge/);
  await assert.rejects(adminCreate(db, 'ann@example.test', { member_provisioning_challenge_id: 'not-a-uuid' }), /Invalid member provisioning/);
  assert.deepEqual(await counts(db), { tenants: 2, users: 0, auth_users: 0, links: 0 });
});

test('expired, consumed and hashless (OTP-login) challenges cannot provision', async () => {
  const db = await freshDb();
  const expired = await challenge(db, { expired: true });
  await assert.rejects(adminCreate(db, 'ann@example.test', meta(expired)), /expired member provisioning/);
  const loginOnly = await challenge(db, { s: null });
  await assert.rejects(adminCreate(db, 'ann@example.test', { member_provisioning_challenge_id: loginOnly.id, member_provisioning_secret: secret() }), /expired member provisioning/);
  const c = await challenge(db, { member: 'mA3', email: 'bob@example.test' });
  await adminCreate(db, 'bob@example.test', meta(c));
  await assert.rejects(adminCreate(db, 'bob2@example.test', meta(c)), /expired member provisioning/);
  assert.equal((await counts(db)).tenants, 2);
});

test('email must match both the challenge and the member record', async () => {
  const db = await freshDb();
  const c = await challenge(db, { email: 'ann@example.test' });
  await assert.rejects(adminCreate(db, 'mallory@example.test', meta(c)), /expired member provisioning/);
  const forged = await challenge(db, { member: 'mA3', email: 'ann@example.test' });
  await assert.rejects(adminCreate(db, 'ann@example.test', meta(forged)), /does not match the member/);
});

test('never overwrites an existing member link', async () => {
  const db = await freshDb();
  const first = await challenge(db);
  const id = await adminCreate(db, 'ann@example.test', meta(first));
  await db.query('delete from auth.users where id <> $1', [id]);
  const second = await challenge(db);
  await assert.rejects(adminCreate(db, 'ANN@example.test', meta(second)), /already linked/);
  assert.equal((await one(db, 'select auth_user_id from public.member_auth_memberships where member_id = $1', ['mA1'])).auth_user_id, id);
});

test('legacy member_login_challenge_id metadata no longer links or overwrites', async () => {
  const db = await freshDb();
  const c = await challenge(db, { s: null });
  await adminCreate(db, 'ann@example.test', { member_login_challenge_id: c.id });
  assert.equal((await counts(db)).links, 0, 'legacy key ignored (ordinary signup path)');
});

test('staff V2 invite and ordinary signup still behave exactly as before', async () => {
  const db = await freshDb();
  const n = secret();
  await db.query(`insert into public.staff_invitations(tenant_id,email,role,binding_nonce_hash) values ($1,'staff@example.test','staff',$2)`, [B, hash(n)]);
  const sid = await adminCreate(db, 'staff@example.test', { staff_invitation_nonce: n });
  assert.deepEqual(await one(db, 'select tenant_id, role from public.users where id = $1', [String(sid)]), { tenant_id: B, role: 'staff' });
  await assert.rejects(adminCreate(db, 'x@example.test', { staff_invitation_nonce: n }), /not bound/);
  const fid = await adminCreate(db, 'founder@example.test', { full_name: 'New Founder' });
  assert.equal((await one(db, 'select role from public.users where id = $1', [String(fid)])).role, 'super_admin');
});

test('link_existing_identity: statuses, tenant scoping and one member per identity per church', async () => {
  const db = await freshDb();
  const ann = await adminCreate(db, 'ann@example.test', { full_name: 'Ann Founder' }); // existing identity elsewhere
  const link = async (t, m, u) => (await one(db, 'select public.member_portal_link_existing_identity($1,$2,$3) s', [t, m, u])).s;
  assert.equal(await link(A, 'mA1', ann), 'provisioned_existing_identity');
  assert.equal(await link(A, 'mA1', ann), 'already_provisioned');
  assert.equal(await link(A, 'mA2', ann), 'identity_linked_to_other_member');
  assert.equal(await link(B, 'mB1', ann), 'provisioned_existing_identity', 'same email in another church is allowed');
  assert.equal(await link(B, 'mA3', ann), 'member_not_found', 'member of another tenant is invisible');
  const bob = await adminCreate(db, 'bob@example.test', {});
  assert.equal(await link(A, 'mA1', bob), 'email_mismatch');
  await assert.rejects(db.query(`insert into public.member_auth_memberships(auth_user_id,tenant_id,member_id) values ($1,$2,'mA2')`, [ann, A]),
    /one_member_per_identity_tenant/);
});

test('migration is guarded: refuses re-application and refuses a pre-V2 trigger', async () => {
  const db = await freshDb();
  await assert.rejects(db.exec(P2), /already present/);
  const v1only = new PGlite();
  await v1only.exec(STUB); await v1only.exec(PRE); await v1only.exec(V1);
  await assert.rejects(v1only.exec(P2), /Staff handshake V2 not present/);
});

test('helpers are service-role only; registration_source import accepted; secret hash format enforced', async () => {
  const db = await freshDb();
  for (const fn of ['public.member_portal_find_auth_user(text)', 'public.member_portal_link_existing_identity(text,text,uuid)', 'public.member_portal_provisioning_version()']) {
    const g = await one(db, `select has_function_privilege('anon',$1,'EXECUTE') a, has_function_privilege('authenticated',$1,'EXECUTE') u,
      has_function_privilege('service_role',$1,'EXECUTE') s`, [fn]);
    assert.deepEqual(g, { a: false, u: false, s: true }, fn);
  }
  await db.query(`update public.members set registration_source = 'import' where id = 'mA3'`);
  await assert.rejects(db.query(`update public.members set registration_source = 'bogus' where id = 'mA3'`), /registration_source_check/);
  await assert.rejects(db.query(`insert into public.member_login_challenges(tenant_id,member_id,email_normalized,binding_secret_hash) values ($1,'mA1','ann@example.test','zz')`, [A]), /binding_secret_hash_format/);
  assert.equal((await one(db, 'select public.member_portal_provisioning_version() v')).v, 'MEMBER_PORTAL_PROVISIONING_V1');
});
