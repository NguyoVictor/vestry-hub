import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type QueueMessage = { msg_id: number; read_ct: number; message: { job_id?: string } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorizeWorker(req: Request, serviceClient: ReturnType<typeof createClient>): Promise<boolean> {
  const token = (req.headers.get("x-vestry-worker-token") || "").trim();
  if (!token) return false;
  const tokenHash = await sha256Hex(token);
  const { data, error } = await serviceClient
    .from("internal_worker_auth")
    .select("worker_name")
    .eq("worker_name", "communication_queue")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  return !error && Boolean(data);
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (!(await authorizeWorker(req, supabase))) return json({ error: "unauthorized" }, 401);

  const { data: messages, error: claimError } = await supabase.rpc("claim_communication_jobs", {
    p_channel: "sms", p_visibility_seconds: 180, p_batch_size: 10,
  });
  if (claimError) return json({ error: claimError.message }, 500);

  const results: unknown[] = [];
  for (const queueMessage of (messages || []) as QueueMessage[]) {
    const jobId = queueMessage.message?.job_id;
    if (!jobId) {
      await supabase.rpc("ack_communication_job", { p_channel: "sms", p_msg_id: queueMessage.msg_id });
      continue;
    }

    const { data: job } = await supabase.from("communication_jobs").select("*").eq("id", jobId).maybeSingle();
    if (!job || ["completed", "partial", "failed", "cancelled"].includes(job.status)) {
      await supabase.rpc("ack_communication_job", { p_channel: "sms", p_msg_id: queueMessage.msg_id });
      continue;
    }

    await supabase.from("communication_jobs").update({
      status: "processing",
      attempt_count: (job.attempt_count || 0) + 1,
      started_at: job.started_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    const payload = job.payload as any;
    const { data: settings } = await supabase
      .from("sms_settings")
      .select("sozuri_api_key, sozuri_project, sender_id, message_type, is_configured")
      .eq("tenant_id", job.tenant_id)
      .maybeSingle();

    if (!settings?.is_configured || !settings.sozuri_api_key || !settings.sozuri_project || !settings.sender_id) {
      await supabase.rpc("release_communication_job", { p_job_id: jobId, p_reason: "sms_provider_not_configured" });
      await supabase.rpc("ack_communication_job", { p_channel: "sms", p_msg_id: queueMessage.msg_id });
      results.push({ job_id: jobId, error: "sms_provider_not_configured" });
      continue;
    }

    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", job.tenant_id).maybeSingle();
    const churchName = payload.church_name || tenant?.name || "Your Church";
    let { data: history } = await supabase.from("sms_history").select("id").eq("communication_job_id", jobId).maybeSingle();
    if (!history) {
      const inserted = await supabase.from("sms_history").insert({
        communication_job_id: jobId,
        tenant_id: job.tenant_id,
        message: payload.message || "",
        recipient_count: payload.recipients?.length || 0,
        delivered_count: 0,
        failed_count: 0,
        status: "queued",
        cost: 0,
        currency: "KES",
        is_test: Boolean(payload.is_test),
      }).select("id").single();
      history = inserted.data;
    }

    const { data: recipientRows } = await supabase
      .from("communication_job_recipients")
      .select("*")
      .eq("job_id", jobId)
      .neq("status", "sent")
      .order("created_at", { ascending: true });

    let transientFailure = false;
    for (const recipientRow of recipientRows || []) {
      const recipient = recipientRow.payload || {};
      const firstName = recipient.first_name || recipient.name?.split(" ")?.[0] || "Friend";
      const lastName = recipient.last_name || recipient.name?.split(" ")?.slice(1).join(" ") || "";
      const fullName = recipient.name || `${firstName} ${lastName}`.trim();
      const personalizedMessage = String(payload.message || "")
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{last_name\}\}/g, lastName)
        .replace(/\{\{full_name\}\}/g, fullName)
        .replace(/\{\{member_name\}\}/g, fullName)
        .replace(/\{\{church_name\}\}/g, churchName);

      await supabase.from("communication_job_recipients").update({
        status: "processing",
        attempt_count: (recipientRow.attempt_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", recipientRow.id);

      try {
        const response = await fetch("https://sozuri.net/api/v1/messaging", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.sozuri_api_key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            project: settings.sozuri_project,
            from: settings.sender_id,
            to: recipientRow.destination,
            message: personalizedMessage,
            type: settings.message_type || "promotional",
            channel: "sms",
          }),
        });
        const provider = await response.json().catch(() => ({}));
        const accepted = response.ok && (provider.success === true || provider.recipients?.[0]?.status === "accepted");

        if (accepted) {
          const providerRef = provider.message_id || provider.recipients?.[0]?.message_id || null;
          await supabase.from("communication_job_recipients").update({
            status: "sent", provider_ref: providerRef, last_error: null,
            sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }).eq("id", recipientRow.id);
          if (history?.id) {
            await supabase.from("sms_recipients").insert({
              sms_history_id: history.id,
              tenant_id: job.tenant_id,
              at_message_id: providerRef,
              phone_number: recipientRow.destination,
              status: "sent",
              failure_reason: null,
              network_code: null,
            });
          }
        } else if (response.status === 429 || response.status >= 500) {
          transientFailure = true;
          await supabase.from("communication_job_recipients").update({
            status: "pending", last_error: `provider_${response.status}`, updated_at: new Date().toISOString(),
          }).eq("id", recipientRow.id);
        } else {
          await supabase.from("communication_job_recipients").update({
            status: "failed", last_error: provider.message || `provider_${response.status}`, updated_at: new Date().toISOString(),
          }).eq("id", recipientRow.id);
          if (history?.id) {
            await supabase.from("sms_recipients").insert({
              sms_history_id: history.id,
              tenant_id: job.tenant_id,
              at_message_id: null,
              phone_number: recipientRow.destination,
              status: "failed",
              failure_reason: provider.message || `provider_${response.status}`,
              network_code: null,
            });
          }
        }
      } catch (error) {
        transientFailure = true;
        await supabase.from("communication_job_recipients").update({
          status: "pending", last_error: String(error), updated_at: new Date().toISOString(),
        }).eq("id", recipientRow.id);
      }
    }

    if (transientFailure && (job.attempt_count || 0) + 1 < (job.max_attempts || 5)) {
      await supabase.from("communication_jobs").update({ status: "queued", last_error: "transient_provider_failure", updated_at: new Date().toISOString() }).eq("id", jobId);
      results.push({ job_id: jobId, retry: true });
      continue;
    }

    if (transientFailure) {
      await supabase.from("communication_job_recipients").update({ status: "failed", last_error: "retry_limit_reached", updated_at: new Date().toISOString() }).eq("job_id", jobId).neq("status", "sent");
    }

    const { count: sentCount = 0 } = await supabase.from("communication_job_recipients").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "sent");
    const { count: failedCount = 0 } = await supabase.from("communication_job_recipients").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "failed");

    await supabase.rpc("finalize_communication_job", {
      p_job_id: jobId,
      p_delivered_count: sentCount || 0,
      p_failed_count: failedCount || 0,
      p_provider_ref: null,
      p_last_error: failedCount ? "one_or_more_recipients_failed" : null,
    });

    if (history?.id) {
      await supabase.from("sms_history").update({
        delivered_count: sentCount || 0,
        failed_count: failedCount || 0,
        status: failedCount ? ((sentCount || 0) > 0 ? "partial" : "failed") : "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", history.id);
    }

    await supabase.rpc("ack_communication_job", { p_channel: "sms", p_msg_id: queueMessage.msg_id });
    results.push({ job_id: jobId, delivered: sentCount || 0, failed: failedCount || 0, acked: true });
  }

  return json({ ok: true, processed: results.length, results });
});
