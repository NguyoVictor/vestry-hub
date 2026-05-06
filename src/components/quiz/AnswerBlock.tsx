import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/animated";

interface AnswerBlockProps {
  option: {
    text: string;
    is_correct: boolean;
  };
  index: number;
  answerCount: number;
  isRevealed: boolean;
  totalAnswers: number;
  className?: string;
}

const KAHOOT_COLORS = [
  { bg: "#e21b3c", shape: "▲" }, // Red triangle
  { bg: "#1368ce", shape: "◆" }, // Blue diamond  
  { bg: "#d89e00", shape: "●" }, // Yellow circle
  { bg: "#26890c", shape: "■" }  // Green square
];

export function AnswerBlock({ 
  option, 
  index, 
  answerCount, 
  isRevealed, 
  totalAnswers,
  className = "" 
}: AnswerBlockProps) {
  const color = KAHOOT_COLORS[index];
  const percentage = totalAnswers > 0 ? (answerCount / totalAnswers) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ 
        opacity: isRevealed && !option.is_correct ? 0.35 : 1,
        y: 0,
        filter: isRevealed && !option.is_correct ? "grayscale(60%)" : "grayscale(0%)"
      }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.5
      }}
      className={`
        relative min-h-[100px] rounded-xl p-6 flex items-center gap-4
        ${className}
      `}
      style={{ backgroundColor: color.bg }}
    >
      {/* Shape icon */}
      <div className="text-white text-3xl font-bold">
        {color.shape}
      </div>
      
      {/* Answer text */}
      <div className="flex-1 text-white text-xl font-semibold text-center">
        {option.text}
      </div>
      
      {/* Answer count badge */}
      {answerCount > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-4 right-4 bg-white rounded-full px-3 py-1 min-w-[40px] text-center"
        >
          <CountUp
            to={answerCount}
            className="font-bold text-sm"
            style={{ color: color.bg }}
            duration={0.5}
          />
        </motion.div>
      )}
      
      {/* Correct answer indicator */}
      {isRevealed && option.is_correct && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute top-4 right-4"
        >
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4 }}
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </motion.div>
      )}
      
      {/* Answer percentage bar (shown after reveal) */}
      {isRevealed && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className={`
            absolute bottom-0 left-0 h-2 rounded-b-xl
            ${option.is_correct ? "bg-green-400" : "bg-white/50"}
          `}
        />
      )}
      
      {/* Flash effect on new answer */}
      <motion.div
        key={answerCount}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-white rounded-xl pointer-events-none"
      />
    </motion.div>
  );
}