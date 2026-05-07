import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { format } from "date-fns";
import { Send, Mail, FileText, Eye, Edit, Trash2, Clock } from "lucide-react";
import { ChannelBadge } from "./ChannelBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageFeedProps {
  activeTab: "broadcasts" | "sent" | "drafts";
  onTabChange: (tab: "broadcasts" | "sent" | "drafts") => void;
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
  tenantId: string;
}

const tabConfig = [
  { id: "broadcasts", label: "Broadcasts", icon: Send },
  { id: "sent", label: "Sent Messages", icon: Mail },
  { id: "drafts", label: "Drafts & Scheduled", icon: FileText },
];

const channelFilters = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "in_app", label: "In-App" },
];

const EmptyState = ({ icon: Icon, title, description }: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="mb-4"
    >
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-purple-500/25">
        <Icon className="h-12 w-12" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
      </div>
    </motion.div>
    <h3 className="text-lg font-semibold mb-2" style={{ color: 'white' }}>
      {title}
    </h3>
    <p className="text-sm max-w-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
      {description}
    </p>
  </div>
);

export const MessageFeed = ({ 
  activeTab, 
  onTabChange, 
  selectedChannel, 
  onChannelChange, 
  tenantId 
}: MessageFeedProps) => {
  const [draftCount, setDraftCount] = useState(0);

  // Fetch broadcasts
  const { data: broadcasts = [], isLoading: broadcastsLoading } = useQuery({
    queryKey: ["broadcasts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.BROADCASTS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch communications
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ["communications", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.COMMUNICATIONS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Filter data based on active tab and selected channel
  const getFilteredData = () => {
    let data: any[] = [];
    
    switch (activeTab) {
      case "broadcasts":
        data = broadcasts.filter(b => b.status === "sent");
        break;
      case "sent":
        data = [...broadcasts.filter(b => b.status === "sent"), ...communications.filter(c => c.status === "sent")];
        break;
      case "drafts":
        data = [...broadcasts.filter(b => b.status === "draft" || b.status === "scheduled"), 
               ...communications.filter(c => c.status === "draft" || c.status === "scheduled")];
        break;
    }

    if (selectedChannel !== "all") {
      data = data.filter(item => {
        if (item.channels) {
          return item.channels.includes(selectedChannel);
        }
        if (item.channel) {
          return item.channel === selectedChannel;
        }
        return false;
      });
    }

    return data;
  };

  const filteredData = getFilteredData();
  const isLoading = broadcastsLoading || communicationsLoading;

  // Update draft count
  useEffect(() => {
    const drafts = [...broadcasts.filter(b => b.status === "draft" || b.status === "scheduled"), 
                   ...communications.filter(c => c.status === "draft" || c.status === "scheduled")];
    setDraftCount(drafts.length);
  }, [broadcasts, communications]);

  return (
    <div className="backdrop-blur-[20px] bg-white/[0.04] border border-purple-500/25 rounded-2xl shadow-2xl shadow-purple-900/20 overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-white/10 p-6 pb-0">
        <div className="flex items-center gap-1 mb-6 relative">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors`}
                style={{ 
                  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)' 
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "drafts" && draftCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-semibold"
                  >
                    {draftCount}
                  </motion.span>
                )}
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Channel Filters */}
        <div className="flex items-center gap-2 pb-6">
          {channelFilters.map((filter) => (
            <motion.button
              key={filter.id}
              onClick={() => onChannelChange(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedChannel === filter.id
                  ? 'bg-white/10 border border-white/20'
                  : 'hover:bg-white/[0.04]'
              }`}
              style={{
                color: selectedChannel === filter.id ? 'white' : 'rgba(255, 255, 255, 0.6)',
                border: selectedChannel === filter.id ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {filter.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02]">
                  <Skeleton className="h-10 w-10 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                    <Skeleton className="h-3 w-1/2 bg-white/10" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : filteredData.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {activeTab === "broadcasts" && (
                <EmptyState
                  icon={Send}
                  title="No broadcasts sent yet"
                  description="Create your first broadcast to reach your congregation."
                />
              )}
              {activeTab === "sent" && (
                <EmptyState
                  icon={Mail}
                  title="No messages sent yet"
                  description="Start communicating with your members through various channels."
                />
              )}
              {activeTab === "drafts" && (
                <EmptyState
                  icon={FileText}
                  title="No drafts or scheduled messages"
                  description="Draft messages and scheduled communications will appear here."
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredData.map((item, index) => {
                const channel = item.channels?.[0] || item.channel || "in_app";
                const sentAt = item.sent_at || item.scheduled_at || item.created_at;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-semibold truncate" style={{ color: 'white' }}>
                          {item.subject || "(No subject)"}
                        </h4>
                        <ChannelBadge channel={channel} size="sm" />
                      </div>
                      
                      <p className="text-sm mb-3 line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {item.body?.replace(/<[^>]+>/g, "").slice(0, 120)}...
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        <span>👥 {item.recipient_count || 0} recipients</span>
                        <span>📅 {sentAt ? format(new Date(sentAt), "MMM dd, yyyy · HH:mm") : "—"}</span>
                        {item.status && (
                          <span className={`px-2 py-1 rounded-full ${
                            item.status === "sent" ? "bg-emerald-500/20 text-emerald-400" :
                            item.status === "scheduled" ? "bg-blue-500/20 text-blue-400" :
                            "bg-orange-500/20 text-orange-400"
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(item.status === "draft" || item.status === "scheduled") && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-500/10" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};