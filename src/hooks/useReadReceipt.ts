import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES } from "@/lib/schema";

/**
 * Automatically marks an announcement as read when the card enters the
 * viewport and stays visible for at least 2 seconds.
 *
 * Silent — no toast on success or failure.
 * Skips the upsert if the member has already read this announcement in
 * the current session (hasRead guard).
 */
export function useReadReceipt(
  announcementId: string,
  cardRef: React.RefObject<HTMLElement>
): void {
  const member = useMemberPortal();
  const [hasRead, setHasRead] = useState(false);

  useEffect(() => {
    // Skip if already recorded in this session or ref not yet attached
    if (hasRead || !cardRef.current) return;

    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Start 2-second dwell timer
          timer = setTimeout(async () => {
            const { error } = await supabase
              .from(TABLES.ANNOUNCEMENT_READ_RECEIPTS)
              .upsert(
                {
                  announcement_id: announcementId,
                  member_id: member.memberId,
                  tenant_id: member.tenantId,
                  read_at: new Date().toISOString(),
                },
                { onConflict: "announcement_id,member_id", ignoreDuplicates: true }
              );

            if (!error) {
              setHasRead(true);
            }
            // Silent on error — no toast
          }, 2000);
        } else {
          // Card left viewport before 2 seconds — cancel the timer
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [announcementId, member.memberId, member.tenantId, hasRead, cardRef]);
}
