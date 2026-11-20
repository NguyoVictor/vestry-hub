import type { SupabaseClient } from '@supabase/supabase-js';

// Finding 1: member portal access is provisioned automatically when a member
// with an email is saved. No invitation, activation or approval email exists.

export const PROVISIONED_STATUSES = [
  'already_provisioned',
  'provisioned',
  'provisioned_existing_identity',
] as const;

export type ProvisionedStatus = (typeof PROVISIONED_STATUSES)[number];

export type PortalProvisioningResult =
  | { ok: true; status: ProvisionedStatus }
  | { ok: false; error: string };

type FunctionsClient = Pick<SupabaseClient, 'functions'>;

const ERROR_MESSAGES: Record<string, string> = {
  member_email_missing: 'This member has no email address. Add one to enable Member Portal access.',
  invalid_member_email: "This member's email address is not valid.",
  email_mismatch: "The existing sign-in identity does not match this member's email.",
  member_linked_to_other_identity: 'This member is already linked to a different sign-in identity.',
  identity_linked_to_other_member: 'This email is already used for portal access by another member of this church.',
  member_not_found: 'Member record not found for this church.',
  forbidden: 'Only church administrators can set up Member Portal access.',
  unauthorized: 'Your session has expired. Sign in again and retry.',
  provisioning_unavailable: 'Member Portal access setup is temporarily unavailable.',
  identity_creation_failed: 'The sign-in identity could not be created.',
  association_failed: 'The member could not be linked to a sign-in identity.',
};

export function isProvisionedStatus(value: unknown): value is ProvisionedStatus {
  return typeof value === 'string' && (PROVISIONED_STATUSES as readonly string[]).includes(value);
}

export function describeProvisioningError(error: string): string {
  return ERROR_MESSAGES[error] ?? 'Member Portal access setup failed.';
}

async function readErrorCode(error: unknown): Promise<string> {
  // supabase-js FunctionsHttpError exposes the Response as `context`.
  const context = (error as { context?: { json?: () => Promise<unknown> } })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: unknown };
      if (typeof body?.error === 'string') return body.error;
    } catch {
      /* fall through */
    }
  }
  return 'request_failed';
}

export async function provisionMemberPortalAccess(
  client: FunctionsClient,
  memberId: string,
  tenantId: string,
): Promise<PortalProvisioningResult> {
  try {
    const { data, error } = await client.functions.invoke('member-provision-access', {
      body: { memberId, tenantId },
    });
    if (error) return { ok: false, error: await readErrorCode(error) };
    const status = (data as { status?: unknown } | null)?.status;
    if ((data as { ok?: unknown } | null)?.ok === true && isProvisionedStatus(status)) {
      return { ok: true, status };
    }
    const code = (data as { error?: unknown } | null)?.error;
    return { ok: false, error: typeof code === 'string' ? code : 'unexpected_response' };
  } catch {
    return { ok: false, error: 'request_failed' };
  }
}
