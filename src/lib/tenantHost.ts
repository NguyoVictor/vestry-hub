export const DEFAULT_TENANT_BASE_DOMAIN = "vestryhub.com";

const RESERVED_SUBDOMAINS = new Set(["app", "www"]);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function stripPort(hostname: string): string {
  const value = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end >= 0 ? value.slice(1, end) : value;
  }
  const colon = value.lastIndexOf(":");
  return colon > -1 && value.indexOf(":") === colon ? value.slice(0, colon) : value;
}

function normalizeBaseDomain(baseDomain: string): string {
  return stripPort(baseDomain).replace(/^\.+|\.+$/g, "");
}

export function isValidTenantSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return SLUG_PATTERN.test(normalized) && !RESERVED_SUBDOMAINS.has(normalized);
}

/**
 * Returns a tenant slug only for an exact one-label tenant host such as
 * `hope-church.vestryhub.com`. Root/app hosts, localhost/IP addresses,
 * previews, malformed values, and multi-level subdomains return null.
 */
export function resolveTenantSlug(
  hostname: string,
  baseDomain = DEFAULT_TENANT_BASE_DOMAIN,
): string | null {
  const host = stripPort(hostname);
  const base = normalizeBaseDomain(baseDomain);
  if (!host || !base) return null;

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  ) {
    return null;
  }

  if (host === base || host === `app.${base}` || host === `www.${base}`) return null;
  if (!host.endsWith(`.${base}`)) return null;

  const prefix = host.slice(0, -(base.length + 1));
  if (!prefix || prefix.includes(".")) return null;
  return isValidTenantSlug(prefix) ? prefix : null;
}

export interface BuildTenantUrlOptions {
  baseDomain?: string;
  protocol?: "http" | "https";
  port?: string | number;
}

export function buildTenantUrl(
  slug: string,
  path = "/",
  options: BuildTenantUrlOptions = {},
): string {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!isValidTenantSlug(normalizedSlug)) {
    throw new Error(`Invalid tenant slug: ${slug}`);
  }

  const baseDomain = normalizeBaseDomain(options.baseDomain ?? DEFAULT_TENANT_BASE_DOMAIN);
  if (!baseDomain) throw new Error("Tenant base domain is required");

  const protocol = options.protocol ?? "https";
  const port = options.port ? `:${String(options.port).replace(/^:/, "")}` : "";
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "/";
  return `${protocol}://${normalizedSlug}.${baseDomain}${port}${normalizedPath}`;
}

export function currentTenantBaseDomain(): string {
  const configured = typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_TENANT_BASE_DOMAIN
    : undefined;
  return configured?.trim() || DEFAULT_TENANT_BASE_DOMAIN;
}

export function currentTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return resolveTenantSlug(window.location.hostname, currentTenantBaseDomain());
}

/**
 * Root/app/local/preview hosts do not bind a session to a tenant hostname.
 * A real tenant host must match the session tenant slug exactly.
 */
export function tenantSlugMatchesHostname(
  hostname: string,
  tenantSlug: string,
  baseDomain = DEFAULT_TENANT_BASE_DOMAIN,
): boolean {
  const host = stripPort(hostname);
  const resolved = resolveTenantSlug(hostname, baseDomain);
  if (resolved) return resolved === tenantSlug.trim().toLowerCase();

  const base = normalizeBaseDomain(baseDomain);
  if (host === base || host === `app.${base}` || host === `www.${base}`) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;

  // Non-platform hosts (for example deployment previews) are deliberately
  // session-driven rather than inferred as tenant subdomains.
  return !host.endsWith(`.${base}`);
}
