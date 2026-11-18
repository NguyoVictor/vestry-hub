/** Check the server-created staff invitation profile; never authorize from user_metadata. */
export interface AuthInviteUser {
  id: string;
  email?: string | null;
}

export interface StaffInviteProfile {
  id: string;
  tenant_id: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  invitation_sent: boolean | null;
}

export function isValidInvitedStaffProfile(
  user: AuthInviteUser | null,
  profile: StaffInviteProfile | null,
): boolean {
  if (!user?.id || !user.email || !profile) return false;
  if (profile.id !== user.id) return false;
  if (profile.email?.trim().toLowerCase() !== user.email.trim().toLowerCase()) return false;
  return Boolean(
    profile.tenant_id &&
    profile.role &&
    profile.status === "active" &&
    profile.invitation_sent === true,
  );
}
