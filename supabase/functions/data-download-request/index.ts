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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { churchName, adminName, adminEmail, adminPhone, submittedAt } = body;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("Email service not configured");

    const subject = `[Data Download Request] - ${churchName}`;
    const bodyHtml = `
      <h2 style="margin:0 0 16px;">Data Download Request Submitted</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:8px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;">Church Name</td><td style="padding:8px;border:1px solid #e2e8f0;">${churchName}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;">Admin Name</td><td style="padding:8px;border:1px solid #e2e8f0;">${adminName}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;">Admin Email</td><td style="padding:8px;border:1px solid #e2e8f0;">${adminEmail}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;">Phone/WhatsApp</td><td style="padding:8px;border:1px solid #e2e8f0;">${adminPhone || "—"}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;">Submitted At</td><td style="padding:8px;border:1px solid #e2e8f0;">${submittedAt}</td></tr>
      </table>
      <p style="margin-top:16px;color:#ef4444;font-weight:600;">⚠ Action Required: Please contact the admin personally to verify their identity before processing this request.</p>
    `;

    // Use a neutral branding for admin notifications (no tenant_id needed)
    const html = await buildBrandedEmail({
      tenantId: "admin",
      churchName: "Vestry Hub",
      subject,
      bodyHtml,
      supabaseClient: supabase,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Vestry Hub <noreply@vestry.app>", to: ["victornguyodev@gmail.com"], subject, html }),
    });

    if (!res.ok) throw new Error(`Email error: ${await res.text()}`);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
