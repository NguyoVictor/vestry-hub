import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageTransition } from "@/components/ui/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { AnnouncementCardMember } from "@/components/announcements/AnnouncementCardMember";
import type { AnnouncementType } from "@/types/announcements";

// ─── Skeleton card for loading state ─────────────────────────────────────────

function AnnouncementSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberAnnouncements() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  // Clear highlight param after animation
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("highlight");
        return next;
      }, { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [highlightId, setSearchParams]);

  // Scroll highlighted card into view
  useEffect(() => {
    if (!highlightId || !highlightedRef.current) return;
    highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  // ── Query 1: Member's group memberships (for audience filtering) ──
  const { data: memberGroupIds = [] } = useQuery({
    queryKey: ["member-group-ids", member.memberId],
    queryFn: async () => {
      if (!member.memberId) return [];
      const { data } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select("group_id")
        .eq("member_id", member.memberId);
      return (data ?? []).map((r: { group_id: string }) => r.group_id);
    },
    enabled: !!member.memberId,
    staleTime: 300_000,
  });

  // ── Query 2: Announcements with all related data ──
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["member-announcements", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .select(`
          *,
          announcement_types(label, color),
          announcement_attachments(*),
          announcement_reactions(*),
          announcement_comments(*, members(first_name, last_name, avatar_url))
        `)
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "active")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // ── Query 3: Active announcement types for filter pills ──
  const { data: announcementTypes = [] } = useQuery({
    queryKey: ["announcement-types", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENT_TYPES)
        .select("id, label, color")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("is_active", true)
        .order("order");
      if (error) throw error;
      return (data ?? []) as Pick<AnnouncementType, "id" | "label" | "color">[];
    },
    staleTime: 300_000,
  });

  // ── Mutation: Reaction toggle ──
  const reactionMutation = useMutation({
    mutationFn: async ({
      announcementId,
      emoji,
    }: {
      announcementId: string;
      emoji: string;
    }) => {
      // Check if member already reacted with this emoji
      const { data: existing } = await supabase
        .from(TABLES.ANNOUNCEMENT_REACTIONS)
        .select("id")
        .eq("announcement_id", announcementId)
        .eq("member_id", member.memberId)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        // Delete existing reaction
        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENT_REACTIONS)
          .delete()
          .eq("announcement_id", announcementId)
          .eq("member_id", member.memberId)
          .eq("emoji", emoji);
        if (error) throw error;
      } else {
        // Insert new reaction
        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENT_REACTIONS)
          .insert({
            tenant_id: member.tenantId,
            announcement_id: announcementId,
            member_id: member.memberId,
            emoji,
          } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-announcements", member.churchId] });
    },
    onError: () => {
      toast.error("Failed to update reaction");
    },
  });

  // ── Mutation: Add comment ──
  const commentMutation = useMutation({
    mutationFn: async ({
      announcementId,
      body,
      parentId,
    }: {
      announcementId: string;
      body: string;
      parentId?: string;
    }) => {
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENT_COMMENTS)
        .insert({
          tenant_id: member.tenantId,
          announcement_id: announcementId,
          member_id: member.memberId,
          body,
          parent_id: parentId ?? null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-announcements", member.churchId] });
    },
    onError: () => {
      toast.error("Failed to post comment");
    },
  });

  // ── Audience + expiry filtering ──
  const visibleAnnouncements = (announcements as any[]).filter((a) => {
    // Filter expired
    if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
    // Audience filter
    if (a.audience === "all" || !a.audience) return true;
    if (a.audience === "specific_group") return memberGroupIds.includes(a.group_id);
    if (a.audience === "leaders_only")
      return member.memberType === "leader" || member.memberType === "staff";
    return true;
  });

  // ── Category filter ──
  const filteredAnnouncements =
    selectedTypeId === null
      ? visibleAnnouncements
      : visibleAnnouncements.filter((a) => a.category_id === selectedTypeId);

  const isLoading = announcementsLoading;

  return (
    <PageTransition>
      <div className="font-jakarta min-h-screen bg-slate-50 px-4 py-6">
        <Helmet>
          <title>Announcements — Vestry</title>
        </Helmet>

        <div className="max-w-[680px] mx-auto space-y-5">
          {/* ── Page header ── */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-jakarta">Announcements</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-jakarta">
              Stay up to date with what's happening
            </p>
          </div>

          {/* ── Category filter pills ── */}
          {announcementTypes.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {/* "All" pill */}
              <button
                onClick={() => setSelectedTypeId(null)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedTypeId === null
                    ? "bg-orange-500 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                All
              </button>

              {/* Type pills */}
              {announcementTypes.map((type) => {
                const isActive = selectedTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTypeId(isActive ? null : type.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}
                    style={isActive ? { backgroundColor: type.color } : undefined}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Content ── */}
          {isLoading ? (
            <div className="space-y-4">
              <AnnouncementSkeleton />
              <AnnouncementSkeleton />
              <AnnouncementSkeleton />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <Empty
              icon={Megaphone}
              title="No announcements for you right now"
              description="Check back later for updates from your church."
            />
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement: any) => (
                <div
                  key={announcement.id}
                  ref={announcement.id === highlightId ? highlightedRef : null}
                  className={announcement.id === highlightId
                    ? "rounded-xl ring-2 ring-orange-400 ring-offset-2 transition-all duration-300"
                    : undefined}
                >
                  <AnnouncementCardMember
                    announcement={announcement}
                    currentMemberId={member.memberId}
                    onReactionToggle={(announcementId, emoji) =>
                      reactionMutation.mutate({ announcementId, emoji })
                    }
                    onAddComment={(announcementId, body, parentId) =>
                      commentMutation.mutate({ announcementId, body, parentId })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
