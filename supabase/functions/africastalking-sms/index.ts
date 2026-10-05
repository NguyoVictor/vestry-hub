import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authorizeTenantActor } from "../_shared/authorize-tenant-actor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function formatPhoneToE164(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("254")) return digits;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id, recipients, message, is_test = false, admin_phone, church_name } = await req.json();
    if (!tenant_id) return json({ error: "tenant_id is required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      await authorizeTenantActor(req, supabase, tenant_id);
    } catch (error) {
      return json({ error: String(error).includes("forbidden") ? "forbidden" : "unauthorized" }, String(error).includes("forbidden") ? 403 : 401);
    }

    const normalizedRecipients = is_test
      ? (admin_phone ? [{ phone: formatPhoneToE164(admin_phone), name: "Admin" }] : [])
      : (Array.isArray(recipients) ? recipients : [])
          .filter((recipient) => recipient?.phone)
          .map((recipient) => ({ ...recipient, phone: formatPhoneToE164(recipient.phone) }))
          .filter((recipient) => recipient.phone.length >= 10);

    if (normalizedRecipients.length === 0) return json({ error: is_test ? "admin_phone is required" : "No valid phone numbers found" }, 400);
    if (!is_test && !message) return json({ error: "message is required" }, 400);

    const queuedPayload = {
      tenant_id,
      recipients: normalizedRecipients,
      message: is_test ? `This is a test SMS from ${church_name ?? "your church"} via Vestry Hub.` : message,
      is_test: Boolean(is_test),
      church_name: church_name || null,
    };

    const credits = is_test ? 0 : normalizedRecipients.length;
    const { data: jobId, error: reserveError } = await supabase.rpc("reserve_communication_credits", {
      p_tenant_id: tenant_id,
      p_channel: "sms",
      p_credits: credits,
      p_payload: queuedPayload,
      p_scheduled_at: null,
    });

    if (reserveError || !jobId) {
      const messageText = reserveError?.message || "Unable to queue SMS";
      const limitReached = /credit limit/i.test(messageText);
      return json({ error: limitReached ? "SMS credit limit reached. Top up to continue." : messageText, limit_reached: limitReached }, limitReached ? 402 : 500);
    }

    const rows = normalizedRecipients.map((recipient) => ({
      job_id: jobId,
      tenant_id,
      destination: recipient.phone,
      display_name: recipient.name || [recipient.first_name, recipient.last_name].filter(Boolean).join(" ") || null,
      payload: recipient,
    }));
    const { error: recipientError } = await supabase.from("communication_job_recipients").insert(rows);
    if (recipientError) {
      await supabase.rpc("release_communication_job", { p_job_id: jobId, p_reason: `recipient_setup_failed:${recipientError.message}` });
      return json({ error: "Unable to queue recipients" }, 500);
    }

    return json({ ok: true, queued: true, job_id: jobId, recipient_count: rows.length }, 202);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
