/**
 * Phase 1B.2 V2 behavioral harness — in-process Postgres (PGlite), NO network,
 * NO Supabase project. Replays the real SQL chain on a minimal stub schema:
 *   pre-1B.2 trigger (docs/recovery/rollback) -> 20261119101722 (V1, applied on
 *   staging) -> 20261120043624 (V2), then simulates GoTrue's real insert order
 *   (auth.users INSERT with invited_at NULL; invite data in raw_user_meta_data).
 *
 * Usage (PGlite is not a project dependency; install it outside the repo):
 *   npm install --prefix /some/scratch @electric-sql/pglite@0.2.17
 *   PGLITE_MODULE=/some/scratch/node_modules/@electric-sql/pglite/dist/index.js \
 *     node --test scripts/recovery/p1b2-staff-binding-pglite-harness.mjs
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

const A = '20d06ab3-5183-4b0b-b1af-ca009480503b';
const B = 'db75d0c0-ec9c-406e-a386-a690725b654f';

const STUB = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text, invited_at timestamptz,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb);
create table public.tenants (id varchar primary key, slug text, name text, church_code text,
  subscription_plan text, subscription_tier text, subscription_status text,
  onboarding_completed boolean, onboarding_step int, created_at timestamptz, updated_at timestamptz);
create table public.users (id varchar primary key, tenant_id varchar references public.tenants(id),
  email text, first_name text, last_name text, role text, status text, is_super_admin boolean,
  avatar_url text, join_date date, created_at timestamptz, updated_at timestamptz,
  email_verified boolean, invitation_sent boolean default false);
create table public.members (id varchar primary key, tenant_id varchar);
create table public.staff_invitations (id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id), email varchar not null, role varchar not null,
  first_name varchar, last_name varchar, auth_user_id varchar,
  expires_at timestamptz not null default (now() + interval '24 hours'), consumed_at timestamptz);
create table public.member_login_challenges (id uuid primary key default gen_random_uuid(),
  tenant_id varchar, member_id varchar, email_normalized text, expires_at timestamptz);
create table public.member_auth_memberships (auth_user_id uuid, tenant_id varchar,
  member_id varchar unique, last_used_at timestamptz);
insert into public.tenants(id, name) values ('${A}', 'Church A'), ('${B}', 'Church B');
`;

const hash = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const nonce = () => randomBytes(32).toString('base64url');

async function freshDb({ applyV2 = true } = {}) {
  const db = new PGlite();
  await db.exec(STUB);
  await db.exec(PRE);
  await db.exec('create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();');
  await db.exec(V1);
  if (applyV2) await db.exec(V2);
  return db;
}
const one = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const counts = (db) => one(db, `select (select count(*)::int from public.tenants) tenants,
  (select count(*)::int from public.users) users, (select count(*)::int from auth.users) auth_users`);

async function invite(db, email, tenant, n) {
  await db.query(`insert into public.staff_invitations(tenant_id,email,role,first_name,last_name,binding_nonce_hash)
    values ($1,$2,'staff','Ada','Canary',$3)`, [tenant, email, n === null ? null : hash(n)]);
}
// GoTrue order: INSERT with invited_at NULL and invite data in raw_user_meta_data.
const goTrueInsert = (db, email, meta = {}) => db.query(
  `insert into auth.users(email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
  [email, JSON.stringify(meta)]);

test('V2 bound invite (invited_at NULL at insert) creates staff profile in the invited church', async () => {
  const db = await freshDb();
  const before = await counts(db);
  const n = nonce();
  await invite(db, 'Canary.A@Example.test', A, n);
  const { rows: [{ id }] } = await goTrueInsert(db, 'canary.a@example.test', { first_name: 'Ada', staff_invitation_nonce: n });
  const p = await one(db, 'select tenant_id, role, status, invitation_sent from public.users where id = $1', [String(id)]);
  assert.deepEqual(p, { tenant_id: A, role: 'staff', status: 'active', invitation_sent: true });
  const si = await one(db, 'select auth_user_id, consumed_at is not null consumed from public.staff_invitations');
  assert.equal(si.auth_user_id, String(id)); assert.equal(si.consumed, true);
  const after = await counts(db);
  assert.equal(after.tenants, before.tenants, 'no new tenant');
  assert.equal(after.users, before.users + 1);
});

test('V1 (currently on staging) rejects the same real invite — reproduces the bug', async () => {
  const db = await freshDb({ applyV2: false });
  await db.query(`insert into public.staff_invitations(tenant_id,email,role) values ($1,'x@example.test','staff')`, [A]);
  await assert.rejects(goTrueInsert(db, 'x@example.test', {}), /must be accepted through Auth invite/);
  assert.equal((await counts(db)).auth_users, 0);
});

test('self-signup for an email with a pending invite (no secret) fails closed', async () => {
  const db = await freshDb();
  await invite(db, 'victim@example.test', A, nonce());
  await assert.rejects(goTrueInsert(db, 'victim@example.test', { full_name: 'Mallory' }), /bound Auth invite/);
  const c = await counts(db);
  assert.deepEqual([c.tenants, c.users, c.auth_users], [2, 0, 0]);
});

test('wrong secret, and secret for another email, are rejected', async () => {
  const db = await freshDb();
  const n = nonce();
  await invite(db, 'a@example.test', A, n);
  await assert.rejects(goTrueInsert(db, 'a@example.test', { staff_invitation_nonce: nonce() }), /bound Auth invite/);
  await assert.rejects(goTrueInsert(db, 'other@example.test', { staff_invitation_nonce: n }), /not bound/);
  assert.equal((await counts(db)).users, 0);
});

test('legacy pending row without a hash cannot be claimed', async () => {
  const db = await freshDb();
  await invite(db, 'legacy@example.test', A, null);
  await assert.rejects(goTrueInsert(db, 'legacy@example.test', { staff_invitation_nonce: nonce() }), /bound Auth invite/);
});

test('expired or consumed invitation with a secret never falls through to new-church creation', async () => {
  const db = await freshDb();
  const n = nonce();
  await db.query(`insert into public.staff_invitations(tenant_id,email,role,binding_nonce_hash,expires_at)
    values ($1,'late@example.test','staff',$2, now() - interval '1 minute')`, [A, hash(n)]);
  await assert.rejects(goTrueInsert(db, 'late@example.test', { staff_invitation_nonce: n }), /not bound/);
  assert.equal((await counts(db)).tenants, 2);
});

test('ambiguous duplicate pending invitations still fail closed', async () => {
  const db = await freshDb();
  const n = nonce();
  await invite(db, 'dup@example.test', A, n);
  await invite(db, 'dup@example.test', B, n);
  await assert.rejects(goTrueInsert(db, 'dup@example.test', { staff_invitation_nonce: n }), /Multiple pending/);
});

test('tenant comes from the server row only, never from user metadata', async () => {
  const db = await freshDb();
  const n = nonce();
  await invite(db, 'b@example.test', B, n);
  const { rows: [{ id }] } = await goTrueInsert(db, 'b@example.test',
    { staff_invitation_nonce: n, tenant_id: A, role: 'super_admin' });
  const p = await one(db, 'select tenant_id, role from public.users where id = $1', [String(id)]);
  assert.deepEqual(p, { tenant_id: B, role: 'staff' });
});

test('ordinary signup without any invitation keeps the existing new-church behavior', async () => {
  const db = await freshDb();
  const { rows: [{ id }] } = await goTrueInsert(db, 'founder@example.test', { full_name: 'New Founder' });
  const p = await one(db, 'select role from public.users where id = $1', [String(id)]);
  assert.equal(p.role, 'super_admin');
  assert.equal((await counts(db)).tenants, 3);
});

test('migration is guarded: refuses re-application and refuses a non-V1 trigger', async () => {
  const db = await freshDb();
  await assert.rejects(db.exec(V2), /V2 already present/);
  const pre = new PGlite();
  await pre.exec(STUB); await pre.exec(PRE);
  await assert.rejects(pre.exec(V2), /V1 staff invitation handshake not present/);
});

test('marker reports version 2 and is service-role only', async () => {
  const db = await freshDb();
  assert.equal((await one(db, 'select public.staff_invitation_handshake_version() v')).v, 2);
  const g = await one(db, `select has_function_privilege('anon','public.staff_invitation_handshake_version()','EXECUTE') a,
    has_function_privilege('authenticated','public.staff_invitation_handshake_version()','EXECUTE') u,
    has_function_privilege('service_role','public.staff_invitation_handshake_version()','EXECUTE') s`);
  assert.deepEqual(g, { a: false, u: false, s: true });
});

test('hash format constraint rejects non-hex digests', async () => {
  const db = await freshDb();
  await assert.rejects(db.query(`insert into public.staff_invitations(tenant_id,email,role,binding_nonce_hash)
    values ($1,'z@example.test','staff','not-a-hash')`, [A]), /binding_nonce_hash_format/);
});
