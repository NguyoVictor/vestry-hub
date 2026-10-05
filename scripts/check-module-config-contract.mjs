import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const modules = read("src/config/modules.ts");
const onboarding = read("src/pages/Onboarding.tsx");
const adminLayout = read("src/components/layout/AppLayout.tsx");
const memberLayout = read("src/components/layout/MemberPortalLayout.tsx");
const memberHome = read("src/pages/member/MemberHome.tsx");
const memberLogin = read("src/pages/member/MemberLogin.tsx");
const app = read("src/App.tsx");

assert(modules.includes("MODULE_CONFIG_VERSION = 1"), "canonical module config must be versioned");
assert(modules.includes("moduleConfigFromOnboarding"), "onboarding mapper must exist");
assert(modules.includes("isAdminPathEnabled"), "admin route guard helper must exist");
assert(modules.includes("isMemberPathEnabled"), "member route guard helper must exist");
assert(onboarding.includes("enabled_modules: moduleConfigFromOnboarding(selectedNeeds)"), "onboarding must persist canonical enabled_modules");
assert(adminLayout.includes("filterAdminNavigation"), "admin navigation must be filtered by canonical config");
assert(adminLayout.includes("isAdminPathEnabled"), "admin direct routes must be guarded");
assert(memberLayout.includes("isMemberPathEnabled"), "member navigation and direct routes must be guarded");
assert(memberHome.includes("isMemberPathEnabled"), "member home cards must use canonical route checks");
assert(memberLogin.includes("enabledModules: fnData.tenant.enabled_modules || null"), "member login must capture the full canonical config");
assert((app.match(/path="modules"/g) || []).length === 1, "settings/modules must only be declared once");

console.log("module configuration contract: PASS");
