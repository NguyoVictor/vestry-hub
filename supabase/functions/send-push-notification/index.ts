import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FCM_PROJECT_ID = "vestry-hub";

// Helper function to get OAuth2 access token from service account
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600, // 1 hour
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/[=]/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[=]/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  // Create signature using Web Crypto API
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key
  const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, "\n");
  const privateKeyDer = pemToDer(privateKeyPem);
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", 
    privateKey, 
    new TextEncoder().encode(signatureInput)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[=]/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Helper function to convert PEM to DER format
function pemToDer(pem: string): ArrayBuffer {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  
  // Decode base64
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenant_id, recipient_user_ids, title, body, priority, data } = await req.json();

    if (!tenant_id || !title || !body) {
      return new Response(JSON.stringify({ error: "tenant_id, title, and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FCM_SERVICE_ACCOUNT = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!FCM_SERVICE_ACCOUNT) {
      return new Response(JSON.stringify({ error: "FCM_SERVICE_ACCOUNT not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Get OAuth2 access token
    const accessToken = await getAccessToken(FCM_SERVICE_ACCOUNT);

    // Fetch FCM tokens for the recipients
    let query = supabase.from("device_tokens").select("token, user_id").eq("tenant_id", tenant_id);
    if (recipient_user_ids && Array.isArray(recipient_user_ids) && recipient_user_ids.length > 0) {
      query = query.in("user_id", recipient_user_ids);
    }
    const { data: tokenRows } = await query;
    const tokens: string[] = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, note: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isUrgent = priority === "urgent";
    let successCount = 0;
    let failCount = 0;
    const invalidTokens: string[] = [];

    // Send one message per token (FCM v1 API requires individual sends or multicast)
    for (const token of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body: body.slice(0, 200) },
          android: {
            priority: isUrgent ? "high" : "normal",
            notification: { color: "#F97316", sound: "default" },
          },
          apns: {
            headers: { "apns-priority": isUrgent ? "10" : "5" },
            payload: { aps: { sound: "default", badge: 1 } },
          },
          webpush: {
            notification: {
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              requireInteraction: isUrgent,
            },
          },
          data: {
            ...(data ?? {}),
            priority: priority ?? "normal",
          },
        },
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        }
      );

      if (res.ok) {
        successCount++;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errCode = errData?.error?.details?.[0]?.errorCode ?? errData?.error?.status ?? "";
        if (errCode === "UNREGISTERED" || errCode === "INVALID_ARGUMENT") {
          invalidTokens.push(token);
        }
        failCount++;
      }
    }

    // Clean up invalid/expired tokens
    if (invalidTokens.length > 0) {
      await supabase.from("device_tokens").delete().in("token", invalidTokens);
    }

    return new Response(JSON.stringify({ ok: true, sent: successCount, failed: failCount, invalid_cleaned: invalidTokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
