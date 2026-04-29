import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';

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
 * Provides bible_settings query and update mutation
 */
export function useMemberPreferences(tenantId: string, memberId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['member-preferences', tenantId, memberId];

  // Fetch bible_settings from member_preferences
  const { data: bibleSettings = DEFAULT_BIBLE_SETTINGS, isLoading } = useQuery<BibleSettings>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEMBER_PREFERENCES)
        .select(COLS.BIBLE_SETTINGS)
        .eq(COLS.TENANT_ID, tenantId)
        .eq(COLS.MEMBER_ID, memberId)
        .single();

      if (error) {
        // If no record exists, return defaults
        if (error.code === 'PGRST116') {
          return DEFAULT_BIBLE_SETTINGS;
        }
        throw error;
      }

      // Merge with defaults
      return {
        ...DEFAULT_BIBLE_SETTINGS,
        ...(data?.bible_settings || {}),
      };
    },
    staleTime: 300_000,
    enabled: !!tenantId && !!memberId,
  });

  // Update bible_settings mutation
  const updateBibleSettings = useMutation({
    mutationFn: async (partial: Partial<BibleSettings>) => {
      const merged = { ...bibleSettings, ...partial };

      const { error } = await supabase
        .from(TABLES.MEMBER_PREFERENCES)
        .upsert(
          {
            [COLS.TENANT_ID]: tenantId,
            [COLS.MEMBER_ID]: memberId,
            [COLS.BIBLE_SETTINGS]: merged,
          },
          {
            onConflict: `${COLS.TENANT_ID},${COLS.MEMBER_ID}`,
          }
        );

      if (error) throw error;
      return merged;
    },
    onMutate: async (partial) => {
      await queryClient.cancelQueries({ queryKey });
      const previousSettings = queryClient.getQueryData<BibleSettings>(queryKey);

      queryClient.setQueryData<BibleSettings>(queryKey, (old = DEFAULT_BIBLE_SETTINGS) => ({
        ...old,
        ...partial,
      }));

      return { previousSettings };
    },
    onError: (error, variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKey, context.previousSettings);
      }
      toast.error('Failed to save preferences');
      console.error('Preferences mutation error:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    bibleSettings,
    isLoading,
    updateBibleSettings: updateBibleSettings.mutate,
  };
}
