import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';

interface VerseNote {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number: number;
  content: string;
  updated_at: string;
}

/**
 * useBibleNotes — Manage private verse notes for the member
 * Provides notes query, save mutation, and hasNote helper
 */
export function useBibleNotes(
  tenantId: string,
  memberId: string,
  bookId: string,
  chapter: number
) {
  const queryClient = useQueryClient();
  const queryKey = ['bible-notes', tenantId, memberId, bookId, chapter];

  // Fetch notes for current chapter
  const { data: notes = [], isLoading } = useQuery<VerseNote[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.VERSE_NOTES)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_ID, memberId)
        .eq(COLS.BOOK_ID, bookId)
        .eq(COLS.CHAPTER, chapter);

      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
    enabled: !!tenantId && !!memberId && !!bookId,
  });

  // Check if a verse has a note
  const hasNote = (verseNumber: number): boolean => {
    return notes.some(n => n.verse_number === verseNumber);
  };

  // Get note content for a verse
  const getNote = (verseNumber: number): string | null => {
    const note = notes.find(n => n.verse_number === verseNumber);
    return note ? note.content : null;
  };

  // Save note mutation (upsert)
  const saveNote = useMutation({
    mutationFn: async ({ verseNumber, content }: { verseNumber: number; content: string }) => {
      const existing = notes.find(n => n.verse_number === verseNumber);

      if (existing) {
        // Update existing note
        const { error } = await supabase
          .from(TABLES.VERSE_NOTES)
          .update({
            [COLS.CONTENT]: content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'update', verseNumber, content };
      } else {
        // Insert new note
        const { error } = await supabase
          .from(TABLES.VERSE_NOTES)
          .insert({
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BOOK_ID]: bookId,
            [COLS.CHAPTER]: chapter,
            [COLS.VERSE_NUMBER]: verseNumber,
            [COLS.CONTENT]: content,
          });

        if (error) throw error;
        return { action: 'insert', verseNumber, content };
      }
    },
    onMutate: async ({ verseNumber, content }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotes = queryClient.getQueryData<VerseNote[]>(queryKey);

      queryClient.setQueryData<VerseNote[]>(queryKey, (old = []) => {
        const existing = old.find(n => n.verse_number === verseNumber);

        if (existing) {
          return old.map(n =>
            n.verse_number === verseNumber
              ? { ...n, content, updated_at: new Date().toISOString() }
              : n
          );
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
              content,
              updated_at: new Date().toISOString(),
            },
          ];
        }
      });

      return { previousNotes };
    },
    onError: (error, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(queryKey, context.previousNotes);
      }
      toast.error('Failed to save note');
      console.error('Note mutation error:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notes,
    isLoading,
    hasNote,
    getNote,
    saveNote: saveNote.mutate,
  };
}
