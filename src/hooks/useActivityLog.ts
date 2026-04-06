import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityEntry {
  id: string;
  tenant_id: string;
  action_type: string;
  description: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useActivityLog(churchId: string, limit = 10) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activity-log", churchId, limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_log")
        .select("*")
        .eq("tenant_id", churchId)  // DB uses tenant_id
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as ActivityEntry[];
    },
    enabled: !!churchId,
    staleTime: 30_000, // 30s — activity feed should be fairly fresh
  });

  // Realtime subscription — invalidate on new INSERT
  useEffect(() => {
    if (!churchId) return;
    const channel = supabase
      .channel(`activity-log:${churchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `tenant_id=eq.${churchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity-log", churchId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [churchId, queryClient]);

  return query;
}
