import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const assert = (condition, message) => checks.push({ condition: Boolean(condition), message });

const modules = read("src/config/modules.ts");
const adminLayout = read("src/components/layout/AppLayout.tsx");
const memberLayout = read("src/components/layout/MemberPortalLayout.tsx");
const memberContext = read("src/contexts/MemberPortalContext.tsx");
const edge = read("supabase/functions/member-session-context/index.ts");
const supabaseConfig = read("supabase/config.toml");
const e2e = read("e2e/platform/modules/module-enforcement.spec.ts");

assert(modules.includes("isAdminPathEnabled"), "canonical admin route guard exists");
assert(modules.includes("isMemberPathEnabled"), "canonical member route guard exists");
assert(adminLayout.includes("filterAdminNavigation") && adminLayout.includes("isAdminPathEnabled"), "Admin navigation and direct routes share canonical enforcement");
assert(memberLayout.includes("isMemberPathEnabled") && memberLayout.includes("visibleSidebarNav") && memberLayout.includes("visibleBottomNav"), "Member desktop/mobile navigation and routes share canonical enforcement");
assert(memberContext.includes('supabase.functions.invoke("member-session-context"'), "Member portal revalidates its opaque session server-side");
assert(memberContext.includes("normalizeModuleConfig(church.enabled_modules)"), "Member portal uses current tenant module config returned by server");
assert(!memberContext.includes("normalizeModuleConfig(session.enabledModules)"), "Member portal no longer trusts stale local module snapshot");
assert(edge.includes('.from("member_sessions")') && edge.includes('.eq("session_token"'), "Session-context function validates opaque token against member_sessions");
assert(edge.includes('.select("id, name, logo, church_code, slug, enabled_modules")'), "Session-context function returns current tenant module config");
assert(supabaseConfig.includes("[functions.member-session-context]") && /\[functions\.member-session-context\][\s\S]*?verify_jwt\s*=\s*false/.test(supabaseConfig), "Custom member-session function is explicitly configured for opaque-token auth");
assert(e2e.includes("stale member module snapshot is refreshed"), "Protected browser coverage includes stale member-session regression");
assert(e2e.includes("disabled admin module is absent from nav and blocked by direct URL"), "Protected browser coverage includes Admin nav/direct URL parity");

const failed = checks.filter(check => !check.condition);
for (const check of checks) console.log(`${check.condition ? "PASS" : "FAIL"}: ${check.message}`);
if (failed.length) process.exit(1);
console.log(`module enforcement QA contract: PASS (${checks.length}/${checks.length})`);
