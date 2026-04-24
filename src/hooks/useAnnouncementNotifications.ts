import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import type { AnnouncementAudience } from "@/types/announcements";

interface AnnouncementNotifyPayload {
  title: string;
  body: string | null;
  rich_body: string | null;
  audience: AnnouncementAudience;
  group_id: string | null;
}

/**
 * Fans out in-app notification records to all target audience members
 * when an announcement is posted.
 *
 * Silent on failure — console.error only, no user-facing toast.
 */
export function useAnnouncementNotifications() {
  const { tenantId } = useChurch();

  const notify = async (
    announcementId: string,
    announcement: AnnouncementNotifyPayload,
    categoryColor: string,
    categoryLabel: string
  ): Promise<void> => {
    try {
      // ── 1. Resolve target member IDs based on audience ──────────────────
      let memberIds: string[] = [];

      if (announcement.audience === "all") {
        const { data, error } = await supabase
          .from(TABLES.MEMBERS)
          .select(COLS.ID)
          .eq(COLS.TENANT_ID, tenantId)
          .eq(COLS.MEMBER_STATUS, "active");

        if (error) throw error;
        memberIds = (data ?? []).map((m) => m.id);
      } else if (
        announcement.audience === "specific_group" &&
        announcement.group_id
      ) {
        const { data, error } = await supabase
          .from(TABLES.GROUP_MEMBERS)
          .select("member_id")
          .eq("group_id", announcement.group_id);

        if (error) throw error;
        memberIds = (data ?? []).map((m) => m.member_id);
      } else if (announcement.audience === "leaders_only") {
        const { data, error } = await supabase
          .from(TABLES.MEMBERS)
          .select(COLS.ID)
          .eq(COLS.TENANT_ID, tenantId)
          .in("member_type", ["leader", "staff"]);

        if (error) throw error;
        memberIds = (data ?? []).map((m) => m.id);
      }

      if (memberIds.length === 0) return;

      // ── 2. Build plain-text body (strip HTML, truncate to 120 chars) ────
      const rawText = (announcement.rich_body ?? announcement.body ?? "")
        .replace(/<[^>]+>/g, "")
        .trim();
      const plainBody = rawText.length > 120 ? rawText.slice(0, 120) : rawText;

      // ── 3. Batch-insert notification records ────────────────────────────
      const records = memberIds.map((memberId) => ({
        tenant_id: tenantId,
        user_id: memberId,
        type: "announcement",
        title: announcement.title,
        body: plainBody,
        is_read: false,
        link: "/member/announcements",
        metadata: {
          announcementId,
          categoryColor,
          categoryLabel,
        },
      }));

      const { error: insertError } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert(records as never);

      if (insertError) throw insertError;
    } catch (err) {
      console.error("[useAnnouncementNotifications] Failed to fan out notifications:", err);
    }
  };

  return { notify };
}
