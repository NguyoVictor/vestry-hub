import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTenantUrl,
  classifyPlatformHost,
  resolveTenantSlug,
  tenantSlugMatchesHostname,
} from "../../lib/tenantHost.ts";

test("platform surfaces are classified explicitly", () => {
  assert.equal(classifyPlatformHost("vestryhub.com", "vestryhub.com"), "marketing");
  assert.equal(classifyPlatformHost("www.vestryhub.com", "vestryhub.com"), "marketing");
  assert.equal(classifyPlatformHost("app.vestryhub.com", "vestryhub.com"), "application");
  assert.equal(classifyPlatformHost("hope-church.vestryhub.com", "vestryhub.com"), "tenant");
  assert.equal(classifyPlatformHost("join.vestryhub.com", "vestryhub.com"), "reserved");
  assert.equal(classifyPlatformHost("feature-123.vercel.app", "vestryhub.com"), "preview");
  assert.equal(classifyPlatformHost("localhost:5173", "vestryhub.com"), "local");
});

test("reserved/root/app hosts are non-tenant and tenant host resolves", () => {
  for (const host of ["vestryhub.com", "www.vestryhub.com", "app.vestryhub.com", "join.vestryhub.com"]) {
    assert.equal(resolveTenantSlug(host, "vestryhub.com"), null, host);
  }
  assert.equal(resolveTenantSlug("Hope-Church.VestryHub.com", "vestryhub.com"), "hope-church");
});

test("preview/local/malformed hosts do not resolve", () => {
  for (const host of ["localhost", "localhost:5173", "127.0.0.1", "feature-123.vercel.app", "a.b.vestryhub.com", "bad_slug.vestryhub.com", ".vestryhub.com"]) {
    assert.equal(resolveTenantSlug(host, "vestryhub.com"), null, host);
  }
});

test("tenant URLs are canonical and reserved/malformed slugs are rejected", () => {
  assert.equal(buildTenantUrl("hope-church", "/member/login?code=ABC#top", { baseDomain: "vestryhub.com" }), "https://hope-church.vestryhub.com/member/login?code=ABC#top");
  assert.equal(buildTenantUrl("hope-church", "give/hope-church", { baseDomain: "vestryhub.com" }), "https://hope-church.vestryhub.com/give/hope-church");
  assert.throws(() => buildTenantUrl("bad_slug", "/member/login", { baseDomain: "vestryhub.com" }));
  assert.throws(() => buildTenantUrl("app", "/member/login", { baseDomain: "vestryhub.com" }));
  assert.throws(() => buildTenantUrl("www", "/member/login", { baseDomain: "vestryhub.com" }));
  assert.throws(() => buildTenantUrl("join", "/member/login", { baseDomain: "vestryhub.com" }));
});

test("hostname/session agreement blocks tenant mismatch and reserved platform hosts", () => {
  assert.equal(tenantSlugMatchesHostname("vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("www.vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("app.vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("localhost:5173", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("feature-123.vercel.app", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("hope-church.vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("other.vestryhub.com", "hope-church", "vestryhub.com"), false);
  assert.equal(tenantSlugMatchesHostname("join.vestryhub.com", "hope-church", "vestryhub.com"), false);
});
