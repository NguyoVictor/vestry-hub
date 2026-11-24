// node --experimental-strip-types --test scripts/recovery/daraja.node.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darajaBase, darajaTimestamp, darajaPassword, stkPushBody, parseStkCallback, newCallbackToken } from '../../supabase/functions/_shared/daraja.ts';

test('environment base URLs', () => {
  assert.equal(darajaBase('sandbox'), 'https://sandbox.safaricom.co.ke');
  assert.equal(darajaBase('production'), 'https://api.safaricom.co.ke');
});

test('timestamp is Kenyan time (UTC+3), YYYYMMDDHHmmss', () => {
  assert.equal(darajaTimestamp(new Date('2026-11-24T21:30:05Z')), '20261125003005');
  assert.match(darajaTimestamp(), /^\d{14}$/);
});

test('password = base64(shortcode + passkey + timestamp)', () => {
  assert.equal(darajaPassword('174379', 'abc', '20261124120000'), Buffer.from('174379abc20261124120000').toString('base64'));
});

const cfg = { consumer_key: 'k', consumer_secret: 's', passkey: 'p', shortcode: '174379', till_number: null, transaction_type: 'CustomerPayBillOnline', env: 'sandbox' };

test('paybill STK body: PartyB is the paybill; reference sanitised to 12 chars; whole shillings', () => {
  const b = stkPushBody(cfg, 10.4, '254712345678', 'https://x/cb', 'a1b2-c3d4-e5f6-7788', '20261124120000');
  assert.equal(b.PartyB, '174379'); assert.equal(b.BusinessShortCode, '174379');
  assert.equal(b.TransactionType, 'CustomerPayBillOnline');
  assert.equal(b.Amount, 10); assert.equal(b.AccountReference, 'a1b2c3d4e5f6');
  assert.equal(b.PartyA, '254712345678'); assert.equal(b.PhoneNumber, '254712345678');
});

test('till STK body: BuyGoods with PartyB = till number', () => {
  const b = stkPushBody({ ...cfg, transaction_type: 'CustomerBuyGoodsOnline', till_number: '5123456' }, 50, '254712345678', 'https://x/cb', 'g', '20261124120000');
  assert.equal(b.TransactionType, 'CustomerBuyGoodsOnline'); assert.equal(b.PartyB, '5123456'); assert.equal(b.BusinessShortCode, '174379');
});

test('callback parsing: success with metadata, and user-cancelled', () => {
  const ok = parseStkCallback({ Body: { stkCallback: { MerchantRequestID: 'm', CheckoutRequestID: 'ws_CO_1', ResultCode: 0, ResultDesc: 'The service request is processed successfully.',
    CallbackMetadata: { Item: [{ Name: 'Amount', Value: 10 }, { Name: 'MpesaReceiptNumber', Value: 'UKO6K2U0IR' }, { Name: 'TransactionDate', Value: 20261124120102 }, { Name: 'PhoneNumber', Value: 254712345678 }] } } } });
  assert.deepEqual(ok, { checkoutRequestId: 'ws_CO_1', resultCode: 0, resultDesc: 'The service request is processed successfully.', amount: 10, receipt: 'UKO6K2U0IR', phone: '254712345678' });
  const cancelled = parseStkCallback({ Body: { stkCallback: { CheckoutRequestID: 'ws_CO_2', ResultCode: 1032, ResultDesc: 'Request cancelled by user' } } });
  assert.equal(cancelled.resultCode, 1032); assert.equal(cancelled.amount, null); assert.equal(cancelled.receipt, null);
  assert.equal(parseStkCallback({ foo: 1 }), null); assert.equal(parseStkCallback(null), null);
});

test('callback token is random and long', () => {
  const a = newCallbackToken(); assert.match(a, /^[0-9a-f]{48}$/); assert.notEqual(a, newCallbackToken());
});
