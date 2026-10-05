import { describe, expect, it } from "vitest";
import {
  buildTenantUrl,
  classifyPlatformHost,
  resolveTenantSlug,
  tenantSlugMatchesHostname,
} from "@/lib/tenantHost";

describe("platform hostname classification", () => {
  it("separates marketing, application, tenant and reserved hosts", () => {
    expect(classifyPlatformHost("vestryhub.com", "vestryhub.com")).toBe("marketing");
    expect(classifyPlatformHost("www.vestryhub.com", "vestryhub.com")).toBe("marketing");
    expect(classifyPlatformHost("app.vestryhub.com", "vestryhub.com")).toBe("application");
    expect(classifyPlatformHost("hope-church.vestryhub.com", "vestryhub.com")).toBe("tenant");
    expect(classifyPlatformHost("join.vestryhub.com", "vestryhub.com")).toBe("reserved");
  });
});

describe("tenant hostname resolution", () => {
  it("never treats root, www, app or reserved platform hosts as tenant hosts", () => {
    for (const host of ["vestryhub.com", "www.vestryhub.com", "app.vestryhub.com", "join.vestryhub.com"]) {
      expect(resolveTenantSlug(host, "vestryhub.com")).toBeNull();
    }
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
  it("allows intended unbound hosts but requires exact tenant-host agreement", () => {
    expect(tenantSlugMatchesHostname("vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("www.vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("app.vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("localhost:5173", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("feature-123.vercel.app", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("hope-church.vestryhub.com", "hope-church", "vestryhub.com")).toBe(true);
    expect(tenantSlugMatchesHostname("other.vestryhub.com", "hope-church", "vestryhub.com")).toBe(false);
    expect(tenantSlugMatchesHostname("join.vestryhub.com", "hope-church", "vestryhub.com")).toBe(false);
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

  it("rejects malformed and reserved tenant slugs", () => {
    expect(() => buildTenantUrl("bad_slug", "/member/login", { baseDomain: "vestryhub.com" })).toThrow();
    expect(() => buildTenantUrl("app", "/member/login", { baseDomain: "vestryhub.com" })).toThrow();
    expect(() => buildTenantUrl("www", "/member/login", { baseDomain: "vestryhub.com" })).toThrow();
    expect(() => buildTenantUrl("join", "/member/login", { baseDomain: "vestryhub.com" })).toThrow();
  });
});
