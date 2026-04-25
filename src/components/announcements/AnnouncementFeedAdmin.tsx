import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { AnnouncementCardAdmin } from "@/components/announcements/AnnouncementCardAdmin";
import { PostAnnouncementDrawer } from "@/components/announcements/PostAnnouncementDrawer";
import { useChurch } from "@/contexts/ChurchContext";
import type {
  Announcement,
  AnnouncementType,
  AnnouncementAttachment,
  AnnouncementReaction,
  AnnouncementComment,
} from "@/types/announcements";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnnouncementFeedAdminProps {
  tenantId: string;
  announcementTypes: AnnouncementType[];
  onPostNew: () => void;
}

type AnnouncementWithRelations = Announcement & {
  announcement_types: Pick<AnnouncementType, "label" | "color" | "icon"> | null;
  announcement_attachments: AnnouncementAttachment[];
  announcement_reactions: AnnouncementReaction[];
  announcement_comments: AnnouncementComment[];
};

// ─── Animation variants ───────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// ─── Card skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementFeedAdmin({
  tenantId,
  announcementTypes,
  onPostNew,
}: AnnouncementFeedAdminProps) {
  const qc = useQueryClient();
  const { userId } = useChurch();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [editData, setEditData] = useState<Announcement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [receiptsAnnouncementId, setReceiptsAnnouncementId] = useState<string | null>(null);

  // ── Fetch announcements ───────────────────────────────────────────────────

  const { data: announcements = [], isLoading } = useQuery<AnnouncementWithRelations[]>({
    queryKey: ["announcements", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .select(`*, announcement_types(label, color, icon), announcement_attachments(*), announcement_reactions(*), announcement_comments(*, members(first_name, last_name, avatar_url))`)
        .eq(COLS.TENANT_ID, tenantId)
        .neq("status", "archived")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnnouncementWithRelations[];
    },
    staleTime: 300_000,
  });

  // ── Fetch groups (for AnnouncementCardAdmin audience labels) ──────────────

  const { data: groups = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["groups", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.GROUPS)
        .select("id, name")
        .eq(COLS.TENANT_ID, tenantId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["announcements", tenantId] });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .update({ status: "archived" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement archived");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to archive announcement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete announcement");
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .update({ is_pinned: pinned } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update pin status");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (ann: Announcement) => {
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .insert({
          tenant_id: ann.tenant_id,
          title: `Copy of ${ann.title}`,
          body: ann.body,
          rich_body: ann.rich_body,
          category_id: ann.category_id,
          audience: ann.audience,
          group_id: ann.group_id,
          is_pinned: false,
          status: "draft",
          comments_enabled: ann.comments_enabled,
          reactions_enabled: ann.reactions_enabled,
          created_by: userId,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement duplicated as draft");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to duplicate announcement");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEdit = (ann: Announcement) => {
    setEditData(ann);
    setDrawerOpen(true);
  };

  const handleDuplicate = (ann: Announcement) => {
    duplicateMutation.mutate(ann);
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleTogglePin = (id: string, pinned: boolean) => {
    togglePinMutation.mutate({ id, pinned });
  };

  const handleViewReceipts = (id: string) => {
    setReceiptsAnnouncementId(id);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditData(null);
  };

  // ── Category filter tabs ──────────────────────────────────────────────────

  const activeTypes = announcementTypes.filter((t) => t.is_active);

  const tabs = [
    { id: "all", label: "All" },
    ...activeTypes.map((t) => ({ id: t.id, label: t.label })),
  ];

  // ── Filtered announcements ────────────────────────────────────────────────

  const filtered =
    activeCategory === "all"
      ? announcements
      : announcements.filter((a) => a.category_id === activeCategory);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-jakarta space-y-5">
      {/* ── Category filter tabs ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-0 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id)}
            className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeCategory === tab.id
                ? "text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
            {activeCategory === tab.id && (
              <motion.div
                layoutId="announcementActiveTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && filtered.length === 0 && (
        <Empty
          icon={Megaphone}
          title="No announcements yet"
          description="Post your first announcement to keep your congregation informed."
          action={
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={onPostNew}
            >
              <Megaphone className="h-4 w-4 mr-1.5" />
              Post Announcement
            </Button>
          }
        />
      )}

      {/* ── Announcement list ── */}
      {!isLoading && filtered.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {filtered.map((ann) => (
            <motion.div key={ann.id} variants={item}>
              <AnnouncementCardAdmin
                announcement={ann}
                groups={groups}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onViewReceipts={handleViewReceipts}
                onTogglePin={handleTogglePin}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Edit drawer ── */}
      <PostAnnouncementDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        tenantId={tenantId}
        userId={userId}
        editData={editData}
      />
    </div>
  );
}
