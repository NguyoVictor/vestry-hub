import test from "node:test";
import assert from "node:assert/strict";
import { buildTenantUrl, resolveTenantSlug, tenantSlugMatchesHostname } from "../../lib/tenantHost.ts";

test("root/app hosts are non-tenant and tenant host resolves", () => {
  assert.equal(resolveTenantSlug("vestryhub.com", "vestryhub.com"), null);
  assert.equal(resolveTenantSlug("app.vestryhub.com", "vestryhub.com"), null);
  assert.equal(resolveTenantSlug("Hope-Church.VestryHub.com", "vestryhub.com"), "hope-church");
});

test("preview/local/malformed hosts do not resolve", () => {
  for (const host of ["localhost", "localhost:5173", "127.0.0.1", "feature-123.vercel.app", "a.b.vestryhub.com", "bad_slug.vestryhub.com", ".vestryhub.com"]) {
    assert.equal(resolveTenantSlug(host, "vestryhub.com"), null, host);
  }
});

test("tenant URLs are canonical and malformed slugs are rejected", () => {
  assert.equal(buildTenantUrl("hope-church", "/member/login?code=ABC#top", { baseDomain: "vestryhub.com" }), "https://hope-church.vestryhub.com/member/login?code=ABC#top");
  assert.equal(buildTenantUrl("hope-church", "give/hope-church", { baseDomain: "vestryhub.com" }), "https://hope-church.vestryhub.com/give/hope-church");
  assert.throws(() => buildTenantUrl("bad_slug", "/member/login", { baseDomain: "vestryhub.com" }));
});


test("hostname/session agreement blocks tenant mismatch", () => {
  assert.equal(tenantSlugMatchesHostname("vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("app.vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("localhost:5173", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("hope-church.vestryhub.com", "hope-church", "vestryhub.com"), true);
  assert.equal(tenantSlugMatchesHostname("other.vestryhub.com", "hope-church", "vestryhub.com"), false);
});
