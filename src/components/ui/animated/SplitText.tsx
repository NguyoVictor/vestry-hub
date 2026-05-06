import { motion } from "framer-motion";
import { ReactNode, useEffect } from "react";

interface SplitTextProps {
  children: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export function SplitText({ 
  children, 
  className = "", 
  delay = 0, 
  duration = 0.5 
}: SplitTextProps) {
  const words = children.split(" ");

  useEffect(() => {
    console.log("🎬 SplitText mounted:", { children, delay, wordsCount: words.length });
  }, []);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: delay },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
      onAnimationStart={() => console.log("🎬 SplitText animation started")}
      onAnimationComplete={() => console.log("✅ SplitText animation complete")}
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          key={index}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}