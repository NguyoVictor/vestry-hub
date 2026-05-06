import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeContentProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
}

export function FadeContent({ 
  children, 
  className = "", 
  delay = 0,
  duration = 0.6,
  direction = "up"
}: FadeContentProps) {
  const directionOffset = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      className={className}
      initial={{ 
        opacity: 0, 
        ...directionOffset[direction] 
      }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}