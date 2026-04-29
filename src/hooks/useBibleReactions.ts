import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';

interface VerseReaction {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  reaction: string;
  created_at: string;
}

/**
 * useBibleReactions — Manage verse reactions with Realtime updates
 * Provides reactions query, reaction counts, toggle mutation, and live subscription
 */
export function useBibleReactions(
  tenantId: string,
  memberId: string,
  bookId: string,
  chapter: number
) {
  const queryClient = useQueryClient();
  const queryKey = ['bible-reactions', tenantId, bookId, chapter];

  // Fetch reactions for current chapter (tenant-wide)
  const { data: reactions = [], isLoading } = useQuery<VerseReaction[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VERSE_REACTIONS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.BOOK_ID, bookId)
        .eq('chapter', chapter);

      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
    enabled: !!tenantId && !!bookId,
  });

  // Compute reaction counts per verse
  const reactionCounts: Record<number, Record<string, number>> = {};
  reactions.forEach(r => {
    if (!reactionCounts[r.verse_number]) {
      reactionCounts[r.verse_number] = {};
    }
    reactionCounts[r.verse_number][r.reaction] =
      (reactionCounts[r.verse_number][r.reaction] || 0) + 1;
  });

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!tenantId || !bookId) return;

    const channel = supabase
      .channel(`verse_reactions:${tenantId}:${bookId}:${chapter}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.VERSE_REACTIONS,
          filter: `tenant_id=eq.${tenantId},book_id=eq.${bookId},chapter=eq.${chapter}`,
        },
        (payload) => {
          // Update query cache without full re-fetch
          queryClient.setQueryData<VerseReaction[]>(queryKey, (old = []) => {
            if (payload.eventType === 'INSERT') {
              return [...old, payload.new as VerseReaction];
            } else if (payload.eventType === 'DELETE') {
              return old.filter(r => r.id !== (payload.old as any).id);
            }
            return old;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, bookId, chapter, queryClient, queryKey]);

  // Toggle reaction mutation
  const toggleReaction = useMutation({
    mutationFn: async ({ verseNumber, reaction }: { verseNumber: number; reaction: string }) => {
      const existing = reactions.find(
        r => r.member_id === memberId && r.verse_number === verseNumber && r.reaction === reaction
      );

      if (existing) {
        // Delete reaction
        const { error } = await supabase
          .from(TABLES.VERSE_REACTIONS)
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'delete', id: existing.id };
      } else {
        // Insert reaction
        const { error } = await supabase
          .from(TABLES.VERSE_REACTIONS)
          .insert({
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BOOK_ID]: bookId,
            chapter,
            [COLS.VERSE_NUMBER]: verseNumber,
            [COLS.REACTION]: reaction,
          });

        if (error) throw error;
        return { action: 'insert', verseNumber, reaction };
      }
    },
    onMutate: async ({ verseNumber, reaction }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousReactions = queryClient.getQueryData<VerseReaction[]>(queryKey);

      queryClient.setQueryData<VerseReaction[]>(queryKey, (old = []) => {
        const existing = old.find(
          r => r.member_id === memberId && r.verse_number === verseNumber && r.reaction === reaction
        );

        if (existing) {
          return old.filter(r => r.id !== existing.id);
        } else {
          return [
            ...old,
            {
              id: `temp-${Date.now()}`,
              tenant_id: tenantId,
              member_id: memberId,
              book_id: bookId,
              chapter,
              verse_number: verseNumber,
              reaction,
              created_at: new Date().toISOString(),
            },
          ];
        }
      });

      return { previousReactions };
    },
    onError: (error, variables, context) => {
      if (context?.previousReactions) {
        queryClient.setQueryData(queryKey, context.previousReactions);
      }
      toast.error('Failed to update reaction');
      console.error('Reaction mutation error:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    reactions,
    reactionCounts,
    isLoading,
    toggleReaction: toggleReaction.mutate,
  };
}
