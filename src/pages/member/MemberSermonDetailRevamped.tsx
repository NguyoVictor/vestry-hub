import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberPortal } from '@/contexts/MemberPortalContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, User, BookOpen, Share2, Bookmark, BookmarkCheck,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MemberSermonDetailRevamped() {
  const { sermonId } = useParams<{ sermonId: string }>();
  const navigate = useNavigate();
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [personalNotes, setPersonalNotes] = useState('');

  // Fetch sermon
  const { data: sermon, isLoading } = useQuery({
    queryKey: ['member-sermon', sermonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .eq('id', sermonId!)
        .eq('tenant_id', member.churchId)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sermonId,
  });

  // Fetch bookmark status
  const { data: isBookmarked = false } = useQuery({
    queryKey: ['sermon-bookmark', sermonId, member.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_bookmarks')
        .select('id')
        .eq('sermon_id', sermonId!)
        .eq('member_id', member.userId)
        .single();
      return !!data;
    },
    enabled: !!sermonId,
  });

  // Fetch user reactions
  const { data: userReactions = [] } = useQuery({
    queryKey: ['sermon-user-reactions', sermonId, member.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_reactions')
        .select('reaction_type')
        .eq('sermon_id', sermonId!)
        .eq('member_id', member.userId);
      return (data || []).map(r => r.reaction_type);
    },
    enabled: !!sermonId,
  });

  // Fetch reaction counts
  const { data: reactionCounts = {} } = useQuery({
    queryKey: ['sermon-reaction-counts', sermonId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_reactions')
        .select('reaction_type')
        .eq('sermon_id', sermonId!);
      
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      return counts;
    },
    enabled: !!sermonId,
  });

  // Fetch personal notes
  const { data: notesData } = useQuery({
    queryKey: ['sermon-notes', sermonId, member.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_notes')
        .select('notes_content')
        .eq('sermon_id', sermonId!)
        .eq('member_id', member.userId)
        .single();
      return data;
    },
    enabled: !!sermonId,
  });

  useEffect(() => {
    if (notesData?.notes_content) {
      setPersonalNotes(notesData.notes_content);
    }
  }, [notesData]);

  // Track view
  const trackViewMut = useMutation({
    mutationFn: async () => {
      await supabase.from('sermon_views').insert({
        tenant_id: member.churchId,
        sermon_id: sermonId!,
        member_id: member.userId,
      } as any);
    },
  });

  useEffect(() => {
    if (sermon) {
      trackViewMut.mutate();
    }
  }, [sermon?.id]);

  // Toggle bookmark
  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await supabase
          .from('sermon_bookmarks')
          .delete()
          .eq('sermon_id', sermonId!)
          .eq('member_id', member.userId);
      } else {
        await supabase.from('sermon_bookmarks').insert({
          tenant_id: member.churchId,
          sermon_id: sermonId!,
          member_id: member.userId,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermon-bookmark'] });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    },
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async (reactionType: string) => {
      if (userReactions.includes(reactionType)) {
        const { error } = await supabase
          .from('sermon_reactions')
          .delete()
          .eq('sermon_id', sermonId!)
          .eq('member_id', member.userId)
          .eq('reaction_type', reactionType);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sermon_reactions').insert({
          tenant_id: member.churchId,
          sermon_id: sermonId!,
          member_id: member.userId,
          reaction_type: reactionType,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermon-user-reactions'] });
      queryClient.invalidateQueries({ queryKey: ['sermon-reaction-counts'] });
    },
    onError: (error: any) => {
      console.error('Reaction error:', error);
      toast.error(error.message || 'Failed to update reaction');
    },
  });

  // Save notes
  const saveNotes = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from('sermon_notes')
        .select('id')
        .eq('sermon_id', sermonId!)
        .eq('member_id', member.userId)
        .single();

      if (existing) {
        await supabase
          .from('sermon_notes')
          .update({ notes_content: personalNotes })
          .eq('id', existing.id);
      } else {
        await supabase.from('sermon_notes').insert({
          tenant_id: member.churchId,
          sermon_id: sermonId!,
          member_id: member.userId,
          notes_content: personalNotes,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermon-notes'] });
      toast.success('Notes saved');
    },
  });

  const handleShare = () => {
    const url = `${window.location.origin}/sermons/${member.churchId}/${sermonId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const getVideoEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-jakarta mb-4">Sermon not found</p>
        <Button onClick={() => navigate('/member/sermons')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Sermons
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{sermon.title} — {member.churchName}</title></Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Back Button */}
        <Button
          onClick={() => navigate('/member/sermons')}
          variant="ghost"
          size="sm"
          className="font-jakarta"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Sermons
        </Button>

        {/* Video Player */}
        {sermon.video_url && (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <div className="relative pb-[56.25%]">
              <iframe
                src={getVideoEmbedUrl(sermon.video_url)}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Thumbnail (if no video) */}
        {!sermon.video_url && sermon.thumbnail_url && (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full" />
          </div>
        )}

        {/* Title and Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              {sermon.series && (
                <span className="inline-block px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-sm font-medium mb-3">
                  {sermon.series}
                </span>
              )}
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-jakarta">
                {sermon.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleBookmark.mutate()}
                className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-orange-500" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </motion.button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 font-jakarta mb-4">
            {sermon.speaker && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{sermon.speaker}</span>
              </div>
            )}
            {sermon.scripture_reference && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{sermon.scripture_reference}</span>
              </div>
            )}
            {sermon.sermon_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(sermon.sermon_date), 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Reactions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 font-jakarta">React:</p>
            {['prayer', 'heart', 'fire'].map((type) => {
              const emoji = type === 'prayer' ? '🙏' : type === 'heart' ? '❤️' : '🔥';
              const isActive = userReactions.includes(type);
              const count = reactionCounts[type] || 0;

              return (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={() => toggleReaction.mutate(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Audio Player */}
        {sermon.audio_url && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 font-jakarta">Audio</h3>
            <audio controls className="w-full">
              <source src={sermon.audio_url} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Description */}
        {sermon.description && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 font-jakarta">Description</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-jakarta whitespace-pre-wrap">
              {sermon.description}
            </p>
          </div>
        )}

        {/* Sermon Notes */}
        {sermon.manuscript && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 font-jakarta">Sermon Notes</h3>
            <div className="prose prose-slate dark:prose-invert max-w-none font-jakarta">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {sermon.manuscript}
              </pre>
            </div>
          </div>
        )}

        {/* Personal Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white font-jakarta">My Personal Notes</h3>
            <Button
              onClick={() => saveNotes.mutate()}
              disabled={saveNotes.isPending}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveNotes.isPending ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-jakarta">
            These notes are private and only visible to you
          </p>
          <Textarea
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            placeholder="Add your personal notes, reflections, or takeaways from this sermon..."
            className="min-h-[200px] resize-none font-jakarta"
          />
        </div>
      </motion.div>
    </>
  );
}
