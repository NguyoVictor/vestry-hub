import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { channel, to, subject, body, booking_id, tenant_id } = payload;

    // 8.5 — validate required fields
    if (!channel || !to || !body || !booking_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "missing_fields", message: "channel, to, body, booking_id, and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (channel !== "email" && channel !== "sms") {
      return new Response(
        JSON.stringify({ error: "invalid_channel", message: "channel must be 'email' or 'sms'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8.3 — email via Resend
    if (channel === "email") {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        return new Response(
          JSON.stringify({ error: "config_error", message: "RESEND_API_KEY is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vestry Bookings <noreply@vestry.app>",
          to,
          subject: subject ?? "Booking Confirmation",
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px"><p>${body}</p></div>`,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(
          JSON.stringify({ error: "send_failed", message: `Resend error: ${err}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, channel: "email", booking_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8.4 — SMS via Africa's Talking
    if (channel === "sms") {
      const AT_API_KEY = Deno.env.get("AT_API_KEY");
      const AT_USERNAME = Deno.env.get("AT_USERNAME");

      if (!AT_API_KEY || !AT_USERNAME) {
        return new Response(
          JSON.stringify({ error: "config_error", message: "AT_API_KEY or AT_USERNAME is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "apiKey": AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: new URLSearchParams({ username: AT_USERNAME, to, message: body }),
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(
          JSON.stringify({ error: "send_failed", message: `Africa's Talking error: ${err}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, channel: "sms", booking_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "server_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
