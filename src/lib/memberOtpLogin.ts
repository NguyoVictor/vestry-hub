import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// The Edge Function, not the caller's email/church code, is the authority for
// tenant membership. This module intentionally never creates Auth users.
type MemberAuthClient = Pick<SupabaseClient<Database>, 'auth' | 'functions'>;

export interface VerifiedMemberLogin {
  member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    member_type?: string | null;
  };
  tenant: {
    id: string;
    slug: string;
    enabled_modules?: unknown;
  };
  sessionToken: string;
  expiresAt: string;
}

export type MemberOtpResult =
  | { kind: 'success'; login: VerifiedMemberLogin }
  | { kind: 'verification_failed' | 'access_denied' | 'invalid_input' };

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeChurchCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidChurchCode(code: string): boolean {
  return /^[A-Z0-9-]{4,32}$/.test(normalizeChurchCode(code));
}

// Supabase Auth email OTP length is a per-project setting (6-10 digits; the
// staging project sends 8). Never hard-code 6, or every login fails.
export const MEMBER_OTP_MAX_LENGTH = 10;
export function isValidMemberOtp(otp: string): boolean {
  return /^\d{6,10}$/.test(otp.trim());
}

// Finding 1, steps 4-6: the member-otp-request Edge Function first verifies
// that the email belongs to a portal-provisioned member of the church named by
// the access code, then sends the OTP with signInWithOtp({ shouldCreateUser:
// false }). Its response is generic, so it never reveals membership.
// Supabase's Magic Link template MUST contain {{ .Token }} to send a code.
export async function sendExistingMemberOtp(
  client: MemberAuthClient,
  email: string,
  churchCode: string,
): Promise<boolean> {
  const normalizedEmail = normalizeMemberEmail(email);
  const normalizedCode = normalizeChurchCode(churchCode);
  if (!normalizedEmail || !normalizedEmail.includes('@') || !isValidChurchCode(normalizedCode)) return false;
  const { data, error } = await client.functions.invoke('member-otp-request', {
    body: { email: normalizedEmail, churchCode: normalizedCode },
  });
  return !error && (data as { ok?: unknown } | null)?.ok === true;
}

function validLoginPayload(value: unknown): value is VerifiedMemberLogin {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VerifiedMemberLogin>;
  const member = candidate.member;
  const tenant = candidate.tenant;
  return Boolean(
    member && typeof member.id === 'string' &&
    tenant && typeof tenant.id === 'string' && typeof tenant.slug === 'string' &&
    candidate.sessionToken && typeof candidate.sessionToken === 'string' &&
    candidate.expiresAt && typeof candidate.expiresAt === 'string' &&
    Date.parse(candidate.expiresAt) > Date.now(),
  );
}

export async function verifyMemberOtpAndLogin(
  client: MemberAuthClient,
  email: string,
  code: string,
  otp: string,
): Promise<MemberOtpResult> {
  const normalizedEmail = normalizeMemberEmail(email);
  const normalizedCode = normalizeChurchCode(code);
  if (!isValidChurchCode(normalizedCode) || !isValidMemberOtp(otp)) {
    return { kind: 'invalid_input' };
  }

  const { data: verified, error: otpError } = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: otp.trim(),
    type: 'email',
  });
  const accessToken = verified?.session?.access_token;
  if (otpError || !accessToken) return { kind: 'verification_failed' };

  // Recheck the verified server-side identity; never trust a request-body email.
  const { data: identity, error: identityError } = await client.auth.getUser(accessToken);
  const verifiedEmail = identity?.user?.email;
  if (identityError || !verifiedEmail ||
      normalizeMemberEmail(verifiedEmail) !== normalizedEmail ||
      !identity.user.email_confirmed_at) {
    return { kind: 'verification_failed' };
  }

  const { data: result, error: loginError } = await client.functions.invoke('member-login', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { churchCode: normalizedCode },
  });
  if (loginError || !validLoginPayload(result)) return { kind: 'access_denied' };
  return { kind: 'success', login: result };
}
