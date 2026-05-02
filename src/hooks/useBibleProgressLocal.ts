import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ReadingProgress {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  read_at: string;
}

/**
 * Local storage version of useBibleProgress
 * Bypasses Supabase and uses localStorage instead
 */
export function useBibleProgressLocal(tenantId: string, memberId: string) {
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bible_progress_${tenantId}_${memberId}`);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading progress from localStorage:', error);
    }
  }, [tenantId, memberId]);

  // Calculate chapters read
  const chaptersRead = progress.length;

  // Calculate percentage complete (assuming 1189 total chapters in the Bible)
  const percentComplete = Math.round((chaptersRead / 1189) * 100);

  // Save progress to localStorage
  const saveProgress = (newProgress: ReadingProgress[]) => {
    try {
      localStorage.setItem(`bible_progress_${tenantId}_${memberId}`, JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Error saving progress to localStorage:', error);
    }
  };

  // Mark chapter as read
  const markChapterRead = ({ bookId, chapter }: { bookId: string; chapter: number }) => {
    const existing = progress.find(p => p.book_id === bookId && p.chapter === chapter);
    
    if (!existing) {
      const newProgress: ReadingProgress = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        member_id: memberId,
        book_id: bookId,
        chapter: chapter,
        read_at: new Date().toISOString(),
      };
      const updatedProgress = [...progress, newProgress];
      saveProgress(updatedProgress);
      toast.success(`${bookId} ${chapter} marked as read!`);
    }
  };

  return {
    progress,
    chaptersRead,
    percentComplete,
    isLoading,
    markChapterRead,
  };
}