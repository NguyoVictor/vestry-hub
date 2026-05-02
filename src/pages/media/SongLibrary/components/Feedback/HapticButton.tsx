/**
 * Haptic Feedback Button Component
 * 
 * Enhanced button component with haptic feedback for touch devices.
 * Provides different feedback types based on button actions.
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { triggerHapticFeedback } from '../../utils/mobileUtils';

interface HapticButtonProps extends ButtonProps {
  hapticType?: 'light' | 'medium' | 'heavy';
  enableHaptic?: boolean;
  touchOptimized?: boolean;
  children: React.ReactNode;
}

export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ 
    hapticType = 'light', 
    enableHaptic = true, 
    touchOptimized = false,
    onClick, 
    className = '',
    children, 
    ...props 
  }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (enableHaptic) {
        triggerHapticFeedback(hapticType);
      }
      onClick?.(e);
    };

    const touchOptimizedClasses = touchOptimized 
      ? 'min-h-[44px] min-w-[44px] touch-manipulation' 
      : '';

    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        <Button
          ref={ref}
          onClick={handleClick}
          className={`${className} ${touchOptimizedClasses}`}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);

HapticButton.displayName = 'HapticButton';

// Specialized haptic button variants
export const HapticPrimaryButton = forwardRef<HTMLButtonElement, Omit<HapticButtonProps, 'hapticType'>>(
  (props, ref) => (
    <HapticButton ref={ref} hapticType="medium" {...props} />
  )
);

HapticPrimaryButton.displayName = 'HapticPrimaryButton';

export const HapticDestructiveButton = forwardRef<HTMLButtonElement, Omit<HapticButtonProps, 'hapticType'>>(
  (props, ref) => (
    <HapticButton ref={ref} hapticType="heavy" variant="destructive" {...props} />
  )
);

HapticDestructiveButton.displayName = 'HapticDestructiveButton';

export const HapticGhostButton = forwardRef<HTMLButtonElement, Omit<HapticButtonProps, 'hapticType'>>(
  (props, ref) => (
    <HapticButton ref={ref} hapticType="light" variant="ghost" {...props} />
  )
);

HapticGhostButton.displayName = 'HapticGhostButton';

export default HapticButton;