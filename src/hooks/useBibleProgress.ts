import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { TABLES, COLS } from '../lib/schema';

interface ReadingProgress {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  read_at: string;
}

/**
 * useBibleProgress — Track reading progress across the Bible
 * Provides progress query, derived stats, and mark chapter read mutation
 */
export function useBibleProgress(tenantId: string, memberId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['bible-progress', tenantId, memberId];
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  // Fetch all progress records for member
  const { data: progress = [], isLoading } = useQuery<ReadingProgress[]>({
    queryKey,
    queryFn: async () => {
      // Guard: Don't proceed if memberId is undefined
      if (!memberId || memberId === undefined) {
        console.warn('useBibleProgress: memberId is undefined, returning empty progress');
        return [];
      }

      const { data, error } = await supabase
        .from(TABLES.READING_PROGRESS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_ID, memberId);

      if (error) throw error;
      return (data || []) as ReadingProgress[];
    },
    staleTime: 300_000,
    enabled: !!tenantId && !!memberId,
  });

  // Derive stats
  const chaptersRead = progress.length;
  const percentComplete = Math.round((chaptersRead / 1189) * 100);

  // Mark chapter as read mutation
  const markChapterRead = useMutation({
    mutationFn: async ({ bookId, chapter }: { bookId: string; chapter: number }) => {
      // Additional guard at mutation level
      if (!memberId || memberId === undefined) {
        console.warn('useBibleProgress: memberId is undefined, skipping progress save');
        throw new Error('Member ID is required for progress tracking');
      }

      const { error } = await supabase
        .from(TABLES.READING_PROGRESS)
        .upsert(
          {
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BOOK_ID]: bookId,
            [COLS.CHAPTER]: chapter,
          },
          {
            onConflict: `${COLS.TENANT_ID},${COLS.MEMBER_ID},${COLS.BOOK_ID},${COLS.CHAPTER}`,
          }
        );

      if (error) throw error;
      return { bookId, chapter };
    },
    onSuccess: () => {
      retryCount.current = 0; // Reset retry count on success
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any, variables) => {
      // BUG 2 FIX: Handle different error types and prevent infinite retry
      
      // Schema/column errors - NOT retryable (code bugs)
      if (error.code === 'PGRST204' || error.code === 'PGRST116' || 
          error.message?.includes('column') || 
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')) {
        console.error('Bible progress: schema error, not retrying:', error.message);
        retryCount.current = 0;
        return;
      }

      // Authentication/permission errors - NOT retryable
      if (error.code === 'PGRST301' || error.code === 'PGRST302' || 
          error.message?.includes('permission') ||
          error.message?.includes('unauthorized')) {
        console.error('Bible progress: auth error, not retrying:', error.message);
        retryCount.current = 0;
        return;
      }

      // Max retries reached
      if (retryCount.current >= MAX_RETRIES) {
        console.error('Bible progress: max retries reached, giving up');
        retryCount.current = 0;
        return;
      }

      // Only retry for network/temporary errors
      if (error.message?.includes('network') || 
          error.message?.includes('timeout') ||
          error.message?.includes('fetch')) {
        retryCount.current++;
        console.warn(`Progress mark failed, retrying (${retryCount.current}/${MAX_RETRIES}):`, error);
        
        setTimeout(() => {
          markChapterRead.mutate(variables);
        }, 2000 * retryCount.current); // Exponential backoff
      } else {
        // Unknown error type - don't retry to be safe
        console.error('Bible progress: unknown error, not retrying:', error);
        retryCount.current = 0;
      }
    },
    retry: false, // Disable built-in retry, we handle it manually
  });

  return {
    progress,
    chaptersRead,
    percentComplete,
    isLoading,
    markChapterRead: (params: { bookId: string; chapter: number }) => {
      // Prevent mutation if memberId is undefined
      if (!memberId || memberId === undefined) {
        console.warn('useBibleProgress: Cannot mark chapter read - memberId is undefined');
        return;
      }
      markChapterRead.mutate(params);
    },
  };
}
