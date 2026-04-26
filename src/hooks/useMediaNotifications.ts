import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";

/**
 * Dispatches in-app notifications for Church Media events.
 * Follows the exact same pattern as useTestimonyNotifications.
 * Silent on failure — console.error only, no user-facing toast.
 */
export function useMediaNotifications() {

  /**
   * EVENT 1: Featured media uploaded → notify all active members
   */
  const notifyFeaturedMedia = async (
    tenantId: string,
    mediaTitle: string | null,
    mediaId: string
  ): Promise<void> => {
    try {
      const { data: members, error } = await supabase
        .from(TABLES.MEMBERS)
        .select(COLS.ID)
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_STATUS, "active");

      if (error) throw error;
      if (!members?.length) return;

      const records = members.map(m => ({
        tenant_id: tenantId,
        user_id: m.id,
        type: "featured_media",
        title: "New Featured Media 📸",
        body: mediaTitle
          ? `"${mediaTitle}" has been featured in Church Media`
          : "New content has been featured in Church Media",
        is_read: false,
        link: "/member/church-media",
        metadata: { mediaId },
      }));

      const { error: insertError } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert(records as never);

      if (insertError) throw insertError;
    } catch (err) {
      console.error("[useMediaNotifications] notifyFeaturedMedia failed:", err);
    }
  };

  /**
   * EVENT 2: Storage hits 80% — notify church admin users ONCE.
   * Checks storage_warning_sent_at before sending.
   */
  const notifyStorageWarning = async (tenantId: string): Promise<void> => {
    try {
      // Check if warning already sent
      const { data: storageRow } = await supabase
        .from(TABLES.CHURCH_STORAGE)
        .select("storage_warning_sent_at")
        .eq("tenant_id", tenantId)
        .single();

      if ((storageRow as any)?.storage_warning_sent_at) return; // already sent

      const { data: adminUsers, error } = await supabase
        .from(TABLES.USERS)
        .select(COLS.ID)
        .eq(COLS.TENANT_ID, tenantId);

      if (error) throw error;
      if (!adminUsers?.length) return;

      const records = adminUsers.map(u => ({
        tenant_id: tenantId,
        user_id: u.id,
        type: "storage_warning",
        title: "Storage Running Low ⚠️",
        body: "You've used 80% of your storage. Consider upgrading your plan to avoid interruptions.",
        is_read: false,
        link: "/church-media",
        metadata: {},
      }));

      const { error: insertError } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert(records as never);

      if (insertError) throw insertError;

      // Mark warning as sent
      await supabase
        .from(TABLES.CHURCH_STORAGE)
        .update({ storage_warning_sent_at: new Date().toISOString() } as never)
        .eq("tenant_id", tenantId);
    } catch (err) {
      console.error("[useMediaNotifications] notifyStorageWarning failed:", err);
    }
  };

  /**
   * EVENT 3: Storage hits 100% — notify church admin users ONCE.
   * Checks storage_full_notified_at before sending.
   */
  const notifyStorageFull = async (tenantId: string): Promise<void> => {
    try {
      // Check if full notification already sent
      const { data: storageRow } = await supabase
        .from(TABLES.CHURCH_STORAGE)
        .select("storage_full_notified_at")
        .eq("tenant_id", tenantId)
        .single();

      if ((storageRow as any)?.storage_full_notified_at) return; // already sent

      const { data: adminUsers, error } = await supabase
        .from(TABLES.USERS)
        .select(COLS.ID)
        .eq(COLS.TENANT_ID, tenantId);

      if (error) throw error;
      if (!adminUsers?.length) return;

      const records = adminUsers.map(u => ({
        tenant_id: tenantId,
        user_id: u.id,
        type: "storage_full",
        title: "Storage Full — Uploads Blocked 🚫",
        body: "Your storage is full. New uploads are blocked. Upgrade your plan to continue.",
        is_read: false,
        link: "/church-media",
        metadata: {},
      }));

      const { error: insertError } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert(records as never);

      if (insertError) throw insertError;

      // Mark full notification as sent
      await supabase
        .from(TABLES.CHURCH_STORAGE)
        .update({ storage_full_notified_at: new Date().toISOString() } as never)
        .eq("tenant_id", tenantId);
    } catch (err) {
      console.error("[useMediaNotifications] notifyStorageFull failed:", err);
    }
  };

  /**
   * Check storage thresholds after an upload and fire notifications if needed.
   * Call this after every successful upload.
   */
  const checkAndNotifyStorageThresholds = async (tenantId: string): Promise<void> => {
    try {
      const { data } = await supabase.rpc("get_storage_stats", { p_tenant_id: tenantId });
      const stats = data?.[0];
      if (!stats) return;

      if (stats.is_over_limit) {
        await notifyStorageFull(tenantId);
      } else if (stats.is_near_limit) {
        await notifyStorageWarning(tenantId);
      }
    } catch (err) {
      console.error("[useMediaNotifications] checkAndNotifyStorageThresholds failed:", err);
    }
  };

  return {
    notifyFeaturedMedia,
    notifyStorageWarning,
    notifyStorageFull,
    checkAndNotifyStorageThresholds,
  };
}
