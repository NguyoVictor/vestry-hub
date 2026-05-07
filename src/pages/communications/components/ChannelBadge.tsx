import { Mail, MessageSquare, MessageCircle, Radio, Bell } from "lucide-react";

interface ChannelBadgeProps {
  channel: string;
  size?: "sm" | "md";
}

const channelConfig = {
  email: { label: "Email", icon: Mail, color: "#3B82F6", bg: "#3B82F620" },
  sms: { label: "SMS", icon: MessageSquare, color: "#10B981", bg: "#10B98120" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#25D366", bg: "#25D36620" },
  broadcast: { label: "Broadcast", icon: Radio, color: "#F59E0B", bg: "#F59E0B20" },
  in_app: { label: "In-App", icon: Bell, color: "#8B5CF6", bg: "#8B5CF620" },
  inApp: { label: "In-App", icon: Bell, color: "#8B5CF6", bg: "#8B5CF620" },
};

export const ChannelBadge = ({ channel, size = "md" }: ChannelBadgeProps) => {
  const config = channelConfig[channel as keyof typeof channelConfig];
  
  if (!config) {
    return (
      <span 
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-xs"
        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
      >
        <Bell className="h-3 w-3" />
        {channel}
      </span>
    );
  }

  const Icon = config.icon;
  const sizeClasses = size === "sm" 
    ? "px-2 py-1 text-xs gap-1" 
    : "px-2.5 py-1.5 text-sm gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span 
      className={`inline-flex items-center rounded-lg font-medium ${sizeClasses}`}
      style={{ 
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
};