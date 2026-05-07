import { useState } from "react";
import { motion } from "framer-motion";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeroStatCards } from "./components/HeroStatCards";
import { ChannelBreakdownBar } from "./components/ChannelBreakdownBar";
import { MessageFeed } from "./components/MessageFeed";
import { useCommunicationsStats } from "./hooks/useCommunicationsStats";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function GeneralDashboard() {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"broadcasts" | "sent" | "drafts">("broadcasts");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  
  const { stats, isLoading } = useCommunicationsStats(tenantId);

  const handleChannelClick = (channel: string) => {
    setSelectedChannel(channel);
    // Scroll to message feed
    document.getElementById("message-feed")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F0A1E 0%, #1a0533 50%, #0a0a1a 100%)',
        position: 'relative',
      }}
    >
      {/* Grain/noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      
      {/* Subtle gradient overlays */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: '25%',
          width: '384px',
          height: '384px',
          background: 'rgba(124, 58, 237, 0.1)',
          borderRadius: '50%',
          filter: 'blur(48px)',
          zIndex: 0,
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '25%',
          right: '25%',
          width: '320px',
          height: '320px',
          background: 'rgba(249, 115, 22, 0.05)',
          borderRadius: '50%',
          filter: 'blur(48px)',
          zIndex: 0,
        }}
      />
      
      <motion.div
        className="relative p-6 max-w-7xl mx-auto"
        style={{ position: 'relative', zIndex: 1 }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header */}
        <motion.div 
          className="flex items-start justify-between mb-8"
          variants={itemVariants}
        >
          <div>
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: 'white' }}
            >
              Communications
            </h1>
            <p 
              className="text-lg"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Unified overview of all church communications
            </p>
          </div>
          
          <Button
            onClick={() => navigate("/communications/compose")}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40"
          >
            <Plus className="mr-2 h-4 w-4" />
            Compose Message
          </Button>
        </motion.div>

        {/* Hero Stats Cards */}
        <motion.div variants={itemVariants}>
          <HeroStatCards stats={stats} isLoading={isLoading} />
        </motion.div>

        {/* Channel Breakdown Bar */}
        <motion.div variants={itemVariants}>
          <ChannelBreakdownBar 
            stats={stats} 
            onChannelClick={handleChannelClick}
            selectedChannel={selectedChannel}
          />
        </motion.div>

        {/* Message Feed */}
        <motion.div variants={itemVariants} id="message-feed">
          <MessageFeed
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedChannel={selectedChannel}
            onChannelChange={setSelectedChannel}
            tenantId={tenantId}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}