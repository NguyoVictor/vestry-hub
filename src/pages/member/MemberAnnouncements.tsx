import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Pin } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  service: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  event: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function MemberAnnouncements() {
  const member = useMemberPortal();
  const [filter, setFilter] = useState("all");

  // Fetch member's group memberships so we can filter group-targeted announcements
  const { data: memberGroupIds = [] } = useQuery({
    queryKey: ["member-group-ids", member.memberId],
    queryFn: async () => {
      if (!member.memberId) return [];
      const { data } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select("group_id")
        .eq("member_id", member.memberId);
      return (data || []).map((r: any) => r.group_id as string);
    },
    enabled: !!member.memberId,
    staleTime: 300000,
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["member-announcements-full", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "active")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 300000,
  });

  // Audience filtering:
  // - "all" → show to everyone
  // - "group" → show only if member is in target_id group
  // - "branch" → show only to leaders (members with role leader/staff — treat as leaders_only)
  const visibleAnnouncements = announcements.filter((a: any) => {
    const audience = a.target_audience as string;
    if (audience === "all" || !audience) return true;
    if (audience === "group") return memberGroupIds.includes(a.target_id);
    if (audience === "branch") return member.role === "leader" || member.role === "staff";
    return true;
  });

  // Category filter (applied on top of audience filter)
  const filtered = filter === "all"
    ? visibleAnnouncements
    : visibleAnnouncements.filter((a: any) => (a.category as string) === filter);

  const incrementView = async (id: string) => {
    const ann = announcements.find((a: any) => a.id === id);
    if (ann) {
      await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .update({ view_count: ((ann as any).view_count || 0) + 1 } as any)
        .eq(COLS.ID, id);
    }
  };

  return (
    <>
      <Helmet><title>Announcements — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Announcements</h1>

        {/* Category filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["all", "general", "service", "event", "finance", "urgent"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No announcements</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((a: any) => (
              <div
                key={a.id}
                onClick={() => incrementView(a.id)}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 space-y-2 cursor-pointer hover:shadow-sm transition-shadow ${
                  a.is_pinned ? "border-indigo-200 dark:border-indigo-800" : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {a.is_pinned && <Pin className="h-3.5 w-3.5 text-indigo-500" />}
                  <Badge className={`text-xs capitalize ${CATEGORY_COLORS[a.category || "general"] || ""}`}>
                    {a.category || "general"}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(a.created_at), "dd MMM yyyy")}
                  </span>
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
