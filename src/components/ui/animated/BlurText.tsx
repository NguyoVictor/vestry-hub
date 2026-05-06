import { motion } from "framer-motion";
import { ReactNode, useEffect } from "react";

interface BlurTextProps {
  children: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export function BlurText({ 
  children, 
  className = "", 
  delay = 0, 
  duration = 1 
}: BlurTextProps) {
  const letters = Array.from(children);

  useEffect(() => {
    console.log("🌀 BlurText mounted:", { children, delay, lettersCount: letters.length });
  }, []);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 400,
        duration: duration,
      },
    },
    hidden: {
      opacity: 0,
      filter: "blur(10px)",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 400,
        duration: duration,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
      onAnimationStart={() => console.log("🌀 BlurText animation started")}
      onAnimationComplete={() => console.log("✅ BlurText animation complete")}
    >
      {letters.map((letter, index) => (
        <motion.span
          variants={child}
          key={index}
          className="inline-block"
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.div>
  );
}