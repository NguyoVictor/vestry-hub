import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, BookOpen, LogIn, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function PublicSermonDetail() {
  const { tenantId, sermonId } = useParams<{ tenantId: string; sermonId: string }>();
  const navigate = useNavigate();

  // Fetch church branding
  const { data: church } = useQuery({
    queryKey: ['public-church', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('name, logo, primary_color')
        .eq('id', tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch sermon
  const { data: sermon, isLoading } = useQuery({
    queryKey: ['public-sermon', sermonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .eq('id', sermonId!)
        .eq('tenant_id', tenantId!)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sermonId && !!tenantId,
    staleTime: 60000,
  });

  // Track view
  const trackViewMut = useMutation({
    mutationFn: async () => {
      await supabase.from('sermon_views').insert({
        tenant_id: tenantId!,
        sermon_id: sermonId!,
        member_id: null,
      } as any);
    },
  });

  useEffect(() => {
    if (sermon) {
      trackViewMut.mutate();
    }
  }, [sermon?.id]);

  const handleShare = () => {
    const url = window.location.href;
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-96 w-full rounded-xl mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-jakarta mb-4">Sermon not found</p>
          <Button onClick={() => navigate(`/sermons/${tenantId}`)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Sermons
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{sermon.title} — {church?.name || 'Church'}</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={() => navigate(`/sermons/${tenantId}`)}
                variant="ghost"
                size="sm"
                className="font-jakarta"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />Back to all sermons
              </Button>
              <div className="flex items-center gap-2">
                <Button onClick={handleShare} variant="outline" size="sm" className="font-jakarta">
                  <Share2 className="h-4 w-4 mr-2" />Share
                </Button>
                <Button
                  onClick={() => navigate(`/member-login`)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                  size="sm"
                >
                  <LogIn className="h-4 w-4 mr-2" />Join Portal
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {/* Video Player */}
          {sermon.video_url && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
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
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full" />
            </div>
          )}

          {/* Title and Meta */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            {sermon.series && (
              <span className="inline-block px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-sm font-medium mb-3">
                {sermon.series}
              </span>
            )}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 font-jakarta">
              {sermon.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 font-jakarta">
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
          </div>

          {/* Audio Player */}
          {sermon.audio_url && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 font-jakarta">Audio</h3>
              <audio controls className="w-full">
                <source src={sermon.audio_url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Description */}
          {sermon.description && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 font-jakarta">Description</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-jakarta whitespace-pre-wrap">
                {sermon.description}
              </p>
            </div>
          )}

          {/* Sermon Notes */}
          {sermon.manuscript && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 font-jakarta">Sermon Notes</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none font-jakarta">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {sermon.manuscript}
                </pre>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl border border-orange-200 dark:border-orange-800 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-jakarta">
              Want to join our church community?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4 font-jakarta">
              Access exclusive content, connect with members, and stay updated
            </p>
            <Button
              onClick={() => navigate(`/member-login`)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
            >
              <LogIn className="h-4 w-4 mr-2" />Join Church Portal
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">
              Powered by <span className="font-semibold text-orange-500">Vestry Hub</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
