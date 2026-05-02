/**
 * Collaboration Hook for Song Library UI Revamp
 * 
 * Provides comprehensive real-time collaboration features:
 * - User presence tracking and display
 * - Real-time setlist synchronization
 * - Conflict detection and resolution
 * - Change history management
 * - Cross-tab synchronization
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.7
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { toast } from 'sonner';

import type { 
  CollaborationState,
  SetlistCollaborator,
  CollaborationEvents,
  EditConflict,
  SetlistChangeHistory,
  CursorPosition,
  CollaborationError,
  CollaborationConfig,
  OptimisticUpdate,
  ConflictResolution
} from '@/types/song-library';

interface UseCollaborationOptions {
  setlistId: string;
  enableRealTime?: boolean;
  enablePresence?: boolean;
  enableConflictResolution?: boolean;
  maxHistorySize?: number;
  
  // Event handlers
  onCollaboratorJoin?: (collaborator: SetlistCollaborator) => void;
  onCollaboratorLeave?: (userId: string) => void;
  onSetlistChange?: (change: SetlistChangeHistory) => void;
  onCursorMove?: (userId: string, position: CursorPosition) => void;
  onConflictDetected?: (conflict: EditConflict) => void;
  onConnectionStatusChange?: (status: CollaborationState['connectionStatus']) => void;
}

interface UseCollaborationReturn {
  // State
  state: CollaborationState;
  collaborators: SetlistCollaborator[];
  activeCollaborators: SetlistCollaborator[];
  
  // Actions
  joinCollaboration: () => Promise<void>;
  leaveCollaboration: () => Promise<void>;
  updateCursor: (position: CursorPosition) => Promise<void>;
  
  // Change management
  broadcastChange: (change: SetlistChangeHistory) => Promise<void>;
  undoChange: () => Promise<void>;
  redoChange: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'accept' | 'reject' | 'merge') => Promise<void>;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  changeHistory: SetlistChangeHistory[];
  
  // Connection management
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Default collaboration configuration
 */
const DEFAULT_CONFIG: Required<Omit<UseCollaborationOptions, 'setlistId'>> = {
  enableRealTime: true,
  enablePresence: true,
  enableConflictResolution: true,
  maxHistorySize: 50,
  onCollaboratorJoin: () => {},
  onCollaboratorLeave: () => {},
  onSetlistChange: () => {},
  onCursorMove: () => {},
  onConflictDetected: () => {},
  onConnectionStatusChange: () => {},
};

/**
 * Collaboration Hook
 * 
 * Manages real-time collaboration for setlist editing, including presence tracking,
 * change synchronization, conflict resolution, and cross-tab communication.
 */
export function useCollaboration({
  setlistId,
  onCollaboratorJoin,
  onCollaboratorLeave,
  onSetlistChange,
  onCursorMove,
  onConflictDetected,
  onConnectionStatusChange,
  ...options
}: UseCollaborationOptions): UseCollaborationReturn {
  const { tenantId, user } = useChurch();
  const mergedConfig = { ...DEFAULT_CONFIG, ...options };
  
  // State
  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    activeCollaborators: [],
    currentUser: {
      user_id: user?.id || '',
      user_name: user?.name || '',
      user_avatar: user?.avatar_url || null,
      is_online: true,
      last_seen_at: new Date().toISOString(),
      permissions: {
        can_edit: true,
        can_reorder: true,
        can_add_songs: true,
        can_remove_songs: true,
        can_modify_settings: false,
        can_invite_others: false,
      },
    },
    pendingChanges: [],
    conflicts: [],
    syncErrors: [],
  });
  
  const [collaborators, setCollaborators] = useState<SetlistCollaborator[]>([]);
  const [changeHistory, setChangeHistory] = useState<SetlistChangeHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // Refs
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Computed values
  const activeCollaborators = collaborators.filter(c => c.is_online);
  const canUndo = currentHistoryIndex >= 0;
  const canRedo = currentHistoryIndex < changeHistory.length - 1;

  /**
   * Initialize real-time collaboration
   */
  const initializeCollaboration = useCallback(async () => {
    if (!mergedConfig.enableRealTime || !user?.id) return;
    
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    
    try {
      // Create Supabase channel for this setlist
      const channel = supabase.channel(`setlist-collaboration-${setlistId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });
      
      channelRef.current = channel;
      
      // Set up presence tracking
      if (mergedConfig.enablePresence) {
        channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const presentUsers = Object.values(presenceState).flat() as SetlistCollaborator[];
            setCollaborators(presentUsers);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            const newUser = newPresences[0] as SetlistCollaborator;
            onCollaboratorJoin?.(newUser);
            toast.success(`${newUser.user_name} joined the collaboration`);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            const leftUser = leftPresences[0] as SetlistCollaborator;
            onCollaboratorLeave?.(leftUser.user_id);
            toast.info(`${leftUser.user_name} left the collaboration`);
          });
      }
      
      // Set up real-time change broadcasting
      channel
        .on('broadcast', { event: 'setlist-change' }, ({ payload }) => {
          handleSetlistChange(payload);
        })
        .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
          onCursorMove?.(payload.userId, payload.position);
        })
        .on('broadcast', { event: 'conflict-detected' }, ({ payload }) => {
          handleConflictDetected(payload.conflict);
        });
      
      // Subscribe to database changes
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'set_list_songs',
          filter: `set_list_id=eq.${setlistId}`,
        }, handleSetlistChange)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'set_lists',
          filter: `id=eq.${setlistId}`,
        }, handleSetlistChange);
      
      // Subscribe to collaboration events
      channel.on('broadcast', { event: 'setlist-change' }, ({ payload }) => {
        handleSetlistChange(payload);
      });
      
      const { error } = await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            connectionStatus: 'connected',
            lastSyncedAt: new Date().toISOString(),
          }));
          onConnectionStatusChange?.('connected');
          
          // Track presence
          if (mergedConfig.enablePresence) {
            await channel.track({
              user_id: user.id,
              user_name: user.name,
              user_avatar: user.avatar_url,
              is_online: true,
              last_seen_at: new Date().toISOString(),
              permissions: state.currentUser.permissions,
            });
          }
          
          // Start heartbeat
          startHeartbeat();
        } else if (status === 'CHANNEL_ERROR') {
          setState(prev => ({ 
            ...prev, 
            isConnected: false, 
            connectionStatus: 'error' 
          }));
          onConnectionStatusChange?.('error');
          scheduleReconnect();
        }
      });
      
      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionStatus: 'error',
        syncErrors: [...prev.syncErrors, {
          code: 'INIT_ERROR',
          message: 'Failed to initialize collaboration',
          details: error,
        }],
      }));
      onConnectionStatusChange?.('error');
      scheduleReconnect();
    }
  }, [setlistId, mergedConfig.enableRealTime, user?.id, onCollaboratorJoin, onCollaboratorLeave, onCursorMove, onConflictDetected, onConnectionStatusChange]);

  /**
   * Handle setlist change broadcasts
   */
  const handleSetlistChange = useCallback((payload: any) => {
    const change: SetlistChangeHistory = payload.new || payload;
    
    // Add to change history
    setChangeHistory(prev => {
      const newHistory = [...prev, change];
      return newHistory.slice(-mergedConfig.maxHistorySize);
    });
    
    // Update current index
    setCurrentHistoryIndex(prev => Math.min(prev + 1, mergedConfig.maxHistorySize - 1));
    
    onSetlistChange?.(change);
    
    // Sync across tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const tabChannel = new BroadcastChannel(`setlist-sync-${setlistId}`);
      tabChannel.postMessage({
        type: 'setlist-change',
        data: { change }
      });
      tabChannel.close();
    }
  }, [mergedConfig.maxHistorySize, onSetlistChange, setlistId]);

  /**
   * Handle conflict detection
   */
  const handleConflictDetected = useCallback((conflict: EditConflict) => {
    setState(prev => ({
      ...prev,
      conflicts: [...prev.conflicts, conflict],
    }));
    
    onConflictDetected?.(conflict);
    toast.error(`Conflict detected: ${conflict.description}`);
  }, [onConflictDetected]);

  /**
   * Start heartbeat to maintain connection
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(async () => {
      if (channelRef.current && state.isConnected) {
        try {
          await channelRef.current.track({
            user_id: user?.id,
            user_name: user?.name,
            user_avatar: user?.avatar_url,
            is_online: true,
            last_seen_at: new Date().toISOString(),
            permissions: state.currentUser.permissions,
          });
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, 30000); // 30 seconds
  }, [state.isConnected, state.currentUser.permissions, user]);

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!state.isConnected) {
        initializeCollaboration();
      }
    }, 5000); // 5 seconds
  }, [state.isConnected, initializeCollaboration]);

  /**
   * Join collaboration session
   */
  const joinCollaboration = useCallback(async () => {
    await initializeCollaboration();
  }, [initializeCollaboration]);

  /**
   * Leave collaboration session
   */
  const leaveCollaboration = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionStatus: 'disconnected',
    }));
    
    // Clear intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  /**
   * Update cursor position
   */
  const updateCursor = useCallback(async (position: CursorPosition) => {
    if (!channelRef.current || !state.isConnected) return;
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: {
          userId: user?.id,
          position,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Failed to update cursor:', error);
    }
  }, [state.isConnected, user?.id]);

  /**
   * Broadcast setlist change to other collaborators
   */
  const broadcastChange = useCallback(async (change: SetlistChangeHistory) => {
    if (!channelRef.current || !mergedConfig.enableRealTime) return;
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'setlist-change',
        payload: change,
      });
      
      setState(prev => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to broadcast change:', error);
      setState(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, {
          code: 'BROADCAST_ERROR',
          message: 'Failed to broadcast change',
          details: error,
        }],
      }));
    }
  }, [mergedConfig.enableRealTime]);

  /**
   * Undo last change
   */
  const undoChange = useCallback(async () => {
    if (!canUndo) return;
    
    const targetIndex = currentHistoryIndex - 1;
    setCurrentHistoryIndex(targetIndex);
    
    // Broadcast undo action
    if (targetIndex >= 0) {
      const change = changeHistory[targetIndex];
      await broadcastChange({
        ...change,
        change_type: 'undo',
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
      } as SetlistChangeHistory);
    }
  }, [canUndo, currentHistoryIndex, changeHistory, broadcastChange, user?.id]);

  /**
   * Redo last undone change
   */
  const redoChange = useCallback(async () => {
    if (!canRedo) return;
    
    const targetIndex = currentHistoryIndex + 1;
    setCurrentHistoryIndex(targetIndex);
    
    // Broadcast redo action
    const change = changeHistory[targetIndex];
    await broadcastChange({
      ...change,
      change_type: 'redo',
      user_id: user?.id || '',
      created_at: new Date().toISOString(),
    } as SetlistChangeHistory);
  }, [canRedo, currentHistoryIndex, changeHistory, broadcastChange, user?.id]);

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'accept' | 'reject' | 'merge') => {
    setState(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter(c => c.id !== conflictId),
    }));
    
    // Broadcast conflict resolution
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'conflict-resolved',
        payload: {
          conflictId,
          resolution,
          resolvedBy: user?.id,
          timestamp: Date.now(),
        },
      });
    }
    
    toast.success('Conflict resolved successfully');
  }, [user?.id]);

  /**
   * Reconnect to collaboration
   */
  const reconnect = useCallback(async () => {
    await leaveCollaboration();
    await initializeCollaboration();
  }, [leaveCollaboration, initializeCollaboration]);

  /**
   * Disconnect from collaboration
   */
  const disconnect = useCallback(async () => {
    await leaveCollaboration();
  }, [leaveCollaboration]);

  // Initialize on mount
  useEffect(() => {
    if (setlistId && user?.id) {
      initializeCollaboration();
    }
    
    return () => {
      leaveCollaboration();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setlistId, user?.id]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !state.isConnected) {
        initializeCollaboration();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isConnected, initializeCollaboration]);

  return {
    // State
    state,
    collaborators,
    activeCollaborators,
    
    // Actions
    joinCollaboration,
    leaveCollaboration,
    updateCursor,
    
    // Change management
    broadcastChange,
    undoChange,
    redoChange,
    resolveConflict,
    
    // History
    canUndo,
    canRedo,
    changeHistory,
    
    // Connection management
    reconnect,
    disconnect,
  };
}

export default useCollaboration;