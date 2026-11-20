import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countErrors, compare } from './typecheck-ratchet.mjs';

const out = [
  'src/a.tsx(1,2): error TS2339: x',
  'src/a.tsx(3,4): error TS2322: y',
  'src/b.ts(9,9): error TS2304: Cannot find name',
  'some unrelated line',
].join('\n');

test('counts errors per file', () => {
  assert.deepEqual(countErrors(out), { 'src/a.tsx': 2, 'src/b.ts': 1 });
});

test('fails on a new error in a known file or a new file', () => {
  assert.equal(compare({ 'src/a.tsx': 3 }, { 'src/a.tsx': 2 }).regressions.length, 1);
  assert.equal(compare({ 'src/new.ts': 1 }, {}).regressions.length, 1);
});

test('passes when equal or improved, and reports improvements', () => {
  const r = compare({ 'src/a.tsx': 1 }, { 'src/a.tsx': 2, 'src/b.ts': 1 });
  assert.equal(r.regressions.length, 0);
  assert.equal(r.improvements.length, 2);
});
