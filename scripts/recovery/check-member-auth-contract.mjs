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
const otpRequest = read('supabase/functions/member-otp-request/index.ts');
const required = [
  [login, /authClient\.auth\.getUser\(jwt\)/, 'login must verify Auth JWT'],
  [login, /user\.email_confirmed_at/, 'login must require confirmed email'],
  [login, /\.eq\("tenant_id", tenant\.id\)/, 'login must restrict member lookup to tenant'],
  [login, /session_token:\s*sessionTokenHash/, 'login must store only hashed member session'],
  [context, /hashSessionToken\(sessionToken\)/, 'context must hash bearer token'],
  [context, /\.eq\("session_token", sessionTokenHash\)/, 'context must verify hashed session'],
  [logout, /\.eq\("session_token", await hashToken\(sessionToken\)\)/, 'logout must revoke by hashed bearer token'],
  [otpRequest, /shouldCreateUser:\s*false/, 'OTP must not create new users'],
  [otpRequest, /member_auth_memberships/, 'OTP only for provisioned members'],
  [helper, /functions\.invoke\('member-otp-request'/, 'OTP request must be pre-checked server-side'],
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
// Finding 1: provisioning without invitations; no status gating; link required.
const provision = read('supabase/functions/member-provision-access/index.ts');
const provisionShared = read('supabase/functions/_shared/member-portal-provisioning.ts');
const register = read('supabase/functions/member-register/index.ts');
for (const [name, source] of [['member-provision-access', provision], ['provisioning module', provisionShared], ['member-otp-request', otpRequest]]) {
  if (/inviteUserByEmail|generateLink|signInWithOtp\([^)]*shouldCreateUser:\s*true/.test(source)) {
    throw new Error(`Member auth safety contract failed: ${name} must not send invitations or create users via OTP`);
  }
}
// GoTrue applies app_metadata only AFTER the auth.users INSERT, so the AFTER
// INSERT trigger can only see insert-time user_metadata. The binding must be a
// challenge id plus a single-use secret whose SHA-256 only the server stores.
if (!/user_metadata:\s*\{\s*member_provisioning_challenge_id:\s*challenge\.id,\s*member_provisioning_secret:\s*binding\.secret/.test(provisionShared) ||
    !/binding_secret_hash:\s*binding\.hash/.test(provisionShared) ||
    !/crypto\.getRandomValues\(new Uint8Array\(32\)\)/.test(provisionShared)) {
  throw new Error('Member auth safety contract failed: provisioning must bind via hashed single-use secret in insert-time user_metadata');
}
if (/app_metadata:\s*\{\s*member_provisioning/.test(provisionShared)) {
  throw new Error('Member auth safety contract failed: app_metadata binding is invisible to the AFTER INSERT trigger');
}
if (!/provisionMemberPortalAccess\(supabase, tenant\.id, member\.id\)/.test(register)) {
  throw new Error('Member auth safety contract failed: self-registration must provision portal access');
}
for (const [name, source] of [['member-login', login], ['member-session-context', context]]) {
  if (/membership_status \|\| ""\)\.trim\(\)\.toLowerCase\(\) !==|\.status \|\| ""\)\.trim\(\)\.toLowerCase\(\) !== "active"/.test(source)) {
    throw new Error(`Member auth safety contract failed: ${name} must not reject on status/membership_status`);
  }
  if (!/member_auth_memberships/.test(source)) {
    throw new Error(`Member auth safety contract failed: ${name} must require the provisioned identity link`);
  }
}
console.log('PASS: member OTP, JWT, tenant, hashed-session and Finding 1 provisioning source contracts');
