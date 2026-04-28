import { useRef, useState, MouseEvent, ReactNode } from 'react';
import './GlareHover.css';

interface GlareHoverProps {
  children: ReactNode;
  className?: string;
  glareColor?: string;
  glareOpacity?: number;
}

export default function GlareHover({
  children,
  className = '',
  glareColor = 'rgba(255, 255, 255, 0.3)',
  glareOpacity = 0.3,
}: GlareHoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePosition({ x, y });
  };

  return (
    <div
      ref={cardRef}
      className={`glare-hover-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}
      {isHovering && (
        <div
          className="glare-hover-effect"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, ${glareColor}, transparent 50%)`,
            opacity: glareOpacity,
          }}
        />
      )}
    </div>
  );
}
