import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import {
  Gamepad2, Mountain, Zap, Trophy, Users, Clock,
  Star, Target, BookOpen, Shuffle, ArrowRight,
} from "lucide-react";

interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  emoji?: string;
  badge?: string;
  bg: string;
  colSpan?: string;
  rowSpan?: string;
  borderBeam?: boolean;
  beamFrom?: string;
  beamTo?: string;
  stats?: { label: string; value: string }[];
}

const GAME_MODES: GameMode[] = [
  {
    id: "mastery-peak",
    title: "Mastery Peak",
    description: "Adaptive questions that get harder as students climb. Perfect for deep learning.",
    icon: Mountain,
    emoji: "⛰️",
    badge: "Students love this!",
    bg: "bg-quiz-purple",
    colSpan: "col-span-2",
    borderBeam: true,
    beamFrom: "#a78bfa",
    beamTo: "#7c3aed",
    stats: [
      { label: "Avg Score Boost", value: "+34%" },
      { label: "Engagement", value: "98%" },
    ],
  },
  {
    id: "classic",
    title: "Classic",
    description: "Traditional quiz format. Everyone answers at the same time.",
    icon: Gamepad2,
    emoji: "🎮",
    bg: "bg-quiz-teal",
    colSpan: "col-span-1",
  },
  {
    id: "team-battle",
    title: "Team Battle",
    description: "Split into teams and compete for the highest score.",
    icon: Users,
    emoji: "⚔️",
    bg: "bg-quiz-pink",
    colSpan: "col-span-1",
  },
  {
    id: "speed-round",
    title: "Speed Round",
    description: "Race against the clock. Fastest correct answer wins bonus points.",
    icon: Zap,
    emoji: "⚡",
    bg: "bg-quiz-navy",
    colSpan: "col-span-1",
  },
  {
    id: "tournament",
    title: "Tournament",
    description: "Bracket-style elimination. Only the best advance.",
    icon: Trophy,
    emoji: "🏆",
    bg: "bg-[#92400e]",
    colSpan: "col-span-1",
  },
];

// ── Individual game card ───────────────────────────────────────────────────────
function GameCard({ mode, onClick }: { mode: GameMode; onClick: (id: string) => void }) {
  const Icon = mode.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("relative cursor-pointer", mode.colSpan, mode.rowSpan)}
      onClick={() => onClick(mode.id)}
    >
      <MagicCard
        className={cn(
          "relative h-full min-h-[180px] rounded-game border-0 p-6 text-white shadow-xl",
          mode.bg,
        )}
        gradientColor="#ffffff"
        gradientOpacity={0.15}
        gradientSize={350}
      >
        {/* Border beam on featured card */}
        {mode.borderBeam && (
          <BorderBeam
            size={300}
            duration={8}
            colorFrom={mode.beamFrom ?? "#a78bfa"}
            colorTo={mode.beamTo ?? "#7c3aed"}
            borderWidth={2}
          />
        )}

        {/* Badge */}
        {mode.badge && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white border border-white/30"
          >
            <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
            {mode.badge}
          </motion.div>
        )}

        <div className="flex flex-col h-full gap-3">
          {/* Icon + emoji */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            {mode.emoji && (
              <span className="text-3xl select-none">{mode.emoji}</span>
            )}
          </div>

          {/* Title + description */}
          <div className="flex-1">
            <h3 className="font-fredoka text-2xl font-semibold text-white leading-tight mb-1">
              {mode.title}
            </h3>
            <p className="text-sm text-white/80 leading-relaxed">
              {mode.description}
            </p>
          </div>

          {/* Stats row (featured card only) */}
          {mode.stats && (
            <div className="flex items-center gap-4 pt-2 border-t border-white/20">
              {mode.stats.map(stat => (
                <div key={stat.label}>
                  <p className="text-xl font-fredoka font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/70">{stat.label}</p>
                </div>
              ))}
              <div className="ml-auto">
                <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-colors">
                  Start <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}
        </div>
      </MagicCard>
    </motion.div>
  );
}

// ── Main GameModeSelector ──────────────────────────────────────────────────────
interface GameModeSelectorProps {
  quizTitle?: string;
  onSelect?: (modeId: string) => void;
  onClose?: () => void;
}

export function GameModeSelector({
  quizTitle = "Quiz",
  onSelect,
  onClose,
}: GameModeSelectorProps) {
  const handleSelect = (id: string) => {
    onSelect?.(id);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="min-h-screen bg-quiz-navy flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-2">
          {quizTitle}
        </p>
        <h1 className="font-fredoka text-4xl md:text-5xl font-bold text-white mb-2">
          Choose Your Game Mode
        </h1>
        <p className="text-white/60 text-base">
          Pick how you want to run this session
        </p>
      </motion.div>

      {/* Bento Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-4xl grid grid-cols-3 gap-4 auto-rows-fr"
      >
        {GAME_MODES.map(mode => (
          <motion.div key={mode.id} variants={itemVariants} className={cn("contents")}>
            <GameCard mode={mode} onClick={handleSelect} />
          </motion.div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-white/40 text-sm"
      >
        All modes support real-time leaderboards and analytics
      </motion.p>
    </div>
  );
}

export default GameModeSelector;
