/**
 * Cover Art Hook
 * 
 * Manages cover art operations including upload, update, and removal.
 * Integrates with Supabase Storage and song database updates.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { TABLES } from '@/lib/schema';
import { toast } from 'sonner';

import type { CoverArtUploadResult } from '../components/CoverArt/types';
import type { CoverArtColors } from '@/types/song-library';

interface UseCoverArtReturn {
  uploadCoverArt: (songId: string, result: CoverArtUploadResult) => Promise<void>;
  removeCoverArt: (songId: string) => Promise<void>;
  updateCoverArtColors: (songId: string, colors: CoverArtColors) => Promise<void>;
  isUploading: boolean;
  isRemoving: boolean;
  isUpdating: boolean;
}

export function useCoverArt(): UseCoverArtReturn {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Upload cover art mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ songId, result }: { songId: string; result: CoverArtUploadResult }) => {
      const { error } = await supabase
        .from(TABLES.SONGS)
        .update({
          cover_art_url: result.originalUrl,
          cover_art_colors: result.colors,
          updated_at: new Date().toISOString()
        })
        .eq('id', songId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to update song: ${error.message}`);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate songs query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['songs', tenantId] });
      toast.success('Cover art uploaded successfully');
    },
    onError: (error) => {
      console.error('Cover art upload error:', error);
      toast.error(`Failed to upload cover art: ${error.message}`);
    }
  });

  // Remove cover art mutation
  const removeMutation = useMutation({
    mutationFn: async (songId: string) => {
      // First get the current cover art URL to delete from storage
      const { data: song, error: fetchError } = await supabase
        .from(TABLES.SONGS)
        .select('cover_art_url')
        .eq('id', songId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch song: ${fetchError.message}`);
      }

      // Delete from storage if there's a cover art URL
      if (song?.cover_art_url) {
        try {
          // Extract the path from the URL
          const url = new URL(song.cover_art_url);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'song-cover-art');
          
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            
            // Delete the file from storage
            const { error: deleteError } = await supabase.storage
              .from('song-cover-art')
              .remove([filePath]);

            if (deleteError) {
              console.warn('Failed to delete file from storage:', deleteError);
              // Don't throw here, continue with database update
            }

            // Also try to delete associated size variants
            const baseFileName = filePath.split('/').pop()?.split('.')[0];
            if (baseFileName) {
              const sizeVariants = ['64', '128', '256', '512'].map(size => 
                `${tenantId}/sizes/${baseFileName}-${size}.webp`
              );
              
              await supabase.storage
                .from('song-cover-art')
                .remove(sizeVariants);
            }
          }
        } catch (storageError) {
          console.warn('Storage cleanup error:', storageError);
          // Continue with database update even if storage cleanup fails
        }
      }

      // Update database to remove cover art references
      const { error: updateError } = await supabase
        .from(TABLES.SONGS)
        .update({
          cover_art_url: null,
          cover_art_colors: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', songId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw new Error(`Failed to update song: ${updateError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', tenantId] });
      toast.success('Cover art removed successfully');
    },
    onError: (error) => {
      console.error('Cover art removal error:', error);
      toast.error(`Failed to remove cover art: ${error.message}`);
    }
  });

  // Update cover art colors mutation (for color extraction updates)
  const updateColorsMutation = useMutation({
    mutationFn: async ({ songId, colors }: { songId: string; colors: CoverArtColors }) => {
      const { error } = await supabase
        .from(TABLES.SONGS)
        .update({
          cover_art_colors: colors,
          updated_at: new Date().toISOString()
        })
        .eq('id', songId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to update colors: ${error.message}`);
      }

      return colors;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', tenantId] });
    },
    onError: (error) => {
      console.error('Color update error:', error);
      toast.error(`Failed to update colors: ${error.message}`);
    }
  });

  // Upload cover art
  const uploadCoverArt = useCallback(async (songId: string, result: CoverArtUploadResult) => {
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ songId, result });
    } finally {
      setIsUploading(false);
    }
  }, [uploadMutation]);

  // Remove cover art
  const removeCoverArt = useCallback(async (songId: string) => {
    setIsRemoving(true);
    try {
      await removeMutation.mutateAsync(songId);
    } finally {
      setIsRemoving(false);
    }
  }, [removeMutation]);

  // Update cover art colors
  const updateCoverArtColors = useCallback(async (songId: string, colors: CoverArtColors) => {
    setIsUpdating(true);
    try {
      await updateColorsMutation.mutateAsync({ songId, colors });
    } finally {
      setIsUpdating(false);
    }
  }, [updateColorsMutation]);

  return {
    uploadCoverArt,
    removeCoverArt,
    updateCoverArtColors,
    isUploading: isUploading || uploadMutation.isPending,
    isRemoving: isRemoving || removeMutation.isPending,
    isUpdating: isUpdating || updateColorsMutation.isPending,
  };
}