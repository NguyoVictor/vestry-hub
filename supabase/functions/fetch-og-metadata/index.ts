import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAuthenticatedTenantActor } from "../_shared/authorize-tenant-actor.ts";
import { checkUrl, isBlockedAddress } from "./url-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Phase 6: callers must be active church staff (was open to anyone).
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    try {
      await getAuthenticatedTenantActor(req, service);
    } catch {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url } = await req.json();
    const first = checkUrl(url);
    if (!first.ok) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // SSRF guard: every hop is re-validated (manual redirects) incl. resolved IPs.
    const resolvesPublic = async (host: string): Promise<boolean> => {
      const h = host.replace(/^\[|\]$/g, '');
      if (/^[\d.]+$/.test(h) || h.includes(':')) return !isBlockedAddress(h);
      const resolver = (Deno as unknown as { resolveDns?: (n: string, t: string) => Promise<string[]> }).resolveDns;
      if (!resolver) return true;
      for (const t of ['A', 'AAAA']) {
        try { for (const addr of await resolver(h, t)) if (isBlockedAddress(addr)) return false; } catch { /* no records of this type */ }
      }
      return true;
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let html: string;
    try {
      let target = first.url;
      let response: Response | null = null;
      for (let hop = 0; hop < 4; hop++) {
        if (!(await resolvesPublic(target.hostname))) throw new Error('blocked');
        response = await fetch(target, {
          signal: controller.signal,
          redirect: 'manual',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VestryBot/1.0; +https://vestry.app)' },
        });
        const loc = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && loc) {
          const next = checkUrl(new URL(loc, target).toString());
          if (!next.ok) throw new Error('blocked redirect');
          target = next.url;
          continue;
        }
        break;
      }
      clearTimeout(timeout);
      if (!response || !response.ok || !response.body) throw new Error('no page');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value); received += value.length;
        if (received > 512 * 1024) { await reader.cancel(); break; }
      }
      const all = new Uint8Array(received); let off = 0;
      for (const c of chunks) { all.set(c.subarray(0, Math.min(c.length, received - off)), off); off += c.length; if (off >= received) break; }
      html = new TextDecoder().decode(all);
    } catch {
      clearTimeout(timeout);
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse OG tags
    const getMetaContent = (property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    const result = {
      title: getMetaContent('og:title') || (titleMatch ? titleMatch[1].trim() : null),
      description: getMetaContent('og:description') || getMetaContent('description'),
      imageUrl: getMetaContent('og:image'),
    };

    // Return null if we couldn't get any meaningful data
    if (!result.title && !result.description && !result.imageUrl) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-og-metadata error:', error);
    return new Response(JSON.stringify(null), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
