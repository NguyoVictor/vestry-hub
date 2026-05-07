import { motion } from "framer-motion";
import { Mail, MessageSquare, MessageCircle, Radio, Bell } from "lucide-react";

interface ChannelBreakdownBarProps {
  stats: {
    channels: {
      email: number;
      sms: number;
      whatsapp: number;
      broadcast: number;
      inApp: number;
    };
  };
  onChannelClick: (channel: string) => void;
  selectedChannel: string;
}

const channelConfig = [
  { id: "email", label: "Email", icon: Mail, color: "#3B82F6" },
  { id: "sms", label: "SMS", icon: MessageSquare, color: "#10B981" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  { id: "broadcast", label: "Broadcast", icon: Radio, color: "#F59E0B" },
  { id: "inApp", label: "In-App", icon: Bell, color: "#8B5CF6" },
];

export const ChannelBreakdownBar = ({ stats, onChannelClick, selectedChannel }: ChannelBreakdownBarProps) => {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="backdrop-blur-[20px] bg-white/[0.04] border border-purple-500/25 rounded-2xl p-6 shadow-2xl shadow-purple-900/20">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'white' }}>
          Channel Breakdown
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {channelConfig.map((channel) => {
            const Icon = channel.icon;
            const count = stats.channels[channel.id as keyof typeof stats.channels] || 0;
            const isSelected = selectedChannel === channel.id;
            
            return (
              <motion.button
                key={channel.id}
                onClick={() => onChannelClick(channel.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-white/10 border border-white/20 shadow-lg'
                    : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    background: `${channel.color}20`,
                    border: `1px solid ${channel.color}30`,
                  }}
                >
                  <Icon 
                    className="h-4 w-4" 
                    style={{ color: channel.color }}
                  />
                </div>
                
                <div className="text-left">
                  <div className="font-medium text-sm" style={{ color: 'white' }}>
                    {channel.label}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {count.toLocaleString()}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};