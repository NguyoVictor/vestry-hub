/**
 * Phase 10 budget utilisation harness — REAL SQL from migration 20261120240000
 * (expenditure guard, line recalc, expense sync, audit) on PGlite. No network.
 *   PGLITE_MODULE=.../@electric-sql/pglite/dist/index.js node --test scripts/recovery/p10-budget-pglite-harness.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const mig = readFileSync(new URL('../../supabase/migrations/20261120240000_p10_budget_utilisation_tax_payroll.sql', import.meta.url), 'utf8');
const part = mig.slice(mig.indexOf('CREATE TABLE IF NOT EXISTS public.budget_expenditures'), mig.indexOf('-- ── Finding 27: tax rates'));

async function db() {
  const d = new PGlite();
  await d.exec(`create role anon; create role authenticated; create schema private; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select '00000000-0000-0000-0000-0000000000aa'::uuid $$;
    create table public.tenants (id varchar primary key);
    create table public.budgets (id varchar primary key, tenant_id varchar references public.tenants(id), name text);
    create table public.budget_categories (id varchar primary key, budget_id varchar references public.budgets(id), category text, allocated_amount numeric, spent_amount numeric default 0);
    create table public.expenses (id varchar primary key, tenant_id varchar, title text, description text, amount numeric, expense_date date,
      approval_status varchar default 'pending', approved_by varchar, payment_reference varchar, budget_category_id varchar);
    insert into public.tenants values ('A'),('B');
    insert into public.budgets values ('bA','A','2026'),('bB','B','2026');
    insert into public.budget_categories (id,budget_id,category,allocated_amount) values ('lA1','bA','utilities',1000),('lA2','bA','rent',500),('lB1','bB','utilities',800);`);
  await d.exec(part);
  return d;
}
const spent = async (d, l) => Number((await d.query(`select spent_amount from public.budget_categories where id='${l}'`)).rows[0].spent_amount);
const exp = (amt, line='lA1', b='bA', t='A') => `insert into public.budget_expenditures (tenant_id,budget_id,budget_category_id,amount,description) values ('${t}','${b}','${line}',${amt},'x') returning id`;

test('manual expenditure updates spent; reversal restores it; facts cannot be edited', async () => {
  const d = await db();
  const id = (await d.query(exp(350))).rows[0].id;
  assert.equal(await spent(d, 'lA1'), 350);
  await assert.rejects(d.exec(`update public.budget_expenditures set amount=1 where id='${id}'`));
  await assert.rejects(d.exec(`update public.budget_expenditures set reversed_at=now() where id='${id}'`), 'reason required');
  await d.exec(`update public.budget_expenditures set reversed_at=now(), reversal_reason='typo' where id='${id}'`);
  assert.equal(await spent(d, 'lA1'), 0);
  await assert.rejects(d.exec(`update public.budget_expenditures set reversed_at=now(), reversal_reason='again' where id='${id}'`));
});
test('cannot book against another church budget or a line of another budget; amount must be positive', async () => {
  const d = await db();
  await assert.rejects(d.query(exp(10, 'lB1', 'bB', 'A')));
  await assert.rejects(d.query(exp(10, 'lA2', 'bB', 'B')));
  await assert.rejects(d.query(exp(0)));
});
test('approved expense counts once; un-approve reverses; re-approve counts again; re-link moves it', async () => {
  const d = await db();
  await d.exec(`insert into public.expenses (id,tenant_id,title,amount,budget_category_id) values ('e1','A','Power bill',200,'lA1')`);
  assert.equal(await spent(d, 'lA1'), 0, 'pending does not count');
  await d.exec(`update public.expenses set approval_status='approved' where id='e1'`);
  assert.equal(await spent(d, 'lA1'), 200);
  await d.exec(`update public.expenses set amount=200 where id='e1'`); // re-trigger, no duplicate
  assert.equal(await spent(d, 'lA1'), 200);
  await assert.rejects(d.exec(`insert into public.budget_expenditures (tenant_id,budget_id,budget_category_id,amount,description,source_type,source_id) values ('A','bA','lA1',200,'dup','expense','e1')`), 'no double count');
  await d.exec(`update public.expenses set approval_status='rejected' where id='e1'`);
  assert.equal(await spent(d, 'lA1'), 0);
  await d.exec(`update public.expenses set approval_status='approved' where id='e1'`);
  assert.equal(await spent(d, 'lA1'), 200);
  await d.exec(`update public.expenses set budget_category_id='lA2' where id='e1'`);
  assert.equal(await spent(d, 'lA1'), 0); assert.equal(await spent(d, 'lA2'), 200);
  const rows = (await d.query(`select count(*)::int n, count(*) filter (where reversed_at is null)::int active from public.budget_expenditures where source_id='e1'`)).rows[0];
  assert.deepEqual(rows, { n: 3, active: 1 }, 'history kept (approve, re-approve, re-link), one active');
});
test('audit trail records budget, line and expenditure changes', async () => {
  const d = await db();
  await d.exec(`update public.budgets set name='2026 v2' where id='bA'; update public.budget_categories set allocated_amount=1200 where id='lA1';`);
  await d.query(exp(5));
  const r = (await d.query(`select entity, action from public.budget_audit_log where tenant_id='A' order by changed_at, entity`)).rows.map(x => `${x.entity}:${x.action}`);
  for (const e of ['budgets:update', 'budget_categories:update', 'budget_expenditures:insert']) assert.ok(r.includes(e), e);
});
