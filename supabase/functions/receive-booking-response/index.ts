import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let payload: Record<string, unknown>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Africa's Talking sends form-encoded webhooks
      const text = await req.text();
      const params = new URLSearchParams(text);
      payload = Object.fromEntries(params.entries());
    } else {
      payload = await req.json();
    }

    // ── Detect channel ────────────────────────────────────────────────────────
    const isAtSms = "from" in payload && "text" in payload;
    const isResendEmail = "type" in payload && typeof payload.type === "string" && payload.type.startsWith("email.");

    if (!isAtSms && !isResendEmail) {
      return jsonResponse({ error: "unrecognised_payload", message: "Cannot determine channel from payload" }, 400);
    }

    // ── 12.2 — Handle inbound AT SMS webhook ─────────────────────────────────
    if (isAtSms) {
      const from = payload["from"] as string | undefined;
      const text = payload["text"] as string | undefined;
      const linkId = payload["linkId"] as string | undefined;

      if (!from || !text) {
        return jsonResponse({ error: "malformed_sms", message: "Missing 'from' or 'text' fields" }, 400);
      }

      // Resolve booking_id from linkId (AT passes the original message ID as linkId)
      // linkId may encode booking_id; fall back to null if not resolvable
      const bookingId = linkId ?? null;

      // Derive tenant_id from booking if linkId resolves, otherwise require it in payload
      let tenantId = (payload["tenantId"] ?? payload["tenant_id"]) as string | undefined;

      if (!tenantId && bookingId) {
        const { data: booking } = await supabase
          .from("facility_bookings")
          .select("tenant_id")
          .eq("id", bookingId)
          .single();
        tenantId = booking?.tenant_id;
      }

      if (!tenantId) {
        return jsonResponse({ error: "missing_tenant", message: "Cannot resolve tenant_id from SMS payload" }, 400);
      }

      const responseId = crypto.randomUUID().replace(/-/g, "").substring(0, 20);

      const { error: insertError } = await supabase
        .from("facility_booking_responses")
        .insert({
          id: responseId,
          tenant_id: tenantId,
          booking_id: bookingId,
          channel: "sms",
          from_address: from,
          body: text,
          is_read: false,
        });

      if (insertError) {
        return jsonResponse({ error: "insert_failed", message: insertError.message }, 500);
      }

      await insertNotifications(supabase, tenantId, responseId, bookingId);

      return jsonResponse({ success: true, channel: "sms", response_id: responseId });
    }

    // ── 12.3 — Handle inbound Resend email reply webhook ─────────────────────
    if (isResendEmail) {
      // Resend inbound email webhook shape:
      // { type: "email.received", data: { from: "...", subject: "...", text: "...", html: "...", headers: [...] } }
      const data = payload["data"] as Record<string, unknown> | undefined;

      if (!data) {
        return jsonResponse({ error: "malformed_email", message: "Missing 'data' field in Resend webhook" }, 400);
      }

      const fromAddress = data["from"] as string | undefined;
      const body = (data["text"] ?? data["html"] ?? "") as string;

      if (!fromAddress) {
        return jsonResponse({ error: "malformed_email", message: "Missing 'from' in email data" }, 400);
      }

      // Extract booking_id from custom headers if present (set when sending confirmation)
      const headers = (data["headers"] as Array<{ name: string; value: string }>) ?? [];
      const bookingIdHeader = headers.find((h) => h.name.toLowerCase() === "x-booking-id");
      const tenantIdHeader = headers.find((h) => h.name.toLowerCase() === "x-tenant-id");

      const bookingId = bookingIdHeader?.value ?? null;
      let tenantId = tenantIdHeader?.value;

      if (!tenantId && bookingId) {
        const { data: booking } = await supabase
          .from("facility_bookings")
          .select("tenant_id")
          .eq("id", bookingId)
          .single();
        tenantId = booking?.tenant_id;
      }

      if (!tenantId) {
        return jsonResponse({ error: "missing_tenant", message: "Cannot resolve tenant_id from email payload" }, 400);
      }

      const responseId = crypto.randomUUID().replace(/-/g, "").substring(0, 20);

      const { error: insertError } = await supabase
        .from("facility_booking_responses")
        .insert({
          id: responseId,
          tenant_id: tenantId,
          booking_id: bookingId,
          channel: "email",
          from_address: fromAddress,
          body: body,
          is_read: false,
        });

      if (insertError) {
        return jsonResponse({ error: "insert_failed", message: insertError.message }, 500);
      }

      await insertNotifications(supabase, tenantId, responseId, bookingId);

      return jsonResponse({ success: true, channel: "email", response_id: responseId });
    }

  } catch (err) {
    return jsonResponse({ error: "server_error", message: String(err) }, 500);
  }
});

// ── 12.4 — Insert notifications for all admin users in the tenant ─────────────
async function insertNotifications(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  responseId: string,
  bookingId: string | null
) {
  // Fetch all admin/super_admin users for this tenant
  const { data: adminUsers } = await supabase
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "super_admin"]);

  if (!adminUsers?.length) return;

  const notifications = adminUsers.map((u: { id: string }) => ({
    id: crypto.randomUUID().replace(/-/g, "").substring(0, 20),
    tenant_id: tenantId,
    user_id: u.id,
    type: "facility_response",
    title: "New booking response received",
    body: bookingId ? `Reply received for booking ${bookingId}` : "A booker has replied to a facility booking.",
    is_read: false,
    task_id: responseId,
  }));

  await supabase.from("notifications").insert(notifications);
}
