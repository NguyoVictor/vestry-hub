/**
 * Optimistic Locking Utilities for Song Library UI Revamp
 * 
 * Provides optimistic locking mechanisms for concurrent editing:
 * - Version-based conflict detection
 * - Lock acquisition and release
 * - Conflict resolution strategies
 * - Change validation
 * 
 * Requirements: 14.3
 */

import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';

import type { 
  Setlist, 
  SetlistItem, 
  EditConflict,
  SetlistChange 
} from '@/types/song-library';

interface OptimisticLock {
  id: string;
  resource_type: 'setlist' | 'setlist_item';
  resource_id: string;
  user_id: string;
  version: number;
  acquired_at: string;
  expires_at: string;
  is_active: boolean;
}

interface LockResult {
  success: boolean;
  lock?: OptimisticLock;
  conflict?: EditConflict;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  conflicts: EditConflict[];
  currentVersion: number;
}

/**
 * Generate a unique lock ID
 */
function generateLockId(): string {
  return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate lock expiration time (default: 5 minutes)
 */
function calculateExpiration(durationMs: number = 5 * 60 * 1000): string {
  return new Date(Date.now() + durationMs).toISOString();
}

/**
 * Acquire optimistic lock for a resource
 */
export async function acquireLock(
  resourceType: 'setlist' | 'setlist_item',
  resourceId: string,
  userId: string,
  tenantId: string,
  durationMs?: number
): Promise<LockResult> {
  try {
    // Check for existing active locks
    const { data: existingLocks, error: checkError } = await supabase
      .from('optimistic_locks')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (checkError) {
      return { success: false, error: checkError.message };
    }

    // If there's an active lock by another user, return conflict
    const conflictingLock = existingLocks?.find(lock => lock.user_id !== userId);
    if (conflictingLock) {
      const conflict: EditConflict = {
        id: generateLockId(),
        setlist_id: resourceType === 'setlist' ? resourceId : '',
        conflict_type: 'concurrent_edit',
        description: `Resource is currently being edited by another user`,
        conflicting_users: [conflictingLock.user_id, userId],
        timestamp: new Date().toISOString(),
        current_state: null,
        incoming_change: null,
        resolution_status: 'pending',
      };

      return { success: false, conflict };
    }

    // Get current version of the resource
    let currentVersion = 1;
    if (resourceType === 'setlist') {
      const { data: setlist } = await supabase
        .from(TABLES.SET_LISTS)
        .select('version')
        .eq('id', resourceId)
        .eq(COLS.TENANT_ID, tenantId)
        .single();
      
      currentVersion = setlist?.version || 1;
    }

    // Create or update lock
    const lockData: Partial<OptimisticLock> = {
      id: generateLockId(),
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      version: currentVersion,
      acquired_at: new Date().toISOString(),
      expires_at: calculateExpiration(durationMs),
      is_active: true,
    };

    const { data: lock, error: lockError } = await supabase
      .from('optimistic_locks')
      .upsert(lockData)
      .select()
      .single();

    if (lockError) {
      return { success: false, error: lockError.message };
    }

    return { success: true, lock: lock as OptimisticLock };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Release optimistic lock
 */
export async function releaseLock(
  lockId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('optimistic_locks')
      .update({ 
        is_active: false,
        released_at: new Date().toISOString()
      })
      .eq('id', lockId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate change against current state and detect conflicts
 */
export async function validateChange(
  resourceType: 'setlist' | 'setlist_item',
  resourceId: string,
  expectedVersion: number,
  change: SetlistChange,
  tenantId: string
): Promise<ValidationResult> {
  try {
    const conflicts: EditConflict[] = [];
    let currentVersion = expectedVersion;

    if (resourceType === 'setlist') {
      // Get current setlist state
      const { data: currentSetlist, error } = await supabase
        .from(TABLES.SET_LISTS)
        .select(`
          *,
          set_list_songs (
            id,
            song_id,
            position,
            key_override,
            notes,
            duration_override
          )
        `)
        .eq('id', resourceId)
        .eq(COLS.TENANT_ID, tenantId)
        .single();

      if (error) {
        return { isValid: false, conflicts: [], currentVersion };
      }

      currentVersion = currentSetlist.version || 1;

      // Check if version has changed (indicating concurrent edits)
      if (currentVersion > expectedVersion) {
        // Detect specific conflicts
        const conflictType = detectConflictType(change, currentSetlist);
        
        const conflict: EditConflict = {
          id: generateLockId(),
          setlist_id: resourceId,
          conflict_type: conflictType,
          description: getConflictDescription(conflictType, change),
          conflicting_users: [change.user_id], // Would need to track other users
          timestamp: new Date().toISOString(),
          current_state: currentSetlist,
          incoming_change: change.data,
          resolution_status: 'pending',
        };

        conflicts.push(conflict);
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      currentVersion,
    };

  } catch (error) {
    console.error('Error validating change:', error);
    return { isValid: false, conflicts: [], currentVersion: expectedVersion };
  }
}

/**
 * Detect the type of conflict based on the change and current state
 */
function detectConflictType(
  change: SetlistChange, 
  currentState: any
): EditConflict['conflict_type'] {
  switch (change.type) {
    case 'song_add':
    case 'song_remove':
      return change.type;
    case 'setlist_reorder':
      return 'setlist_reorder';
    case 'setlist_edit':
      return 'setlist_edit';
    default:
      return 'concurrent_edit';
  }
}

/**
 * Generate human-readable conflict description
 */
function getConflictDescription(
  conflictType: EditConflict['conflict_type'],
  change: SetlistChange
): string {
  switch (conflictType) {
    case 'song_add':
      return `Conflict adding song: Another user may have modified the setlist`;
    case 'song_remove':
      return `Conflict removing song: Another user may have modified the setlist`;
    case 'setlist_reorder':
      return `Conflict reordering songs: Another user may have changed the song order`;
    case 'setlist_edit':
      return `Conflict editing setlist: Another user may have modified setlist properties`;
    case 'concurrent_edit':
      return `Concurrent edit detected: Multiple users are editing simultaneously`;
    default:
      return `Unknown conflict type: ${conflictType}`;
  }
}

/**
 * Clean up expired locks (should be called periodically)
 */
export async function cleanupExpiredLocks(): Promise<{ success: boolean; cleaned: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('optimistic_locks')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)
      .select('id');

    if (error) {
      return { success: false, cleaned: 0, error: error.message };
    }

    return { success: true, cleaned: data?.length || 0 };

  } catch (error) {
    return { 
      success: false, 
      cleaned: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if user has active lock on resource
 */
export async function hasActiveLock(
  resourceType: 'setlist' | 'setlist_item',
  resourceId: string,
  userId: string
): Promise<{ hasLock: boolean; lock?: OptimisticLock; error?: string }> {
  try {
    const { data: locks, error } = await supabase
      .from('optimistic_locks')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) {
      return { hasLock: false, error: error.message };
    }

    const lock = locks?.[0] as OptimisticLock;
    return { hasLock: !!lock, lock };

  } catch (error) {
    return { 
      hasLock: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Extend lock expiration
 */
export async function extendLock(
  lockId: string,
  userId: string,
  extensionMs: number = 5 * 60 * 1000
): Promise<{ success: boolean; error?: string }> {
  try {
    const newExpiration = calculateExpiration(extensionMs);
    
    const { error } = await supabase
      .from('optimistic_locks')
      .update({ expires_at: newExpiration })
      .eq('id', lockId)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}