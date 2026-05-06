import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CountdownTimer } from "./CountdownTimer";
import { AnswerBlock } from "./AnswerBlock";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/animated";
import { ChevronRight, Check } from "lucide-react";
import { ANSWER_COLORS, ANSWER_SHAPES } from "@/lib/quiz-game";

interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
  image?: string;
}

interface HostQuestionProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  quizName: string;
  answeredCount: number;
  totalParticipants: number;
  answerCounts: number[]; // Count for each option
  onQuestionEnd: () => void;
  onNextQuestion: () => void;
  isRevealed: boolean;
  isLastQuestion: boolean;
}

export function HostQuestion({
  question,
  questionIndex,
  totalQuestions,
  quizName,
  answeredCount,
  totalParticipants,
  answerCounts,
  onQuestionEnd,
  onNextQuestion,
  isRevealed,
  isLastQuestion
}: HostQuestionProps) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit || 30);
  const [showNextButton, setShowNextButton] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(5);

  // Timer countdown
  useEffect(() => {
    if (isRevealed) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onQuestionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRevealed, onQuestionEnd]);

  // Show next button after reveal
  useEffect(() => {
    if (isRevealed) {
      const timer = setTimeout(() => {
        setShowNextButton(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  // Auto-advance countdown
  useEffect(() => {
    if (showNextButton) {
      const interval = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onNextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showNextButton, onNextQuestion]);

  const progressPercent = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-sm shrink-0">
        <div className="text-white text-lg font-medium">
          Question {questionIndex + 1} of {totalQuestions}
        </div>
        <div className="text-white/60 text-sm">
          {quizName}
        </div>
        <div className="text-white text-sm">
          <CountUp to={answeredCount} /> / {totalParticipants} answered
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-4 shrink-0">
        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-purple-500 rounded-full"
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 22 
          }}
          className="w-full max-w-4xl bg-white rounded-2xl p-8 shadow-2xl mb-6"
        >
          {question.image && (
            <div className="mb-6">
              <img 
                src={question.image} 
                alt="Question" 
                className="w-full max-h-48 object-cover rounded-xl"
              />
            </div>
          )}
          
          <h2 className="text-3xl font-bold text-slate-900 text-center leading-tight">
            {question.text}
          </h2>
        </motion.div>

        {/* Countdown Timer */}
        {!isRevealed && (
          <div className="mb-8">
            <CountdownTimer
              duration={question.timeLimit || 30}
              timeLeft={timeLeft}
              size={120}
            />
          </div>
        )}

        {/* Answer Blocks */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-6xl mb-6">
          {question.options.map((option, index) => (
            <AnswerBlock
              key={index}
              index={index}
              text={option}
              color={ANSWER_COLORS[index]}
              shape={ANSWER_SHAPES[index]}
              answerCount={answerCounts[index] || 0}
              isCorrect={index === question.correctIndex}
              isRevealed={isRevealed}
              showStats={isRevealed}
              totalAnswers={answeredCount}
            />
          ))}
        </div>

        {/* Next Question Button */}
        <AnimatePresence>
          {showNextButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Button
                onClick={onNextQuestion}
                size="lg"
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold text-xl px-8 py-4 rounded-xl shadow-lg"
              >
                {isLastQuestion ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
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
                Auto-advancing in {autoAdvanceCountdown}s...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}