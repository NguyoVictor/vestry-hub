import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// This endpoint receives delivery reports from Africa's Talking.
// Configure it in your AT dashboard under SMS → Delivery Reports:
//   https://<your-project>.supabase.co/functions/v1/africastalking-delivery-webhook
//
// AT posts application/x-www-form-urlencoded with these fields:
//   id          — AT message ID (matches at_message_id in sms_recipients)
//   status      — Success | Failed | Rejected | Expired
//   phoneNumber — recipient phone number
//   networkCode — network operator code
//   failureReason — reason string (only present when status != Success)
//   retryCount  — number of retry attempts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map AT status strings to our internal status values
function mapStatus(atStatus: string): string {
  switch (atStatus) {
    case "Success":   return "delivered";
    case "Failed":    return "failed";
    case "Rejected":  return "rejected";
    case "Expired":   return "expired";
    default:          return "failed";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // AT sends POST with application/x-www-form-urlencoded
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse form-encoded body
    const text = await req.text();
    const params = new URLSearchParams(text);

    const atMessageId   = params.get("id");
    const atStatus      = params.get("status") ?? "";
    const phoneNumber   = params.get("phoneNumber") ?? "";
    const networkCode   = params.get("networkCode") ?? null;
    const failureReason = params.get("failureReason") ?? null;
    const retryCount    = parseInt(params.get("retryCount") ?? "0", 10);

    // Validate required fields
    if (!atMessageId || !atStatus || !phoneNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, status, phoneNumber" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const internalStatus = mapStatus(atStatus);
    const isDelivered = internalStatus === "delivered";

    // Find the recipient row by AT message ID
    const { data: recipientRow, error: findErr } = await supabase
      .from("sms_recipients")
      .select("id, sms_history_id, tenant_id, status")
      .eq("at_message_id", atMessageId)
      .maybeSingle();

    if (findErr) {
      console.error("Error finding recipient:", findErr.message);
      // Still return 200 so AT doesn't keep retrying
      return new Response(JSON.stringify({ ok: false, error: findErr.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipientRow) {
      // Unknown message ID — could be from a different system or already processed
      console.warn(`No sms_recipient found for at_message_id: ${atMessageId}`);
      return new Response(JSON.stringify({ ok: true, note: "message_id not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already in a terminal state (delivered/failed/rejected/expired)
    const terminalStatuses = ["delivered", "failed", "rejected", "expired"];
    if (terminalStatuses.includes(recipientRow.status)) {
      return new Response(JSON.stringify({ ok: true, note: "already_terminal" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the recipient row
    await supabase.from("sms_recipients").update({
      status: internalStatus,
      failure_reason: failureReason,
      network_code: networkCode,
      retry_count: retryCount,
      delivered_at: isDelivered ? new Date().toISOString() : null,
    }).eq("id", recipientRow.id);

    // Recompute delivered_count and failed_count on the parent sms_history row
    const { data: allRecipients } = await supabase
      .from("sms_recipients")
      .select("status")
      .eq("sms_history_id", recipientRow.sms_history_id);

    if (allRecipients) {
      const delivered = allRecipients.filter(r => r.status === "delivered").length;
      const failed    = allRecipients.filter(r => ["failed", "rejected", "expired"].includes(r.status)).length;
      const total     = allRecipients.length;

      // Determine overall status
      let overallStatus = "sent";
      if (delivered === total)                    overallStatus = "delivered";
      else if (failed === total)                  overallStatus = "failed";
      else if (delivered > 0 || failed > 0)       overallStatus = "partial";

      await supabase.from("sms_history").update({
        delivered_count: delivered,
        failed_count: failed,
        status: overallStatus,
      }).eq("id", recipientRow.sms_history_id);
    }

    return new Response(JSON.stringify({ ok: true, updated: atMessageId, status: internalStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Webhook error:", String(err));
    // Always return 200 to AT so it doesn't retry indefinitely
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
