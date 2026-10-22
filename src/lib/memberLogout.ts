/** Revoke a member's opaque Vestry Hub session on the server. */
export async function revokeMemberSession(): Promise<boolean> {
  const raw = localStorage.getItem("member_session");
  if (!raw) return true;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return false;
    const { memberId, tenantId, sessionToken } = value as Record<string, unknown>;
    if (typeof memberId !== "string" || typeof tenantId !== "string" || typeof sessionToken !== "string") return false;
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ memberId, tenantId, sessionToken }),
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    // Always clear local access even if server revocation fails due to network outage.
    localStorage.removeItem("member_session");
  }
}
