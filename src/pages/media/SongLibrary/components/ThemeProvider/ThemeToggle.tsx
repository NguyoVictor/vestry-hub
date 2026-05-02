/**
 * Theme Toggle Component for Song Library
 * 
 * Provides an elegant toggle button for switching between light and dark themes
 * with smooth animations and visual feedback
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './index';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({ 
  className = '', 
  size = 'md', 
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 w-14',
    md: 'h-10 w-18',
    lg: 'h-12 w-22'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-[var(--sl-text-secondary)]">
          Theme
        </span>
      )}
      
      <motion.button
        onClick={toggleTheme}
        className={`
          relative ${sizeClasses[size]} rounded-full p-1
          transition-all duration-300 ease-out
          ${theme === 'dark' 
            ? 'bg-[var(--sl-accent-primary)] shadow-[var(--sl-ambient-glow-sm)]' 
            : 'bg-slate-200 hover:bg-slate-300'
          }
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${theme === 'dark' 
            ? 'focus:ring-[var(--sl-accent-primary)] focus:ring-offset-[var(--sl-bg-surface)]' 
            : 'focus:ring-orange-500 focus:ring-offset-white'
          }
        `}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {/* Toggle Track */}
        <div className="relative h-full w-full">
          {/* Toggle Thumb */}
          <motion.div
            className={`
              absolute top-0 h-full aspect-square rounded-full
              bg-white shadow-md flex items-center justify-center
              ${theme === 'dark' ? 'shadow-black/20' : 'shadow-black/10'}
            `}
            animate={{
              x: theme === 'dark' ? 'calc(100% + 4px)' : '0px'
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
          >
            {/* Icon with rotation animation */}
            <motion.div
              animate={{ rotate: theme === 'dark' ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {theme === 'dark' ? (
                <Moon className={`${iconSizes[size]} text-[var(--sl-accent-primary)]`} />
              ) : (
                <Sun className={`${iconSizes[size]} text-orange-500`} />
              )}
            </motion.div>
          </motion.div>

          {/* Background Icons */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <motion.div
              animate={{ 
                opacity: theme === 'light' ? 0.3 : 0.6,
                scale: theme === 'light' ? 0.8 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <Sun className={`${iconSizes[size]} text-orange-400`} />
            </motion.div>
            <motion.div
              animate={{ 
                opacity: theme === 'dark' ? 0.3 : 0.6,
                scale: theme === 'dark' ? 0.8 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <Moon className={`${iconSizes[size]} text-purple-300`} />
            </motion.div>
          </div>
        </div>

        {/* Ambient glow effect for dark mode */}
        {theme === 'dark' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, var(--sl-ambient-primary)20 0%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.button>
    </div>
  );
}

export default ThemeToggle;