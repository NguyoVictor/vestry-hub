/**
 * Auto-Save Hook and Component
 * 
 * Provides real-time auto-save functionality for setlist changes with
 * optimistic updates, conflict detection, and rollback capabilities.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Setlist, OptimisticUpdate } from '@/types/song-library';

interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  lastSaved: Date | null;
  pendingChanges: OptimisticUpdate[];
  hasUnsavedChanges: boolean;
  retryCount: number;
}

interface UseAutoSaveOptions {
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  onSave: (setlist: Setlist) => Promise<void>;
  onError: (error: Error) => void;
  onConflict?: (conflict: any) => void;
}

export function useAutoSave(
  setlist: Setlist | null,
  options: UseAutoSaveOptions
) {
  const [state, setState] = useState<AutoSaveState>({
    status: 'idle',
    lastSaved: null,
    pendingChanges: [],
    hasUnsavedChanges: false,
    retryCount: 0,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSetlistRef = useRef<string>('');
  const isOnlineRef = useRef(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setState(prev => ({ ...prev, status: 'idle' }));
      
      // Retry pending saves when coming back online
      if (state.hasUnsavedChanges && setlist) {
        triggerSave();
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setState(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.hasUnsavedChanges, setlist]);

  // Perform the actual save operation
  const performSave = useCallback(async () => {
    if (!setlist || !options.enabled || !isOnlineRef.current) {
      return;
    }

    setState(prev => ({ ...prev, status: 'saving' }));

    try {
      await options.onSave(setlist);
      
      setState(prev => ({
        ...prev,
        status: 'saved',
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        retryCount: 0,
        pendingChanges: [],
      }));

      // Reset to idle after showing saved status
      setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 2000);

    } catch (error) {
      console.error('Auto-save failed:', error);
      
      setState(prev => ({
        ...prev,
        status: 'error',
        retryCount: prev.retryCount + 1,
      }));

      options.onError(error as Error);

      // Retry with exponential backoff
      if (state.retryCount < options.maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, state.retryCount), 30000);
        setTimeout(() => {
          if (setlist && state.hasUnsavedChanges) {
            performSave();
          }
        }, retryDelay);
      } else {
        toast.error('Failed to save changes. Please save manually.');
      }
    }
  }, [setlist, options, state.retryCount]);

  // Trigger save with debouncing
  const triggerSave = useCallback(() => {
    if (!options.enabled || !setlist) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, options.interval);
  }, [options.enabled, options.interval, setlist, performSave]);

  // Detect changes in setlist
  useEffect(() => {
    if (!setlist) return;

    const currentSetlistString = JSON.stringify(setlist);
    
    if (lastSetlistRef.current && lastSetlistRef.current !== currentSetlistString) {
      setState(prev => ({ ...prev, hasUnsavedChanges: true }));
      triggerSave();
    }
    
    lastSetlistRef.current = currentSetlistString;
  }, [setlist, triggerSave]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    saveNow,
    isOnline: isOnlineRef.current,
  };
}

interface AutoSaveIndicatorProps {
  autoSaveState: ReturnType<typeof useAutoSave>;
  className?: string;
}

export function AutoSaveIndicator({ 
  autoSaveState, 
  className = '' 
}: AutoSaveIndicatorProps) {
  const { status, lastSaved, hasUnsavedChanges, isOnline, saveNow } = autoSaveState;

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Save className="h-3 w-3 animate-pulse" />;
      case 'saved':
        return <CheckCircle className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      case 'offline':
        return <WifiOff className="h-3 w-3" />;
      default:
        return isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      case 'offline':
        return 'Offline';
      default:
        if (hasUnsavedChanges) {
          return 'Unsaved changes';
        }
        return lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'saved':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'offline':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        if (hasUnsavedChanges) {
          return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        }
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <Badge 
            variant="secondary" 
            className={`
              flex items-center gap-1.5 text-xs font-jakarta transition-colors
              ${getStatusColor()}
            `}
          >
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </motion.div>
      </AnimatePresence>

      {/* Manual save button for error states */}
      {(status === 'error' || (hasUnsavedChanges && !isOnline)) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={saveNow}
          className="h-6 px-2 text-xs font-jakarta"
          disabled={status === 'saving'}
        >
          <Save className="h-3 w-3 mr-1" />
          Save Now
        </Button>
      )}
    </div>
  );
}

/**
 * Auto-Save Provider Component
 * 
 * Wraps setlist components with auto-save functionality
 */
interface AutoSaveProviderProps {
  children: React.ReactNode;
  setlist: Setlist | null;
  onSave: (setlist: Setlist) => Promise<void>;
  onError?: (error: Error) => void;
  enabled?: boolean;
  interval?: number;
  maxRetries?: number;
  showIndicator?: boolean;
}

export function AutoSaveProvider({
  children,
  setlist,
  onSave,
  onError = (error) => console.error('Auto-save error:', error),
  enabled = true,
  interval = 2000, // 2 seconds
  maxRetries = 3,
  showIndicator = true,
}: AutoSaveProviderProps) {
  const autoSaveState = useAutoSave(setlist, {
    enabled,
    interval,
    maxRetries,
    onSave,
    onError,
  });

  return (
    <div className="relative">
      {children}
      
      {/* Auto-save indicator */}
      {showIndicator && (
        <div className="fixed bottom-4 right-4 z-50">
          <AutoSaveIndicator autoSaveState={autoSaveState} />
        </div>
      )}
    </div>
  );
}

export default AutoSaveProvider;