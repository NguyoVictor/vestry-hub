import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { mayInviteStaff, validateStaffInvite } from "./validation.ts";

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

// This function uses the service role *only after validating the caller's Supabase Auth JWT*
// and checking the caller's persisted tenant/role. Client-supplied role metadata is never
// considered proof of permission.
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

  const service = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Confirm the JWT against Supabase Auth, not unverified JWT claims or user_metadata.
    const { data: authData, error: authError } = await service.auth.getUser(bearer[1]);
    if (authError || !authData.user) return json({ error: "Authentication required" }, 401);

    const { data: actor, error: actorError } = await service
      .from("users")
      .select("tenant_id, role, status, is_super_admin")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (actorError) return json({ error: "Unable to verify inviter permissions" }, 503);
    if (!mayInviteStaff(actor, tenantId)) return json({ error: "Forbidden: church administrator required" }, 403);

    const { data: tenant, error: tenantError } = await service
      .from("tenants")
      .select("id, name")
      .eq("id", tenantId)
      .maybeSingle();
    if (tenantError) return json({ error: "Unable to verify church" }, 503);
    if (!tenant) return json({ error: "Church not found" }, 404);

    // public.users.id is the Auth user ID (single primary key across tenants).
    // Never UPSERT here: it could silently move an existing account to another tenant.
    const { data: existingAccount, error: existingError } = await service
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (existingError) return json({ error: "Unable to check existing account" }, 503);
    if (existingAccount) {
      return json({ error: "An account already uses this email. Existing-account access needs separate review." }, 409);
    }

    const { count: staffCount, error: staffError } = await service
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .neq("role", "member")
      .eq("status", "active");
    if (staffError || staffCount === null) return json({ error: "Unable to verify staff quota" }, 503);

    const { data: subscription, error: subscriptionError } = await service
      .from("tenant_subscriptions")
      .select("staff_limit")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (subscriptionError) return json({ error: "Unable to verify staff quota" }, 503);
    const limit = subscription?.staff_limit ?? 3;
    if (staffCount >= limit) return json({ error: `Staff limit reached (${limit})` }, 403);

    // Supabase Auth sends the invitation email. RESEND_API_KEY is not required here.
    // The invitation's user_metadata is for display only, never authorization.
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://vestryhub.com";
    const redirectTo = new URL("/auth/invite", siteUrl).toString();
    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        tenant_id: tenantId,
        role,
        invited_by: authData.user.id,
        church_name: tenant.name,
        first_name: firstName,
        last_name: lastName,
      },
    });
    if (inviteError) {
      if (inviteError.status === 422) {
        return json({ error: "This email already has an Auth account. Existing-account access needs separate review." }, 409);
      }
      console.error("send-invitation: Supabase Auth invitation failed", inviteError.status);
      return json({ error: "Unable to send invitation" }, 502);
    }

    const invitedId = invited.user?.id;
    if (!invitedId) return json({ error: "Invite sent but no Auth user ID was returned; administrator review required" }, 502);

    const { error: userError } = await service.from("users").insert({
      id: invitedId,
      tenant_id: tenantId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      role,
      status: "active",
      invitation_sent: true,
      is_super_admin: false,
    });
    if (userError) {
      // The Auth invitation may already be delivered. Never report false success,
      // and never delete an Auth account without proof it was newly created.
      console.error("send-invitation: profile insertion failed", userError.code);
      return json({ error: "Invitation sent but staff profile creation failed; administrator review required" }, 503);
    }

    return json({ ok: true, already_registered: false });
  } catch (error) {
    console.error("send-invitation failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "Unable to process invitation" }, 500);
  }
});
