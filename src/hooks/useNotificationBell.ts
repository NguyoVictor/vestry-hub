import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memberPortalFeed } from "@/lib/memberPortalFeed";
import { useMemberPortal } from "@/contexts/MemberPortalContext";

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
      const result = await memberPortalFeed<{ notifications: MemberNotification[] }>("notifications", member.memberId, member.tenantId);
      return result.notifications;
    },
    staleTime: 60_000,
  });

  const notifications: MemberNotification[] = data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!notifications.some(n => !n.is_read)) return;
      await memberPortalFeed("mark_all", member.memberId, member.tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await memberPortalFeed("mark_one", member.memberId, member.tenantId, notificationId);
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
