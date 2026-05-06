import { useEffect } from "react";
import { motion } from "framer-motion";
import { SplitText, CountUp } from "@/components/ui/animated";
import { Button } from "@/components/ui/button";
import { RotateCcw, X } from "lucide-react";
import confetti from "canvas-confetti";

interface Participant {
  id: string;
  display_name: string;
  avatar_emoji: string;
  score: number;
  accuracy?: number;
}

interface HostPodiumProps {
  participants: Participant[];
  onPlayAgain: () => void;
  onEndSession: () => void;
}

export function HostPodium({ participants, onPlayAgain, onEndSession }: HostPodiumProps) {
  const topThree = participants.slice(0, 3);
  const winner = topThree[0];
  const runnerUp = topThree[1];
  const thirdPlace = topThree[2];

  // Confetti celebration on mount
  useEffect(() => {
    // Initial burst
    confetti({
      particleCount: 250,
      spread: 120,
      startVelocity: 40,
      colors: ['#FFD700', '#C0C0C0', '#CD7F32', '#7c3aed', '#ffffff', '#f59e0b'],
      origin: { x: 0.5, y: 0.3 }
    });

    // Side bursts
    setTimeout(() => {
      confetti({
        particleCount: 150,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.6 }
      });
      confetti({
        particleCount: 150,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.6 }
      });
    }, 800);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden">
      {/* Floating golden particles background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 10 - 5, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Title */}
      <div className="text-center mb-12 relative z-10">
        <SplitText 
          className="text-5xl font-black text-white mb-4"
          delay={0}
        >
          🏆 Final Results
        </SplitText>
      </div>

      {/* Podium */}
      <div className="relative mb-12">
        {/* Podium Platforms */}
        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          {runnerUp && (
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 180, 
                damping: 20,
                delay: 0.3 
              }}
              className="flex flex-col items-center"
            >
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 20,
                  delay: 1.1 
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border-4 border-gray-400 flex items-center justify-center text-3xl mb-2 shadow-lg"
              >
                {runnerUp.avatar_emoji}
              </motion.div>
              <p className="text-white font-bold text-sm mb-1">{runnerUp.display_name}</p>
              <CountUp 
                to={runnerUp.score}
                className="text-gray-300 font-mono font-black text-lg"
                delay={1500}
              />
              {/* Platform */}
              <div className="w-24 h-36 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg flex items-center justify-center mt-4 shadow-xl">
                <span className="text-white font-black text-2xl">2nd</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {winner && (
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 180, 
                damping: 20,
                delay: 0.6 
              }}
              className="flex flex-col items-center"
            >
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 20,
                  delay: 1.4 
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-400 flex items-center justify-center text-4xl mb-2 shadow-xl"
              >
                {winner.avatar_emoji}
              </motion.div>
              <p className="text-white font-bold text-lg mb-1">{winner.display_name}</p>
              <CountUp 
                to={winner.score}
                className="text-yellow-400 font-mono font-black text-2xl"
                delay={1800}
              />
              {/* Platform */}
              <div className="w-28 h-48 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg flex items-center justify-center mt-4 shadow-2xl">
                <span className="text-white font-black text-3xl">1st</span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 180, 
                damping: 20,
                delay: 0 
              }}
              className="flex flex-col items-center"
            >
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 20,
                  delay: 0.8 
                }}
                className="w-18 h-18 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-4 border-orange-500 flex items-center justify-center text-2xl mb-2 shadow-lg"
              >
                {thirdPlace.avatar_emoji}
              </motion.div>
              <p className="text-white font-bold text-sm mb-1">{thirdPlace.display_name}</p>
              <CountUp 
                to={thirdPlace.score}
                className="text-orange-400 font-mono font-black text-lg"
                delay={1200}
              />
              {/* Platform */}
              <div className="w-20 h-28 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg flex items-center justify-center mt-4 shadow-lg">
                <span className="text-white font-black text-xl">3rd</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Full Rankings Table */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
        className="w-full max-w-2xl bg-black/40 rounded-2xl border border-white/10 overflow-hidden mb-8"
      >
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-lg">Complete Rankings</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {participants.map((participant, index) => (
            <div 
              key={participant.id}
              className="flex items-center gap-4 px-6 py-3 border-b border-white/5 last:border-b-0"
            >
              <span className="text-white/60 font-bold w-8 text-center">
                {index + 1}
              </span>
              <span className="text-2xl">{participant.avatar_emoji}</span>
              <span className="text-white flex-1 font-medium">
                {participant.display_name}
              </span>
              <span className="text-white font-bold">
                {participant.score}
              </span>
              {participant.accuracy && (
                <span className="text-white/60 text-sm">
                  {participant.accuracy}%
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5 }}
        className="flex gap-4"
      >
        <Button
          onClick={onPlayAgain}
          variant="outline"
          size="lg"
          className="border-white text-white hover:bg-white hover:text-slate-900 font-semibold px-6"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Play Again
        </Button>
        <Button
          onClick={onEndSession}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 font-semibold px-6"
        >
          <X className="h-5 w-5 mr-2" />
          End Session
        </Button>
      </motion.div>
    </div>
  );
}