// Phase 6: SSRF guard for fetch-og-metadata (pure, unit-tested).
// Only public http(s) URLs on default ports; no credentials; no localhost /
// internal names; no private, loopback, link-local, CGNAT or metadata IPs.

function ipv4Blocked(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}

function ipv6Blocked(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return ipv4Blocked(mapped[1]);
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16), lo = parseInt(mappedHex[2], 16);
    return ipv4Blocked(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  if (v.startsWith("::ffff:")) return true; // any other IPv4-mapped form
  return /^(fc|fd)/.test(v) || /^fe[89ab]/.test(v) || /^ff/.test(v);
}

export function isBlockedAddress(addr: string): boolean {
  return addr.includes(":") ? ipv6Blocked(addr) : ipv4Blocked(addr);
}

export function checkUrl(raw: unknown): { ok: true; url: URL } | { ok: false; reason: string } {
  if (typeof raw !== "string" || raw.length > 2048) return { ok: false, reason: "invalid" };
  let url: URL;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid" }; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "scheme" };
  if (url.username || url.password) return { ok: false, reason: "credentials" };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "port" };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host.endsWith(".internal") || host === "metadata.google.internal") {
    return { ok: false, reason: "host" };
  }
  const isV4 = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const isV6 = host.startsWith("[") || host.includes(":");
  if ((isV4 || isV6) && isBlockedAddress(host)) return { ok: false, reason: "address" };
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return { ok: false, reason: "address" }; // decimal/hex IP forms
  return { ok: true, url };
}
