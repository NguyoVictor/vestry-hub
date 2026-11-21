// node --experimental-strip-types --test scripts/recovery/intasend.node.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKenyanPhone, validateAmount, mapState, challengeMatches, nextStatus, amountMatches } from '../../supabase/functions/_shared/intasend.ts';
test('phone normalisation', () => {
  for (const [i, o] of [['0712345678','254712345678'],['0112345678','254112345678'],['254712345678','254712345678'],['+254 712 345 678','254712345678'],['712345678','254712345678']]) assert.equal(normalizeKenyanPhone(i), o, i);
  for (const i of ['0812345678','25471234567','abc','',null,'+1 202 555 0100','0712-34-567']) assert.equal(normalizeKenyanPhone(i), null, String(i));
});
test('amount limits and rounding', () => {
  assert.deepEqual(validateAmount('100'), { ok: true, amount: 100 });
  assert.deepEqual(validateAmount(99.2), { ok: true, amount: 100 });
  assert.equal(validateAmount(5).ok, false); assert.equal(validateAmount(1e7).ok, false); assert.equal(validateAmount('x').ok, false);
});
test('state mapping', () => {
  assert.equal(mapState('COMPLETE'), 'confirmed'); assert.equal(mapState('FAILED'), 'failed'); assert.equal(mapState('CANCELED'), 'failed');
  assert.equal(mapState('PROCESSING'), 'pending'); assert.equal(mapState('PARTIAL'), null); assert.equal(mapState(undefined), null);
});
test('challenge is compared exactly (constant time)', () => {
  assert.equal(challengeMatches('s3cret-value', 's3cret-value'), true);
  for (const r of ['s3cret-valuE', 's3cret-valu', 's3cret-value!', '', null, 42]) assert.equal(challengeMatches(r, 's3cret-value'), false, String(r));
  assert.equal(challengeMatches('x', undefined), false);
});
test('status transitions never downgrade a confirmed gift', () => {
  assert.equal(nextStatus('pending', 'confirmed'), 'confirmed');
  assert.equal(nextStatus('confirmed', 'failed'), null);
  assert.equal(nextStatus('confirmed', 'pending'), null);
  assert.equal(nextStatus('failed', 'confirmed'), 'confirmed'); // late success after a retry
  assert.equal(nextStatus('failed', 'pending'), null);
  assert.equal(nextStatus('pending', 'pending'), null);
});
test('amount/currency must match before confirming', () => {
  assert.equal(amountMatches(100, '100.00', 'KES'), true);
  assert.equal(amountMatches(100, '99.00', 'KES'), false);
  assert.equal(amountMatches(100, '100.00', 'USD'), false);
});
