import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  normalizeChurchCode,
  isValidChurchCode,
  sendExistingMemberOtp,
  verifyMemberOtpAndLogin,
} from '../../src/lib/memberOtpLogin.ts';

const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
function mockClient(overrides = {}) {
  const calls = [];
  const client = {
    auth: {
      signInWithOtp: async args => { calls.push(['send', args]); return { error: null }; },
      verifyOtp: async args => {
        calls.push(['verify', args]);
        return { data: { session: { access_token: 'verified.jwt.for.test' } }, error: null };
      },
      getUser: async jwt => {
        calls.push(['getUser', jwt]);
        return { data: { user: { email: 'member@example.test', email_confirmed_at: '2026-11-01T00:00:00Z' } }, error: null };
      },
      ...overrides.auth,
    },
    functions: {
      invoke: async (name, args) => {
        calls.push(['invoke', name, args]);
        return { data: {
          member: { id: 'member-a', first_name: 'A', last_name: 'Member' },
          tenant: { id: 'church-a', slug: 'church-a' },
          sessionToken: 'opaque-token', expiresAt: future,
        }, error: null };
      },
      ...overrides.functions,
    },
  };
  return { client, calls };
}

test('accepts eight-character staging church codes and normalizes case', () => {
  assert.equal(normalizeChurchCode('  abcd1234 '), 'ABCD1234');
  assert.equal(isValidChurchCode('abcd1234'), true);
  assert.equal(isValidChurchCode('HOPE-2847'), true);
  assert.equal(isValidChurchCode('!bad'), false);
});

test('OTP request is pre-checked server-side with email + church code and never calls Auth directly', async () => {
  const { client, calls } = mockClient({ functions: { invoke: async (name, args) => {
    calls.push(['invoke', name, args]); return { data: { ok: true }, error: null };
  } } });
  assert.equal(await sendExistingMemberOtp(client, ' MEMBER@Example.Test ', ' abcd1234 '), true);
  assert.deepEqual(calls, [['invoke', 'member-otp-request', {
    body: { email: 'member@example.test', churchCode: 'ABCD1234' },
  }]]);
});

test('invalid email or church code cannot request OTP', async () => {
  const { client, calls } = mockClient();
  assert.equal(await sendExistingMemberOtp(client, '', 'ABCD1234'), false);
  assert.equal(await sendExistingMemberOtp(client, 'member@example.test', '!x'), false);
  assert.equal(calls.length, 0);
});

test('OTP request failure is reported as not sent', async () => {
  const { client } = mockClient({ functions: { invoke: async () => ({ data: null, error: new Error('down') }) } });
  assert.equal(await sendExistingMemberOtp(client, 'member@example.test', 'ABCD1234'), false);
});

test('verified email OTP produces a scoped member login without request-body email', async () => {
  const { client, calls } = mockClient();
  const result = await verifyMemberOtpAndLogin(client, 'member@example.test', 'abcd1234', '123456');
  assert.equal(result.kind, 'success');
  assert.equal(calls[0][0], 'verify');
  assert.deepEqual(calls[0][1], { email: 'member@example.test', token: '123456', type: 'email' });
  assert.equal(calls[1][0], 'getUser');
  assert.equal(calls[2][1], 'member-login');
  assert.deepEqual(calls[2][2], {
    headers: { Authorization: 'Bearer verified.jwt.for.test' },
    body: { churchCode: 'ABCD1234' },
  });
});

test('invalid six digit OTP does not call backend or even verifyOtp', async () => {
  const { client, calls } = mockClient();
  assert.deepEqual(await verifyMemberOtpAndLogin(client, 'member@example.test', 'ABCD1234', 'abcd12'), {kind:'invalid_input'});
  assert.equal(calls.length, 0);
});

test('failed OTP never calls member-login', async () => {
  const { client, calls } = mockClient({ auth: { verifyOtp: async () => ({data:{session:null},error:{message:'invalid'}}) } });
  assert.equal((await verifyMemberOtpAndLogin(client, 'member@example.test', 'ABCD1234', '123456')).kind, 'verification_failed');
  assert.equal(calls.some(x => x[0] === 'invoke'), false);
});

test('verified JWT for another email is rejected before member-login', async () => {
  const { client, calls } = mockClient({ auth: {
    getUser: async () => ({ data:{user:{email:'other@example.test',email_confirmed_at:'2026-01-01'}},error:null }),
  }});
  assert.equal((await verifyMemberOtpAndLogin(client, 'member@example.test', 'ABCD1234', '123456')).kind, 'verification_failed');
  assert.equal(calls.some(x => x[0] === 'invoke'), false);
});

test('unconfirmed Auth identity is rejected before member-login', async () => {
  const { client, calls } = mockClient({ auth: {
    getUser: async () => ({ data:{user:{email:'member@example.test',email_confirmed_at:null}},error:null }),
  }});
  assert.equal((await verifyMemberOtpAndLogin(client, 'member@example.test', 'ABCD1234', '123456')).kind, 'verification_failed');
  assert.equal(calls.some(x => x[0] === 'invoke'), false);
});

test('tenant membership denial never returns a member session', async () => {
  const { client } = mockClient({ functions: {
    invoke: async () => ({ data:{error:'invalid_credentials_or_membership'},error:null }),
  }});
  assert.equal((await verifyMemberOtpAndLogin(client, 'member@example.test', 'ABCD1234', '123456')).kind, 'access_denied');
});

test('untrusted or expired member session response is rejected', async () => {
  const { client } = mockClient({ functions: {
    invoke: async () => ({ data:{member:{id:'a'},tenant:{id:'a',slug:'a'},sessionToken:'token',expiresAt:'2020-01-01T00:00:00Z'},error:null }),
  }});
  assert.equal((await verifyMemberOtpAndLogin(client, 'member@example.test', 'ABCD1234', '123456')).kind, 'access_denied');
});

test('commit-time sources must not restore insecure member-login', () => {
  const source = path => readFileSync(resolve(path),'utf8');
  const login = source('supabase/functions/member-login/index.ts');
  assert.match(login, /authClient\.auth\.getUser\(jwt\)/);
  assert.doesNotMatch(login, /const\s*\{\s*email\s*,\s*churchCode\s*\}\s*=\s*await req\.json\(/);
  assert.match(login, /session_token:\s*sessionTokenHash/);
  const session = source('supabase/functions/member-session-context/index.ts');
  assert.match(session, /hashSessionToken\(sessionToken\)/);
});
