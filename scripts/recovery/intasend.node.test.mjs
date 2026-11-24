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
import { keyPairEnv, newChallenge } from '../../supabase/functions/_shared/intasend.ts';
test('key pair environment (one account per church)', () => {
  assert.deepEqual(keyPairEnv('ISSecretKey_live_abcdefgh123', 'ISPubKey_live_abcdefgh456'), { ok: true, env: 'live' });
  assert.deepEqual(keyPairEnv(' ISSecretKey_test_abcdefgh123 ', 'ISPubKey_test_abcdefgh456'), { ok: true, env: 'test' });
  assert.equal(keyPairEnv('ISSecretKey_live_abcdefgh123', 'ISPubKey_test_abcdefgh456').ok, false);
  assert.equal(keyPairEnv('ISPubKey_live_abcdefgh123', 'ISSecretKey_live_abcdefgh456').ok, false);
  assert.equal(keyPairEnv('sk_live_x', 'ISPubKey_live_abcdefgh456').ok, false);
  assert.equal(keyPairEnv(undefined, null).ok, false);
});
test('webhook challenge is random and long', () => {
  const a = newChallenge(), b = newChallenge();
  assert.match(a, /^vestry_[0-9a-f]{48}$/);
  assert.notEqual(a, b);
});
import { verifyStatusReply } from '../../supabase/functions/_shared/intasend.ts';
test('status reply verification (documented nested shape) and readable reasons', () => {
  const doc = { invoice: { invoice_id: 'ABC123', state: 'COMPLETE', value: 10, currency: 'KES', api_ref: 'gift-1', provider_ref: 'QWE123RTY' } };
  assert.deepEqual(verifyStatusReply(200, doc, 'gift-1', '10.00'), { ok: true, receipt: 'QWE123RTY' });
  assert.equal(verifyStatusReply(200, { ...doc.invoice }, 'gift-1', 10).ok, true, 'flat reply also accepted');
  const wrongRef = verifyStatusReply(200, doc, 'gift-2', 10);
  assert.equal(wrongRef.ok, false); assert.match(wrongRef.reason, /api_ref_match=false/);
  assert.match(verifyStatusReply(400, { detail: 'x' }, 'gift-1', 10).reason, /http=400 .*keys=detail/);
  assert.match(verifyStatusReply(200, { invoice: { ...doc.invoice, state: 'PROCESSING' } }, 'gift-1', 10).reason, /state=PROCESSING/);
  assert.match(verifyStatusReply(200, { invoice: { ...doc.invoice, value: 9 } }, 'gift-1', 10).reason, /value=9/);
});
