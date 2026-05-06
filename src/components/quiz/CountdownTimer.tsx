import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  size?: number;
  className?: string;
}

export function CountdownTimer({ 
  duration, 
  onComplete, 
  size = 120, 
  className = "" 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  const progress = (timeLeft / duration) * 100;
  const circumference = 2 * Math.PI * (size / 2 - 10);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color based on time remaining
  const getColor = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage > 50) return "#7c3aed"; // purple
    if (percentage > 25) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
          fill="transparent"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke={getColor()}
          strokeWidth="8"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{
            strokeDashoffset,
            stroke: getColor()
          }}
          transition={{ duration: 0.5 }}
        />
      </svg>
      
      {/* Timer number */}
      <motion.div
        key={timeLeft}
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.span
          className="text-4xl font-bold text-white"
          animate={timeLeft <= 5 && timeLeft > 0 ? {
            x: [-2, 2, -2, 2, 0]
          } : {}}
          transition={{ duration: 1, repeat: timeLeft <= 5 ? Infinity : 0 }}
        >
          {timeLeft}
        </motion.span>
      </motion.div>
    </div>
  );
}