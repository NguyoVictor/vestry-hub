import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Send, FileText, Clock, TrendingUp, Loader2 } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  isLoading?: boolean;
  glowColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ icon: Icon, label, value, isLoading, glowColor, trend }: StatCardProps) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (!isLoading && value > 0) {
      const controls = animate(count, value, {
        duration: 1.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      });
      return controls.stop;
    }
  }, [count, value, isLoading]);

  return (
    <motion.div
      className="relative group"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
        style={{ 
          background: `linear-gradient(135deg, ${glowColor}20, ${glowColor}10)`,
          transform: 'scale(1.05)',
        }}
      />
      
      {/* Glass card */}
      <div className="relative backdrop-blur-[20px] bg-white/[0.04] border border-purple-500/25 rounded-2xl p-6 shadow-2xl shadow-purple-900/20">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="p-3 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${glowColor}20, ${glowColor}10)`,
              border: `1px solid ${glowColor}30`,
            }}
          >
            <Icon className="h-6 w-6" style={{ color: glowColor }} />
          </div>
          
          {trend && (
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              trend.isPositive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <TrendingUp className={`h-3 w-3 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              {trend.value}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-bold" style={{ color: 'white' }}>
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            ) : (
              <motion.span>{rounded}</motion.span>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface HeroStatCardsProps {
  stats: {
    totalSent: number;
    drafts: number;
    scheduled: number;
    reachRate: number;
  };
  isLoading: boolean;
}

export const HeroStatCards = ({ stats, isLoading }: HeroStatCardsProps) => {
  const cardVariants = {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div variants={cardVariants}>
        <StatCard
          icon={Send}
          label="Total Sent"
          value={stats.totalSent}
          isLoading={isLoading}
          glowColor="#7C3AED"
          trend={{ value: 12, isPositive: true }}
        />
      </motion.div>
      
      <motion.div variants={cardVariants}>
        <StatCard
          icon={FileText}
          label="Drafts"
          value={stats.drafts}
          isLoading={isLoading}
          glowColor="#F97316"
        />
      </motion.div>
      
      <motion.div variants={cardVariants}>
        <StatCard
          icon={Clock}
          label="Scheduled"
          value={stats.scheduled}
          isLoading={isLoading}
          glowColor="#06B6D4"
        />
      </motion.div>
      
      <motion.div variants={cardVariants}>
        <StatCard
          icon={TrendingUp}
          label="Reach Rate"
          value={stats.reachRate}
          isLoading={isLoading}
          glowColor="#10B981"
          trend={{ value: 8, isPositive: true }}
        />
      </motion.div>
    </div>
  );
};