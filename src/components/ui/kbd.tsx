/**
 * Keyboard Key Component
 * 
 * Displays keyboard keys and shortcuts in a styled format.
 * Used for showing keyboard shortcuts in command palettes, tooltips, etc.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** The key or shortcut to display */
  children: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'outline' | 'ghost';
}

const sizeClasses = {
  sm: 'text-xs px-1 py-0.5 min-w-[1.25rem] h-5',
  md: 'text-sm px-1.5 py-1 min-w-[1.5rem] h-6',
  lg: 'text-base px-2 py-1.5 min-w-[2rem] h-8',
};

const variantClasses = {
  default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  outline: 'bg-transparent text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-600',
  ghost: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800',
};

export function Kbd({
  children,
  size = 'md',
  variant = 'default',
  className,
  ...props
}: KbdProps) {
  return (
    <kbd
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'font-mono font-medium',
        'border rounded',
        'shadow-sm',
        'select-none',
        // Size styles
        sizeClasses[size],
        // Variant styles
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

/**
 * Utility function to format keyboard shortcuts for display
 */
export function formatKeyboardShortcut(shortcut: string): string {
  // Detect platform for proper modifier display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .split('+')
    .map(key => {
      switch (key.toLowerCase()) {
        case 'cmd':
        case 'meta':
          return isMac ? '⌘' : 'Ctrl';
        case 'ctrl':
          return isMac ? '⌃' : 'Ctrl';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'enter':
          return '↵';
        case 'escape':
        case 'esc':
          return 'Esc';
        case 'space':
          return 'Space';
        case 'tab':
          return 'Tab';
        case 'backspace':
          return '⌫';
        case 'delete':
          return 'Del';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
}

/**
 * Component for displaying keyboard shortcuts with proper formatting
 */
interface KeyboardShortcutProps {
  shortcut: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function KeyboardShortcut({
  shortcut,
  size = 'md',
  variant = 'default',
  className,
}: KeyboardShortcutProps) {
  const formatted = formatKeyboardShortcut(shortcut);
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Split by + for non-Mac or by individual characters for Mac
  const keys = isMac ? formatted.split('') : formatted.split('+');
  
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <Kbd key={index} size={size} variant={variant}>
          {key}
        </Kbd>
      ))}
    </span>
  );
}

export default Kbd;