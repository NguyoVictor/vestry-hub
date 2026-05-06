import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardRow } from "./LeaderboardRow";
import { SplitText } from "@/components/ui/animated";
import { Button } from "@/components/ui/button";
import { ChevronRight, Trophy } from "lucide-react";

interface Participant {
  id: string;
  display_name: string;
  avatar_emoji: string;
  score: number;
  rank: number;
  previous_rank?: number;
}

interface HostLeaderboardProps {
  participants: Participant[];
  questionIndex: number;
  totalQuestions: number;
  onContinue: () => void;
  isLastQuestion: boolean;
}

export function HostLeaderboard({
  participants,
  questionIndex,
  totalQuestions,
  onContinue,
  isLastQuestion
}: HostLeaderboardProps) {
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(3);

  // Auto-advance countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoAdvanceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onContinue]);

  const topParticipants = participants.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-8"
    >
      {/* Title */}
      <div className="text-center mb-8">
        <SplitText 
          className="text-5xl font-black text-white mb-2"
          delay={0}
        >
          🏆 Leaderboard
        </SplitText>
        <p className="text-white/60 text-xl">
          After Question {questionIndex + 1} of {totalQuestions}
        </p>
      </div>

      {/* Top 5 Leaderboard */}
      <div className="w-full max-w-2xl space-y-3 mb-8">
        <AnimatePresence mode="popLayout">
          {topParticipants.map((participant, index) => (
            <LeaderboardRow
              key={participant.id}
              participant={participant}
              rank={index + 1}
              isTop3={index < 3}
              showChange={participant.previous_rank !== undefined}
              positionChange={
                participant.previous_rank 
                  ? participant.previous_rank - (index + 1)
                  : 0
              }
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-center"
      >
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-white text-purple-600 hover:bg-gray-100 font-bold text-xl px-8 py-4 rounded-xl shadow-lg"
        >
          {isLastQuestion ? (
            <>
              <Trophy className="h-5 w-5 mr-2" />
              See Final Results
            </>
          ) : (
            <>
              Next Question
              <ChevronRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
        
        <p className="text-white/60 text-sm mt-3">
          Continuing in {autoAdvanceCountdown}s...
        </p>
      </motion.div>
    </motion.div>
  );
}