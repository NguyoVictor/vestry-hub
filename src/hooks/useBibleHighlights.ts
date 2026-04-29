import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';

interface VerseHighlight {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  color: string;
  created_at: string;
}

/**
 * useBibleHighlights — Manage verse highlights for the current chapter
 * Provides highlights query and toggle mutation with optimistic updates
 */
export function useBibleHighlights(
  tenantId: string,
  memberId: string,
  bookId: string,
  chapter: number
) {
  const queryClient = useQueryClient();
  const queryKey = ['bible-highlights', tenantId, memberId, bookId, chapter];

  // Fetch highlights for current chapter
  const { data: highlights = [], isLoading } = useQuery<VerseHighlight[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VERSE_HIGHLIGHTS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_ID, memberId)
        .eq(COLS.BOOK_ID, bookId)
        .eq('chapter', chapter);

      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
    enabled: !!tenantId && !!memberId && !!bookId,
  });

  // Toggle highlight mutation
  const toggleHighlight = useMutation({
    mutationFn: async ({ verseNumber, color }: { verseNumber: number; color: string }) => {
      // Check if highlight exists with same color
      const existing = highlights.find(
        h => h.verse_number === verseNumber && h.color === color
      );

      if (existing) {
        // Delete existing highlight
        const { error } = await supabase
          .from(TABLES.VERSE_HIGHLIGHTS)
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'delete', verseNumber, color };
      } else {
        // Delete any existing highlight for this verse (different color)
        const existingAny = highlights.find(h => h.verse_number === verseNumber);
        if (existingAny) {
          await supabase
            .from(TABLES.VERSE_HIGHLIGHTS)
            .delete()
            .eq('id', existingAny.id);
        }

        // Insert new highlight
        const { error } = await supabase
          .from(TABLES.VERSE_HIGHLIGHTS)
          .insert({
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BOOK_ID]: bookId,
            chapter,
            [COLS.VERSE_NUMBER]: verseNumber,
            [COLS.COLOR]: color,
          });

        if (error) throw error;
        return { action: 'insert', verseNumber, color };
      }
    },
    onMutate: async ({ verseNumber, color }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousHighlights = queryClient.getQueryData<VerseHighlight[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<VerseHighlight[]>(queryKey, (old = []) => {
        const existing = old.find(h => h.verse_number === verseNumber && h.color === color);
        
        if (existing) {
          // Remove highlight
          return old.filter(h => h.id !== existing.id);
        } else {
          // Remove any existing highlight for this verse, then add new one
          const filtered = old.filter(h => h.verse_number !== verseNumber);
          return [
            ...filtered,
            {
              id: `temp-${Date.now()}`,
              tenant_id: tenantId,
              member_id: memberId,
              book_id: bookId,
              chapter,
              verse_number: verseNumber,
              color,
              created_at: new Date().toISOString(),
            },
          ];
        }
      });

      return { previousHighlights };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousHighlights) {
        queryClient.setQueryData(queryKey, context.previousHighlights);
      }
      toast.error('Failed to save highlight');
      console.error('Highlight mutation error:', error);
    },
    onSuccess: () => {
      // Invalidate to sync with server
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    highlights,
    isLoading,
    toggleHighlight: toggleHighlight.mutate,
  };
}
