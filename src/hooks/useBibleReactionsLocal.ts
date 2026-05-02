import { useState, useEffect } from 'react';
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
 * Local storage version of useBibleReactions
 * Bypasses Supabase and uses localStorage instead
 */
export function useBibleReactionsLocal(tenantId: string, memberId: string, bookId: string, chapter: number) {
  const [reactions, setReactions] = useState<VerseReaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load reactions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bible_reactions_${tenantId}_${memberId}`);
      if (stored) {
        const allReactions = JSON.parse(stored);
        // Filter for current book and chapter
        const currentReactions = allReactions.filter(
          (r: VerseReaction) => r.book_id === bookId && r.chapter === chapter
        );
        setReactions(currentReactions);
      }
    } catch (error) {
      console.error('Error loading reactions from localStorage:', error);
    }
  }, [tenantId, memberId, bookId, chapter]);

  // Calculate reaction counts
  const reactionCounts = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.verse_number]) {
      acc[reaction.verse_number] = {};
    }
    if (!acc[reaction.verse_number][reaction.reaction]) {
      acc[reaction.verse_number][reaction.reaction] = 0;
    }
    acc[reaction.verse_number][reaction.reaction]++;
    return acc;
  }, {} as Record<number, Record<string, number>>);

  // Save reactions to localStorage
  const saveReactions = (newReactions: VerseReaction[]) => {
    try {
      // Get all reactions from storage
      const stored = localStorage.getItem(`bible_reactions_${tenantId}_${memberId}`);
      const allReactions = stored ? JSON.parse(stored) : [];
      
      // Remove old reactions for this book/chapter
      const otherReactions = allReactions.filter(
        (r: VerseReaction) => !(r.book_id === bookId && r.chapter === chapter)
      );
      
      // Add new reactions
      const updatedReactions = [...otherReactions, ...newReactions];
      
      localStorage.setItem(`bible_reactions_${tenantId}_${memberId}`, JSON.stringify(updatedReactions));
      setReactions(newReactions);
    } catch (error) {
      console.error('Error saving reactions to localStorage:', error);
    }
  };

  // Toggle reaction
  const toggleReaction = ({ verseNumber, reaction }: { verseNumber: number; reaction: string }) => {
    const existing = reactions.find(
      r => r.verse_number === verseNumber && r.reaction === reaction && r.member_id === memberId
    );
    
    if (existing) {
      // Remove reaction
      const newReactions = reactions.filter(r => r.id !== existing.id);
      saveReactions(newReactions);
    } else {
      // Add reaction
      const newReaction: VerseReaction = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        member_id: memberId,
        book_id: bookId,
        chapter: chapter,
        verse_number: verseNumber,
        reaction: reaction,
        created_at: new Date().toISOString(),
      };
      const newReactions = [...reactions, newReaction];
      saveReactions(newReactions);
    }
  };

  return {
    reactions,
    reactionCounts,
    isLoading,
    toggleReaction,
  };
}