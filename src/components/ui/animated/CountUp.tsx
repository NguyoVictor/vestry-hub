import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  delay?: number;
}

export function CountUp({ 
  from = 0, 
  to, 
  duration = 2, 
  className = "", 
  delay = 0 
}: CountUpProps) {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    console.log("🔢 CountUp mounted:", { from, to, duration, delay });
    
    const timer = setTimeout(() => {
      console.log("🔢 CountUp animation starting");
      const controls = animate(count, to, { 
        duration,
        ease: "easeOut",
        onComplete: () => console.log("✅ CountUp animation complete:", to)
      });
      return controls.stop;
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [count, to, duration, delay]);

  return (
    <motion.span className={className}>
      <motion.span>{rounded}</motion.span>
    </motion.span>
  );
}