// Finding 1, section 7: being present in auth.users must not grant Admin
// Portal access. A member who signed in through the Member Portal OTP flow has
// a Supabase Auth session but no staff profile in public.users. The admin app
// must not treat that identity as "a new admin who still needs to create a
// church"; it belongs in the Member Portal. (The database already refuses the
// onboarding writes: authenticated has no INSERT privilege on public.tenants.)

interface MembershipQueryClient {
  from(table: "member_auth_memberships"): {
    select(columns: string): {
      eq(column: string, value: string): {
        limit(count: number): PromiseLike<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
}

/**
 * True when the signed-in identity has at least one Member Portal link.
 * Readable only for the caller's own rows (member_auth_memberships_own_read).
 * Callers must only use this when the identity has NO staff profile.
 * On a query error it returns true (fail closed: never offer church creation
 * when membership cannot be ruled out).
 */
export async function isMemberOnlyIdentity(client: MembershipQueryClient, authUserId: string): Promise<boolean> {
  if (!authUserId) return false;
  const { data, error } = await client
    .from("member_auth_memberships")
    .select("id")
    .eq("auth_user_id", authUserId)
    .limit(1);
  if (error) return true;
  return Array.isArray(data) && data.length > 0;
}

export const MEMBER_PORTAL_HOME = "/member";
