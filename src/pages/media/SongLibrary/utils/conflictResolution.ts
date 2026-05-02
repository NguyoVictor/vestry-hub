/**
 * Conflict Resolution Utilities for Song Library UI Revamp
 * 
 * Provides comprehensive conflict detection and resolution:
 * - Optimistic locking for concurrent edits
 * - Conflict detection algorithms
 * - Resolution strategies (accept, reject, merge)
 * - Change history management
 * - Undo/redo capability
 * 
 * Requirements: 14.3, 14.5, 14.6
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type {
  EditConflict,
  SetlistChangeHistory,
  ConflictResolution,
  OptimisticUpdate,
  SetlistItem,
  Setlist,
  CollaborationError,
} from '@/types/song-library';

interface ConflictDetectionResult {
  hasConflict: boolean;
  conflicts: EditConflict[];
  canAutoResolve: boolean;
}

interface MergeResult {
  success: boolean;
  mergedData: any;
  conflicts: EditConflict[];
}

/**
 * Detect conflicts between current state and incoming changes
 */
export async function detectConflicts(
  setlistId: string,
  currentState: any,
  incomingChanges: SetlistChangeHistory[],
  tenantId: string
): Promise<ConflictDetectionResult> {
  const conflicts: EditConflict[] = [];
  
  try {
    // Get the latest version from database
    const { data: latestSetlist, error } = await supabase
      .from('set_lists')
      .select('*, set_list_songs(*)')
      .eq('id', setlistId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch latest setlist: ${error.message}`);
    }
    
    // Check for version conflicts
    if (latestSetlist.version !== currentState.version) {
      conflicts.push({
        id: `version-conflict-${Date.now()}`,
        type: 'version_mismatch',
        description: 'Setlist has been modified by another user',
        conflicting_users: [], // Will be populated with actual users
        current_state: currentState,
        incoming_change: latestSetlist,
        conflict_data: {
          field_name: 'version',
          original_value: currentState.version,
          conflicting_values: [{
            user_id: 'system',
            value: latestSetlist.version,
            timestamp: new Date().toISOString(),
          }],
        },
        resolution_options: [
          {
            id: 'accept-latest',
            type: 'accept_theirs',
            description: 'Accept the latest version',
            requires_user_input: false,
          },
          {
            id: 'keep-current',
            type: 'accept_mine',
            description: 'Keep your changes',
            requires_user_input: false,
          },
          {
            id: 'merge-changes',
            type: 'merge',
            description: 'Merge changes manually',
            requires_user_input: true,
          },
        ],
        auto_resolvable: false,
        created_at: new Date().toISOString(),
      });
    }
    
    // Check for concurrent edits
    for (const change of incomingChanges) {
      const conflict = await detectConcurrentEdit(change, currentState, latestSetlist);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
    
    // Check for drag conflicts (item position changes)
    const dragConflicts = await detectDragConflicts(currentState, latestSetlist);
    conflicts.push(...dragConflicts);
    
    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      canAutoResolve: conflicts.every(c => c.auto_resolvable),
    };
    
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    throw new Error('Failed to detect conflicts');
  }
}

/**
 * Detect concurrent edit conflicts
 */
async function detectConcurrentEdit(
  change: SetlistChangeHistory,
  currentState: any,
  latestState: any
): Promise<EditConflict | null> {
  const { change_type, change_data } = change;
  
  if (change_type === 'update' && change_data.field_name) {
    const fieldName = change_data.field_name;
    const currentValue = currentState[fieldName];
    const latestValue = latestState[fieldName];
    const incomingValue = change_data.new_value;
    
    // Check if the field has been modified by someone else
    if (currentValue !== latestValue && latestValue !== incomingValue) {
      return {
        id: `concurrent-edit-${Date.now()}`,
        type: 'concurrent_edit',
        description: `Concurrent edit detected on ${fieldName}`,
        conflicting_users: [], // Will be populated with actual users
        current_state: { [fieldName]: currentValue },
        incoming_change: { [fieldName]: incomingValue },
        conflict_data: {
          field_name: fieldName,
          original_value: currentValue,
          conflicting_values: [
            {
              user_id: change.user_id,
              value: incomingValue,
              timestamp: change.created_at,
            },
            {
              user_id: 'current',
              value: latestValue,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        resolution_options: [
          {
            id: 'accept-incoming',
            type: 'accept_theirs',
            description: 'Accept incoming change',
            requires_user_input: false,
          },
          {
            id: 'keep-current',
            type: 'accept_mine',
            description: 'Keep current value',
            requires_user_input: false,
          },
        ],
        auto_resolvable: false,
        created_at: new Date().toISOString(),
      };
    }
  }
  
  return null;
}

/**
 * Detect drag and drop conflicts (position changes)
 */
async function detectDragConflicts(
  currentState: any,
  latestState: any
): Promise<EditConflict[]> {
  const conflicts: EditConflict[] = [];
  
  const currentItems = currentState.items || [];
  const latestItems = latestState.set_list_songs || [];
  
  // Create position maps
  const currentPositions = new Map(
    currentItems.map((item: SetlistItem) => [item.song_id, item.position])
  );
  const latestPositions = new Map(
    latestItems.map((item: any) => [item.song_id, item.position])
  );
  
  // Check for position conflicts
  for (const [songId, currentPos] of currentPositions) {
    const latestPos = latestPositions.get(songId);
    
    if (latestPos !== undefined && currentPos !== latestPos) {
      conflicts.push({
        id: `drag-conflict-${songId}-${Date.now()}`,
        type: 'drag_conflict',
        description: `Position conflict for song ${songId}`,
        conflicting_users: [], // Will be populated with actual users
        current_state: { position: currentPos },
        incoming_change: { position: latestPos },
        conflict_data: {
          item_id: songId,
          field_name: 'position',
          original_value: currentPos,
          conflicting_values: [
            {
              user_id: 'current',
              value: currentPos,
              timestamp: new Date().toISOString(),
            },
            {
              user_id: 'latest',
              value: latestPos,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        resolution_options: [
          {
            id: 'accept-latest-order',
            type: 'accept_theirs',
            description: 'Accept latest song order',
            requires_user_input: false,
          },
          {
            id: 'keep-current-order',
            type: 'accept_mine',
            description: 'Keep current song order',
            requires_user_input: false,
          },
          {
            id: 'merge-order',
            type: 'merge',
            description: 'Manually arrange song order',
            requires_user_input: true,
          },
        ],
        auto_resolvable: false,
        created_at: new Date().toISOString(),
      });
    }
  }
  
  return conflicts;
}

/**
 * Resolve conflict using specified strategy
 */
export async function resolveConflict(
  conflict: EditConflict,
  resolution: ConflictResolution,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (resolution.resolution_type) {
      case 'accept_mine':
        return await acceptCurrentVersion(conflict, tenantId);
        
      case 'accept_theirs':
        return await acceptIncomingVersion(conflict, tenantId);
        
      case 'merge':
        return await mergeConflictingChanges(conflict, resolution.resolved_value, tenantId);
        
      case 'manual':
        return await applyManualResolution(conflict, resolution.resolved_value, tenantId);
        
      default:
        throw new Error(`Unknown resolution type: ${resolution.resolution_type}`);
    }
  } catch (error) {
    console.error('Error resolving conflict:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Accept current version (reject incoming changes)
 */
async function acceptCurrentVersion(
  conflict: EditConflict,
  tenantId: string
): Promise<{ success: boolean; result?: any }> {
  // No database update needed - just keep current state
  toast.success('Kept your changes');
  
  return {
    success: true,
    result: conflict.current_state,
  };
}

/**
 * Accept incoming version (accept their changes)
 */
async function acceptIncomingVersion(
  conflict: EditConflict,
  tenantId: string
): Promise<{ success: boolean; result?: any }> {
  const { conflict_data } = conflict;
  
  if (conflict.type === 'drag_conflict' && conflict_data.item_id) {
    // Update item position
    const { error } = await supabase
      .from('set_list_songs')
      .update({ 
        position: conflict.incoming_change.position,
        updated_at: new Date().toISOString(),
      })
      .eq('song_id', conflict_data.item_id)
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`Failed to update position: ${error.message}`);
    }
  } else if (conflict.type === 'concurrent_edit' && conflict_data.field_name) {
    // Update field value
    const updateData = {
      [conflict_data.field_name]: conflict.incoming_change[conflict_data.field_name],
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('set_lists')
      .update(updateData)
      .eq('id', conflict_data.item_id || '')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`Failed to update field: ${error.message}`);
    }
  }
  
  toast.success('Accepted incoming changes');
  
  return {
    success: true,
    result: conflict.incoming_change,
  };
}

/**
 * Merge conflicting changes
 */
async function mergeConflictingChanges(
  conflict: EditConflict,
  mergedData: any,
  tenantId: string
): Promise<{ success: boolean; result?: any }> {
  if (conflict.type === 'drag_conflict') {
    // Apply merged item positions
    const updates = Object.entries(mergedData).map(([songId, position]) => ({
      song_id: songId,
      position: position as number,
      updated_at: new Date().toISOString(),
    }));
    
    for (const update of updates) {
      const { error } = await supabase
        .from('set_list_songs')
        .update({ 
          position: update.position,
          updated_at: update.updated_at,
        })
        .eq('song_id', update.song_id)
        .eq('tenant_id', tenantId);
      
      if (error) {
        throw new Error(`Failed to update position for ${update.song_id}: ${error.message}`);
      }
    }
  } else {
    // Apply merged field values
    const { error } = await supabase
      .from('set_lists')
      .update({
        ...mergedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conflict.conflict_data.item_id || '')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`Failed to apply merged changes: ${error.message}`);
    }
  }
  
  toast.success('Changes merged successfully');
  
  return {
    success: true,
    result: mergedData,
  };
}

/**
 * Apply manual resolution
 */
async function applyManualResolution(
  conflict: EditConflict,
  resolvedValue: any,
  tenantId: string
): Promise<{ success: boolean; result?: any }> {
  // Similar to merge but with user-provided resolution
  return await mergeConflictingChanges(conflict, resolvedValue, tenantId);
}

/**
 * Create optimistic update for immediate UI feedback
 */
export function createOptimisticUpdate(
  type: 'add' | 'remove' | 'reorder' | 'update',
  targetId: string,
  originalState: any,
  newState: any,
  userId: string
): OptimisticUpdate {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    target_id: targetId,
    original_state: originalState,
    new_state: newState,
    user_id: userId,
    timestamp: new Date().toISOString(),
    is_confirmed: false,
    retry_count: 0,
  };
}

/**
 * Apply optimistic update to local state
 */
export function applyOptimisticUpdate(
  currentState: any,
  update: OptimisticUpdate
): any {
  switch (update.type) {
    case 'add':
      return {
        ...currentState,
        items: [...(currentState.items || []), update.new_state],
      };
      
    case 'remove':
      return {
        ...currentState,
        items: (currentState.items || []).filter((item: any) => item.id !== update.target_id),
      };
      
    case 'reorder':
      return {
        ...currentState,
        items: update.new_state,
      };
      
    case 'update':
      return {
        ...currentState,
        items: (currentState.items || []).map((item: any) =>
          item.id === update.target_id ? { ...item, ...update.new_state } : item
        ),
      };
      
    default:
      return currentState;
  }
}

/**
 * Rollback optimistic update
 */
export function rollbackOptimisticUpdate(
  currentState: any,
  update: OptimisticUpdate
): any {
  switch (update.type) {
    case 'add':
      return {
        ...currentState,
        items: (currentState.items || []).filter((item: any) => item.id !== update.target_id),
      };
      
    case 'remove':
      return {
        ...currentState,
        items: [...(currentState.items || []), update.original_state],
      };
      
    case 'reorder':
    case 'update':
      return {
        ...currentState,
        ...update.original_state,
      };
      
    default:
      return currentState;
  }
}

/**
 * Validate optimistic update against server state
 */
export async function validateOptimisticUpdate(
  update: OptimisticUpdate,
  tenantId: string
): Promise<{ isValid: boolean; serverState?: any; conflicts?: EditConflict[] }> {
  try {
    // Fetch current server state
    const { data: serverState, error } = await supabase
      .from('set_lists')
      .select('*, set_list_songs(*)')
      .eq('id', update.target_id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) {
      throw new Error(`Failed to validate update: ${error.message}`);
    }
    
    // Check if update is still valid
    const conflicts = await detectConflicts(
      update.target_id,
      update.original_state,
      [update as any], // Cast to SetlistChangeHistory for compatibility
      tenantId
    );
    
    return {
      isValid: !conflicts.hasConflict,
      serverState,
      conflicts: conflicts.conflicts,
    };
    
  } catch (error) {
    console.error('Error validating optimistic update:', error);
    return {
      isValid: false,
      conflicts: [],
    };
  }
}

/**
 * Generate change history entry
 */
export function createChangeHistoryEntry(
  setlistId: string,
  userId: string,
  changeType: SetlistChangeHistory['change_type'],
  changeData: any,
  previousState?: any
): SetlistChangeHistory {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    setlist_id: setlistId,
    user_id: userId,
    change_type: changeType,
    change_data: changeData,
    previous_state: previousState,
    metadata: {
      user_agent: navigator.userAgent,
      session_id: `session-${Date.now()}`,
    },
    created_at: new Date().toISOString(),
  };
}

/**
 * Implement undo functionality
 */
export async function undoChange(
  changeId: string,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Get the change to undo
    const { data: change, error: fetchError } = await supabase
      .from('setlist_change_history')
      .select('*')
      .eq('id', changeId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch change: ${fetchError.message}`);
    }
    
    if (!change.previous_state) {
      throw new Error('Cannot undo: no previous state available');
    }
    
    // Apply the previous state
    const { error: updateError } = await supabase
      .from('set_lists')
      .update({
        ...change.previous_state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', change.setlist_id)
      .eq('tenant_id', tenantId);
    
    if (updateError) {
      throw new Error(`Failed to undo change: ${updateError.message}`);
    }
    
    toast.success('Change undone successfully');
    
    return {
      success: true,
      result: change.previous_state,
    };
    
  } catch (error) {
    console.error('Error undoing change:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Implement redo functionality
 */
export async function redoChange(
  changeId: string,
  tenantId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Get the change to redo
    const { data: change, error: fetchError } = await supabase
      .from('setlist_change_history')
      .select('*')
      .eq('id', changeId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch change: ${fetchError.message}`);
    }
    
    // Apply the change data
    const { error: updateError } = await supabase
      .from('set_lists')
      .update({
        ...change.change_data.new_value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', change.setlist_id)
      .eq('tenant_id', tenantId);
    
    if (updateError) {
      throw new Error(`Failed to redo change: ${updateError.message}`);
    }
    
    toast.success('Change redone successfully');
    
    return {
      success: true,
      result: change.change_data.new_value,
    };
    
  } catch (error) {
    console.error('Error redoing change:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}