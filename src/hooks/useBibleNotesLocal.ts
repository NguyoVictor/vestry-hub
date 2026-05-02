import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface VerseNote {
  id: string;
  tenant_id: string;
  member_id: string;
  book_id: string;
  chapter: number;
  verse_number?: number;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Local storage version of useBibleNotes
 * Bypasses Supabase and uses localStorage instead
 */
export function useBibleNotesLocal(tenantId: string, memberId: string, bookId: string, chapter: number) {
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bible_notes_${tenantId}_${memberId}`);
      if (stored) {
        const allNotes = JSON.parse(stored);
        // Filter for current book and chapter
        const currentNotes = allNotes.filter(
          (n: VerseNote) => n.book_id === bookId && n.chapter === chapter
        );
        setNotes(currentNotes);
      }
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
    }
  }, [tenantId, memberId, bookId, chapter]);

  // Save notes to localStorage
  const saveNotes = (newNotes: VerseNote[]) => {
    try {
      // Get all notes from storage
      const stored = localStorage.getItem(`bible_notes_${tenantId}_${memberId}`);
      const allNotes = stored ? JSON.parse(stored) : [];
      
      // Remove old notes for this book/chapter
      const otherNotes = allNotes.filter(
        (n: VerseNote) => !(n.book_id === bookId && n.chapter === chapter)
      );
      
      // Add new notes
      const updatedNotes = [...otherNotes, ...newNotes];
      
      localStorage.setItem(`bible_notes_${tenantId}_${memberId}`, JSON.stringify(updatedNotes));
      setNotes(newNotes);
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
    }
  };

  // Check if verse has a note
  const hasNote = (verseNumber: number): boolean => {
    return notes.some(n => n.verse_number === verseNumber);
  };

  // Get note for verse
  const getNote = (verseNumber: number): VerseNote | undefined => {
    return notes.find(n => n.verse_number === verseNumber);
  };

  // Save note
  const saveNote = (verseNumber: number, content: string) => {
    const existing = notes.find(n => n.verse_number === verseNumber);
    
    if (existing) {
      // Update existing note
      const updatedNote = {
        ...existing,
        content,
        updated_at: new Date().toISOString(),
      };
      const newNotes = notes.map(n => n.id === existing.id ? updatedNote : n);
      saveNotes(newNotes);
      toast.success('Note updated');
    } else {
      // Create new note
      const newNote: VerseNote = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        member_id: memberId,
        book_id: bookId,
        chapter: chapter,
        verse_number: verseNumber,
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newNotes = [...notes, newNote];
      saveNotes(newNotes);
      toast.success('Note saved');
    }
  };

  return {
    notes,
    isLoading,
    hasNote,
    getNote,
    saveNote,
  };
}