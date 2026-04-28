import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberPortal } from '@/contexts/MemberPortalContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlareHover from '@/components/ui/GlareHover';
import Counter from '@/components/ui/Counter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, FileText, Music, Calendar, User, BookOpen, Bookmark,
  Heart, Flame, Grid3x3, List, Share2, ArrowLeft, X, BookmarkCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type TabType = 'all' | 'bookmarks';

export default function MemberSermonsRevamped() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Fetch published sermons
  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ['member-sermons', member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .eq('tenant_id', member.churchId)
        .eq('is_published', true)
        .order('sermon_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch bookmarks
  const { data: bookmarks = [] } = useQuery({
    queryKey: ['sermon-bookmarks', member.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_bookmarks')
        .select('sermon_id')
        .eq('member_id', member.userId);
      return (data || []).map(b => b.sermon_id);
    },
  });

  // Fetch reactions
  const { data: reactions = [] } = useQuery({
    queryKey: ['sermon-reactions', member.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_reactions')
        .select('sermon_id, reaction_type')
        .eq('member_id', member.userId);
      return data || [];
    },
  });

  // Get reaction counts per sermon
  const { data: reactionCounts = {} } = useQuery({
    queryKey: ['sermon-reaction-counts', member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sermon_reactions')
        .select('sermon_id, reaction_type')
        .eq('tenant_id', member.churchId);
      
      const counts: Record<string, Record<string, number>> = {};
      (data || []).forEach((r: any) => {
        if (!counts[r.sermon_id]) counts[r.sermon_id] = {};
        counts[r.sermon_id][r.reaction_type] = (counts[r.sermon_id][r.reaction_type] || 0) + 1;
      });
      return counts;
    },
  });

  const allSeries = Array.from(new Set(sermons.map((s: any) => s.series).filter(Boolean)));
  const featuredSermon = sermons.find((s: any) => s.is_featured);

  const filtered = sermons.filter((s: any) => {
    if (activeTab === 'bookmarks' && !bookmarks.includes(s.id)) return false;
    const matchSearch = !search.trim() ||
      (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.scripture_reference || '').toLowerCase().includes(search.toLowerCase());
    const matchSeries = seriesFilter === 'all' || s.series === seriesFilter;
    return matchSearch && matchSeries;
  });

  const mostReacted = [...sermons]
    .map((s: any) => ({
      ...s,
      totalReactions: Object.values(reactionCounts[s.id] || {}).reduce((a: any, b: any) => a + b, 0)
    }))
    .sort((a, b) => b.totalReactions - a.totalReactions)
    .slice(0, 5);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <>
      <Helmet><title>Sermons — {member.churchName}</title></Helmet>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl border border-orange-200 dark:border-orange-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1 font-jakarta">
                  Total Sermons
                </p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white font-jakarta">
                  <Counter to={sermons.length} duration={1.5} />
                </p>
              </div>
              <BookOpen className="h-12 w-12 text-orange-500/20" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl border border-violet-200 dark:border-violet-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-1 font-jakarta">
                  Series Available
                </p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white font-jakarta">
                  <Counter to={allSeries.length} duration={1.5} />
                </p>
              </div>
              <FileText className="h-12 w-12 text-violet-500/20" />
            </div>
          </div>
        </motion.div>

        {/* Featured Sermon */}
        {featuredSermon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GlareHover>
              <div
                onClick={() => navigate(`/member/sermons/${featuredSermon.id}`)}
                className="relative bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl overflow-hidden cursor-pointer group"
              >
                <div className="absolute inset-0 bg-black/40" />
                {featuredSermon.thumbnail_url && (
                  <img
                    src={featuredSermon.thumbnail_url}
                    alt={featuredSermon.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                  />
                )}
                <div className="relative p-8 md:p-12">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-4">
                    ⭐ Featured
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-jakarta">
                    {featuredSermon.title}
                  </h2>
                  <div className="flex flex-wrap gap-4 text-white/90 text-sm font-jakarta">
                    {featuredSermon.speaker && (
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />{featuredSermon.speaker}
                      </span>
                    )}
                    {featuredSermon.scripture_reference && (
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />{featuredSermon.scripture_reference}
                      </span>
                    )}
                  </div>
                  <Button className="mt-6 bg-white text-orange-600 hover:bg-white/90">
                    <Play className="h-4 w-4 mr-2" />Watch Now
                  </Button>
                </div>
              </div>
            </GlareHover>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="font-jakarta">
              <TabsTrigger value="all">All Sermons</TabsTrigger>
              <TabsTrigger value="bookmarks">
                <BookmarkCheck className="h-4 w-4 mr-2" />My Bookmarks
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sermons..."
                  className="pl-9 font-jakarta"
                />
              </div>
              {allSeries.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button
                    variant={seriesFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeriesFilter('all')}
                    className="font-jakarta shrink-0"
                  >
                    All Series
                  </Button>
                  {allSeries.map(s => (
                    <Button
                      key={s}
                      variant={seriesFilter === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeriesFilter(s)}
                      className="font-jakarta shrink-0"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Sermon Grid/List */}
            {isLoading ? (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-3'
              )}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className={viewMode === 'grid' ? 'h-80' : 'h-24'} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-jakarta">
                  {activeTab === 'bookmarks' ? 'No bookmarked sermons yet' : 'No sermons found'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  layout
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-3'
                  )}
                >
                  {filtered.map((sermon: any) => (
                    <SermonCard
                      key={sermon.id}
                      sermon={sermon}
                      viewMode={viewMode}
                      isBookmarked={bookmarks.includes(sermon.id)}
                      userReactions={reactions.filter(r => r.sermon_id === sermon.id)}
                      reactionCounts={reactionCounts[sermon.id] || {}}
                      onNavigate={() => navigate(`/member/sermons/${sermon.id}`)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>

        {/* Most Reacted Section */}
        {mostReacted.length > 0 && mostReacted[0].totalReactions > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 font-jakarta">
              Most Reacted
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mostReacted.slice(0, 3).map((sermon: any) => (
                <motion.div
                  key={sermon.id}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/member/sermons/${sermon.id}`)}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 cursor-pointer"
                >
                  <p className="font-semibold text-sm mb-2 font-jakarta line-clamp-2">{sermon.title}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      🙏 {reactionCounts[sermon.id]?.prayer || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      ❤️ {reactionCounts[sermon.id]?.heart || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      🔥 {reactionCounts[sermon.id]?.fire || 0}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface SermonCardProps {
  sermon: any;
  viewMode: ViewMode;
  isBookmarked: boolean;
  userReactions: any[];
  reactionCounts: Record<string, number>;
  onNavigate: () => void;
}

function SermonCard({ sermon, viewMode, isBookmarked, userReactions, reactionCounts, onNavigate }: SermonCardProps) {
  const member = useMemberPortal();
  const queryClient = useQueryClient();

  const toggleBookmark = useMutation({
    mutationFn: async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isBookmarked) {
        await supabase
          .from('sermon_bookmarks')
          .delete()
          .eq('sermon_id', sermon.id)
          .eq('member_id', member.userId);
      } else {
        await supabase.from('sermon_bookmarks').insert({
          tenant_id: member.churchId,
          sermon_id: sermon.id,
          member_id: member.userId,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermon-bookmarks'] });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    },
  });

  if (viewMode === 'list') {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, x: -20 },
          show: { opacity: 1, x: 0 }
        }}
        onClick={onNavigate}
        className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
          {sermon.thumbnail_url ? (
            <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-slate-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm font-jakarta truncate">{sermon.title}</p>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            {sermon.speaker && <span>{sermon.speaker}</span>}
            {sermon.sermon_date && <span>{format(new Date(sermon.sermon_date), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => toggleBookmark.mutate(e)}
          className="shrink-0"
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-5 w-5 text-orange-500" />
          ) : (
            <Bookmark className="h-5 w-5 text-slate-400" />
          )}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
      <GlareHover>
        <div
          onClick={onNavigate}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
            {sermon.thumbnail_url ? (
              <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-slate-300" />
              </div>
            )}
            <div className="absolute top-3 right-3 flex gap-2">
              {sermon.video_url && (
                <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-medium flex items-center gap-1">
                  <Play className="h-3 w-3" />Video
                </span>
              )}
              {sermon.audio_url && (
                <span className="px-2 py-1 rounded-full bg-blue-500 text-white text-xs font-medium flex items-center gap-1">
                  <Music className="h-3 w-3" />Audio
                </span>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => toggleBookmark.mutate(e)}
              className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-orange-500" />
              ) : (
                <Bookmark className="h-4 w-4 text-slate-600" />
              )}
            </motion.button>
          </div>
          <div className="p-5">
            {sermon.series && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-xs font-medium mb-2">
                {sermon.series}
              </span>
            )}
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 font-jakarta line-clamp-2">
              {sermon.title}
            </h3>
            <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 font-jakarta">
              {sermon.speaker && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{sermon.speaker}</span>
                </div>
              )}
              {sermon.sermon_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(sermon.sermon_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
            {Object.keys(reactionCounts).length > 0 && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {reactionCounts.prayer > 0 && <span>🙏 {reactionCounts.prayer}</span>}
                {reactionCounts.heart > 0 && <span>❤️ {reactionCounts.heart}</span>}
                {reactionCounts.fire > 0 && <span>🔥 {reactionCounts.fire}</span>}
              </div>
            )}
          </div>
        </div>
      </GlareHover>
    </motion.div>
  );
}
