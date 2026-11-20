import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { mayInviteStaff, validateStaffInvite } from "./validation.ts";
import { newInvitationBinding, stagingInviteOrigin, verifiedStaffInvitation } from "./handshake.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Staff invites must be bound to a server-created, tenant-scoped DB row BEFORE
 * auth.admin.inviteUserByEmail creates an auth.users identity. The AFTER INSERT
 * Auth trigger consumes that row and creates the staff profile atomically.
 *
 * GoTrue INSERTs auth.users with invited_at = NULL (it is set afterwards), so
 * the trigger cannot rely on invited_at. Instead a 256-bit single-use secret is
 * passed in insert-time invite data; only its SHA-256 is stored on the trusted
 * row and the trigger (STAFF_INVITATION_HANDSHAKE_V2) matches the hash.
 *
 * Deployment gate: the database handshake marker (version 2) must be present first.
 * Do not deploy this function to Production as part of the recovery exercise.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bearer = /^Bearer\s+([^\s]+)$/i.exec(req.headers.get("Authorization")?.trim() ?? "");
  if (!bearer) return json({ error: "Authentication required" }, 401);

  const validation = validateStaffInvite(await req.json().catch(() => null));
  if (!validation.ok) return json({ error: validation.error }, 400);
  const { email, tenantId, role, firstName, lastName } = validation.value;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "Invitation service unavailable" }, 503);

  // Fixed server-side Preview origin only. Never accept a redirect URL in the
  // request body and never silently default to the production website.
  const configuredOrigin = Deno.env.get("STAFF_INVITATION_REDIRECT_ORIGIN") || "";
  const approvedOrigin = stagingInviteOrigin(configuredOrigin);
  if (!approvedOrigin) return json({ error: "Staging invitation redirect is not configured" }, 503);
  const redirectTo = new URL("/auth/invite", approvedOrigin).toString();

  const service = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Fail closed until a reviewed migration has installed the trusted
    // invitation trigger; the old trigger can create an unintended tenant.
    const { data: handshakeVersion, error: handshakeError } = await service
      .rpc("staff_invitation_handshake_version");
    if (handshakeError || handshakeVersion !== 2) {
      return json({ error: "Staff invitation handshake is not configured" }, 503);
    }

    const { data: authData, error: authError } = await service.auth.getUser(bearer[1]);
    if (authError || !authData.user) return json({ error: "Authentication required" }, 401);

    const { data: actor, error: actorError } = await service.from("users")
      .select("tenant_id, role, status, is_super_admin")
      .eq("id", authData.user.id).maybeSingle();
    if (actorError) return json({ error: "Unable to verify inviter permissions" }, 503);
    if (!mayInviteStaff(actor, tenantId)) return json({ error: "Forbidden: church administrator required" }, 403);

    const { data: tenant, error: tenantError } = await service.from("tenants")
      .select("id, name").eq("id", tenantId).maybeSingle();
    if (tenantError || !tenant) return json({ error: "Church not found" }, 404);

    // Auth user IDs are global: do not upsert or transfer existing profiles.
    const { data: existingAccount, error: existingError } = await service.from("users")
      .select("id").ilike("email", email).limit(1).maybeSingle();
    if (existingError) return json({ error: "Unable to check existing account" }, 503);
    if (existingAccount) return json({ error: "Existing-account access requires a separate review" }, 409);

    // Multiple unconsumed invites for one email would be ambiguous to the
    // Auth trigger. Refuse to add another, even for a different tenant.
    const { count: pendingCount, error: pendingError } = await service.from("staff_invitations")
      .select("id", { head: true, count: "exact" })
      .ilike("email", email).is("consumed_at", null)
      .gt("expires_at", new Date().toISOString());
    if (pendingError || pendingCount === null) return json({ error: "Unable to check outstanding invitations" }, 503);
    if (pendingCount !== 0) return json({ error: "A pending invitation already exists for this email" }, 409);

    const { count: staffCount, error: staffError } = await service.from("users")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId).neq("role", "member").eq("status", "active");
    if (staffError || staffCount === null) return json({ error: "Unable to verify staff quota" }, 503);
    const { data: subscription, error: subscriptionError } = await service.from("tenant_subscriptions")
      .select("staff_limit").eq("tenant_id", tenantId).maybeSingle();
    if (subscriptionError) return json({ error: "Unable to verify staff quota" }, 503);
    const limit = subscription?.staff_limit ?? 3;
    if (staffCount >= limit) return json({ error: `Staff limit reached (${limit})` }, 403);

    // TRUST ROOT: this row is written by service-role ONLY after caller
    // authentication, role validation, uniqueness and quota checks.
    const binding = await newInvitationBinding();
    const { data: invitation, error: invitationError } = await service.from("staff_invitations")
      .insert({ tenant_id: tenantId, email, role, first_name: firstName,
        last_name: lastName, invited_by: authData.user.id,
        binding_nonce_hash: binding.hash })
      .select("id").single();
    if (invitationError || !invitation?.id) return json({ error: "Unable to prepare staff invitation" }, 503);

    // This operation creates auth.users; the database Auth trigger must
    // consume the trusted, email-matched invitation and insert public.users.
    // No tenant/role from user_metadata may authorize that insertion.
    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      // staff_invitation_nonce is a bearer secret, not an authorization claim:
      // it only selects the server-written row whose hash matches.
      data: { first_name: firstName, last_name: lastName, church_name: tenant.name,
        staff_invitation_nonce: binding.nonce },
    });
    if (inviteError || !invited.user?.id) {
      // Never delete an Auth user or invitation automatically: delivery or
      // identity creation may have partially completed. Flag manual review.
      console.error("send-invitation: Auth invitation failed", inviteError?.status ?? "unknown");
      return json({ error: "Staff invitation incomplete; administrator review required" }, 503);
    }

    const invitedId = invited.user.id;
    const [committedResult, profileResult] = await Promise.all([
      service.from("staff_invitations")
        .select("id,tenant_id,email,role,consumed_at,auth_user_id")
        .eq("id", invitation.id).maybeSingle(),
      service.from("users")
        .select("id,tenant_id,email,role,status,invitation_sent")
        .eq("id", invitedId).maybeSingle(),
    ]);
    const committed = committedResult.error ? null : committedResult.data;
    const profile = profileResult.error ? null : profileResult.data;

    if (!verifiedStaffInvitation(invitedId, invitation.id, tenantId, email, role, committed, profile)) {
      console.error("send-invitation: account and invitation postconditions do not match");
      return json({ error: "Invitation sent but staff account verification failed; administrator review required" }, 503);
    }

    return json({ ok: true, already_registered: false });
  } catch (error) {
    console.error("send-invitation: unexpected failure", error instanceof Error ? error.name : "unknown");
    return json({ error: "Unable to process invitation; administrator review required" }, 500);
  }
});
