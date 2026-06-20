import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildBrandedEmail } from "../_shared/buildBrandedEmail.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { tenantId, contactName, churchName, email, phone, message } = body;
    const { error: dbError } = await supabase.from("website_consultation_requests").insert({ tenant_id: tenantId || null, contact_name: contactName, church_name: churchName || null, email, phone: phone || null, message: message || null });
    if (dbError) throw dbError;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const bodyText = `New website consultation request received.\n\nContact: ${contactName}\nChurch: ${churchName || "\u2014"}\nEmail: ${email}\nPhone: ${phone || "\u2014"}\n\nMessage:\n${message || "No message provided"}`;
      const { html, subject } = await buildBrandedEmail(tenantId ?? "system", {
        subject: `New Website Consultation Request \u2014 ${churchName || contactName}`,
        body: bodyText,
        churchName: churchName ?? "Vestry Hub",
      });
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Vestry Hub <noreply@vestry.app>", to: ["victornguyodev@gmail.com"], subject, html }),
      });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
