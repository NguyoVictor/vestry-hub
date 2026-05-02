/**
 * Presence Indicator Component for Song Library UI Revamp
 * 
 * Shows real-time presence of active collaborators:
 * - User avatars with online status
 * - Editing indicators
 * - Cursor positions (future enhancement)
 * - Connection status
 * 
 * Requirements: 14.2
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Edit3, 
  Eye, 
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

import type { 
  SetlistCollaborator,
  CollaborationState
} from '@/types/song-library';

interface PresenceIndicatorProps {
  collaborators: SetlistCollaborator[];
  connectionStatus: CollaborationState['connectionStatus'];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
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
 * Get role icon and color
 */
function getRoleInfo(permissions: string) {
  switch (permissions) {
    case 'owner':
      return { icon: Crown, color: 'text-amber-500' };
    case 'editor':
      return { icon: Edit3, color: 'text-blue-500' };
    case 'viewer':
      return { icon: Eye, color: 'text-slate-500' };
    default:
      return { icon: Eye, color: 'text-slate-500' };
  }
}

/**
 * Get connection status info
 */
function getConnectionInfo(status: CollaborationState['connectionStatus']) {
  switch (status) {
    case 'connected':
      return { icon: Wifi, color: 'text-emerald-500', label: 'Connected' };
    case 'connecting':
      return { icon: Wifi, color: 'text-amber-500', label: 'Connecting...' };
    case 'disconnected':
      return { icon: WifiOff, color: 'text-slate-400', label: 'Disconnected' };
    case 'error':
      return { icon: AlertTriangle, color: 'text-red-500', label: 'Connection Error' };
    default:
      return { icon: WifiOff, color: 'text-slate-400', label: 'Unknown' };
  }
}

/**
 * Presence Indicator Component
 */
export function PresenceIndicator({
  collaborators,
  connectionStatus,
  maxVisible = 5,
  size = 'md',
  showStatus = true,
  className,
}: PresenceIndicatorProps) {
  const connectionInfo = getConnectionInfo(connectionStatus);
  const ConnectionIcon = connectionInfo.icon;
  
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };
  
  const avatarSize = sizeClasses[size];
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = Math.max(0, collaborators.length - maxVisible);

  if (collaborators.length === 0 && connectionStatus === 'disconnected') {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Connection Status */}
      {showStatus && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800",
                avatarSize,
                connectionStatus === 'connected' ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-slate-800'
              )}>
                <ConnectionIcon className={cn(
                  "h-3 w-3",
                  connectionInfo.color,
                  connectionStatus === 'connecting' && "animate-spin"
                )} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{connectionInfo.label}</p>
              {collaborators.length > 0 && (
                <p className="text-xs text-slate-500">
                  {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Collaborator Avatars */}
      {collaborators.length > 0 && (
        <div className="flex -space-x-1">
          <AnimatePresence>
            {visibleCollaborators.map((collaborator, index) => {
              const roleInfo = getRoleInfo(collaborator.permissions);
              const RoleIcon = roleInfo.icon;
              
              return (
                <motion.div
                  key={collaborator.user_id}
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className={cn(
                            avatarSize,
                            "border-2 border-white dark:border-slate-800 transition-transform hover:scale-110"
                          )}>
                            <AvatarImage src={collaborator.user_avatar || undefined} />
                            <AvatarFallback className={cn(
                              size === 'sm' ? 'text-xs' : 'text-sm'
                            )}>
                              {getUserInitials(collaborator.user_name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Online/Editing Status */}
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-slate-800",
                            size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
                            collaborator.is_editing 
                              ? 'bg-emerald-500 animate-pulse' 
                              : 'bg-blue-500'
                          )} />
                          
                          {/* Role Icon */}
                          {collaborator.permissions === 'owner' && (
                            <div className={cn(
                              "absolute -top-0.5 -left-0.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 flex items-center justify-center",
                              size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
                            )}>
                              <RoleIcon className={cn(
                                "text-white",
                                size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
                              )} />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <p className="font-medium">{collaborator.user_name}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {collaborator.permissions}
                          </p>
                          <p className="text-xs text-slate-500">
                            {collaborator.is_editing ? 'Currently editing' : 'Viewing'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Active {formatDistanceToNow(new Date(collaborator.last_seen_at), { addSuffix: true })}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Hidden Count Indicator */}
          {hiddenCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800",
                avatarSize
              )}
            >
              <span className={cn(
                "font-medium text-slate-600 dark:text-slate-300",
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}>
                +{hiddenCount}
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* Collaboration Count Badge */}
      {collaborators.length > 0 && size !== 'sm' && (
        <Badge variant="secondary" className="text-xs">
          {collaborators.length} online
        </Badge>
      )}
    </div>
  );
}

export default PresenceIndicator;