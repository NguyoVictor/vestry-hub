/** Pure staging-only staff-invitation guards; no network and no Auth metadata trusts. */
export function stagingInviteOrigin(raw: string): string | null {
  try {
    const target = new URL(raw);
    if (target.protocol !== "https:" || !target.hostname.endsWith(".vercel.app") ||
        target.hostname === "vestry-hub.vercel.app" || target.port ||
        target.username || target.password || target.pathname !== "/" ||
        target.search || target.hash ||
        target.origin !== raw.trim().replace(/\/$/, "")) return null;
    return target.origin;
  } catch {
    return null;
  }
}

interface InvitationClaim {
  id?: string | null;
  tenant_id?: string | null;
  email?: string | null;
  role?: string | null;
  consumed_at?: string | null;
  auth_user_id?: string | null;
}
interface StaffProfile {
  id?: string | null;
  tenant_id?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  invitation_sent?: boolean | null;
}

export function verifiedStaffInvitation(
  invitedId: string,
  invitationId: string,
  tenantId: string,
  email: string,
  role: string,
  invitation: InvitationClaim | null,
  profile: StaffProfile | null,
): boolean {
  if (!invitedId || !invitationId || !tenantId || !email || !role ||
      !invitation || !profile) return false;
  const normalized = email.trim().toLowerCase();
  return Boolean(invitation.id === invitationId &&
    invitation.tenant_id === tenantId &&
    invitation.role === role &&
    invitation.email?.trim().toLowerCase() === normalized &&
    invitation.auth_user_id === invitedId && invitation.consumed_at &&
    profile.id === invitedId && profile.tenant_id === tenantId &&
    profile.role === role && profile.email?.trim().toLowerCase() === normalized &&
    profile.status === "active" && profile.invitation_sent === true);
}
