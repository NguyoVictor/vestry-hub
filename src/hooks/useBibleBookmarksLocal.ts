import { useState, useEffect } from 'react';
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
 * Local storage version of useBibleBookmarks
 * Bypasses Supabase and uses localStorage instead
 */
export function useBibleBookmarksLocal(tenantId: string, memberId: string) {
  const [bookmarks, setBookmarks] = useState<VerseBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bible_bookmarks_${tenantId}_${memberId}`);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading bookmarks from localStorage:', error);
    }
  }, [tenantId, memberId]);

  // Save bookmarks to localStorage whenever they change
  const saveBookmarks = (newBookmarks: VerseBookmark[]) => {
    try {
      localStorage.setItem(`bible_bookmarks_${tenantId}_${memberId}`, JSON.stringify(newBookmarks));
      setBookmarks(newBookmarks);
    } catch (error) {
      console.error('Error saving bookmarks to localStorage:', error);
    }
  };

  // Check if a verse is bookmarked
  const isBookmarked = (bookId: string, chapter: number, verseNumber: number): boolean => {
    return bookmarks.some(
      b => b.book_id === bookId && b.chapter === chapter && b.verse_number === verseNumber
    );
  };

  // Toggle bookmark
  const toggleBookmark = {
    mutate: (verse: BookmarkVerse) => {
      const existing = bookmarks.find(
        b =>
          b.book_id === verse.bookId &&
          b.chapter === verse.chapter &&
          b.verse_number === verse.verseNumber
      );

      if (existing) {
        // Remove bookmark
        const newBookmarks = bookmarks.filter(b => b.id !== existing.id);
        saveBookmarks(newBookmarks);
        toast.success('Bookmark removed');
      } else {
        // Add bookmark
        const newBookmark: VerseBookmark = {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          member_id: memberId,
          book_id: verse.bookId,
          chapter: verse.chapter,
          verse_number: verse.verseNumber,
          verse_text: verse.verseText,
          translation: verse.translation,
          created_at: new Date().toISOString(),
        };
        const newBookmarks = [newBookmark, ...bookmarks];
        saveBookmarks(newBookmarks);
        toast.success('Bookmark added');
      }
    },
  };

  return {
    bookmarks,
    isLoading,
    isBookmarked,
    toggleBookmark: toggleBookmark.mutate,
  };
}