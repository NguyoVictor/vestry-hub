/**
 * Touch-Optimized Component Variants
 * 
 * Provides touch-friendly versions of common UI components with:
 * - Larger touch targets (minimum 44px)
 * - Enhanced visual feedback
 * - Haptic feedback integration
 * - Gesture support
 * - Accessibility improvements
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { Input, InputProps } from '@/components/ui/input';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Card, CardProps } from '@/components/ui/card';
import { triggerHapticFeedback } from '../../utils/mobileUtils';

// Touch-optimized Button
interface TouchButtonProps extends ButtonProps {
  hapticFeedback?: 'light' | 'medium' | 'heavy';
  enableHaptic?: boolean;
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ 
    hapticFeedback = 'light', 
    enableHaptic = true, 
    onClick, 
    className = '', 
    children, 
    ...props 
  }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (enableHaptic) {
        triggerHapticFeedback(hapticFeedback);
      }
      onClick?.(e);
    };

    return (
      <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }}>
        <Button
          ref={ref}
          onClick={handleClick}
          className={`min-h-[44px] min-w-[44px] touch-manipulation ${className}`}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);

TouchButton.displayName = 'TouchButton';

// Touch-optimized Input
interface TouchInputProps extends InputProps {
  label?: string;
  error?: string;
}

export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
            {label}
          </label>
        )}
        <Input
          ref={ref}
          className={`min-h-[48px] text-base touch-manipulation ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

TouchInput.displayName = 'TouchInput';

// Touch-optimized Badge
interface TouchBadgeProps extends BadgeProps {
  interactive?: boolean;
  onTap?: () => void;
}

export const TouchBadge = forwardRef<HTMLDivElement, TouchBadgeProps>(
  ({ interactive = false, onTap, className = '', children, ...props }, ref) => {
    const handleTap = () => {
      if (interactive && onTap) {
        triggerHapticFeedback('light');
        onTap();
      }
    };

    if (interactive) {
      return (
        <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }}>
          <Badge
            ref={ref}
            onClick={handleTap}
            className={`min-h-[32px] px-3 cursor-pointer touch-manipulation ${className}`}
            {...props}
          >
            {children}
          </Badge>
        </motion.div>
      );
    }

    return (
      <Badge ref={ref} className={`min-h-[32px] px-3 ${className}`} {...props}>
        {children}
      </Badge>
    );
  }
);

TouchBadge.displayName = 'TouchBadge';

// Touch-optimized Card
interface TouchCardProps extends CardProps {
  interactive?: boolean;
  onTap?: () => void;
  hapticFeedback?: 'light' | 'medium' | 'heavy';
}

export const TouchCard = forwardRef<HTMLDivElement, TouchCardProps>(
  ({ 
    interactive = false, 
    onTap, 
    hapticFeedback = 'light',
    className = '', 
    children, 
    ...props 
  }, ref) => {
    const handleTap = () => {
      if (interactive && onTap) {
        triggerHapticFeedback(hapticFeedback);
        onTap();
      }
    };

    if (interactive) {
      return (
        <motion.div
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            ref={ref}
            onClick={handleTap}
            className={`cursor-pointer touch-manipulation transition-shadow hover:shadow-md ${className}`}
            {...props}
          >
            {children}
          </Card>
        </motion.div>
      );
    }

    return (
      <Card ref={ref} className={className} {...props}>
        {children}
      </Card>
    );
  }
);

TouchCard.displayName = 'TouchCard';

// Touch-optimized List Item
interface TouchListItemProps {
  children: React.ReactNode;
  onTap?: () => void;
  className?: string;
  disabled?: boolean;
  selected?: boolean;
}

export const TouchListItem = forwardRef<HTMLDivElement, TouchListItemProps>(
  ({ children, onTap, className = '', disabled = false, selected = false }, ref) => {
    const handleTap = () => {
      if (!disabled && onTap) {
        triggerHapticFeedback('light');
        onTap();
      }
    };

    return (
      <motion.div
        ref={ref}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        transition={{ duration: 0.1 }}
        onClick={handleTap}
        className={`
          min-h-[56px] px-4 py-3 flex items-center touch-manipulation
          ${onTap && !disabled ? 'cursor-pointer' : ''}
          ${selected ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${!disabled && onTap ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800' : ''}
          transition-colors ${className}
        `}
      >
        {children}
      </motion.div>
    );
  }
);

TouchListItem.displayName = 'TouchListItem';

// Touch-optimized Toggle Switch
interface TouchToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const TouchToggle = forwardRef<HTMLButtonElement, TouchToggleProps>(
  ({ checked, onChange, label, disabled = false, className = '' }, ref) => {
    const handleToggle = () => {
      if (!disabled) {
        triggerHapticFeedback('medium');
        onChange(!checked);
      }
    };

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
            {label}
          </label>
        )}
        
        <motion.button
          ref={ref}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative inline-flex h-8 w-14 items-center rounded-full transition-colors
            min-h-[44px] min-w-[44px] touch-manipulation
            ${checked 
              ? 'bg-orange-500 hover:bg-orange-600' 
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <motion.span
            layout
            className={`
              inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform
              ${checked ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </motion.button>
      </div>
    );
  }
);

TouchToggle.displayName = 'TouchToggle';

// Touch-optimized Slider
interface TouchSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const TouchSlider = forwardRef<HTMLDivElement, TouchSliderProps>(
  ({ 
    value, 
    onChange, 
    min = 0, 
    max = 100, 
    step = 1, 
    label, 
    disabled = false, 
    className = '' 
  }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        const newValue = parseFloat(e.target.value);
        triggerHapticFeedback('light');
        onChange(newValue);
      }
    };

    return (
      <div ref={ref} className={`space-y-2 ${className}`}>
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {label}
            </label>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {value}
            </span>
          </div>
        )}
        
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={`
              w-full h-8 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer
              touch-manipulation
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              slider-thumb:appearance-none slider-thumb:h-6 slider-thumb:w-6 
              slider-thumb:rounded-full slider-thumb:bg-orange-500 slider-thumb:cursor-pointer
              slider-thumb:shadow-lg slider-thumb:border-2 slider-thumb:border-white
              hover:slider-thumb:bg-orange-600 active:slider-thumb:scale-110
            `}
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
            }}
          />
        </div>
      </div>
    );
  }
);

TouchSlider.displayName = 'TouchSlider';

// Touch-optimized Tab
interface TouchTabProps {
  children: React.ReactNode;
  active?: boolean;
  onTap?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TouchTab = forwardRef<HTMLButtonElement, TouchTabProps>(
  ({ children, active = false, onTap, className = '', disabled = false }, ref) => {
    const handleTap = () => {
      if (!disabled && onTap) {
        triggerHapticFeedback('light');
        onTap();
      }
    };

    return (
      <motion.button
        ref={ref}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={handleTap}
        disabled={disabled}
        className={`
          relative px-4 py-3 min-h-[48px] text-sm font-medium transition-colors
          touch-manipulation
          ${active 
            ? 'text-orange-600 dark:text-orange-400' 
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
      >
        {children}
        
        {active && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>
    );
  }
);

TouchTab.displayName = 'TouchTab';

export {
  TouchButton as default,
  TouchInput,
  TouchBadge,
  TouchCard,
  TouchListItem,
  TouchToggle,
  TouchSlider,
  TouchTab
};