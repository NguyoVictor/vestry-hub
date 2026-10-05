import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildBrandedEmail } from "../_shared/branded-email.ts";
import { replacePlaceholders, getMemberPlaceholderData, type PlaceholderData } from "../_shared/placeholder-replacer.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

type QueueMessage = { msg_id: number; read_ct: number; message: { job_id?: string } };

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

async function sendResend(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { response, data };
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (!(await authorizeWorker(req, supabase))) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

  const { data: messages, error: claimError } = await supabase.rpc("claim_communication_jobs", {
    p_channel: "email",
    p_visibility_seconds: 180,
    p_batch_size: 10,
  });
  if (claimError) return json({ error: claimError.message }, 500);

  const results: unknown[] = [];
  for (const queueMessage of (messages || []) as QueueMessage[]) {
    const jobId = queueMessage.message?.job_id;
    if (!jobId) {
      await supabase.rpc("ack_communication_job", { p_channel: "email", p_msg_id: queueMessage.msg_id });
      continue;
    }

    const { data: job } = await supabase.from("communication_jobs").select("*").eq("id", jobId).maybeSingle();
    if (!job || ["completed", "partial", "failed", "cancelled"].includes(job.status)) {
      await supabase.rpc("ack_communication_job", { p_channel: "email", p_msg_id: queueMessage.msg_id });
      continue;
    }

    await supabase.from("communication_jobs").update({
      status: "processing",
      attempt_count: (job.attempt_count || 0) + 1,
      started_at: job.started_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    const payload = job.payload as any;
    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", job.tenant_id).maybeSingle();
    const churchName = tenant?.name || "Your Church";
    const { data: recipientRows } = await supabase
      .from("communication_job_recipients")
      .select("*")
      .eq("job_id", jobId)
      .neq("status", "sent")
      .order("created_at", { ascending: true });

    let delivered = 0;
    let failed = 0;
    let transientFailure = false;
    let providerRef: string | null = null;

    for (const recipientRow of recipientRows || []) {
      const recipient = recipientRow.payload || {};
      await supabase.from("communication_job_recipients").update({
        status: "processing",
        attempt_count: (recipientRow.attempt_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", recipientRow.id);

      const placeholderData: PlaceholderData = payload.is_test
        ? { first_name: payload.admin_first_name || "Admin", church_name: churchName }
        : {
            ...(await getMemberPlaceholderData(supabase, job.tenant_id, recipientRow.destination)),
            ...(payload.event_data ? {
              event_name: payload.event_data.name,
              event_date: payload.event_data.date,
              event_time: payload.event_data.time,
              event_location: payload.event_data.location,
            } : {}),
            ...(payload.giving_data ? {
              amount: payload.giving_data.amount,
              giving_type: payload.giving_data.type,
              receipt_number: payload.giving_data.receipt_number,
              giving_date: payload.giving_data.date,
            } : {}),
          };

      const subject = payload.is_test ? "Test Email - Vestry Hub" : replacePlaceholders(payload.subject || "", placeholderData);
      const bodyHtml = payload.is_test
        ? `<p>Hello ${payload.admin_first_name || "Admin"},</p><p>This is a test email from <strong>Vestry Hub</strong>.</p>`
        : `<p>${replacePlaceholders(payload.body || "", placeholderData).replace(/\n/g, "<br/>")}</p>`;
      const html = await buildBrandedEmail({ tenantId: job.tenant_id, churchName, subject, bodyHtml, supabaseClient: supabase });

      try {
        const { response, data } = await sendResend(apiKey, {
          from: `${churchName} <support@vestryhub.com>`,
          to: [recipientRow.destination],
          subject,
          html,
          ...(Array.isArray(payload.attachments) && payload.attachments.length ? {
            attachments: payload.attachments.map((att: any) => ({ filename: att.name, path: att.url })),
          } : {}),
        });

        if (response.ok) {
          delivered++;
          providerRef = providerRef || data?.id || null;
          await supabase.from("communication_job_recipients").update({
            status: "sent", provider_ref: data?.id || null, last_error: null,
            sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }).eq("id", recipientRow.id);
        } else if (response.status === 429 || response.status >= 500) {
          transientFailure = true;
          await supabase.from("communication_job_recipients").update({
            status: "pending", last_error: `resend_${response.status}`, updated_at: new Date().toISOString(),
          }).eq("id", recipientRow.id);
        } else {
          failed++;
          await supabase.from("communication_job_recipients").update({
            status: "failed", last_error: `resend_${response.status}`, updated_at: new Date().toISOString(),
          }).eq("id", recipientRow.id);
        }
      } catch (error) {
        transientFailure = true;
        await supabase.from("communication_job_recipients").update({
          status: "pending", last_error: String(error), updated_at: new Date().toISOString(),
        }).eq("id", recipientRow.id);
      }
    }

    const { count: alreadySent = 0 } = await supabase.from("communication_job_recipients").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "sent");
    const { count: permanentFailed = 0 } = await supabase.from("communication_job_recipients").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "failed");

    if (transientFailure && (job.attempt_count || 0) + 1 < (job.max_attempts || 5)) {
      await supabase.from("communication_jobs").update({ status: "queued", last_error: "transient_provider_failure", updated_at: new Date().toISOString() }).eq("id", jobId);
      results.push({ job_id: jobId, retry: true, delivered, failed });
      continue;
    }

    if (transientFailure) {
      await supabase.from("communication_job_recipients").update({ status: "failed", last_error: "retry_limit_reached", updated_at: new Date().toISOString() }).eq("job_id", jobId).neq("status", "sent");
    }

    const { count: finalFailed = 0 } = await supabase.from("communication_job_recipients").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "failed");
    await supabase.rpc("finalize_communication_job", {
      p_job_id: jobId,
      p_delivered_count: alreadySent || 0,
      p_failed_count: finalFailed || permanentFailed || failed,
      p_provider_ref: providerRef,
      p_last_error: finalFailed ? "one_or_more_recipients_failed" : null,
    });

    await supabase.from("communications").insert({
      tenant_id: job.tenant_id,
      channel: "email",
      subject: payload.subject || "Test Email - Vestry Hub",
      body: payload.body || "Test email",
      recipient_count: payload.recipients?.length || 0,
      status: finalFailed ? ((alreadySent || 0) > 0 ? "partial" : "failed") : "sent",
      sent_at: new Date().toISOString(),
      is_test: Boolean(payload.is_test),
    });

    await supabase.rpc("ack_communication_job", { p_channel: "email", p_msg_id: queueMessage.msg_id });
    results.push({ job_id: jobId, delivered: alreadySent || 0, failed: finalFailed || 0, acked: true });
  }

  return json({ ok: true, processed: results.length, results });
});
