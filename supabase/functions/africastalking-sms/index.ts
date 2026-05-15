import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id, recipients, message, is_test, admin_phone, church_name } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Fetch church's AT credentials
    const { data: settings } = await supabase
      .from("sms_settings")
      .select("at_username, at_api_key, sender_id, is_configured")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!settings?.is_configured || !settings.at_username || !settings.at_api_key) {
      return new Response(JSON.stringify({ error: "SMS not configured. Add Africa's Talking credentials in Settings → Communications → SMS." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { at_username, at_api_key, sender_id } = settings;

    // ── TEST SMS ──────────────────────────────────────────────────────────────
    if (is_test) {
      if (!admin_phone) {
        return new Response(JSON.stringify({ error: "admin_phone is required for test SMS" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const testMessage = `This is a test SMS from ${church_name ?? "your church"} via Vestry Hub. Your SMS configuration is working correctly.`;
      const body = new URLSearchParams({ username: at_username, to: admin_phone, message: testMessage });
      if (sender_id) body.set("from", sender_id);

      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: { "apiKey": at_api_key, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`AT error: ${JSON.stringify(data)}`);

      // Log to sms_history
      const { data: historyRow } = await supabase.from("sms_history").insert({
        tenant_id, message: testMessage, recipient_count: 1,
        delivered_count: 0, failed_count: 0, status: "sent", is_test: true,
        sent_at: new Date().toISOString(),
      }).select("id").single();

      // Log recipient with AT message ID
      const atRecipient = data?.SMSMessageData?.Recipients?.[0];
      if (historyRow?.id && atRecipient) {
        await supabase.from("sms_recipients").insert({
          sms_history_id: historyRow.id,
          tenant_id,
          at_message_id: atRecipient.messageId ?? null,
          phone_number: admin_phone,
          status: atRecipient.status === "Success" ? "sent" : "failed",
          network_code: atRecipient.networkCode ?? null,
        });
      }

      return new Response(JSON.stringify({ ok: true, sent_to: admin_phone }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BULK SMS ──────────────────────────────────────────────────────────────
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "recipients array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant name for placeholder replacement
    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", tenant_id).maybeSingle();
    const churchNameResolved: string = church_name ?? tenant?.name ?? "Your Church";

    let totalCost = 0;
    let successCount = 0;
    let failCount = 0;
    const currency = "KES";

    // Collect per-recipient results for sms_recipients insert
    const recipientRows: {
      tenant_id: string;
      sms_history_id: string;
      at_message_id: string | null;
      phone_number: string;
      status: string;
      failure_reason: string | null;
      network_code: string | null;
    }[] = [];

    // Create the sms_history record first so we have an ID for recipients
    const { data: historyRow } = await supabase.from("sms_history").insert({
      tenant_id,
      message,
      recipient_count: recipients.length,
      delivered_count: 0,
      failed_count: 0,
      status: "sent",
      cost: 0,
      currency,
      is_test: false,
      sent_at: new Date().toISOString(),
    }).select("id").single();

    const historyId = historyRow?.id;

    for (const recipient of recipients) {
      if (!recipient.phone) {
        failCount++;
        if (historyId) {
          recipientRows.push({ tenant_id, sms_history_id: historyId, at_message_id: null, phone_number: recipient.phone ?? "unknown", status: "failed", failure_reason: "No phone number", network_code: null });
        }
        continue;
      }

      const firstName = recipient.first_name ?? recipient.name?.split(" ")[0] ?? "Friend";
      const lastName = recipient.last_name ?? (recipient.name?.split(" ").slice(1).join(" ") ?? "");
      const fullName = recipient.name ?? `${firstName} ${lastName}`.trim();

      const personalised = message
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{last_name\}\}/g, lastName)
        .replace(/\{\{full_name\}\}/g, fullName)
        .replace(/\{\{member_name\}\}/g, fullName)
        .replace(/\{\{church_name\}\}/g, churchNameResolved);

      const body = new URLSearchParams({ username: at_username, to: recipient.phone, message: personalised });
      if (sender_id) body.set("from", sender_id);

      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: { "apiKey": at_api_key, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body,
      });
      const data = await res.json();
      const atRecipient = data?.SMSMessageData?.Recipients?.[0];

      if (res.ok && atRecipient?.status === "Success") {
        successCount++;
        const costStr = String(atRecipient?.cost ?? "0").replace(/[^0-9.]/g, "");
        totalCost += parseFloat(costStr) || 0;
        if (historyId) {
          recipientRows.push({
            tenant_id,
            sms_history_id: historyId,
            at_message_id: atRecipient?.messageId ?? null,
            phone_number: recipient.phone,
            status: "sent",
            failure_reason: null,
            network_code: atRecipient?.networkCode ?? null,
          });
        }
      } else {
        failCount++;
        if (historyId) {
          recipientRows.push({
            tenant_id,
            sms_history_id: historyId,
            at_message_id: atRecipient?.messageId ?? null,
            phone_number: recipient.phone,
            status: "failed",
            failure_reason: atRecipient?.status ?? "Unknown error",
            network_code: atRecipient?.networkCode ?? null,
          });
        }
      }
    }

    // Update sms_history with final counts
    if (historyId) {
      const finalStatus = failCount === recipients.length ? "failed"
        : successCount === recipients.length ? "sent"
        : "partial";

      await supabase.from("sms_history").update({
        delivered_count: successCount,
        failed_count: failCount,
        status: finalStatus,
        cost: totalCost,
      }).eq("id", historyId);

      // Bulk insert recipient rows
      if (recipientRows.length > 0) {
        await supabase.from("sms_recipients").insert(recipientRows as any);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: successCount, failed: failCount, cost: totalCost, currency }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
