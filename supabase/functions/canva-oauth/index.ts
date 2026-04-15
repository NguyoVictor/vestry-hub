import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANVA_CLIENT_ID = Deno.env.get("CANVA_CLIENT_ID")!;
const CANVA_CLIENT_SECRET = Deno.env.get("CANVA_CLIENT_SECRET")!;
const CANVA_REDIRECT_URI = Deno.env.get("CANVA_REDIRECT_URI")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Service-role client for DB writes (bypasses RLS)
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Manually verify the caller's JWT (verify_jwt is disabled on this function
    // because the Supabase gateway rejects the token before it reaches the handler)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) return json({ error: "Missing authorization token" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();

    if (authErr || !user) {
      console.error("Auth error:", authErr?.message);
      return json({ error: "Unauthorized", detail: authErr?.message }, 401);
    }

    const body = await req.json();
    const { action, tenant_id, state: incomingState, code } = body;

    // ── authorize ─────────────────────────────────────────────────────────────
    if (action === "authorize") {
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(32);

      const { error: insertErr } = await db.from("canva_oauth_state").insert({
        state, code_verifier: codeVerifier, tenant_id, user_id: user.id,
      });
      if (insertErr) throw insertErr;

      const params = new URLSearchParams({
        response_type: "code",
        client_id: CANVA_CLIENT_ID,
        redirect_uri: CANVA_REDIRECT_URI,
        scope: "design:content:read design:meta:read",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      return json({ url: `https://www.canva.com/api/oauth/authorize?${params.toString()}` });
    }

    // ── callback ──────────────────────────────────────────────────────────────
    if (action === "callback") {
      if (!incomingState || !code) return json({ error: "Missing state or code" }, 400);

      const { data: stateRow, error: stateErr } = await db
        .from("canva_oauth_state").select("*").eq("state", incomingState)
        .gt("expires_at", new Date().toISOString()).single();

      if (stateErr || !stateRow) return json({ error: "Invalid or expired state" }, 400);

      const tokenRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code", code,
          redirect_uri: CANVA_REDIRECT_URI,
          client_id: CANVA_CLIENT_ID, client_secret: CANVA_CLIENT_SECRET,
          code_verifier: stateRow.code_verifier,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return json({ error: "Token exchange failed", detail: err }, 400);
      }

      const tokens = await tokenRes.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await db.from("canva_tokens").upsert({
        tenant_id: stateRow.tenant_id, user_id: stateRow.user_id,
        access_token: tokens.access_token, refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt, updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,user_id" });

      await db.from("canva_oauth_state").delete().eq("state", incomingState);
      return json({ success: true });
    }

    // ── refresh ───────────────────────────────────────────────────────────────
    if (action === "refresh") {
      const { data: tokenRow, error: tokenErr } = await db
        .from("canva_tokens").select("*").eq("tenant_id", tenant_id).eq("user_id", user.id).single();

      if (tokenErr || !tokenRow?.refresh_token) return json({ error: "No refresh token found" }, 400);

      const refreshRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token", refresh_token: tokenRow.refresh_token,
          client_id: CANVA_CLIENT_ID, client_secret: CANVA_CLIENT_SECRET,
        }),
      });

      if (!refreshRes.ok) return json({ error: "Token refresh failed" }, 400);

      const tokens = await refreshRes.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await db.from("canva_tokens").update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? tokenRow.refresh_token,
        expires_at: expiresAt, updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenant_id).eq("user_id", user.id);

      return json({ access_token: tokens.access_token, expires_at: expiresAt });
    }

    // ── disconnect ────────────────────────────────────────────────────────────
    if (action === "disconnect") {
      await db.from("canva_tokens").delete().eq("tenant_id", tenant_id).eq("user_id", user.id);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);

  } catch (err: any) {
    console.error("canva-oauth error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANVA_CLIENT_ID = Deno.env.get("CANVA_CLIENT_ID")!;
const CANVA_CLIENT_SECRET = Deno.env.get("CANVA_CLIENT_SECRET")!;
const CANVA_REDIRECT_URI = Deno.env.get("CANVA_REDIRECT_URI")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── PKCE helpers ──────────────────────────────────────────────────────────────
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { action, tenant_id, state: incomingState, code } = body;

    // ── authorize ─────────────────────────────────────────────────────────────
    if (action === "authorize") {
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(32);

      // Store PKCE state (expires in 10 min)
      await supabase.from("canva_oauth_state").insert({
        state,
        code_verifier: codeVerifier,
        tenant_id,
        user_id: user.id,
      });

      const params = new URLSearchParams({
        response_type: "code",
        client_id: CANVA_CLIENT_ID,
        redirect_uri: CANVA_REDIRECT_URI,
        scope: "design:content:read design:meta:read",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      const authUrl = `https://www.canva.com/api/oauth/authorize?${params.toString()}`;
      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── callback ──────────────────────────────────────────────────────────────
    if (action === "callback") {
      if (!incomingState || !code) {
        return new Response(JSON.stringify({ error: "Missing state or code" }), { status: 400, headers: corsHeaders });
      }

      // Retrieve and validate state
      const { data: stateRow, error: stateErr } = await supabase
        .from("canva_oauth_state")
        .select("*")
        .eq("state", incomingState)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (stateErr || !stateRow) {
        return new Response(JSON.stringify({ error: "Invalid or expired state" }), { status: 400, headers: corsHeaders });
      }

      // Exchange code for tokens
      const tokenRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: CANVA_REDIRECT_URI,
          client_id: CANVA_CLIENT_ID,
          client_secret: CANVA_CLIENT_SECRET,
          code_verifier: stateRow.code_verifier,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return new Response(JSON.stringify({ error: "Token exchange failed", detail: err }), { status: 400, headers: corsHeaders });
      }

      const tokens = await tokenRes.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Upsert tokens
      await supabase.from("canva_tokens").upsert({
        tenant_id: stateRow.tenant_id,
        user_id: stateRow.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,user_id" });

      // Clean up state
      await supabase.from("canva_oauth_state").delete().eq("state", incomingState);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── refresh ───────────────────────────────────────────────────────────────
    if (action === "refresh") {
      const { data: tokenRow, error: tokenErr } = await supabase
        .from("canva_tokens")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("user_id", user.id)
        .single();

      if (tokenErr || !tokenRow?.refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token found" }), { status: 400, headers: corsHeaders });
      }

      const refreshRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
          client_id: CANVA_CLIENT_ID,
          client_secret: CANVA_CLIENT_SECRET,
        }),
      });

      if (!refreshRes.ok) {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), { status: 400, headers: corsHeaders });
      }

      const tokens = await refreshRes.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabase.from("canva_tokens").update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? tokenRow.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenant_id).eq("user_id", user.id);

      return new Response(JSON.stringify({ access_token: tokens.access_token, expires_at: expiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── disconnect ────────────────────────────────────────────────────────────
    if (action === "disconnect") {
      await supabase.from("canva_tokens").delete().eq("tenant_id", tenant_id).eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
