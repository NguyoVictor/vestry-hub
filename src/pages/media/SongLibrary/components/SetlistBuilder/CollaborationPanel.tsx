/**
 * Collaboration Panel Component for Song Library UI Revamp
 * 
 * Displays real-time collaboration features:
 * - Active collaborators with presence indicators
 * - Connection status and sync indicators
 * - Conflict resolution interface
 * - Change history with undo/redo controls
 * - Cross-tab synchronization status
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.7
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Clock, 
  Undo2, 
  Redo2,
  Eye,
  Edit3,
  Crown,
  CheckCircle,
  XCircle,
  Merge,
  RefreshCw,
  Layers, // Changed from Tabs to Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

import type { 
  SetlistCollaborator,
  CollaborationState,
  EditConflict,
  SetlistChangeHistory,
  CollaborationError
} from '@/types/song-library';

interface CollaborationPanelProps {
  // Collaboration state
  state: CollaborationState;
  collaborators: SetlistCollaborator[];
  activeCollaborators: SetlistCollaborator[];
  
  // History management
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => Promise<void>;
  onRedo: () => Promise<void>;
  
  // Conflict resolution
  onResolveConflict: (conflictId: string, resolution: 'accept' | 'reject' | 'merge') => Promise<void>;
  
  // Connection management
  onReconnect: () => Promise<void>;
  
  // UI props
  className?: string;
  compact?: boolean;
  showHistory?: boolean;
  showConflicts?: boolean;
}

/**
 * Get user initials for avatar fallback
 */
function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get connection status color and icon
 */
function getConnectionStatus(status: CollaborationState['connectionStatus']) {
  switch (status) {
    case 'connected':
      return { 
        color: 'text-emerald-600 dark:text-emerald-400', 
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
        icon: Wifi,
        label: 'Connected'
      };
    case 'connecting':
      return { 
        color: 'text-amber-600 dark:text-amber-400', 
        bgColor: 'bg-amber-100 dark:bg-amber-900/20',
        icon: RefreshCw,
        label: 'Connecting...'
      };
    case 'disconnected':
      return { 
        color: 'text-slate-500 dark:text-slate-400', 
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        icon: WifiOff,
        label: 'Disconnected'
      };
    case 'error':
      return { 
        color: 'text-red-600 dark:text-red-400', 
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        icon: AlertTriangle,
        label: 'Connection Error'
      };
    default:
      return { 
        color: 'text-slate-500 dark:text-slate-400', 
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        icon: WifiOff,
        label: 'Unknown'
      };
  }
}

/**
 * Get collaborator role icon and color
 */
function getCollaboratorRole(collaborator: SetlistCollaborator) {
  switch (collaborator.permissions) {
    case 'owner':
      return { icon: Crown, color: 'text-amber-600 dark:text-amber-400' };
    case 'editor':
      return { icon: Edit3, color: 'text-blue-600 dark:text-blue-400' };
    case 'viewer':
      return { icon: Eye, color: 'text-slate-500 dark:text-slate-400' };
    default:
      return { icon: Eye, color: 'text-slate-500 dark:text-slate-400' };
  }
}

/**
 * Collaboration Panel Component
 */
export function CollaborationPanel({
  state,
  collaborators,
  activeCollaborators,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResolveConflict,
  onReconnect,
  className,
  compact = false,
  showHistory = true,
  showConflicts = true,
}: CollaborationPanelProps) {
  const [showAllCollaborators, setShowAllCollaborators] = useState(false);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  
  const connectionStatus = getConnectionStatus(state.connectionStatus);
  const ConnectionIcon = connectionStatus.icon;
  
  // Handle conflict resolution
  const handleResolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'accept' | 'reject' | 'merge'
  ) => {
    try {
      await onResolveConflict(conflictId, resolution);
      setExpandedConflict(null);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  }, [onResolveConflict]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Connection Status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                connectionStatus.bgColor,
                connectionStatus.color
              )}>
                <ConnectionIcon className="h-3 w-3" />
                {state.isConnected && activeCollaborators.length > 0 && (
                  <span>{activeCollaborators.length}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{connectionStatus.label}</p>
              {state.isConnected && (
                <p className="text-xs text-slate-500">
                  {activeCollaborators.length} active collaborator{activeCollaborators.length !== 1 ? 's' : ''}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Active Collaborators Avatars */}
        {state.isConnected && activeCollaborators.length > 0 && (
          <div className="flex -space-x-1">
            {activeCollaborators.slice(0, 3).map((collaborator) => (
              <TooltipProvider key={collaborator.user_id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 border-2 border-white dark:border-slate-800">
                      <AvatarImage src={collaborator.user_avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(collaborator.user_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{collaborator.user_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{collaborator.permissions}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {activeCollaborators.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  +{activeCollaborators.length - 3}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Conflicts Indicator */}
        {showConflicts && state.conflicts.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {state.conflicts.length} conflict{state.conflicts.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
            Collaboration
          </h3>
        </div>
        
        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium",
          connectionStatus.bgColor,
          connectionStatus.color
        )}>
          <ConnectionIcon className={cn("h-3 w-3", state.connectionStatus === 'connecting' && "animate-spin")} />
          <span>{connectionStatus.label}</span>
        </div>
      </div>

      {/* Connection Error */}
      {state.connectionStatus === 'error' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connection lost. Changes may not sync.</span>
            <Button size="sm" variant="outline" onClick={onReconnect}>
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Errors */}
      {state.syncErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {state.syncErrors.length} sync error{state.syncErrors.length !== 1 ? 's' : ''} occurred.
            Some changes may not be saved.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Collaborators */}
      {state.isConnected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 font-jakarta">
              Active Now ({activeCollaborators.length})
            </h4>
            {collaborators.length > activeCollaborators.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCollaborators(!showAllCollaborators)}
                className="text-xs"
              >
                {showAllCollaborators ? 'Hide' : 'Show'} All
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              <AnimatePresence>
                {activeCollaborators.map((collaborator) => {
                  const roleInfo = getCollaboratorRole(collaborator);
                  const RoleIcon = roleInfo.icon;
                  
                  return (
                    <motion.div
                      key={collaborator.user_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={collaborator.user_avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(collaborator.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        {collaborator.current_action?.type === 'editing' && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate font-jakarta">
                          {collaborator.user_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {collaborator.current_action?.type === 'editing' ? 'Editing' : 'Viewing'}
                        </p>
                      </div>
                      
                      <RoleIcon className={cn("h-4 w-4", roleInfo.color)} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* All Collaborators */}
          <AnimatePresence>
            {showAllCollaborators && collaborators.length > activeCollaborators.length && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Separator />
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 font-jakarta">
                  Recent Collaborators
                </h4>
                <ScrollArea className="max-h-24">
                  <div className="space-y-1">
                    {collaborators
                      .filter(c => !activeCollaborators.find(ac => ac.user_id === c.user_id))
                      .map((collaborator) => (
                        <div
                          key={collaborator.user_id}
                          className="flex items-center gap-3 p-2 rounded-lg opacity-60"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={collaborator.user_avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(collaborator.user_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-jakarta">
                              {collaborator.user_name}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {formatDistanceToNow(new Date(collaborator.last_seen_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* History Controls */}
      {showHistory && state.isConnected && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 font-jakarta">
              History
            </h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-7 w-7 p-0"
              >
                <Undo2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-7 w-7 p-0"
              >
                <Redo2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {state.lastSyncedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last synced: {format(new Date(state.lastSyncedAt), 'HH:mm:ss')}
            </p>
          )}
        </div>
      )}

      {/* Conflicts */}
      {showConflicts && state.conflicts.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 font-jakarta">
              Conflicts ({state.conflicts.length})
            </h4>
          </div>
          
          <div className="space-y-2">
            {state.conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-jakarta">
                      {conflict.description}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {conflict.conflicting_users.map(u => u.user_name).join(', ')} • {formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedConflict(
                      expandedConflict === conflict.id ? null : conflict.id
                    )}
                    className="text-xs"
                  >
                    {expandedConflict === conflict.id ? 'Hide' : 'Resolve'}
                  </Button>
                </div>
                
                <AnimatePresence>
                  {expandedConflict === conflict.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'accept')}
                          className="flex-1"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'reject')}
                          className="flex-1"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'merge')}
                          className="flex-1"
                        >
                          <Merge className="h-3 w-3 mr-1" />
                          Merge
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-tab Sync Indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Layers className="h-3 w-3" />
        <span>Synced across browser tabs</span>
      </div>
    </div>
  );
}

export default CollaborationPanel;