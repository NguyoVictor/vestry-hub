import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildBrandedEmail } from "../_shared/buildBrandedEmail.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function toValidRole(role: string): string {
  const r = role.toLowerCase().replace(/\s+/g, "_");
  const valid = ["super_admin", "staff_leader", "member", "guest"];
  if (valid.includes(r)) return r;
  if (["church_admin","general_overseer","senior_pastor","pastor","assistant_pastor","accountant","leader","studio_operator"].includes(r)) return "staff_leader";
  return "member";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { memberId, email, role, branchId, sendInvite, tenantId } = body;
    if (!email || !tenantId) throw new Error("email and tenantId are required");
    const validRole = toValidRole(role ?? "member");
    const [{ data: member }, { data: tenant }] = await Promise.all([
      supabase.from("members").select("first_name, last_name").eq("id", memberId).single(),
      supabase.from("tenants").select("name").eq("id", tenantId).single(),
    ]);
    const memberName = member ? `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() : email;
    const churchName = tenant?.name ?? "Your Church";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://vestry.app";
    const now = new Date().toISOString();
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find((u: { email?: string }) => u.email === email);
    let authUserId: string | null = null;
    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
    } else {
      const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true, user_metadata: { tenant_id: tenantId, role: validRole, branch_id: branchId ?? null, member_id: memberId } });
      if (createErr) throw new Error(`Failed to create user: ${createErr.message}`);
      authUserId = newUser.user?.id ?? null;
    }
    if (!authUserId) throw new Error("Could not create or find auth user");
    const { error: userErr } = await supabase.from("users").upsert({ id: authUserId, tenant_id: tenantId, first_name: member?.first_name?.trim() ?? "", last_name: member?.last_name?.trim() ?? "", email, role: validRole, status: "active", join_date: now.slice(0, 10), created_at: now, updated_at: now }, { onConflict: "id" });
    if (userErr) throw new Error(`User record error: ${userErr.message}`);
    if (sendInvite) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const { data: resetData } = await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${siteUrl}/auth/callback` } });
        const inviteLink = resetData?.properties?.action_link ?? `${siteUrl}/auth/signin`;
        const bodyText = `Hi ${memberName},\n\nYou have been invited to join ${churchName} on Vestry Hub as a ${role.replace(/_/g, " ")}.\n\nClick the button below to set up your password and access your account.`;
        const { html, subject } = await buildBrandedEmail(tenantId, { subject: `You've been invited to join ${churchName} on Vestry Hub`, body: bodyText, ctaLabel: "Accept Invitation", ctaUrl: inviteLink, churchName });
        await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "Vestry Hub <noreply@vestry.app>", to: [email], subject, html }) });
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = (err as Error).message ?? "Unknown error";
    console.error("invite-user error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
