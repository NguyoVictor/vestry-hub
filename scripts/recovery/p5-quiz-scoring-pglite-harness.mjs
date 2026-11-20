/**
 * Phase 5: quiz scoring moved server-side. Runs the REAL trigger/constraint SQL
 * from migration 20261120200000 on in-process Postgres (PGlite), no network.
 *   PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node --test scripts/recovery/p5-quiz-scoring-pglite-harness.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const mig = readFileSync(new URL('../../supabase/migrations/20261120200000_p5_close_remaining_loopholes.sql', import.meta.url), 'utf8');
const quizPart = mig.slice(mig.indexOf('CREATE OR REPLACE FUNCTION private.quiz_apply_answer_score()'), mig.indexOf('DROP POLICY IF EXISTS quiz_answers_p5_insert'));

async function db() {
  const d = new PGlite();
  await d.exec(`create role anon; create role authenticated; create schema private;
    create table public.quiz_sessions (id uuid primary key default gen_random_uuid());
    create table public.quiz_participants (id uuid primary key default gen_random_uuid(), session_id uuid, score int default 0, coins int default 0, streak int default 0);
    create table public.quiz_answers (id uuid primary key default gen_random_uuid(), session_id uuid, participant_id uuid, question_index int, is_correct boolean, points_earned int);
    insert into public.quiz_sessions (id) values ('00000000-0000-0000-0000-000000000001');
    insert into public.quiz_participants (id, session_id) values ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000001');`);
  await d.exec(quizPart);
  return d;
}
const P = "'00000000-0000-0000-0000-0000000000aa'";
const ans = (q, ok, pts) => `insert into public.quiz_answers (session_id, participant_id, question_index, is_correct, points_earned) values ('00000000-0000-0000-0000-000000000001', ${P}, ${q}, ${ok}, ${pts})`;
const row = async (d) => (await d.query(`select score, coins, streak from public.quiz_participants where id = ${P}`)).rows[0];

test('score, coins and streak are derived from answers', async () => {
  const d = await db();
  await d.exec(ans(0, true, 950)); await d.exec(ans(1, true, 400));
  assert.deepEqual(await row(d), { score: 1350, coins: 13, streak: 2 });
  await d.exec(ans(2, false, 0));
  assert.deepEqual(await row(d), { score: 1350, coins: 13, streak: 0 });
});
test('one answer per player per question', async () => {
  const d = await db(); await d.exec(ans(0, true, 500));
  await assert.rejects(d.exec(ans(0, true, 500)));
  assert.equal((await row(d)).score, 500);
});
test('points per answer are capped', async () => {
  const d = await db();
  await assert.rejects(d.exec(ans(0, true, 999999)));
  await assert.rejects(d.exec(ans(1, true, -5)));
  assert.equal((await row(d)).score, 0);
});
test('scoring function is not callable by clients', async () => {
  const d = await db();
  const r = await d.query(`select has_function_privilege('anon','private.quiz_apply_answer_score()','execute') a, has_function_privilege('authenticated','private.quiz_apply_answer_score()','execute') b`);
  assert.deepEqual(r.rows[0], { a: false, b: false });
});
