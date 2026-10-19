import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
  let reservationId: number | null = null;
  try {
    const { prompt, model, tenant_id } = await req.json();
    if (!prompt || !tenant_id) return json({ error: "prompt_and_tenant_required" }, 400);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: authData, error: authError } = await service.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "unauthorized" }, 401);

    const { data: actor } = await service.from("users").select("id, tenant_id, status, role").eq("id", authData.user.id).maybeSingle();
    if (!actor || actor.status !== "active" || String(actor.tenant_id) !== String(tenant_id) || actor.role === "member") return json({ error: "forbidden" }, 403);

    const { data: reservation, error: reserveError } = await service.rpc("reserve_ai_request", { p_tenant_id: String(tenant_id), p_actor_id: String(actor.id), p_function_name: "generate-ai-content" });
    if (reserveError) {
      const msg = reserveError.message || "";
      if (msg.includes("ai_rate_limit")) return json({ error: "rate_limit", message: "AI request limit reached. Please wait a minute and try again." }, 429);
      if (msg.includes("ai_credit_limit")) return json({ error: "credit_limit", message: "AI credit limit reached." }, 402);
      return json({ error: "ai_unavailable" }, 503);
    }
    reservationId = Number(reservation);

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("ai_provider_not_configured");
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({ model: model || "llama-3.3-70b-versatile", messages: [{ role: "user", content: String(prompt).slice(0, 24000) }] }),
    });
    if (!groqRes.ok) throw new Error(`ai_provider_${groqRes.status}`);
    const data = await groqRes.json();
    return json({ content: data.choices?.[0]?.message?.content || "" });
  } catch (error) {
    if (reservationId) await service.rpc("release_ai_request", { p_request_id: reservationId }).catch(() => undefined);
    console.error("generate-ai-content failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "ai_generation_failed" }, 500);
  }
});
