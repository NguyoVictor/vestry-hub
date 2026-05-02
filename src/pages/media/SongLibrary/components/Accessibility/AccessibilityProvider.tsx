/**
 * Accessibility Provider for Song Library UI Revamp
 * 
 * Provides global accessibility context and state management:
 * - High contrast mode detection and management
 * - Reduced motion preferences
 * - Screen reader announcements coordination
 * - Keyboard navigation state
 * - Focus management utilities
 * 
 * Requirements: 12.1, 12.2, 12.6, 12.7
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

import { 
  useScreenReaderAnnouncements,
  useHighContrastMode,
  useReducedMotion
} from '../../utils/accessibility';

interface AccessibilityContextValue {
  // High contrast mode
  isHighContrast: boolean;
  
  // Reduced motion preference
  prefersReducedMotion: boolean;
  
  // Screen reader announcements
  announce: (message: string, options?: { priority?: 'polite' | 'assertive'; delay?: number }) => void;
  
  // Keyboard navigation state
  isKeyboardUser: boolean;
  setKeyboardUser: (isKeyboard: boolean) => void;
  
  // Focus management
  focusMode: 'mouse' | 'keyboard' | 'touch';
  setFocusMode: (mode: 'mouse' | 'keyboard' | 'touch') => void;
  
  // Accessibility preferences
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  
  // Keyboard shortcuts help
  showKeyboardHelp: boolean;
  setShowKeyboardHelp: (show: boolean) => void;
}

interface AccessibilityPreferences {
  announceNavigation: boolean;
  announceSelections: boolean;
  announceStateChanges: boolean;
  verboseDescriptions: boolean;
  enableSoundEffects: boolean;
  enableHapticFeedback: boolean;
  keyboardNavigationSpeed: 'slow' | 'normal' | 'fast';
  focusIndicatorStyle: 'subtle' | 'normal' | 'high-contrast';
}

const defaultPreferences: AccessibilityPreferences = {
  announceNavigation: true,
  announceSelections: true,
  announceStateChanges: true,
  verboseDescriptions: false,
  enableSoundEffects: false,
  enableHapticFeedback: true,
  keyboardNavigationSpeed: 'normal',
  focusIndicatorStyle: 'normal'
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [focusMode, setFocusMode] = useState<'mouse' | 'keyboard' | 'touch'>('mouse');
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Accessibility detection hooks
  const isHighContrast = useHighContrastMode();
  const prefersReducedMotion = useReducedMotion();
  const { announce } = useScreenReaderAnnouncements();

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('song-library-accessibility-preferences');
      if (saved) {
        const savedPreferences = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...savedPreferences });
      }
    } catch (error) {
      console.error('Failed to load accessibility preferences:', error);
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    try {
      localStorage.setItem('song-library-accessibility-preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }, [preferences]);

  // Detect keyboard usage
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tab key indicates keyboard navigation
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
        setFocusMode('keyboard');
      }
      
      // Show keyboard help with ?
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Only show if not typing in an input
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true'
        );
        
        if (!isTyping) {
          event.preventDefault();
          setShowKeyboardHelp(true);
        }
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      setFocusMode('mouse');
    };

    const handleTouchStart = () => {
      setIsKeyboardUser(false);
      setFocusMode('touch');
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleTouchStart);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // Apply accessibility styles to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (prefersReducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Keyboard user
    if (isKeyboardUser) {
      root.classList.add('keyboard-user');
    } else {
      root.classList.remove('keyboard-user');
    }
    
    // Focus mode
    root.setAttribute('data-focus-mode', focusMode);
    
    // Focus indicator style
    root.setAttribute('data-focus-style', preferences.focusIndicatorStyle);
  }, [isHighContrast, prefersReducedMotion, isKeyboardUser, focusMode, preferences.focusIndicatorStyle]);

  // Enhanced announce function with preferences
  const enhancedAnnounce = useCallback((
    message: string, 
    options: { priority?: 'polite' | 'assertive'; delay?: number } = {}
  ) => {
    // Check if announcements are enabled for this type
    const shouldAnnounce = preferences.announceStateChanges;
    
    if (shouldAnnounce) {
      announce(message, options);
    }
  }, [announce, preferences.announceStateChanges]);

  const contextValue: AccessibilityContextValue = {
    isHighContrast,
    prefersReducedMotion,
    announce: enhancedAnnounce,
    isKeyboardUser,
    setKeyboardUser: setIsKeyboardUser,
    focusMode,
    setFocusMode,
    preferences,
    updatePreferences,
    showKeyboardHelp,
    setShowKeyboardHelp
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook to use accessibility context
 */
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  
  return context;
}

/**
 * Hook for keyboard-only interactions
 */
export function useKeyboardOnly() {
  const { isKeyboardUser, focusMode } = useAccessibility();
  
  return {
    isKeyboardOnly: isKeyboardUser && focusMode === 'keyboard',
    shouldShowFocusRing: isKeyboardUser,
    focusMode
  };
}

/**
 * Hook for accessible announcements with preferences
 */
export function useAccessibleAnnouncements() {
  const { announce, preferences } = useAccessibility();
  
  const announceNavigation = useCallback((message: string) => {
    if (preferences.announceNavigation) {
      announce(message, { priority: 'polite', delay: 100 });
    }
  }, [announce, preferences.announceNavigation]);
  
  const announceSelection = useCallback((message: string) => {
    if (preferences.announceSelections) {
      announce(message, { priority: 'polite' });
    }
  }, [announce, preferences.announceSelections]);
  
  const announceStateChange = useCallback((message: string, urgent = false) => {
    if (preferences.announceStateChanges) {
      announce(message, { priority: urgent ? 'assertive' : 'polite' });
    }
  }, [announce, preferences.announceStateChanges]);
  
  return {
    announceNavigation,
    announceSelection,
    announceStateChange,
    announce
  };
}

/**
 * Hook for focus management with accessibility preferences
 */
export function useAccessibleFocus() {
  const { isKeyboardUser, focusMode, preferences } = useAccessibility();
  
  const getFocusStyles = useCallback((isFocused: boolean) => {
    if (!isFocused || !isKeyboardUser) return {};
    
    const baseStyles = {
      outline: '2px solid #f97316',
      outlineOffset: '2px'
    };
    
    switch (preferences.focusIndicatorStyle) {
      case 'subtle':
        return {
          ...baseStyles,
          outline: '1px solid #f97316',
          outlineOffset: '1px'
        };
      case 'high-contrast':
        return {
          ...baseStyles,
          outline: '3px solid #f97316',
          outlineOffset: '3px',
          boxShadow: '0 0 0 1px #ffffff, 0 0 0 4px #f97316'
        };
      default:
        return baseStyles;
    }
  }, [isKeyboardUser, preferences.focusIndicatorStyle]);
  
  const shouldShowFocus = useCallback((element?: HTMLElement) => {
    return isKeyboardUser && focusMode === 'keyboard';
  }, [isKeyboardUser, focusMode]);
  
  return {
    getFocusStyles,
    shouldShowFocus,
    isKeyboardUser,
    focusMode
  };
}

export default AccessibilityProvider;