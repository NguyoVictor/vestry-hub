// Finding 1 (manual testing report): provision or associate a member's Auth
// identity WITHOUT sending invitation, activation or magic-link email.
// Dependency-free so it can be unit tested under Node; callers pass a
// service-role Supabase client.

export const MEMBER_PORTAL_PROVISIONING_MARKER = "MEMBER_PORTAL_PROVISIONING_V1";

export type ProvisionSuccessStatus =
  | "already_provisioned"
  | "provisioned"
  | "provisioned_existing_identity";

export type ProvisionErrorCode =
  | "member_not_found"
  | "member_email_missing"
  | "invalid_member_email"
  | "email_mismatch"
  | "member_linked_to_other_identity"
  | "identity_linked_to_other_member"
  | "provisioning_unavailable"
  | "identity_creation_failed"
  | "association_failed";

export type ProvisionResult =
  | { ok: true; status: ProvisionSuccessStatus }
  | { ok: false; error: ProvisionErrorCode };

// Minimal structural view of the supabase-js client used here.
// deno-lint-ignore no-explicit-any
type Db = any;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const LINK_STATUS: Record<string, ProvisionResult> = {
  already_provisioned: { ok: true, status: "already_provisioned" },
  provisioned_existing_identity: { ok: true, status: "provisioned_existing_identity" },
  member_not_found: { ok: false, error: "member_not_found" },
  email_mismatch: { ok: false, error: "email_mismatch" },
  member_linked_to_other_identity: { ok: false, error: "member_linked_to_other_identity" },
  identity_linked_to_other_member: { ok: false, error: "identity_linked_to_other_member" },
};

async function linkExisting(db: Db, tenantId: string, memberId: string, authUserId: string): Promise<ProvisionResult> {
  const { data, error } = await db.rpc("member_portal_link_existing_identity", {
    p_tenant_id: tenantId,
    p_member_id: memberId,
    p_auth_user_id: authUserId,
  });
  if (error || typeof data !== "string") return { ok: false, error: "association_failed" };
  return LINK_STATUS[data] ?? { ok: false, error: "association_failed" };
}

async function findAuthUser(db: Db, email: string): Promise<{ id: string | null; failed: boolean }> {
  const { data, error } = await db.rpc("member_portal_find_auth_user", { p_email: email });
  if (error) return { id: null, failed: true };
  return { id: typeof data === "string" && data ? data : null, failed: false };
}

/** 256-bit single-use binding secret (base64url) and its SHA-256 hex digest. */
export async function newBindingSecret(): Promise<{ secret: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { secret, hash };
}

function isEmailExists(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false;
  return error.code === "email_exists" || error.status === 422 ||
    /already.*(registered|exists)/i.test(error.message ?? "");
}

export async function provisionMemberPortalAccess(
  db: Db,
  tenantId: string,
  memberId: string,
  now: () => number = Date.now,
): Promise<ProvisionResult> {
  const { data: marker, error: markerError } = await db.rpc("member_portal_provisioning_version");
  if (markerError || marker !== MEMBER_PORTAL_PROVISIONING_MARKER) {
    return { ok: false, error: "provisioning_unavailable" };
  }

  const { data: member, error: memberError } = await db.from("members")
    .select("id, tenant_id, email")
    .eq("id", memberId).eq("tenant_id", tenantId).maybeSingle();
  if (memberError || !member || member.tenant_id !== tenantId) return { ok: false, error: "member_not_found" };

  const email = normalizeEmail(member.email);
  if (!email) return { ok: false, error: "member_email_missing" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalid_member_email" };

  // 1. Existing identity (any church, staff or member): associate safely.
  const existing = await findAuthUser(db, email);
  if (existing.failed) return { ok: false, error: "association_failed" };
  if (existing.id) return linkExisting(db, tenantId, memberId, existing.id);

  // 2. New identity bound to a server-created, single-use challenge. GoTrue
  //    applies app_metadata/email_confirm only AFTER the auth.users INSERT, so
  //    the binding travels in insert-time user_metadata: the challenge id plus
  //    a 256-bit secret whose SHA-256 only the server stores. The Auth trigger
  //    (MEMBER_PORTAL_PROVISIONING_V1) links atomically or fails closed.
  const binding = await newBindingSecret();
  const { data: challenge, error: challengeError } = await db.from("member_login_challenges")
    .insert({
      tenant_id: tenantId,
      member_id: memberId,
      email_normalized: email,
      expires_at: new Date(now() + CHALLENGE_TTL_MS).toISOString(),
      binding_secret_hash: binding.hash,
    })
    .select("id").single();
  if (challengeError || !challenge?.id) return { ok: false, error: "association_failed" };

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      member_provisioning_challenge_id: challenge.id,
      member_provisioning_secret: binding.secret,
    },
  });

  if (createError || !created?.user?.id) {
    await db.from("member_login_challenges").delete().eq("id", challenge.id).is("consumed_at", null);
    if (isEmailExists(createError)) {
      // A concurrent request created the identity; retry as an association.
      const raced = await findAuthUser(db, email);
      if (raced.id) return linkExisting(db, tenantId, memberId, raced.id);
    }
    return { ok: false, error: "identity_creation_failed" };
  }

  const { data: link } = await db.from("member_auth_memberships")
    .select("auth_user_id, tenant_id")
    .eq("member_id", memberId).maybeSingle();
  if (!link || link.auth_user_id !== created.user.id || link.tenant_id !== tenantId) {
    return { ok: false, error: "association_failed" };
  }
  return { ok: true, status: "provisioned" };
}
