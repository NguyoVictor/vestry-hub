import { supabase } from "@/integrations/supabase/client";

type FeedAction = "notifications" | "mark_one" | "mark_all" | "latest_media";
export async function memberPortalFeed<T>(action: FeedAction, memberId: string, tenantId: string, notificationId?: string): Promise<T> {
  const raw = localStorage.getItem("member_session");
  let session: { memberId?: string; tenantId?: string; sessionToken?: string } | null = null;
  try { session = raw ? JSON.parse(raw) : null; } catch { /* invalid local session */ }
  if (!session?.sessionToken || session.memberId !== memberId || session.tenantId !== tenantId) throw new Error("Missing member session");
  const { data, error } = await supabase.functions.invoke("member-portal-feed", {
    body: { action, memberId, tenantId, sessionToken: session.sessionToken, ...(notificationId ? { notificationId } : {}) },
  });
  if (error || data?.error) throw new Error(data?.error || "Member feed request failed");
  return data as T;
}
