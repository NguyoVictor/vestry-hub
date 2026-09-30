import { describe, expect, it } from "vitest";
import { buildTenantUrl, resolveTenantSlug, tenantSlugMatchesHostname } from "@/lib/tenantHost";

describe("tenant hostname resolution", () => {
  it("treats the root and app hosts as non-tenant hosts", () => {
    expect(resolveTenantSlug("vestryhub.com", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug("app.vestryhub.com", "vestryhub.com")).toBeNull();
  });

  it("extracts a normalized tenant slug from a tenant host", () => {
    expect(resolveTenantSlug("Hope-Church.VestryHub.com", "vestryhub.com")).toBe("hope-church");
  });

  it("does not treat localhost, IPs, preview hosts, or malformed/multi-level hosts as tenant slugs", () => {
    expect(resolveTenantSlug("localhost", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug("localhost:5173", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug("127.0.0.1", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug("feature-123.vercel.app", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug("a.b.vestryhub.com", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug("bad_slug.vestryhub.com", "vestryhub.com")).toBeNull();
    expect(resolveTenantSlug(".vestryhub.com", "vestryhub.com")).toBeNull();
  });
});

describe("hostname/session agreement", () => {
  it("allows root/app/local hosts but requires exact tenant host agreement", () => {
    expect(tenantSlugMatchesHostname("vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("app.vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("localhost:5173", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("hope-church.vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("other.vestryhub.com", "hope-church", "vestryhub.com")).toBe(false);
  });
});

describe("tenant URL builder", () => {
  it("builds an HTTPS tenant URL and preserves path/query/hash", () => {
    expect(buildTenantUrl("hope-church", "/member/login?code=ABC#top", { baseDomain: "vestryhub.com" }))
      .toBe("https://hope-church.vestryhub.com/member/login?code=ABC#top");
  });

  it("normalizes a missing leading slash", () => {
    expect(buildTenantUrl("hope-church", "give/hope-church", { baseDomain: "vestryhub.com" }))
      .toBe("https://hope-church.vestryhub.com/give/hope-church");
  });

  it("rejects malformed tenant slugs", () => {
    expect(() => buildTenantUrl("bad_slug", "/member/login", { baseDomain: "vestryhub.com" })).toThrow();
  });
});
