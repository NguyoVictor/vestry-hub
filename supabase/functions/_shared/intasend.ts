// IntaSend helpers (Phase 9 payments). Pure functions are unit-tested in
// scripts/recovery/intasend.node.test.mjs. Docs: developers.intasend.com
// (read 2026-11-21): one API host for sandbox+live (key selects environment);
// STK push POST /payment/mpesa-stk-push/ {amount, phone_number, api_ref, wallet_id?};
// status POST /payment/status/ {invoice_id}; webhook body is FLAT and carries
// the dashboard-configured `challenge` string (no signature header).

export const INTASEND_API = "https://api.intasend.com/api/v1";
export const MIN_KES = 10;
export const MAX_KES = 150000;

/** Normalise a Kenyan mobile number to 2547XXXXXXXX / 2541XXXXXXXX, or null. */
export function normalizeKenyanPhone(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let d = String(raw).replace(/[\s\-()+]/g, "");
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith("0") && d.length === 10) d = "254" + d.slice(1);
  else if ((d.startsWith("7") || d.startsWith("1")) && d.length === 9) d = "254" + d;
  return /^254[17]\d{8}$/.test(d) ? d : null;
}

/** Whole-shilling amount within limits, or an error message. */
export function validateAmount(raw: unknown): { ok: true; amount: number } | { ok: false; error: string } {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, error: "Enter a valid amount." };
  const amount = Math.ceil(n); // IntaSend rounds up to a whole shilling
  if (amount < MIN_KES) return { ok: false, error: `The minimum M-Pesa amount is KES ${MIN_KES}.` };
  if (amount > MAX_KES) return { ok: false, error: `The maximum M-Pesa amount is KES ${MAX_KES.toLocaleString()}.` };
  return { ok: true, amount };
}

/** IntaSend invoice state → giving_records.payment_status (null = no change). */
export function mapState(state: unknown): "confirmed" | "failed" | "pending" | null {
  switch (String(state ?? "").toUpperCase()) {
    case "COMPLETE": return "confirmed";
    case "FAILED": case "CANCELED": case "CANCELLED": return "failed";
    case "PENDING": case "PROCESSING": case "RETRY": return "pending";
    default: return null; // PARTIAL / unknown → leave for staff review
  }
}

/** Constant-time string comparison for the webhook challenge. */
export function challengeMatches(received: unknown, expected: string | undefined): boolean {
  if (typeof received !== "string" || !expected) return false;
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Only these transitions are allowed (events may arrive out of order). */
export function nextStatus(current: string | null, incoming: "confirmed" | "failed" | "pending"): string | null {
  if (current === "confirmed") return null;                 // never downgrade a confirmed gift
  if (current === "failed" && incoming !== "confirmed") return null;
  if (current === incoming) return null;
  return incoming;
}

/** Amount check used before confirming (webhook amounts are strings). */
export function amountMatches(expected: number | string, value: unknown, currency: unknown): boolean {
  return String(currency ?? "KES").toUpperCase() === "KES" && Math.abs(Number(value) - Number(expected)) < 0.005;
}

export async function intasendPost(path: string, secretKey: string, body: Record<string, unknown>): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const r = await fetch(`${INTASEND_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}

// ── One account per church (20261123160000) ────────────────────────────────

/** Environment of a key pair from its prefixes, or an error. Both keys must agree. */
export function keyPairEnv(secretKey: unknown, publishableKey: unknown): { ok: true; env: "live" | "test" } | { ok: false; error: string } {
  const s = typeof secretKey === "string" ? secretKey.trim() : "";
  const p = typeof publishableKey === "string" ? publishableKey.trim() : "";
  const sm = /^ISSecretKey_(live|test)_[A-Za-z0-9._-]{8,200}$/.exec(s);
  const pm = /^ISPubKey_(live|test)_[A-Za-z0-9._-]{8,200}$/.exec(p);
  if (!sm) return { ok: false, error: "The secret key should start with ISSecretKey_live_ or ISSecretKey_test_." };
  if (!pm) return { ok: false, error: "The publishable key should start with ISPubKey_live_ or ISPubKey_test_." };
  if (sm[1] !== pm[1]) return { ok: false, error: "Both keys must be from the same environment (both live or both test)." };
  return { ok: true, env: sm[1] as "live" | "test" };
}

/** Random webhook challenge the church pastes into IntaSend (Settings → Webhooks). */
export function newChallenge(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return "vestry_" + Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

export async function intasendGet(path: string, secretKey: string): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const r = await fetch(`${INTASEND_API}${path}`, { headers: { Authorization: `Bearer ${secretKey}` } });
  return { status: r.status, json: await r.json().catch(() => null) };
}
