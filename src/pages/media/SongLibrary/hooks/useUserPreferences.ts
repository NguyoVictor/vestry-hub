/**
 * useUserPreferences Hook for Song Library UI Revamp
 * 
 * Manages user preferences for:
 * - Theme selection (light/dark)
 * - View mode (grid/list)
 * - Transposition preferences per song
 * - Filter presets
 * - Recent searches
 * 
 * This is a placeholder implementation - will be enhanced in subsequent tasks.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import type { UserSongPreferences } from '@/types/song-library';

// Default preferences
const DEFAULT_PREFERENCES: Partial<UserSongPreferences> = {
  theme: 'light',
  view_mode: 'grid',
  transposition_preferences: {},
  filter_presets: [],
  recent_searches: [],
};

export function useUserPreferences() {
  const { tenantId, user } = useChurch();
  const queryClient = useQueryClient();
  const [localPreferences, setLocalPreferences] = useState(DEFAULT_PREFERENCES);

  // Get current user ID from auth context
  const userId = user?.id;

  // Fetch user preferences from database
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-song-preferences', userId, tenantId],
    queryFn: async (): Promise<UserSongPreferences | null> => {
      if (!userId || !tenantId) return null;

      const { data, error } = await supabase
        .from('user_song_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is OK
        throw new Error(`Failed to fetch preferences: ${error.message}`);
      }

      return data;
    },
    enabled: !!userId && !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<UserSongPreferences>) => {
      if (!userId || !tenantId) throw new Error('User or tenant not available');

      const payload = {
        user_id: userId,
        tenant_id: tenantId,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_song_preferences')
        .upsert(payload, { onConflict: 'user_id,tenant_id' })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-song-preferences', userId, tenantId], data);
    },
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('song-library-preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved preferences:', error);
      }
    }
  }, []);

  // Merge database and local preferences
  const mergedPreferences = {
    ...DEFAULT_PREFERENCES,
    ...localPreferences,
    ...preferences,
  };

  // Update preferences function
  const updatePreferences = useCallback(async (updates: Partial<UserSongPreferences>) => {
    // Update local state immediately
    setLocalPreferences(prev => ({ ...prev, ...updates }));
    
    // Save to localStorage
    const newLocalPrefs = { ...localPreferences, ...updates };
    localStorage.setItem('song-library-preferences', JSON.stringify(newLocalPrefs));

    // Update database (async)
    try {
      await updatePreferencesMutation.mutateAsync(updates);
    } catch (error) {
      console.error('Failed to save preferences to database:', error);
      // Could show a toast notification here
    }
  }, [localPreferences, updatePreferencesMutation]);

  // Add recent search
  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    const currentSearches = mergedPreferences.recent_searches || [];
    const updated = [query, ...currentSearches.filter(s => s !== query)].slice(0, 5);
    
    updatePreferences({ recent_searches: updated });
  }, [mergedPreferences.recent_searches, updatePreferences]);

  // Add filter preset
  const addFilterPreset = useCallback((name: string, filters: any) => {
    const currentPresets = mergedPreferences.filter_presets || [];
    const newPreset = {
      id: `preset-${Date.now()}`,
      name,
      filters,
    };
    
    const updated = [...currentPresets, newPreset];
    updatePreferences({ filter_presets: updated });
  }, [mergedPreferences.filter_presets, updatePreferences]);

  // Remove filter preset
  const removeFilterPreset = useCallback((presetId: string) => {
    const currentPresets = mergedPreferences.filter_presets || [];
    const updated = currentPresets.filter(p => p.id !== presetId);
    
    updatePreferences({ filter_presets: updated });
  }, [mergedPreferences.filter_presets, updatePreferences]);

  // Update transposition preference for a specific song
  const updateTranspositionPreference = useCallback((songId: string, semitones: number) => {
    const currentPrefs = mergedPreferences.transposition_preferences || {};
    const updated = { ...currentPrefs };
    
    if (semitones === 0) {
      // Remove preference if back to original key
      delete updated[songId];
    } else {
      updated[songId] = semitones;
    }
    
    updatePreferences({ transposition_preferences: updated });
  }, [mergedPreferences.transposition_preferences, updatePreferences]);

  // Get transposition preference for a specific song
  const getTranspositionPreference = useCallback((songId: string): number => {
    return mergedPreferences.transposition_preferences?.[songId] || 0;
  }, [mergedPreferences.transposition_preferences]);

  // Clear all transposition preferences
  const clearTranspositionPreferences = useCallback(() => {
    updatePreferences({ transposition_preferences: {} });
  }, [updatePreferences]);

  return {
    preferences: mergedPreferences,
    isLoading,
    updatePreferences,
    addRecentSearch,
    addFilterPreset,
    removeFilterPreset,
    updateTranspositionPreference,
    getTranspositionPreference,
    clearTranspositionPreferences,
  };
}

export default useUserPreferences;