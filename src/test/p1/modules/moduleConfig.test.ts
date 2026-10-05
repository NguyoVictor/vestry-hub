import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODULE_CONFIG,
  isAdminPathEnabled,
  isMemberPathEnabled,
  moduleConfigFromOnboarding,
  normalizeModuleConfig,
} from "@/config/modules";

describe("canonical module configuration", () => {
  it("defaults legacy tenants without configuration to all admin modules enabled", () => {
    const config = normalizeModuleConfig(null);
    expect(config).toEqual(DEFAULT_MODULE_CONFIG);
  });

  it("translates onboarding priorities into the canonical admin module set", () => {
    const config = moduleConfigFromOnboarding(["online_giving", "communication", "multi_branch"]);
    expect(config.admin.members_groups).toBe(true);
    expect(config.admin.giving_finance).toBe(true);
    expect(config.admin.communications).toBe(true);
    expect(config.admin.branches).toBe(true);
    expect(config.admin.events).toBe(false);
    expect(config.admin.childrens_ministry).toBe(false);
  });

  it("normalizes legacy member portal aliases without dropping admin settings", () => {
    const config = normalizeModuleConfig({
      giving_finance: false,
      member_portal: { giving_history: false, messages_inbox: false },
    });
    expect(config.admin.giving_finance).toBe(false);
    expect(config.member_portal.my_giving_history).toBe(false);
    expect(config.member_portal.messages).toBe(false);
  });

  it("blocks disabled admin routes while keeping settings available", () => {
    const config = normalizeModuleConfig({ version: 1, admin: { ...DEFAULT_MODULE_CONFIG.admin, events: false }, member_portal: DEFAULT_MODULE_CONFIG.member_portal });
    expect(isAdminPathEnabled("/events", config)).toBe(false);
    expect(isAdminPathEnabled("/events/abc", config)).toBe(false);
    expect(isAdminPathEnabled("/settings/modules", config)).toBe(true);
  });

  it("requires both the parent admin module and the member feature for member routes", () => {
    const config = normalizeModuleConfig({
      version: 1,
      admin: { ...DEFAULT_MODULE_CONFIG.admin, communications: false },
      member_portal: { ...DEFAULT_MODULE_CONFIG.member_portal, messages: true },
    });
    expect(isMemberPathEnabled("/member/messages", config)).toBe(false);

    const config2 = normalizeModuleConfig({
      version: 1,
      admin: DEFAULT_MODULE_CONFIG.admin,
      member_portal: { ...DEFAULT_MODULE_CONFIG.member_portal, messages: false },
    });
    expect(isMemberPathEnabled("/member/messages", config2)).toBe(false);
    expect(isMemberPathEnabled("/member/profile", config2)).toBe(true);
  });
});
