/**
 * Keyboard Shortcuts Help Component
 * 
 * Provides comprehensive keyboard navigation help and shortcuts reference.
 * Accessible modal with proper focus management and screen reader support.
 * 
 * Requirements: 12.1, 12.3, 12.4
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Keyboard, 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Play,
  Heart,
  MoreHorizontal,
  Search,
  Grid3X3,
  List,
  Command
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { 
  useFocusManagement
} from '../../hooks/useKeyboardNavigation';

import { 
  useKeyboardShortcut 
} from '../../hooks/useKeyboardShortcut';

import { 
  useScreenReaderAnnouncements,
  useHighContrastMode,
  useReducedMotion,
  getKeyboardShortcutDescription
} from '../../utils/accessibility';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    icon?: React.ComponentType<{ className?: string }>;
    context?: string;
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General Navigation',
    shortcuts: [
      {
        keys: ['⌘', 'K'],
        description: 'Open command palette',
        icon: Command,
        context: 'Global'
      },
      {
        keys: ['Escape'],
        description: 'Close dialogs or cancel actions',
        context: 'Global'
      },
      {
        keys: ['?'],
        description: 'Show keyboard shortcuts help',
        icon: Keyboard,
        context: 'Global'
      },
      {
        keys: ['Tab'],
        description: 'Navigate between interface elements',
        context: 'Global'
      },
      {
        keys: ['Shift', 'Tab'],
        description: 'Navigate backwards between elements',
        context: 'Global'
      }
    ]
  },
  {
    title: 'Song Grid Navigation',
    shortcuts: [
      {
        keys: ['↑'],
        description: 'Move up one row',
        icon: ArrowUp,
        context: 'Grid'
      },
      {
        keys: ['↓'],
        description: 'Move down one row',
        icon: ArrowDown,
        context: 'Grid'
      },
      {
        keys: ['←'],
        description: 'Move left one column',
        icon: ArrowLeft,
        context: 'Grid'
      },
      {
        keys: ['→'],
        description: 'Move right one column',
        icon: ArrowRight,
        context: 'Grid'
      },
      {
        keys: ['Home'],
        description: 'Move to first song in current row',
        context: 'Grid'
      },
      {
        keys: ['End'],
        description: 'Move to last song in current row',
        context: 'Grid'
      },
      {
        keys: ['Ctrl', 'Home'],
        description: 'Move to first song',
        context: 'Grid'
      },
      {
        keys: ['Ctrl', 'End'],
        description: 'Move to last song',
        context: 'Grid'
      },
      {
        keys: ['Page Up'],
        description: 'Move up 3 rows',
        context: 'Grid'
      },
      {
        keys: ['Page Down'],
        description: 'Move down 3 rows',
        context: 'Grid'
      }
    ]
  },
  {
    title: 'Song Actions',
    shortcuts: [
      {
        keys: ['Enter'],
        description: 'Select/deselect song',
        context: 'Song Card'
      },
      {
        keys: ['Space'],
        description: 'Select/deselect song',
        context: 'Song Card'
      },
      {
        keys: ['P'],
        description: 'Play song',
        icon: Play,
        context: 'Song Card'
      },
      {
        keys: ['F'],
        description: 'Add to favorites',
        icon: Heart,
        context: 'Song Card'
      },
      {
        keys: ['M'],
        description: 'More options menu',
        icon: MoreHorizontal,
        context: 'Song Card'
      }
    ]
  },
  {
    title: 'Search & Filtering',
    shortcuts: [
      {
        keys: ['↑'],
        description: 'Previous search result',
        icon: ArrowUp,
        context: 'Command Palette'
      },
      {
        keys: ['↓'],
        description: 'Next search result',
        icon: ArrowDown,
        context: 'Command Palette'
      },
      {
        keys: ['Enter'],
        description: 'Select search result',
        context: 'Command Palette'
      },
      {
        keys: ['Escape'],
        description: 'Close command palette',
        context: 'Command Palette'
      }
    ]
  },
  {
    title: 'View Controls',
    shortcuts: [
      {
        keys: ['G'],
        description: 'Switch to grid view',
        icon: Grid3X3,
        context: 'View Mode'
      },
      {
        keys: ['L'],
        description: 'Switch to list view',
        icon: List,
        context: 'View Mode'
      },
      {
        keys: ['T'],
        description: 'Toggle theme (light/dark)',
        context: 'Theme'
      }
    ]
  },
  {
    title: 'Setlist Builder',
    shortcuts: [
      {
        keys: ['↑'],
        description: 'Move item up in setlist',
        icon: ArrowUp,
        context: 'Setlist'
      },
      {
        keys: ['↓'],
        description: 'Move item down in setlist',
        icon: ArrowDown,
        context: 'Setlist'
      },
      {
        keys: ['Delete'],
        description: 'Remove item from setlist',
        context: 'Setlist'
      },
      {
        keys: ['Ctrl', 'S'],
        description: 'Save setlist',
        context: 'Setlist'
      }
    ]
  }
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { announce } = useScreenReaderAnnouncements();
  const isHighContrast = useHighContrastMode();
  const prefersReducedMotion = useReducedMotion();

  // Focus management
  const { focusFirst } = useFocusManagement({
    containerRef: dialogRef,
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true
  });

  // Handle escape key to close
  useKeyboardShortcut('Escape', onClose, { enabled: isOpen });

  // Announce when dialog opens
  useEffect(() => {
    if (isOpen) {
      announce('Keyboard shortcuts help opened. Use Tab to navigate, Escape to close.', { 
        priority: 'polite',
        delay: 500 
      });
    }
  }, [isOpen, announce]);

  // Render keyboard key
  const renderKey = (key: string) => {
    const keyIcons: Record<string, React.ComponentType<{ className?: string }>> = {
      '↑': ArrowUp,
      '↓': ArrowDown,
      '←': ArrowLeft,
      '→': ArrowRight
    };

    const IconComponent = keyIcons[key];

    return (
      <kbd 
        key={key}
        className={`
          inline-flex items-center justify-center min-w-[2rem] h-7 px-2 
          text-xs font-mono font-medium rounded border
          ${isHighContrast 
            ? 'bg-ButtonFace border-ButtonText text-ButtonText' 
            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
          }
        `}
        aria-label={getKeyboardShortcutDescription(key)}
      >
        {IconComponent ? (
          <IconComponent className="h-3 w-3" aria-hidden="true" />
        ) : (
          key
        )}
      </kbd>
    );
  };

  // Render shortcut row
  const renderShortcut = (shortcut: ShortcutGroup['shortcuts'][0], index: number) => {
    const { keys, description, icon: Icon, context } = shortcut;

    return (
      <div 
        key={index}
        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          {Icon && (
            <Icon 
              className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" 
              aria-hidden="true" 
            />
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {description}
            </p>
            {context && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {context}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {keys.map((key, keyIndex) => (
            <React.Fragment key={keyIndex}>
              {keyIndex > 0 && (
                <span 
                  className="text-xs text-slate-400 dark:text-slate-500 mx-1"
                  aria-hidden="true"
                >
                  +
                </span>
              )}
              {renderKey(key)}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
            ref={dialogRef}
            className="max-w-4xl max-h-[80vh] overflow-hidden p-0"
            style={isHighContrast ? {
              border: '2px solid ButtonText',
              backgroundColor: 'ButtonFace',
              color: 'ButtonText'
            } : {}}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Keyboard className="h-5 w-5 text-orange-500" aria-hidden="true" />
                    <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Keyboard Shortcuts
                    </DialogTitle>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Close keyboard shortcuts help"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Learn keyboard shortcuts to navigate the Song Library efficiently
                </p>
              </DialogHeader>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {shortcutGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {group.title}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          aria-label={`${group.shortcuts.length} shortcuts in this group`}
                        >
                          {group.shortcuts.length}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {group.shortcuts.map((shortcut, shortcutIndex) => 
                          renderShortcut(shortcut, shortcutIndex)
                        )}
                      </div>
                      
                      {groupIndex < shortcutGroups.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                    <span>💡 Tip: Press ? anytime to open this help</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      Press
                    </span>
                    {renderKey('Escape')}
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      to close
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default KeyboardShortcutsHelp;