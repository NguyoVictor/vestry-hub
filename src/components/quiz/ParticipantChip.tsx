import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface ParticipantChipProps {
  participant: {
    id: string;
    member_id: string;
    member_name: string;
    joined_at: string;
    avatar_url?: string;
  };
  isNew?: boolean;
}

export function ParticipantChip({ participant, isNew = false }: ParticipantChipProps) {
  // Generate gradient based on name hash
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

  const timeAgo = formatDistanceToNow(new Date(participant.joined_at), { addSuffix: false });

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ 
        x: 0, 
        opacity: 1,
        boxShadow: isNew ? [
          "0 0 0 0px rgba(16,185,129,0.5)",
          "0 0 0 12px rgba(16,185,129,0.2)", 
          "0 0 0 0px rgba(16,185,129,0.5)"
        ] : "0 0 0 0px rgba(16,185,129,0)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 26,
        boxShadow: { duration: 1.5 }
      }}
      className="flex items-center gap-3 h-11 w-full"
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(participant.member_name)}
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
        <p className="text-white text-sm font-medium truncate">
          {participant.member_name}
        </p>
      </div>
      
      {/* Time */}
      <div className="text-white/40 text-xs">
        {timeAgo === "less than a minute" ? "just now" : `${timeAgo} ago`}
      </div>
    </motion.div>
  );
}