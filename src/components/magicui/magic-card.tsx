import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
}

/**
 * MagicCard — a card with a radial spotlight that follows the mouse cursor.
 * Wrap any card content with this component to get the hover spotlight effect.
 */
export function MagicCard({
  children,
  className,
  gradientSize = 300,
  gradientColor = "#ffffff",
  gradientOpacity = 0.12,
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -999, y: -999 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setPosition({ x: -999, y: -999 }); }}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${position.x}px ${position.y}px, ${gradientColor}, transparent 70%)`,
          opacity: isHovered ? gradientOpacity : 0,
        }}
        animate={{ opacity: isHovered ? gradientOpacity : 0 }}
        transition={{ duration: 0.2 }}
      />
      {children}
    </div>
  );
}

export default MagicCard;
