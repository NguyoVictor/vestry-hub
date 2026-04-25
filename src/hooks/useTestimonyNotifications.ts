import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";

/**
 * Dispatches in-app notifications for testimony workflow events.
 * Follows the exact same pattern as useAnnouncementNotifications.
 * Silent on failure — console.error only, no user-facing toast.
 */
export function useTestimonyNotifications() {

  /** EVENT 1: New testimony submitted → notify all admin users */
  const notifyAdminNewTestimony = async (
    tenantId: string,
    testimonyId: string,
    testimonyTitle: string,
    memberName: string | null,
    isAnonymous: boolean
  ): Promise<void> => {
    try {
      // Fetch all admin/staff users for this tenant
      const { data: adminUsers, error } = await supabase
        .from(TABLES.USERS)
        .select(COLS.ID)
        .eq(COLS.TENANT_ID, tenantId);

      if (error) throw error;
      if (!adminUsers?.length) return;

      const body = isAnonymous
        ? `A member shared a new testimony: "${testimonyTitle}"`
        : `${memberName} shared a testimony: "${testimonyTitle}"`;

      const records = adminUsers.map(u => ({
        tenant_id: tenantId,
        user_id: u.id,
        type: "testimony_submitted",
        title: "New Testimony Submitted",
        body,
        is_read: false,
        link: "/testimonies",
        metadata: { testimonyId, tab: "pending" },
      }));

      const { error: insertError } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert(records as never);

      if (insertError) throw insertError;
    } catch (err) {
      console.error("[useTestimonyNotifications] notifyAdminNewTestimony failed:", err);
    }
  };

  /** EVENT 2: Testimony approved → notify the submitting member */
  const notifyMemberApproved = async (
    tenantId: string,
    memberId: string,
    testimonyId: string,
    testimonyTitle: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert({
          tenant_id: tenantId,
          user_id: memberId,
          type: "testimony_approved",
          title: "Your Testimony Has Been Published! 🙏",
          body: `Your testimony "${testimonyTitle}" is now live and visible to the congregation.`,
          is_read: false,
          link: "/member/testimonies",
          metadata: { testimonyId, tab: "published" },
        } as never);

      if (error) throw error;
    } catch (err) {
      console.error("[useTestimonyNotifications] notifyMemberApproved failed:", err);
    }
  };

  /** EVENT 3: Testimony declined → notify the submitting member (neutral language) */
  const notifyMemberDeclined = async (
    tenantId: string,
    memberId: string,
    testimonyId: string,
    testimonyTitle: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert({
          tenant_id: tenantId,
          user_id: memberId,
          type: "testimony_declined",
          title: "Your Testimony Has Been Reviewed",
          body: `Your testimony "${testimonyTitle}" was reviewed. Please reach out to the church admin for more information.`,
          is_read: false,
          link: "/member/testimonies",
          metadata: { testimonyId, tab: "mine" },
        } as never);

      if (error) throw error;
    } catch (err) {
      console.error("[useTestimonyNotifications] notifyMemberDeclined failed:", err);
    }
  };

  /** EVENT 4: Testimony featured → notify the submitting member (only if not anonymous) */
  const notifyMemberFeatured = async (
    tenantId: string,
    memberId: string,
    testimonyId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert({
          tenant_id: tenantId,
          user_id: memberId,
          type: "testimony_featured",
          title: "Your Testimony Was Featured! ✨",
          body: "Your testimony has been selected as a featured story for the congregation.",
          is_read: false,
          link: "/member/testimonies",
          metadata: { testimonyId },
        } as never);

      if (error) throw error;
    } catch (err) {
      console.error("[useTestimonyNotifications] notifyMemberFeatured failed:", err);
    }
  };

  return {
    notifyAdminNewTestimony,
    notifyMemberApproved,
    notifyMemberDeclined,
    notifyMemberFeatured,
  };
}
