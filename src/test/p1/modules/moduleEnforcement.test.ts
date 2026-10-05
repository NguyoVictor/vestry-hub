import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODULE_CONFIG,
  filterAdminNavigation,
  isAdminPathEnabled,
  isMemberPathEnabled,
  moduleConfigFromOnboarding,
  normalizeModuleConfig,
} from "@/config/modules";

describe("module enforcement regression matrix", () => {
  it.each([
    ["events", "/events"],
    ["attendance", "/services"],
    ["communications", "/announcements"],
    ["giving_finance", "/giving-records"],
    ["operations", "/facility-booking"],
    ["resources_media", "/sermons"],
    ["discipleship", "/new-converts"],
    ["volunteering", "/volunteering"],
    ["childrens_ministry", "/childrens-ministry"],
    ["reports_analytics", "/reports"],
    ["branches", "/branches"],
  ] as const)("blocks %s admin URLs when disabled", (moduleKey, path) => {
    const config = normalizeModuleConfig({
      version: 1,
      admin: { ...DEFAULT_MODULE_CONFIG.admin, [moduleKey]: false },
      member_portal: DEFAULT_MODULE_CONFIG.member_portal,
    });
    expect(isAdminPathEnabled(path, config)).toBe(false);
    expect(isAdminPathEnabled(`${path}/nested`, config)).toBe(false);
  });

  it.each([
    ["events", "upcoming_events", "/member/events"],
    ["communications", "messages", "/member/messages"],
    ["giving_finance", "give_online", "/member/give"],
    ["operations", "member_request", "/member/requests"],
    ["resources_media", "sermons", "/member/sermons"],
    ["discipleship", "training_courses", "/member/training"],
    ["volunteering", "volunteer", "/member/volunteer"],
    ["members_groups", "my_groups", "/member/groups"],
    ["childrens_ministry", "children", "/member/children"],
  ] as const)("requires parent %s and member feature %s", (adminKey, memberKey, path) => {
    const parentDisabled = normalizeModuleConfig({
      version: 1,
      admin: { ...DEFAULT_MODULE_CONFIG.admin, [adminKey]: false },
      member_portal: { ...DEFAULT_MODULE_CONFIG.member_portal, [memberKey]: true },
    });
    expect(isMemberPathEnabled(path, parentDisabled)).toBe(false);

    const memberDisabled = normalizeModuleConfig({
      version: 1,
      admin: { ...DEFAULT_MODULE_CONFIG.admin, [adminKey]: true },
      member_portal: { ...DEFAULT_MODULE_CONFIG.member_portal, [memberKey]: false },
    });
    expect(isMemberPathEnabled(path, memberDisabled)).toBe(false);
  });

  it("keeps core navigation reachable even when optional modules are disabled", () => {
    const config = moduleConfigFromOnboarding([]);
    expect(config.admin.members_groups).toBe(true);
    expect(isAdminPathEnabled("/dashboard", config)).toBe(true);
    expect(isAdminPathEnabled("/settings/modules", config)).toBe(true);
    expect(isMemberPathEnabled("/member", config)).toBe(true);
    expect(isMemberPathEnabled("/member/profile", config)).toBe(true);
    expect(isMemberPathEnabled("/member/settings", config)).toBe(true);
  });

  it("filters admin navigation with the same direct-route decision", () => {
    const config = normalizeModuleConfig({
      version: 1,
      admin: { ...DEFAULT_MODULE_CONFIG.admin, events: false, communications: false },
      member_portal: DEFAULT_MODULE_CONFIG.member_portal,
    });
    const items = [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/events", label: "Events" },
      { path: "/announcements", label: "Announcements" },
      { path: "/members", label: "Members" },
    ];
    const filtered = filterAdminNavigation(items, config);
    expect(filtered.map(item => item.path)).toEqual(["/dashboard", "/members"]);
  });

  it("normalizes a stale legacy snapshot before applying route decisions", () => {
    const stale = normalizeModuleConfig({ communications: false, member_portal: { messages: true } });
    expect(stale.admin.communications).toBe(false);
    expect(stale.member_portal.messages).toBe(true);
    expect(isMemberPathEnabled("/member/messages", stale)).toBe(false);
  });
});
