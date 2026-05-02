/**
 * Cross-Tab Synchronization Component for Song Library UI Revamp
 * 
 * Provides visual indicators and management for cross-tab synchronization:
 * - Tab connection status
 * - Sync indicators
 * - Tab management controls
 * - Unified experience across tabs
 * 
 * Requirements: 14.7
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers as TabsIcon, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

import { useCrossTabSync } from '../../hooks/useCrossTabSync';

interface CrossTabSyncProps {
  setlistId: string;
  onSyncStateChange?: (isConnected: boolean, tabCount: number) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Get device type icon based on user agent
 */
function getDeviceIcon(userAgent?: string) {
  if (!userAgent) return Monitor;
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/iPad/.test(userAgent)) return Tablet;
    return Smartphone;
  }
  
  return Monitor;
}

/**
 * Cross-Tab Synchronization Component
 */
export function CrossTabSync({
  setlistId,
  onSyncStateChange,
  className,
  compact = false,
}: CrossTabSyncProps) {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  const {
    currentTabId,
    connectedTabs,
    isSupported,
    broadcast,
    syncState,
    addEventListener,
  } = useCrossTabSync({
    channelName: `setlist-sync-${setlistId}`,
    enableLogging: process.env.NODE_ENV === 'development',
    onMessage: (message) => {
      setLastSyncTime(new Date());
      
      // Handle sync errors
      if (message.type === 'sync-error') {
        setSyncErrors(prev => [...prev, message.data.error]);
      }
    },
    onTabConnect: (tabId) => {
      console.log('Tab connected:', tabId);
      onSyncStateChange?.(true, connectedTabs.length + 1);
    },
    onTabDisconnect: (tabId) => {
      console.log('Tab disconnected:', tabId);
      onSyncStateChange?.(connectedTabs.length > 1, connectedTabs.length - 1);
    },
  });

  // Handle manual sync trigger
  const handleManualSync = useCallback(() => {
    broadcast('manual-sync', {
      timestamp: Date.now(),
      triggerTab: currentTabId,
    });
    setLastSyncTime(new Date());
  }, [broadcast, currentTabId]);

  // Clear sync errors
  const clearSyncErrors = useCallback(() => {
    setSyncErrors([]);
  }, []);

  // Test cross-tab communication
  const testCommunication = useCallback(() => {
    broadcast('test-message', {
      message: 'Test communication from tab',
      timestamp: Date.now(),
      tabId: currentTabId,
    });
  }, [broadcast, currentTabId]);

  if (!isSupported) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Cross-tab synchronization is not supported in this browser.
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                connectedTabs.length > 0 
                  ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}>
                <TabsIcon className="h-3 w-3" />
                <span>{connectedTabs.length + 1}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cross-tab sync active</p>
              <p className="text-xs text-slate-500">
                {connectedTabs.length + 1} tab{connectedTabs.length !== 0 ? 's' : ''} connected
              </p>
              {lastSyncTime && (
                <p className="text-xs text-slate-500">
                  Last sync: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {syncErrors.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {syncErrors.length} error{syncErrors.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TabsIcon className="h-4 w-4" />
            Cross-Tab Sync
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {connectedTabs.length > 0 ? (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {connectedTabs.length + 1} tabs
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Monitor className="h-3 w-3 mr-1" />
                Single tab
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            {connectedTabs.length > 0 ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-400" />
            )}
            <span className="text-sm font-medium">
              {connectedTabs.length > 0 ? 'Synchronized' : 'No other tabs'}
            </span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSync}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Connected Tabs */}
        {connectedTabs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Connected Tabs ({connectedTabs.length})
            </h4>
            
            <div className="space-y-1">
              <AnimatePresence>
                {connectedTabs.map((tab) => {
                  const DeviceIcon = getDeviceIcon();
                  
                  return (
                    <motion.div
                      key={tab.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <DeviceIcon className="h-4 w-4 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          Tab {tab.id.slice(-8)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tab.connected ? 'Connected' : 'Disconnected'} • 
                          {formatDistanceToNow(tab.lastSeen, { addSuffix: true })}
                        </p>
                      </div>
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        tab.connected ? 'bg-emerald-500' : 'bg-slate-400'
                      )} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Current Tab Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Current Tab
          </h4>
          
          <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Monitor className="h-4 w-4 text-blue-500" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                Tab {currentTabId.slice(-8)} (You)
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Active tab
              </p>
            </div>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* Sync Errors */}
        {syncErrors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                Sync Errors ({syncErrors.length})
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSyncErrors}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
            
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {syncErrors.map((error, index) => (
                <div
                  key={index}
                  className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                >
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Sync Time */}
        {lastSyncTime && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Last sync: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
          </div>
        )}

        {/* Test Communication */}
        {process.env.NODE_ENV === 'development' && (
          <Button
            size="sm"
            variant="outline"
            onClick={testCommunication}
            className="w-full text-xs"
          >
            Test Communication
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default CrossTabSync;