import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnnouncementFeedAdmin } from "@/components/announcements/AnnouncementFeedAdmin";
import { PostAnnouncementDrawer } from "@/components/announcements/PostAnnouncementDrawer";
import type { AnnouncementType } from "@/types/announcements";

export default function Announcements() {
  const { tenantId, userId } = useChurch();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Fetch active announcement types ──────────────────────────────────────

  const { data: announcementTypes = [] } = useQuery<AnnouncementType[]>({
    queryKey: ["announcement-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENT_TYPES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("is_active", true)
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AnnouncementType[];
    },
    staleTime: 300_000,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenDrawer = () => setDrawerOpen(true);
  const handleCloseDrawer = () => setDrawerOpen(false);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="font-jakarta min-h-screen bg-slate-50 px-6 py-6">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <Megaphone className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-jakarta">
                Announcements
              </h1>
              <p className="text-sm text-slate-500 mt-0.5 font-jakarta">
                Post and manage church-wide announcements
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenDrawer}
            className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
          >
            <Megaphone className="h-4 w-4 mr-1.5" />
            Post Announcement
          </Button>
        </div>

        {/* ── Feed ── */}
        <AnnouncementFeedAdmin
          tenantId={tenantId}
          announcementTypes={announcementTypes}
          onPostNew={handleOpenDrawer}
        />

        {/* ── Post / Edit drawer ── */}
        <PostAnnouncementDrawer
          open={drawerOpen}
          onClose={handleCloseDrawer}
          tenantId={tenantId}
          userId={userId}
        />
      </div>
    </PageTransition>
  );
}
