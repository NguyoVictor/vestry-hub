import { motion } from "framer-motion";

interface QuizProgressBarProps {
  currentQuestion: number;
  totalQuestions: number;
  className?: string;
}

export function QuizProgressBar({ 
  currentQuestion, 
  totalQuestions, 
  className = "" 
}: QuizProgressBarProps) {
  const progress = (currentQuestion / totalQuestions) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/60 text-sm">
          Question {currentQuestion} of {totalQuestions}
        </span>
        <span className="text-white/60 text-sm">
          {Math.round(progress)}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
        />
      </div>
    </div>
  );
}