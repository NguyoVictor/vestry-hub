import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Format phone number to E.164 format (remove leading 0, add 254 prefix for Kenya)
function formatPhoneToE164(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 254 (Kenya)
  if (digits.startsWith('0')) {
    return '254' + digits.substring(1);
  }
  
  // If already starts with 254, return as is
  if (digits.startsWith('254')) {
    return digits;
  }
  
  // If 9 digits, assume it's missing the 0 prefix, add 254
  if (digits.length === 9) {
    return '254' + digits;
  }
  
  return digits;
}

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

    // Check SMS usage limits
    const { data: subscription } = await supabase
      .from("tenant_subscriptions")
      .select("sms_credits, sms_addons, sms_used")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (subscription) {
      const smsLimit = (subscription.sms_credits || 0) + (subscription.sms_addons || 0);
      const smsUsed = subscription.sms_used || 0;
      
      if (smsUsed >= smsLimit) {
        return new Response(JSON.stringify({ 
          error: "SMS credit limit reached. Top up to continue.",
          limit_reached: true 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch church's Sozuri credentials
    const { data: settings } = await supabase
      .from("sms_settings")
      .select("sozuri_api_key, sozuri_project, sender_id, message_type, is_configured")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!settings?.is_configured || !settings.sozuri_api_key || !settings.sozuri_project || !settings.sender_id) {
      return new Response(JSON.stringify({ error: "SMS not configured. Add Sozuri credentials in Settings → Communications → SMS." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sozuri_api_key, sozuri_project, sender_id, message_type } = settings;

    // ── TEST SMS ──────────────────────────────────────────────────────────────
    if (is_test) {
      if (!admin_phone) {
        return new Response(JSON.stringify({ error: "admin_phone is required for test SMS" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const testMessage = `This is a test SMS from ${church_name ?? "your church"} via Vestry Hub. Your SMS configuration is working correctly.`;
      const formattedPhone = formatPhoneToE164(admin_phone);

      const response = await fetch('https://sozuri.net/api/v1/messaging', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sozuri_api_key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          project: sozuri_project,
          from: sender_id,
          to: formattedPhone,
          message: testMessage,
          type: message_type || 'promotional',
          channel: 'sms'
        })
      });

      const sozuriData = await response.json();
      if (!response.ok) throw new Error(`Sozuri error: ${JSON.stringify(sozuriData)}`);

      const isAccepted = sozuriData.recipients?.[0]?.status === 'accepted';

      if (!isAccepted) {
        return new Response(JSON.stringify({
          error: `SMS failed: ${sozuriData.recipients?.[0]?.status ?? 'unknown error'}`
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Log to sms_history
      const { data: historyRow } = await supabase.from("sms_history").insert({
        tenant_id, message: testMessage, recipient_count: 1,
        delivered_count: isAccepted ? 1 : 0, failed_count: isAccepted ? 0 : 1, 
        status: isAccepted ? "sent" : "failed", is_test: true,
        sent_at: new Date().toISOString(),
      }).select("id").single();

      // Log recipient
      if (historyRow?.id) {
        await supabase.from("sms_recipients").insert({
          sms_history_id: historyRow.id,
          tenant_id,
          at_message_id: sozuriData.message_id ?? null,
          phone_number: formattedPhone,
          status: isAccepted ? "sent" : "failed",
          failure_reason: isAccepted ? null : sozuriData.recipients?.[0]?.status,
          network_code: null,
        });
      }

      return new Response(JSON.stringify({ ok: true, sent_to: formattedPhone }), {
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

    let successCount = 0;
    let failCount = 0;

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
      currency: "KES",
      is_test: false,
      sent_at: new Date().toISOString(),
    }).select("id").single();

    const historyId = historyRow?.id;

    // Format all phone numbers and prepare message
    const formattedRecipients = recipients
      .filter(r => r.phone)
      .map(r => formatPhoneToE164(r.phone));

    if (formattedRecipients.length === 0) {
      return new Response(JSON.stringify({ error: "No valid phone numbers found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace placeholders in message (using first recipient for personalization)
    const firstRecipient = recipients.find(r => r.phone);
    const firstName = firstRecipient?.first_name ?? firstRecipient?.name?.split(" ")[0] ?? "Friend";
    const lastName = firstRecipient?.last_name ?? (firstRecipient?.name?.split(" ").slice(1).join(" ") ?? "");
    const fullName = firstRecipient?.name ?? `${firstName} ${lastName}`.trim();

    const personalizedMessage = message
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{last_name\}\}/g, lastName)
      .replace(/\{\{full_name\}\}/g, fullName)
      .replace(/\{\{member_name\}\}/g, fullName)
      .replace(/\{\{church_name\}\}/g, churchNameResolved);

    // Send bulk SMS via Sozuri
    const response = await fetch('https://sozuri.net/api/v1/messaging', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sozuri_api_key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        project: sozuri_project,
        from: sender_id,
        to: formattedRecipients.join(','), // E.164 format e.g. 254712345678
        message: personalizedMessage,
        type: message_type || 'promotional',
        channel: 'sms'
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      successCount = formattedRecipients.length;
      failCount = 0;

      // Increment SMS usage after successful send
      if (subscription) {
        await supabase
          .from("tenant_subscriptions")
          .update({ 
            sms_used: (subscription.sms_used || 0) + successCount,
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenant_id);
      }

      // Log successful recipients
      if (historyId) {
        for (const phone of formattedRecipients) {
          recipientRows.push({
            tenant_id,
            sms_history_id: historyId,
            at_message_id: data.message_id ?? null,
            phone_number: phone,
            status: "sent",
            failure_reason: null,
            network_code: null,
          });
        }
      }
    } else {
      successCount = 0;
      failCount = formattedRecipients.length;

      // Log failed recipients
      if (historyId) {
        for (const phone of formattedRecipients) {
          recipientRows.push({
            tenant_id,
            sms_history_id: historyId,
            at_message_id: null,
            phone_number: phone,
            status: "failed",
            failure_reason: data.message ?? "Unknown error",
            network_code: null,
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
        cost: 0, // Sozuri doesn't provide cost info in response
      }).eq("id", historyId);

      // Bulk insert recipient rows
      if (recipientRows.length > 0) {
        await supabase.from("sms_recipients").insert(recipientRows as any);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: successCount, failed: failCount, cost: 0, currency: "KES" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
