#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = name => readFileSync(resolve(process.cwd(), name), 'utf8');
const login = read('supabase/functions/member-login/index.ts');
const context = read('supabase/functions/member-session-context/index.ts');
const logout = read('supabase/functions/member-logout/index.ts');
const frontend = read('src/pages/member/MemberLogin.tsx');
const helper = read('src/lib/memberOtpLogin.ts');
const edgeConfig = read('supabase/config.toml');
const required = [
  [login, /authClient\.auth\.getUser\(jwt\)/, 'login must verify Auth JWT'],
  [login, /user\.email_confirmed_at/, 'login must require confirmed email'],
  [login, /\.eq\("tenant_id", tenant\.id\)/, 'login must restrict member lookup to tenant'],
  [login, /session_token:\s*sessionTokenHash/, 'login must store only hashed member session'],
  [context, /hashSessionToken\(sessionToken\)/, 'context must hash bearer token'],
  [context, /\.eq\("session_token", sessionTokenHash\)/, 'context must verify hashed session'],
  [logout, /\.eq\("session_token", await hashToken\(sessionToken\)\)/, 'logout must revoke by hashed bearer token'],
  [helper, /shouldCreateUser:\s*false/, 'OTP must not create new users'],
  [helper, /client\.auth\.verifyOtp\(/, 'OTP code must be verified'],
  [helper, /client\.auth\.getUser\(accessToken\)/, 'verified identity must be rechecked'],
  [helper, /Authorization:\s*`Bearer \$\{accessToken\}`/, 'member-login must receive a verified JWT'],
  [frontend, /verifyMemberOtpAndLogin\(supabase/, 'frontend must use verified OTP flow'],
  [edgeConfig, /\[functions\.member-login\]\s*verify_jwt\s*=\s*true/, 'CLI must preserve JWT verification'],
];
for (const [source, regex, label] of required) {
  if (!regex.test(source)) throw new Error(`Member auth safety contract failed: ${label}`);
}
if (/const\s*\{\s*email\s*,\s*churchCode\s*\}\s*=\s*await req\.json\(/.test(login)) {
  throw new Error('Member auth safety contract failed: unverified email+code legacy handler');
}
if (/\.eq\("session_token",\s*String\(sessionToken\)\)/.test(context)) {
  throw new Error('Member auth safety contract failed: raw token session lookup');
}
console.log('PASS: member OTP, JWT, tenant and hashed-session source contracts');
