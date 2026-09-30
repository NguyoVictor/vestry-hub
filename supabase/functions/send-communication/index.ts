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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const {
      tenant_id,
      channel = "email",
      subject,
      body,
      recipients,
      attachments = [],
      is_test = false,
      admin_email,
      admin_first_name,
      schedule_at,
      event_data,
      giving_data,
    } = payload;

    if (!tenant_id) return json({ error: "tenant_id is required" }, 400);
    if (channel !== "email") return json({ error: "send-communication only accepts email jobs" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
      await authorizeTenantActor(req, supabase, tenant_id);
    } catch (error) {
      return json({ error: String(error).includes("forbidden") ? "forbidden" : "unauthorized" }, String(error).includes("forbidden") ? 403 : 401);
    }

    const normalizedRecipients = is_test
      ? (admin_email ? [{ email: String(admin_email).trim().toLowerCase(), first_name: admin_first_name || "Admin", name: admin_first_name || "Admin" }] : [])
      : (Array.isArray(recipients) ? recipients : [])
          .filter((recipient) => recipient?.email)
          .map((recipient) => ({ ...recipient, email: String(recipient.email).trim().toLowerCase() }));

    if (normalizedRecipients.length === 0) return json({ error: is_test ? "admin_email is required" : "recipients array is required" }, 400);
    if (!is_test && (!subject || !body)) return json({ error: "subject and body are required" }, 400);

    const queuedPayload = {
      tenant_id,
      channel: "email",
      subject: is_test ? "Test Email - Vestry Hub" : subject,
      body: is_test ? null : body,
      recipients: normalizedRecipients,
      attachments,
      is_test: Boolean(is_test),
      admin_first_name: admin_first_name || null,
      event_data: event_data || null,
      giving_data: giving_data || null,
    };

    const credits = is_test ? 0 : normalizedRecipients.length;
    const { data: jobId, error: reserveError } = await supabase.rpc("reserve_communication_credits", {
      p_tenant_id: tenant_id,
      p_channel: "email",
      p_credits: credits,
      p_payload: queuedPayload,
      p_scheduled_at: schedule_at || null,
    });

    if (reserveError || !jobId) {
      const message = reserveError?.message || "Unable to queue email";
      const limitReached = /credit limit/i.test(message);
      return json({ error: limitReached ? "Email credit limit reached. Top up to continue." : message, limit_reached: limitReached }, limitReached ? 402 : 500);
    }

    const recipientRows = normalizedRecipients.map((recipient) => ({
      job_id: jobId,
      tenant_id,
      destination: recipient.email,
      display_name: recipient.name || [recipient.first_name, recipient.last_name].filter(Boolean).join(" ") || null,
      payload: recipient,
    }));
    const { error: recipientsError } = await supabase.from("communication_job_recipients").insert(recipientRows);
    if (recipientsError) {
      await supabase.rpc("release_communication_job", { p_job_id: jobId, p_reason: `recipient_setup_failed:${recipientsError.message}` });
      return json({ error: "Unable to queue recipients" }, 500);
    }

    return json({ ok: true, queued: true, job_id: jobId, recipient_count: normalizedRecipients.length, scheduled: Boolean(schedule_at) }, 202);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
