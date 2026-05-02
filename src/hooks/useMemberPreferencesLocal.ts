import { useState, useEffect } from 'react';

interface BibleSettings {
  fontSize: number;
  fontFamily: 'sans' | 'serif';
  lineSpacing: number;
  lastBook: string;
  lastChapter: number;
  lastTranslation: string;
}

const DEFAULT_BIBLE_SETTINGS: BibleSettings = {
  fontSize: 16,
  fontFamily: 'sans',
  lineSpacing: 1.6,
  lastBook: 'John',
  lastChapter: 1,
  lastTranslation: 'de4e12af7f28f599-02', // KJV
};

/**
 * Local storage version of useMemberPreferences
 * Bypasses Supabase and uses localStorage instead
 */
export function useMemberPreferencesLocal(tenantId: string, memberId: string) {
  const [bibleSettings, setBibleSettings] = useState<BibleSettings>(DEFAULT_BIBLE_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`member_preferences_${tenantId}_${memberId}`);
      if (stored) {
        const preferences = JSON.parse(stored);
        setBibleSettings({ ...DEFAULT_BIBLE_SETTINGS, ...preferences.bible_settings });
      }
    } catch (error) {
      console.error('Error loading preferences from localStorage:', error);
    }
  }, [tenantId, memberId]);

  // Update Bible settings
  const updateBibleSettings = (updates: Partial<BibleSettings>) => {
    const newSettings = { ...bibleSettings, ...updates };
    setBibleSettings(newSettings);
    
    try {
      const stored = localStorage.getItem(`member_preferences_${tenantId}_${memberId}`);
      const preferences = stored ? JSON.parse(stored) : {};
      preferences.bible_settings = newSettings;
      localStorage.setItem(`member_preferences_${tenantId}_${memberId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  };

  return {
    bibleSettings,
    isLoading,
    updateBibleSettings,
  };
}