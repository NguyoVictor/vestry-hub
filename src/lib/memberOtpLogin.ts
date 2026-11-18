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

// Supabase's default email template sends a magic link. The project's Magic
// Link template MUST contain {{ .Token }} to send the six-digit OTP instead.
export async function sendExistingMemberOtp(client: MemberAuthClient, email: string): Promise<boolean> {
  const normalizedEmail = normalizeMemberEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) return false;
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: false },
  });
  return !error;
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
  if (!isValidChurchCode(normalizedCode) || !/^\d{6}$/.test(otp.trim())) {
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
