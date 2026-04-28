import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import GlareHover from '@/components/ui/GlareHover';
import { motion } from 'framer-motion';
import { Search, Play, FileText, Music, Calendar, User, BookOpen, LogIn } from 'lucide-react';
import { format } from 'date-fns';

export default function PublicSermons() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [preacherFilter, setPreacherFilter] = useState('all');

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

  // Fetch published sermons
  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ['public-sermons', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_published', true)
        .order('sermon_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Extract unique series and preachers
  const allSeries = Array.from(new Set(sermons.map((s: any) => s.series).filter(Boolean)));
  const allPreachers = Array.from(new Set(sermons.map((s: any) => s.speaker).filter(Boolean)));

  // Filter sermons
  const filtered = sermons.filter((s: any) => {
    const matchSearch = !search.trim() ||
      (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.scripture_reference || '').toLowerCase().includes(search.toLowerCase());
    const matchSeries = seriesFilter === 'all' || s.series === seriesFilter;
    const matchPreacher = preacherFilter === 'all' || s.speaker === preacherFilter;
    return matchSearch && matchSeries && matchPreacher;
  });

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
      <Helmet>
        <title>{church?.name ? `${church.name} — Sermons` : 'Sermons'}</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {church?.logo && (
                  <img src={church.logo} alt={church.name} className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-jakarta">
                    {church?.name || 'Church'} Sermons
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">
                    Watch and listen to our messages
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/member-login`)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Join Church Portal
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <Select value={seriesFilter} onValueChange={setSeriesFilter}>
              <SelectTrigger className="w-full sm:w-48 font-jakarta">
                <SelectValue placeholder="All Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Series</SelectItem>
                {allSeries.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={preacherFilter} onValueChange={setPreacherFilter}>
              <SelectTrigger className="w-full sm:w-48 font-jakarta">
                <SelectValue placeholder="All Preachers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Preachers</SelectItem>
                {allPreachers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sermon Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-jakarta">No sermons found</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filtered.map((sermon: any) => (
                <motion.div key={sermon.id} variants={item}>
                  <GlareHover>
                    <div
                      onClick={() => navigate(`/sermons/${tenantId}/${sermon.id}`)}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                        {sermon.thumbnail_url ? (
                          <img
                            src={sermon.thumbnail_url}
                            alt={sermon.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-slate-300" />
                          </div>
                        )}
                        {/* Media badges */}
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
                          {sermon.manuscript && (
                            <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1">
                              <FileText className="h-3 w-3" />Notes
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
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
                          {sermon.scripture_reference && (
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{sermon.scripture_reference}</span>
                            </div>
                          )}
                          {sermon.sermon_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(sermon.sermon_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlareHover>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">
              Powered by <span className="font-semibold text-orange-500">Vestry Hub</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
