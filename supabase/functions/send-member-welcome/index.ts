import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { memberId, tenantId, channel } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: member }, { data: tenant }] = await Promise.all([
      supabase.from("members").select("first_name, last_name, email, phone").eq("id", memberId).single(),
      supabase.from("tenants").select("name, logo, church_code").eq("id", tenantId).single(),
    ]);

    if (!member || !tenant) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const loginUrl = `https://vestry.app/member/login?code=${tenant.church_code}`;

    if (channel === "email" && member.email) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      if (!RESEND_API_KEY) {
        // No email provider configured — return the details so frontend can show them
        return new Response(JSON.stringify({
          success: false,
          no_provider: true,
          details: {
            memberName: `${member.first_name} ${member.last_name}`,
            email: member.email,
            churchCode: tenant.church_code,
            loginUrl,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Vestry <noreply@vestry.app>",
          to: member.email,
          subject: `Welcome to ${tenant.name} — Your Member Portal Access`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              ${tenant.logo ? `<img src="${tenant.logo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 16px" />` : ""}
              <h1 style="text-align:center;font-size:22px;color:#1e293b">${tenant.name}</h1>
              <p style="color:#64748b;text-align:center">Member Portal Access</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
              <p>Hi <strong>${member.first_name}</strong>,</p>
              <p>You have been registered as a member of <strong>${tenant.name}</strong>.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin:24px 0">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px">Your Church Access Code</p>
                <p style="font-size:28px;font-weight:700;font-family:monospace;letter-spacing:4px;color:#4F46E5;margin:0">${tenant.church_code}</p>
              </div>
              <p style="color:#64748b;font-size:14px">To sign in:</p>
              <ol style="color:#64748b;font-size:14px">
                <li>Visit <a href="${loginUrl}" style="color:#4F46E5">${loginUrl}</a></li>
                <li>Enter your email: <strong>${member.email}</strong></li>
                <li>Enter your church code: <strong>${tenant.church_code}</strong></li>
              </ol>
              <p style="color:#94a3b8;font-size:12px;margin-top:32px;text-align:center">Save this code — you will need it every time you sign in.</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${err}`);
      }
    }

    if (channel === "sms" && member.phone) {
      const AT_API_KEY = Deno.env.get("AT_API_KEY");
      const AT_USERNAME = Deno.env.get("AT_USERNAME");
      if (AT_API_KEY && AT_USERNAME) {
        const message = `Welcome to ${tenant.name}! Your church access code is: ${tenant.church_code}. Sign in at vestry.app/member/login`;
        await fetch("https://api.africastalking.com/version1/messaging", {
          method: "POST",
          headers: { "apiKey": AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
          body: new URLSearchParams({ username: AT_USERNAME, to: member.phone, message }),
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          no_provider: true,
          details: { churchCode: tenant.church_code, loginUrl },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
