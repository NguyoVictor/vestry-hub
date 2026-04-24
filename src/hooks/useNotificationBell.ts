import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";

export interface MemberNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  metadata?: {
    announcementId?: string;
    categoryColor?: string;
    categoryLabel?: string;
  };
}

export function useNotificationBell() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();

  const queryKey = ["member-notifications", member.memberId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .select("*")
        .eq(COLS.TENANT_ID, member.tenantId)
        .eq(COLS.NOTIF_USER_ID, member.memberId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as MemberNotification[];
    },
    staleTime: 60_000,
  });

  const notifications: MemberNotification[] = data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .update({ [COLS.NOTIF_IS_READ]: true })
        .in(COLS.ID, unreadIds)
        .eq(COLS.TENANT_ID, member.tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .update({ [COLS.NOTIF_IS_READ]: true })
        .eq(COLS.ID, notificationId)
        .eq(COLS.TENANT_ID, member.tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllRead: () => markAllReadMutation.mutate(),
    markOneRead: (notificationId: string) =>
      markOneReadMutation.mutate(notificationId),
  };
}
