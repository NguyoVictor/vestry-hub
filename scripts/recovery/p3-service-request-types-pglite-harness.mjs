/**
 * Phase 3 F8 harness — in-process Postgres (PGlite), NO network. Applies the
 * real migration 20261120100000 to a stub schema and checks: backfill only for
 * tenants with zero types, new tenants seeded by trigger, idempotent re-run,
 * curated lists untouched, seeding failure never blocks tenant creation,
 * functions not executable by anon/authenticated, and the SQL defaults match
 * DEFAULTS in src/pages/settings/ServiceRequestTypes.tsx.
 *
 *   npm install --prefix /some/scratch @electric-sql/pglite@0.2.17
 *   PGLITE_MODULE=/some/scratch/node_modules/@electric-sql/pglite/dist/index.js \
 *     node --test scripts/recovery/p3-service-request-types-pglite-harness.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to a local @electric-sql/pglite dist/index.js');
const { PGlite } = await import(pathToFileURL(modulePath).href);

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const MIGRATION = read('supabase/migrations/20261120100000_p3_seed_default_service_request_types.sql');
const UI = read('src/pages/settings/ServiceRequestTypes.tsx');

const STUB = `
create role anon; create role authenticated;
create table public.tenants (id varchar primary key, name text, church_code text);
create function public.set_church_code() returns trigger language plpgsql as $$
begin new.church_code := coalesce(new.church_code, 'CODE-' || new.id); return new; end $$;
create trigger auto_generate_church_code before insert on public.tenants
  for each row execute function public.set_church_code();
create table public.service_request_types (
  id text primary key default gen_random_uuid()::text, tenant_id text not null,
  label text not null, internal_name text not null, description text,
  is_active boolean not null default true, is_default boolean not null default false,
  sort_order integer not null default 0, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (tenant_id, internal_name));
`;

async function fresh() {
  const db = new PGlite();
  await db.exec(STUB);
  await db.exec(`insert into public.tenants (id, name) values ('empty-1','Empty 1'), ('empty-2','Empty 2'), ('curated','Curated');
    insert into public.service_request_types (tenant_id, label, internal_name, sort_order)
      values ('curated','Our Own Type','our_own_type',0);`);
  await db.exec(MIGRATION);
  return db;
}
const count = async (db, t) => Number((await db.query(
  'select count(*)::int n from public.service_request_types where tenant_id = $1', [t])).rows[0].n);

test('backfill seeds 15 defaults only for tenants that had zero types', async () => {
  const db = await fresh();
  assert.equal(await count(db, 'empty-1'), 15);
  assert.equal(await count(db, 'empty-2'), 15);
  assert.equal(await count(db, 'curated'), 1, 'curated church list must be untouched');
});

test('a newly created church is seeded by the trigger', async () => {
  const db = await fresh();
  await db.exec(`insert into public.tenants (id, name) values ('new-church','New')`);
  assert.equal(await count(db, 'new-church'), 15);
  const r = await db.query(`select bool_and(is_active and is_default) ok, min(sort_order) mn, max(sort_order) mx
    from public.service_request_types where tenant_id='new-church'`);
  assert.deepEqual(r.rows[0], { ok: true, mn: 0, mx: 14 });
});

test('re-running the migration is idempotent and never duplicates or overwrites', async () => {
  const db = await fresh();
  await db.exec(`update public.service_request_types set label='Renamed' where tenant_id='empty-1' and internal_name='general'`);
  await db.exec(MIGRATION);
  assert.equal(await count(db, 'empty-1'), 15);
  const r = await db.query(`select label from public.service_request_types where tenant_id='empty-1' and internal_name='general'`);
  assert.equal(r.rows[0].label, 'Renamed');
});

test('a seeding failure does not block church creation', async () => {
  const db = await fresh();
  await db.exec(`alter table public.service_request_types add constraint block_seed check (tenant_id <> 'doomed')`);
  await db.exec(`insert into public.tenants (id, name) values ('doomed','Doomed')`);
  const t = await db.query(`select church_code from public.tenants where id='doomed'`);
  assert.equal(t.rows.length, 1, 'tenant must still be created');
  assert.equal(t.rows[0].church_code, 'CODE-doomed', 'existing BEFORE INSERT trigger still runs');
  assert.equal(await count(db, 'doomed'), 0);
});

test('seed functions are not executable by anon or authenticated', async () => {
  const db = await fresh();
  const r = await db.query(`select
    has_function_privilege('anon', 'private.seed_default_service_request_types(text)', 'execute') a1,
    has_function_privilege('authenticated', 'private.seed_default_service_request_types(text)', 'execute') a2,
    has_function_privilege('anon', 'private.tenants_seed_service_request_types()', 'execute') a3,
    has_function_privilege('authenticated', 'private.tenants_seed_service_request_types()', 'execute') a4`);
  assert.deepEqual(r.rows[0], { a1: false, a2: false, a3: false, a4: false });
});

test('SQL defaults match the UI DEFAULTS list exactly', () => {
  const ui = [...UI.matchAll(/\{ label: "([^"]+)",\s*internal_name: "([^"]+)",\s*description: "([^"]+)",\s*sort_order: (\d+) \}/g)]
    .map(m => [m[1], m[2], m[3], Number(m[4])]);
  const sql = [...MIGRATION.matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+)\)/g)]
    .map(m => [m[1], m[2], m[3], Number(m[4])]);
  assert.equal(ui.length, 15);
  assert.deepEqual(sql, ui);
});
