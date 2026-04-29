import React from 'react';
import { motion } from 'framer-motion';
import './AnimatedList.css';

/**
 * AnimatedList — Renders items with staggered entrance animation
 * Used for the Bookmarks tab
 */
function AnimatedList({ items, renderItem, className = '', delay = 50 }) {
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: delay / 1000, // convert ms to seconds
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {items.map((item, index) => (
        <motion.div key={index} variants={itemVariant}>
          {renderItem ? renderItem(item) : item}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default AnimatedList;
