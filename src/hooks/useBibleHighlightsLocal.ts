import { useState, useEffect } from 'react';
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
 * Local storage version of useBibleHighlights
 * Bypasses Supabase and uses localStorage instead
 */
export function useBibleHighlightsLocal(tenantId: string, memberId: string, bookId: string, chapter: number) {
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load highlights from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bible_highlights_${tenantId}_${memberId}`);
      if (stored) {
        const allHighlights = JSON.parse(stored);
        // Filter for current book and chapter
        const currentHighlights = allHighlights.filter(
          (h: VerseHighlight) => h.book_id === bookId && h.chapter === chapter
        );
        setHighlights(currentHighlights);
      }
    } catch (error) {
      console.error('Error loading highlights from localStorage:', error);
    }
  }, [tenantId, memberId, bookId, chapter]);

  // Save highlights to localStorage
  const saveHighlights = (newHighlights: VerseHighlight[]) => {
    try {
      // Get all highlights from storage
      const stored = localStorage.getItem(`bible_highlights_${tenantId}_${memberId}`);
      const allHighlights = stored ? JSON.parse(stored) : [];
      
      // Remove old highlights for this book/chapter
      const otherHighlights = allHighlights.filter(
        (h: VerseHighlight) => !(h.book_id === bookId && h.chapter === chapter)
      );
      
      // Add new highlights
      const updatedHighlights = [...otherHighlights, ...newHighlights];
      
      localStorage.setItem(`bible_highlights_${tenantId}_${memberId}`, JSON.stringify(updatedHighlights));
      setHighlights(newHighlights);
    } catch (error) {
      console.error('Error saving highlights to localStorage:', error);
    }
  };

  // Toggle highlight
  const toggleHighlight = (verseNumber: number, color: string = 'yellow') => {
    const existing = highlights.find(h => h.verse_number === verseNumber);
    
    if (existing) {
      // Remove highlight
      const newHighlights = highlights.filter(h => h.id !== existing.id);
      saveHighlights(newHighlights);
      toast.success('Highlight removed');
    } else {
      // Add highlight
      const newHighlight: VerseHighlight = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        member_id: memberId,
        book_id: bookId,
        chapter: chapter,
        verse_number: verseNumber,
        color: color,
        created_at: new Date().toISOString(),
      };
      const newHighlights = [...highlights, newHighlight];
      saveHighlights(newHighlights);
      toast.success('Verse highlighted');
    }
  };

  return {
    highlights,
    isLoading,
    toggleHighlight,
  };
}