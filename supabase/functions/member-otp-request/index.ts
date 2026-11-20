import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Finding 1, login steps 4-6: verify that the email belongs to a registered,
// portal-provisioned member of the church identified by the access code, then
// ask Supabase Auth to send the email OTP via the existing signInWithOtp flow
// with shouldCreateUser:false. The response is identical whether or not the
// member exists, so the endpoint cannot be used to enumerate members. The
// church code is never authentication: member-login still requires the
// OTP-verified Auth JWT.

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^[A-Z0-9-]{4,32}$/;
const GENERIC = { ok: true, message: "If the details match a registered member, a sign-in code has been sent." };
// Every generic reply takes at least this long, so response timing does not
// reveal whether the email belongs to a provisioned member (OTP send is slow).
const MIN_GENERIC_MS = 2500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const started = Date.now();
  const generic = async () => {
    const wait = MIN_GENERIC_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return reply(GENERIC);
  };

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply({ error: "server_configuration_error" }, 500);

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const churchCode = typeof body?.churchCode === "string" ? body.churchCode.trim().toUpperCase() : "";
    if (!EMAIL_RE.test(email) || email.length > 254 || !CODE_RE.test(churchCode)) {
      return reply({ error: "invalid_request" }, 400);
    }

    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: tenant } = await db.from("tenants")
      .select("id")
      .or(`church_code.eq.${churchCode},invite_code.eq.${churchCode}`)
      .maybeSingle();
    if (!tenant?.id) return await generic();

    const { data: members } = await db.from("members")
      .select("id, email")
      .eq("tenant_id", tenant.id)
      .ilike("email", email);
    const memberIds = (members ?? [])
      .filter((m: { email: string | null }) => String(m.email || "").trim().toLowerCase() === email)
      .map((m: { id: string }) => m.id);
    if (memberIds.length === 0) return await generic();

    const { data: links } = await db.from("member_auth_memberships")
      .select("member_id")
      .eq("tenant_id", tenant.id)
      .in("member_id", memberIds);
    if (!links || links.length === 0) return await generic();

    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) console.error("member-otp-request: OTP send failed", error.status ?? "unknown");
    return await generic();
  } catch (error) {
    console.error("member-otp-request failed", error instanceof Error ? error.name : "unknown");
    return reply({ error: "server_error" }, 500);
  }
});
