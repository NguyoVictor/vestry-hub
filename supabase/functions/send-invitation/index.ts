import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildBrandedEmail } from "../_shared/branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json();
    const { email, role, church_name, invited_by, tenant_id } = payload;

    if (!email || !tenant_id) {
      return new Response(JSON.stringify({ error: "email and tenant_id are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id, role, invited_by },
      redirectTo: `${Deno.env.get("SITE_URL") ?? "https://vestry.app"}/auth/callback`,
    });
    if (inviteErr) throw inviteErr;

    const subject = `You've been invited to join ${church_name} on Vestry Hub`;
    const bodyHtml = `
      <p>Hi there,</p>
      <p><strong>${invited_by}</strong> has invited you to join <strong>${church_name}</strong> on Vestry Hub as a <strong>${role.replace(/_/g, " ")}</strong>.</p>
      <p>Click the button below to accept your invitation and set up your account.</p>
    `;

    const html = await buildBrandedEmail({
      tenantId: tenant_id,
      churchName: church_name,
      subject,
      bodyHtml,
      ctaLabel: "Accept Invitation",
      ctaUrl: `${Deno.env.get("SITE_URL") ?? "https://vestry.app"}/auth/callback`,
      supabaseClient: supabase,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${church_name} via Vestry Hub <noreply@vestry.app>`, to: [email], subject, html }),
    });

    if (!emailRes.ok) throw new Error(`Resend error: ${await emailRes.text()}`);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
