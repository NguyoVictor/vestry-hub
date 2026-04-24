import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReactionChipProps {
  emoji: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function ReactionChip({ emoji, count, isActive, onClick }: ReactionChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "font-jakarta inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all",
        isActive
          ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
      )}
    >
      <span>{emoji}</span>
      {count > 0 && <span className="text-xs font-medium">{count}</span>}
    </motion.button>
  );
}
