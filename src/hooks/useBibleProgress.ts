import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';

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

  // Fetch all progress records for member
  const { data: progress = [], isLoading } = useQuery<ReadingProgress[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.READING_PROGRESS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_ID, memberId);

      if (error) throw error;
      return data || [];
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
      const { error } = await supabase
        .from(TABLES.READING_PROGRESS)
        .upsert(
          {
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BOOK_ID]: bookId,
            chapter,
          },
          {
            onConflict: `${COLS.TENANT_ID},${COLS.MEMBER_ID},${COLS.BOOK_ID},chapter`,
          }
        );

      if (error) throw error;
      return { bookId, chapter };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error, variables) => {
      // Silent retry once
      console.warn('Progress mark failed, retrying:', error);
      setTimeout(() => {
        markChapterRead.mutate(variables);
      }, 1000);
    },
    retry: 1,
  });

  return {
    progress,
    chaptersRead,
    percentComplete,
    isLoading,
    markChapterRead: markChapterRead.mutate,
  };
}
