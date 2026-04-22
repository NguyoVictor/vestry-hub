import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps page content with a fade + slide-up entrance animation.
 * Use as the root wrapper on every page component.
 *
 * @example
 * const MyPage = () => (
 *   <PageTransition>
 *     <div className="min-h-screen bg-slate-50 font-jakarta px-6 py-6">
 *       ...
 *     </div>
 *   </PageTransition>
 * );
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
