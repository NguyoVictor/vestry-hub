import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Derives a 4-letter prefix from the church name.
 * Examples:
 *   "Hope Chapel"          → "HOPE"
 *   "Nairobi Baptist"      → "NRBI"
 *   "St. Paul's Cathedral" → "STPL"
 *   "Church of God"        → "CHOG"
 *   "A"                    → "CHRC" (fallback)
 */
function derivePrefix(name: string): string {
  // Strip punctuation, split into words
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "CHRC";

  if (words.length === 1) {
    // Single word — take first 4 letters, pad if needed
    return words[0].slice(0, 4).padEnd(4, "X");
  }

  if (words.length === 2) {
    // Two words — 2 letters from each
    return (words[0].slice(0, 2) + words[1].slice(0, 2)).padEnd(4, "X");
  }

  // 3+ words — first letter of each word, up to 4
  const initials = words.map(w => w[0]).join("").slice(0, 4);
  return initials.padEnd(4, "X");
}

/** Generates a random 4-character alphanumeric suffix (no ambiguous chars) */
function randomSuffix(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenantId, churchName } = await req.json();

    if (!tenantId || !churchName) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prefix = derivePrefix(churchName);
    let newCode = "";
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    // Keep generating until we find a code no other church is using
    while (attempts < MAX_ATTEMPTS) {
      const candidate = `${prefix}-${randomSuffix()}`;

      const { data: existing } = await supabase
        .from("tenants")
        .select("id")
        .eq("church_code", candidate)
        .neq("id", tenantId) // exclude the current church
        .maybeSingle();

      if (!existing) {
        // No collision — this code is available
        newCode = candidate;
        break;
      }

      attempts++;
    }

    if (!newCode) {
      // Extremely unlikely — fall back to a longer random code
      newCode = `${prefix}-${randomSuffix()}${randomSuffix().slice(0, 2)}`;
    }

    // Persist the new code and reset usage counter
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ 
        church_code: newCode, 
        invite_code: newCode,
        invite_code_uses: 0 
      })
      .eq("id", tenantId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ code: newCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "server_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
