import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { TABLES, COLS } from '../lib/schema';
import { toast } from 'sonner';

interface VerseBookmark {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  verse_text: string;
  translation: string;
  created_at: string;
}

interface BookmarkVerse {
  bookId: string;
  chapter: number;
  verseNumber: number;
  verseText: string;
  translation: string;
}

/**
 * useBibleBookmarks — Manage verse bookmarks for the member
 * Provides bookmarks query, toggle mutation, and isBookmarked helper
 */
export function useBibleBookmarks(tenantId: string, memberId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['bible-bookmarks', tenantId, memberId];

  // Fetch all bookmarks for member
  const { data: bookmarks = [], isLoading } = useQuery<VerseBookmark[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VERSE_BOOKMARKS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_ID, memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
    enabled: !!tenantId && !!memberId,
  });

  // Check if a verse is bookmarked
  const isBookmarked = (bookId: string, chapter: number, verseNumber: number): boolean => {
    return bookmarks.some(
      b => b.book_id === bookId && b.chapter === chapter && b.verse_number === verseNumber
    );
  };

  // Toggle bookmark mutation
  const toggleBookmark = useMutation({
    mutationFn: async (verse: BookmarkVerse) => {
      const existing = bookmarks.find(
        b =>
          b.book_id === verse.bookId &&
          b.chapter === verse.chapter &&
          b.verse_number === verse.verseNumber
      );

      if (existing) {
        // Delete bookmark
        const { error } = await supabase
          .from(TABLES.VERSE_BOOKMARKS)
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'delete', id: existing.id };
      } else {
        // Insert bookmark
        const { error } = await supabase
          .from(TABLES.VERSE_BOOKMARKS)
          .insert({
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BOOK_ID]: verse.bookId,
            [COLS.CHAPTER]: verse.chapter,
            [COLS.VERSE_NUMBER]: verse.verseNumber,
            [COLS.VERSE_TEXT]: verse.verseText,
            [COLS.TRANSLATION]: verse.translation,
          });

        if (error) throw error;
        return { action: 'insert', verse };
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error('Failed to save bookmark');
      console.error('Bookmark mutation error:', error);
      // Invalidate queries to reset to server state
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    bookmarks,
    isLoading,
    isBookmarked,
    toggleBookmark: toggleBookmark.mutate,
  };
}
