import { supabase } from "@/integrations/supabase/client";

export type MemberProfileFields = {
  first_name: string; last_name: string; phone: string; date_of_birth: string;
  gender: string; marital_status: string; address: string; city: string;
};
export async function memberProfileRequest(action: "get_profile" | "update_profile" | "leave_church", memberId: string, tenantId: string, profile?: MemberProfileFields) {
  let session: { memberId?: string; tenantId?: string; sessionToken?: string } | null = null;
  try { session = JSON.parse(localStorage.getItem("member_session") || "null"); } catch { /* invalid local session */ }
  if (!session?.sessionToken || session.memberId !== memberId || session.tenantId !== tenantId) throw new Error("Missing member session");
  const { data, error } = await supabase.functions.invoke("member-profile-update", {
    body: { action, memberId, tenantId, sessionToken: session.sessionToken, ...(profile ? { profile } : {}) },
  });
  if (error || data?.error) throw new Error(data?.error || "Member profile request failed");
  return data as { ok: boolean; profile?: MemberProfileFields };
}
