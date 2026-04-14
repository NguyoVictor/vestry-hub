import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, tenantId, userId, time, days, toEmail, toName, passage, streak } = body;

    // ── action: save_preference — just acknowledge, preference stored client-side ──
    if (action === "save_preference") {
      return new Response(JSON.stringify({ success: true, message: "Preference saved" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── action: send_reminder — send actual email via Resend ──
    if (action === "send_reminder") {
      if (!toEmail) {
        return new Response(JSON.stringify({ error: "toEmail is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #fafafa; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #f97316, #fb923c); padding: 32px 32px 24px; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 16px; color: #1a1a1a; margin-bottom: 16px; }
    .passage-card { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .passage-card .label { font-size: 11px; font-weight: 600; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .passage-card .passage { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .streak { display: inline-flex; align-items: center; gap: 6px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 20px; padding: 6px 14px; font-size: 13px; color: #ea580c; font-weight: 600; margin: 12px 0; }
    .cta { display: block; background: #f97316; color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 20px 0; }
    .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #f0f0f0; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📖 Your Daily Bible Reading</h1>
      <p>Time to spend a moment with the Word</p>
    </div>
    <div class="body">
      <p class="greeting">Good ${getTimeOfDay(time)}, ${toName || "friend"}! 👋</p>
      <p style="color:#4b5563;font-size:14px;">Your scheduled reading for today is ready.</p>

      ${passage ? `
      <div class="passage-card">
        <div class="label">Today's Reading</div>
        <div class="passage">${passage}</div>
      </div>
      ` : ""}

      ${streak && streak > 0 ? `
      <div class="streak">🔥 ${streak}-day streak — keep it going!</div>
      ` : ""}

      <a href="${Deno.env.get("SITE_URL") || "https://vestry.app"}/bible-explorer" class="cta">
        Open Bible Explorer →
      </a>

      <p style="color:#6b7280;font-size:13px;">
        "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
      </p>
    </div>
    <div class="footer">
      You're receiving this because you enabled Bible reading reminders.<br>
      To unsubscribe, turn off reminders in Bible Explorer → Reminders tab.
    </div>
  </div>
</body>
</html>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Bible Explorer <reminders@vestry.app>",
          to: [toEmail],
          subject: `📖 Your Daily Bible Reading${passage ? ` — ${passage}` : ""}`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        return new Response(JSON.stringify({ error: `Resend error: ${resendRes.status}`, detail: errText }), {
          status: resendRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resendRes.json();
      return new Response(JSON.stringify({ success: true, id: data.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getTimeOfDay(time: string): string {
  if (!time) return "day";
  const hour = parseInt(time.split(":")[0]);
  const isPM = time.includes("PM");
  const h24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
  if (h24 < 12) return "morning";
  if (h24 < 17) return "afternoon";
  return "evening";
}
