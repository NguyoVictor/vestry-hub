import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

test("admin context carries tenant slug and enforces hostname agreement", () => {
  const context = read("src/contexts/ChurchContext.tsx");
  const guard = read("src/components/layout/AuthGuard.tsx");
  assert.match(context, /slug:\s*string/);
  assert.match(guard, /tenantSlugMatchesHostname/);
  assert.match(guard, /slug:/);
});

test("member session records tenant slug and guards against hostname mismatch", () => {
  const login = read("src/pages/member/MemberLogin.tsx");
  const guard = read("src/components/layout/MemberAuthGuard.tsx");
  const context = read("src/contexts/MemberPortalContext.tsx");
  assert.match(login, /tenantSlug:\s*fnData\.tenant\.slug/);
  assert.match(guard, /tenantSlugMatchesHostname/);
  assert.match(context, /churchSlug:\s*string/);
  assert.match(context, /tenantSlugMatchesHostname/);
});

test("tenant-sensitive QR/share URLs use the canonical tenant URL builder", () => {
  for (const p of [
    "src/components/shared/ChurchQRModal.tsx",
    "src/pages/settings/QRCodes.tsx",
    "src/pages/people/Visitors.tsx",
    "src/pages/operations/FacilityBooking.tsx",
    "src/pages/media/SermonsRevamped.tsx",
  ]) {
    const source = read(p);
    assert.match(source, /buildTenantUrl/, p);
  }
});
