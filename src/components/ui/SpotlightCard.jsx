import React from 'react';
import './SpotlightCard.css';

/**
 * SpotlightCard — A card with a radial orange glow that tracks mouse position
 * Used for the VOTD hero card
 */
export function SpotlightCard({ 
  children, 
  className = '', 
  spotlightColor = 'rgba(249,115,22,0.15)' 
}) {
  const cardRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--x', `${x}px`);
    cardRef.current.style.setProperty('--y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      style={{ '--spotlight-color': spotlightColor }}
    >
      {children}
    </div>
  );
}
