import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import { useChurch } from "@/contexts/ChurchContext";

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

export function useActivityLog(limit = 10) {
  const church = useChurch();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activity-log", church.tenantId, limit],
    queryFn: async () => {
      // SECURITY FIX: Always use church context, never accept churchId parameter
      // This prevents multi-tenant data leakage
      const { data, error } = await supabase
        .from(TABLES.ACTIVITY_LOG)
        .select(`
          id,
          action_type,
          description,
          actor_name,
          actor_avatar_url,
          entity_type,
          entity_name,
          created_at,
          metadata
        `)
        .eq(COLS.TENANT_ID, church.tenantId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 100)); // Cap at 100 to prevent memory issues
      
      if (error) throw error;
      return (data || []) as ActivityEntry[];
    },
    enabled: !!church?.tenantId,
    staleTime: 30_000, // 30s — activity feed should be fairly fresh
    gcTime: 300_000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Realtime subscription — invalidate on new INSERT
  useEffect(() => {
    if (!church?.tenantId) return;
    
    const channel = supabase
      .channel(`activity-log:${church.tenantId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: TABLES.ACTIVITY_LOG, 
          filter: `tenant_id=eq.${church.tenantId}` 
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ["activity-log", church.tenantId] 
          });
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [church?.tenantId, queryClient]);

  return query;
}
