// Safaricom Daraja (M-Pesa Express / STK push) helpers — direct to a church's
// own paybill or till (provider choice, 20261124110000). Pure functions are
// unit-tested in scripts/recovery/daraja.node.test.mjs.
//   OAuth   GET  {base}/oauth/v1/generate?grant_type=client_credentials (Basic key:secret)
//   STK     POST {base}/mpesa/stkpush/v1/processrequest
//   Query   POST {base}/mpesa/stkpushquery/v1/query
// Password = base64(BusinessShortCode + Passkey + Timestamp), Timestamp in
// Kenyan time (UTC+3) as YYYYMMDDHHmmss. Paybill: TransactionType
// CustomerPayBillOnline, PartyB = shortcode. Till: CustomerBuyGoodsOnline,
// BusinessShortCode = store/head-office number, PartyB = till number.

export type DarajaEnv = "sandbox" | "production";
export interface DarajaConfig {
  consumer_key: string; consumer_secret: string; passkey: string;
  shortcode: string; till_number: string | null;
  transaction_type: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline"; env: DarajaEnv;
}

export function darajaBase(env: DarajaEnv): string {
  return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

/** YYYYMMDDHHmmss in Kenyan time (UTC+3, no daylight saving). */
export function darajaTimestamp(now: Date = new Date()): string {
  const k = new Date(now.getTime() + 3 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}${p(k.getUTCHours())}${p(k.getUTCMinutes())}${p(k.getUTCSeconds())}`;
}

export function darajaPassword(shortcode: string, passkey: string, timestamp: string): string {
  return btoa(`${shortcode}${passkey}${timestamp}`);
}

export function stkPushBody(cfg: DarajaConfig, amount: number, phone: string, callbackUrl: string, reference: string, timestamp: string) {
  return {
    BusinessShortCode: cfg.shortcode,
    Password: darajaPassword(cfg.shortcode, cfg.passkey, timestamp),
    Timestamp: timestamp,
    TransactionType: cfg.transaction_type,
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: cfg.transaction_type === "CustomerBuyGoodsOnline" ? (cfg.till_number ?? cfg.shortcode) : cfg.shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: reference.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "Gift",
    TransactionDesc: "Church gift",
  };
}

export interface ParsedCallback {
  checkoutRequestId: string; resultCode: number; resultDesc: string;
  amount: number | null; receipt: string | null; phone: string | null;
}

/** Parses {Body:{stkCallback:{...}}}; null if the shape is wrong. */
export function parseStkCallback(body: unknown): ParsedCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } } | null)?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items = ((cb.CallbackMetadata as { Item?: { Name: string; Value?: unknown }[] } | undefined)?.Item ?? []);
  const get = (n: string) => items.find(i => i?.Name === n)?.Value;
  const amount = Number(get("Amount"));
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? "").slice(0, 200),
    amount: get("Amount") != null && Number.isFinite(amount) ? amount : null,
    receipt: typeof get("MpesaReceiptNumber") === "string" ? String(get("MpesaReceiptNumber")) : null,
    phone: get("PhoneNumber") != null ? String(get("PhoneNumber")) : null,
  };
}

/** Random secret for the per-church callback URL. */
export function newCallbackToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

export async function darajaToken(cfg: Pick<DarajaConfig, "consumer_key" | "consumer_secret" | "env">): Promise<{ status: number; token: string | null }> {
  const r = await fetch(`${darajaBase(cfg.env)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${cfg.consumer_key}:${cfg.consumer_secret}`)}` },
  });
  const j = await r.json().catch(() => null) as { access_token?: string } | null;
  return { status: r.status, token: typeof j?.access_token === "string" ? j.access_token : null };
}

export async function darajaPost(cfg: DarajaConfig, token: string, path: string, body: Record<string, unknown>) {
  const r = await fetch(`${darajaBase(cfg.env)}${path}`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => null) as Record<string, unknown> | null };
}

/** Re-asks Safaricom whether this STK push succeeded (ResultCode "0"). */
export async function stkQuery(cfg: DarajaConfig, checkoutRequestId: string): Promise<{ ok: boolean; resultCode: string | null; detail: string }> {
  const t = await darajaToken(cfg);
  if (!t.token) return { ok: false, resultCode: null, detail: `oauth http=${t.status}` };
  const ts = darajaTimestamp();
  const q = await darajaPost(cfg, t.token, "/mpesa/stkpushquery/v1/query", {
    BusinessShortCode: cfg.shortcode, Password: darajaPassword(cfg.shortcode, cfg.passkey, ts), Timestamp: ts,
    CheckoutRequestID: checkoutRequestId,
  });
  const code = q.json?.ResultCode != null ? String(q.json.ResultCode) : null;
  return { ok: q.status < 300 && code === "0", resultCode: code, detail: `query http=${q.status} result=${code ?? "?"}` };
}
