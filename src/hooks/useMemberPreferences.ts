import { useState, useEffect } from 'react';

interface BibleSettings {
  fontSize: number;
  fontFamily: 'serif' | 'sans';
  lineSpacing: 1.5 | 1.75 | 2.0;
  lastBook: string;
  lastChapter: number;
  lastTranslation: string;
}

const DEFAULT_BIBLE_SETTINGS: BibleSettings = {
  fontSize: 16,
  fontFamily: 'sans',
  lineSpacing: 1.5,
  lastBook: 'John',
  lastChapter: 1,
  lastTranslation: 'de4e12af7f28f599-02', // KJV
};

/**
 * useMemberPreferences — Manage member's Bible reading preferences
 * Uses localStorage for now since member_preferences table doesn't exist
 */
export function useMemberPreferences(tenantId: string, memberId: string) {
  const [bibleSettings, setBibleSettings] = useState<BibleSettings>(DEFAULT_BIBLE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (!tenantId || !memberId) return;
    
    try {
      const storageKey = `bible-settings-${tenantId}-${memberId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBibleSettings({ ...DEFAULT_BIBLE_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load bible settings from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, memberId]);

  // Update function
  const updateBibleSettings = (partial: Partial<BibleSettings>) => {
    if (!tenantId || !memberId) return;

    try {
      const merged = { ...bibleSettings, ...partial };
      setBibleSettings(merged);
      
      const storageKey = `bible-settings-${tenantId}-${memberId}`;
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to save bible settings to localStorage:', error);
    }
  };

  return {
    bibleSettings,
    isLoading,
    updateBibleSettings,
  };
}
