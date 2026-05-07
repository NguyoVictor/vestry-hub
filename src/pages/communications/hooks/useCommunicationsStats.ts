import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { useEffect } from "react";

interface CommunicationsStats {
  totalSent: number;
  drafts: number;
  scheduled: number;
  reachRate: number;
  channels: {
    email: number;
    sms: number;
    whatsapp: number;
    broadcast: number;
    inApp: number;
  };
}

export const useCommunicationsStats = (tenantId: string | null) => {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["communications-stats", tenantId],
    queryFn: async (): Promise<CommunicationsStats> => {
      if (!tenantId) throw new Error("No tenant ID");

      // Fetch broadcasts
      const { data: broadcasts } = await supabase
        .from(TABLES.BROADCASTS)
        .select("*")
        .eq("tenant_id", tenantId);

      // Fetch communications
      const { data: communications } = await supabase
        .from(TABLES.COMMUNICATIONS)
        .select("*")
        .eq("tenant_id", tenantId);

      // Fetch admin broadcasts
      const { data: adminBroadcasts } = await supabase
        .from(TABLES.ADMIN_BROADCASTS)
        .select("*")
        .eq("tenant_id", tenantId);

      // Fetch SMS history
      const { data: smsHistory } = await supabase
        .from(TABLES.SMS_HISTORY)
        .select("*")
        .eq("tenant_id", tenantId);

      // Fetch WhatsApp messages
      const { data: whatsappMessages } = await supabase
        .from(TABLES.WHATSAPP_MESSAGES)
        .select("*")
        .eq("tenant_id", tenantId);

      const allMessages = [
        ...(broadcasts || []),
        ...(communications || []),
        ...(adminBroadcasts || []),
        ...(smsHistory || []),
        ...(whatsappMessages || []),
      ];

      // Calculate stats
      const sentMessages = allMessages.filter(msg => msg.status === "sent");
      const draftMessages = allMessages.filter(msg => msg.status === "draft");
      const scheduledMessages = allMessages.filter(msg => msg.status === "scheduled");
      
      // Calculate reach rate (delivered / sent)
      const totalDelivered = sentMessages.reduce((sum, msg) => sum + (msg.delivered_count || 0), 0);
      const totalSent = sentMessages.reduce((sum, msg) => sum + (msg.sent_count || msg.recipient_count || 0), 0);
      const reachRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

      // Calculate channel breakdown
      const channels = {
        email: 0,
        sms: 0,
        whatsapp: 0,
        broadcast: 0,
        inApp: 0,
      };

      sentMessages.forEach(msg => {
        if (msg.channel) {
          // Single channel message
          switch (msg.channel) {
            case "email":
              channels.email++;
              break;
            case "sms":
              channels.sms++;
              break;
            case "whatsapp":
              channels.whatsapp++;
              break;
            case "in_app":
              channels.inApp++;
              break;
          }
        } else if (msg.channels && Array.isArray(msg.channels)) {
          // Multi-channel message (broadcasts)
          msg.channels.forEach((channel: string) => {
            switch (channel) {
              case "email":
                channels.email++;
                break;
              case "sms":
                channels.sms++;
                break;
              case "whatsapp":
                channels.whatsapp++;
                break;
              case "in_app":
                channels.inApp++;
                break;
            }
          });
        }
        
        // Check if it's from admin_broadcasts table
        if (adminBroadcasts?.includes(msg)) {
          channels.broadcast++;
        }
      });

      return {
        totalSent: sentMessages.length,
        drafts: draftMessages.length,
        scheduled: scheduledMessages.length,
        reachRate,
        channels,
      };
    },
    enabled: !!tenantId,
    staleTime: 300_000, // 5 minutes
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!tenantId) return;

    const channels = [
      TABLES.BROADCASTS,
      TABLES.COMMUNICATIONS,
      TABLES.ADMIN_BROADCASTS,
      TABLES.SMS_HISTORY,
      TABLES.WHATSAPP_MESSAGES,
    ];

    const subscriptions = channels.map(table => 
      supabase
        .channel(`${table}-changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `tenant_id=eq.${tenantId}`,
          },
          () => {
            refetch();
            // Show subtle toast notification
            if (typeof window !== "undefined") {
              const toast = document.createElement("div");
              toast.className = "fixed bottom-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-lg text-sm z-50 animate-in slide-in-from-bottom-2";
              toast.textContent = "New message activity";
              document.body.appendChild(toast);
              setTimeout(() => {
                toast.remove();
              }, 3000);
            }
          }
        )
        .subscribe()
    );

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [tenantId, refetch]);

  return {
    stats: stats || {
      totalSent: 0,
      drafts: 0,
      scheduled: 0,
      reachRate: 0,
      channels: {
        email: 0,
        sms: 0,
        whatsapp: 0,
        broadcast: 0,
        inApp: 0,
      },
    },
    isLoading,
    refetch,
  };
};