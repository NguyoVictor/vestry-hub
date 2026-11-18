import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidInvitedStaffProfile } from "../../../pages/auth/inviteCallbackGuards";

const user = { id: "auth-1", email: "Staff@Example.com" };
const profile = {
  id: "auth-1",
  tenant_id: "tenant-a",
  email: "staff@example.com",
  role: "church_admin",
  status: "active",
  invitation_sent: true,
};

describe("staff invitation callback safety", () => {
  it("accepts an active, server-created profile belonging to the authenticated user", () => {
    expect(isValidInvitedStaffProfile(user, profile)).toBe(true);
  });

  it("rejects nonexistent or mismatched profiles", () => {
    expect(isValidInvitedStaffProfile(null, profile)).toBe(false);
    expect(isValidInvitedStaffProfile(user, null)).toBe(false);
    expect(isValidInvitedStaffProfile(user, { ...profile, id: "another-user" })).toBe(false);
    expect(isValidInvitedStaffProfile(user, { ...profile, email: "another@example.com" })).toBe(false);
  });

  it("requires an active, invited, tenant-linked account with a role", () => {
    expect(isValidInvitedStaffProfile(user, { ...profile, status: "inactive" })).toBe(false);
    expect(isValidInvitedStaffProfile(user, { ...profile, invitation_sent: false })).toBe(false);
    expect(isValidInvitedStaffProfile(user, { ...profile, tenant_id: null })).toBe(false);
    expect(isValidInvitedStaffProfile(user, { ...profile, role: null })).toBe(false);
  });

  it("never writes or derives roles from user-editable metadata in the callback", () => {
const source = readFileSync("src/pages/auth/InviteCallback.tsx", "utf8");
    expect(source).toContain("supabase.auth.getUser()");
    expect(source).toContain('from("users")');
    expect(source).not.toMatch(/\.(?:upsert|insert|update|delete)\s*\(/);
    expect(source).not.toContain("user_metadata");
    expect(source).not.toContain("create-staff-thread");
  });
});
