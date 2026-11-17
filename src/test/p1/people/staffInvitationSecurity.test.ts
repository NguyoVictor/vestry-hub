import { describe, expect, it } from "vitest";
import {
  INVITABLE_STAFF_ROLES,
  mayInviteStaff,
  validateStaffInvite,
} from "../../../../supabase/functions/send-invitation/validation";

const TENANT_A = "a6e4678b-ea42-4c55-9e32-7c30fde79058";
const TENANT_B = "cf36ddf8-ec05-4378-845a-64dc3c23df1e";
const base = { email: "QA.User@Example.COM ", tenant_id: TENANT_A, role: "church_admin" };

function actor(role: string, tenant_id = TENANT_A, status = "active", is_super_admin = false) {
  return { role, tenant_id, status, is_super_admin };
}

describe("staff invitation security contract", () => {
  it("rejects malformed requests and invalid emails", () => {
    expect(validateStaffInvite(null).ok).toBe(false);
    expect(validateStaffInvite({ ...base, email: "not-an-email" }).ok).toBe(false);
    expect(validateStaffInvite({ ...base, tenant_id: "invalid" }).ok).toBe(false);
  });

  it("normalizes email and trims names", () => {
    const result = validateStaffInvite({ ...base, first_name: " QA ", last_name: " Admin " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("qa.user@example.com");
      expect(result.value.firstName).toBe("QA");
      expect(result.value.lastName).toBe("Admin");
    }
  });

  it("allows the UI standard roles, and rejects direct super_admin grant", () => {
    for (const role of INVITABLE_STAFF_ROLES) {
      expect(validateStaffInvite({ ...base, role }).ok).toBe(true);
    }
    expect(validateStaffInvite({ ...base, role: "super_admin" }).ok).toBe(false);
    expect(validateStaffInvite({ ...base, role: "admin" }).ok).toBe(false);
    expect(validateStaffInvite({ ...base, role: "custom_owner" }).ok).toBe(false);
  });

  it("denies missing, inactive and non-admin inviters", () => {
    expect(mayInviteStaff(null, TENANT_A)).toBe(false);
    expect(mayInviteStaff(actor("super_admin", TENANT_A, "inactive"), TENANT_A)).toBe(false);
    expect(mayInviteStaff(actor("member"), TENANT_A)).toBe(false);
    expect(mayInviteStaff(actor("pastor"), TENANT_A)).toBe(false);
  });

  it("enforces tenant boundaries for tenant admins", () => {
    expect(mayInviteStaff(actor("super_admin"), TENANT_A)).toBe(true);
    expect(mayInviteStaff(actor("church_admin"), TENANT_A)).toBe(true);
    expect(mayInviteStaff(actor("church_admin"), TENANT_B)).toBe(false);
    expect(mayInviteStaff(actor("super_admin"), TENANT_B)).toBe(false);
  });

  it("accepts only a server-verified active platform administrator across tenants", () => {
    expect(mayInviteStaff(actor("member", TENANT_A, "active", true), TENANT_B)).toBe(true);
    expect(mayInviteStaff(actor("member", TENANT_A, "inactive", true), TENANT_B)).toBe(false);
  });
});
