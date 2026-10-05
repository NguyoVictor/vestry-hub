import fs from "node:fs";
import assert from "node:assert/strict";
import {
  classifyPlatformHost,
  isValidTenantSlug,
  resolveTenantSlug,
} from "../src/lib/tenantHost.ts";

const base = "vestryhub.com";
const cases = [
  [base, "marketing", null],
  [`www.${base}`, "marketing", null],
  [`app.${base}`, "application", null],
  [`hope-church.${base}`, "tenant", "hope-church"],
  [`join.${base}`, "reserved", null],
  [`a.b.${base}`, "reserved", null],
  ["feature-123.vercel.app", "preview", null],
  ["localhost:5173", "local", null],
];

for (const [host, surface, slug] of cases) {
  assert.equal(classifyPlatformHost(host, base), surface, `${host} surface`);
  assert.equal(resolveTenantSlug(host, base), slug, `${host} slug`);
}

for (const reserved of ["app", "www", "join"]) {
  assert.equal(isValidTenantSlug(reserved), false, `${reserved} must remain reserved`);
}

const app = fs.readFileSync("src/App.tsx", "utf8");
assert.match(app, /classifyPlatformHost/);
assert.match(app, /surface === "application"[^]*Navigate to="\/dashboard"/);
assert.match(app, /surface === "tenant"[^]*Navigate to="\/member\/login"/);
assert.match(app, /<Route path="\/" element={<RootHostRoute\s*\/>}/);

const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
assert.equal(vercel.$schema, "https://openapi.vercel.sh/vercel.json");
assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);

console.log("domain separation contract: PASS (host classification + root routing + SPA rewrite)");
