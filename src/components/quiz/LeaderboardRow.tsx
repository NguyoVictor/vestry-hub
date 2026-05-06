import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/animated";

interface LeaderboardRowProps {
  participant: {
    id: string;
    member_name: string;
    score: number;
    avatar_url?: string;
  };
  rank: number;
  previousScore?: number;
  positionChange?: number; // +1 = moved up, -1 = moved down, 0 = same
}

export function LeaderboardRow({ 
  participant, 
  rank, 
  previousScore = 0,
  positionChange = 0 
}: LeaderboardRowProps) {
  
  const getRankDisplay = () => {
    switch (rank) {
      case 1:
        return { emoji: "🥇", color: "from-yellow-400 to-yellow-600" };
      case 2:
        return { emoji: "🥈", color: "from-gray-300 to-gray-500" };
      case 3:
        return { emoji: "🥉", color: "from-amber-600 to-amber-800" };
      default:
        return { emoji: rank.toString(), color: "from-slate-400 to-slate-600" };
    }
  };

  const getGradient = (name: string) => {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const gradients = [
      "from-purple-500 to-indigo-600",
      "from-blue-500 to-cyan-500", 
      "from-green-500 to-teal-500",
      "from-orange-500 to-red-500",
      "from-pink-500 to-rose-500",
      "from-indigo-600 to-purple-700"
    ];
    
    return gradients[Math.abs(hash) % gradients.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPositionChangeIcon = () => {
    if (positionChange > 0) {
      return <span className="text-green-400 text-sm">▲ +{positionChange}</span>;
    } else if (positionChange < 0) {
      return <span className="text-red-400 text-sm">▼ {positionChange}</span>;
    } else {
      return <span className="text-white/60 text-sm">—</span>;
    }
  };

  const rankDisplay = getRankDisplay();

  return (
    <motion.div
      layoutId={`leaderboard-${participant.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 24 
      }}
      className="flex items-center gap-4 h-18 bg-white/8 border border-white/12 rounded-2xl px-6 mb-3"
    >
      {/* Rank */}
      <div className="w-12 flex justify-center">
        <div className={`
          w-12 h-12 rounded-full bg-gradient-to-br ${rankDisplay.color}
          flex items-center justify-center text-white font-bold
        `}>
          {rank <= 3 ? (
            <span className="text-2xl">{rankDisplay.emoji}</span>
          ) : (
            <span className="text-lg">{rankDisplay.emoji}</span>
          )}
        </div>
      </div>
      
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-full bg-gradient-to-br ${getGradient(participant.member_name)}
        flex items-center justify-center text-white text-sm font-bold
      `}>
        {participant.avatar_url ? (
          <img 
            src={participant.avatar_url} 
            alt={participant.member_name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials(participant.member_name)
        )}
      </div>
      
      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-lg font-semibold truncate">
          {participant.member_name}
        </p>
      </div>
      
      {/* Score */}
      <div className="text-white text-xl font-black font-mono">
        <CountUp
          from={previousScore}
          to={participant.score}
          duration={1}
        />
      </div>
      
      {/* Position Change */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="w-10 flex justify-center"
      >
        {getPositionChangeIcon()}
      </motion.div>
    </motion.div>
  );
}