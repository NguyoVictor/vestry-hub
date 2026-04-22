import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, churchCode } = await req.json();

    if (!email || !churchCode) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Look up tenant by church_code OR invite_code (both are the same access code)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, logo, church_code, slug")
      .or(`church_code.eq.${churchCode.trim().toUpperCase()},invite_code.eq.${churchCode.trim().toUpperCase()}`)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Look up member by email + tenant_id
    const { data: member } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, phone, avatar_url, status, member_type, membership_status, created_at")
      .eq("tenant_id", tenant.id)
      .eq("email", email.trim().toLowerCase())
      .neq("status", "inactive")
      .single();

    if (!member) {
      return new Response(JSON.stringify({ error: "member_not_found" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block pending approval members — they must wait for admin approval
    if (member.membership_status === "Pending Approval") {
      return new Response(JSON.stringify({ error: "pending_approval" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Generate session token
    const sessionToken = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // 4. Insert session
    await supabase.from("member_sessions").insert({
      member_id: member.id,
      tenant_id: tenant.id,
      session_token: sessionToken,
      expires_at: expiresAt,
    });

    // 5. Update portal_last_seen
    await supabase.from("members").update({ portal_last_seen: new Date().toISOString() }).eq("id", member.id);

    return new Response(
      JSON.stringify({ member, tenant, sessionToken, expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
