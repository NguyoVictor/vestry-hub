import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  gradient?: string;
}

export function GradientText({ 
  children, 
  className = "", 
  gradient = "from-violet-600 via-purple-600 to-blue-600" 
}: GradientTextProps) {
  return (
    <motion.span
      className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.6,
      }}
    >
      {children}
    </motion.span>
  );
}