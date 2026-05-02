/**
 * Admin Livestreaming Page
 * 
 * Comprehensive livestreaming management for church administrators including:
 * - Multi-platform configuration (YouTube, Facebook, Vimeo, custom)
 * - Live session management with real-time status
 * - Prayer request wall with real-time updates
 * - Analytics dashboard
 * - Schedule management (one-time and recurring streams)
 * - Past streams archive with YouTube API sync
 * 
 * Requirements: 2, 3, 6, 8, 10, 12, 13, 22
 */

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Eye,
  Heart,
  Bell,
  Users,
  Calendar,
  Film,
  Plus,
  Edit,
  Trash2,
  Play,
  Youtube,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useChurch } from '@/contexts/ChurchContext';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';
import { BlurFadeIn } from '@/components/ui/BlurFadeIn';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { detectPlatform } from '@/utils/streamPlatform';

interface LivestreamConfig {
  id: string;
  tenant_id: string;
  name: string;
  platform_type: string;
  platform_url: string;
  embed_url: string;
  subscribe_url?: string;
  subscribe_label?: string;
  created_at: string;
  updated_at: string;
}

interface LivestreamSchedule {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  start_time: string;
  recurrence_pattern?: string;
  recurrence_day?: number;
  is_recurring: boolean;
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

interface LivestreamHistory {
  id: string;
  tenant_id: string;
  title: string;
  stream_date: string;
  thumbnail_url?: string;
  embed_url: string;
  youtube_video_id?: string;
  source: string;
  created_at: string;
  updated_at: string;
}

interface PrayerRequest {
  id: string;
  tenant_id: string;
  member_id?: string;
  prayer_text: string;
  is_anonymous: boolean;
  is_prayed_for: boolean;
  prayed_at?: string;
  created_at: string;
}

export default function Livestreaming() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [prayerFilter, setPrayerFilter] = useState<'all' | 'pending' | 'prayed'>('all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pastStreamDialogOpen, setPastStreamDialogOpen] = useState(false);

  // Fetch livestream configs
  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['livestream_configs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_CONFIGS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.CREATED_AT, { ascending: false });
      
      if (error) throw error;
      return data as LivestreamConfig[];
    },
    staleTime: 300000,
  });

  // Fetch livestream schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['livestream_schedules', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.START_TIME, { ascending: true });
      
      if (error) throw error;
      return data as LivestreamSchedule[];
    },
    staleTime: 300000,
  });

  // Fetch livestream history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['livestream_history', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_HISTORY)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.STREAM_DATE, { ascending: false });
      
      if (error) throw error;
      return data as LivestreamHistory[];
    },
    staleTime: 300000,
  });

  // Fetch prayer requests
  const { data: prayers = [], isLoading: prayersLoading } = useQuery({
    queryKey: ['livestream_prayer_requests', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_PRAYER_REQUESTS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.CREATED_AT, { ascending: false });
      
      if (error) throw error;
      return data as PrayerRequest[];
    },
    staleTime: 300000,
  });

  // Subscribe to realtime prayer requests
  useEffect(() => {
    const channel = supabase
      .channel(`prayer_requests:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.LIVESTREAM_PRAYER_REQUESTS,
          filter: `${COLS.TENANT_ID}=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['livestream_prayer_requests', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Mark prayer as prayed for
  const markPrayedMutation = useMutation({
    mutationFn: async (prayerId: string) => {
      const { error } = await supabase
        .from(TABLES.LIVESTREAM_PRAYER_REQUESTS)
        .update({
          [COLS.IS_PRAYED_FOR]: true,
          [COLS.PRAYED_AT]: new Date().toISOString(),
        })
        .eq(COLS.ID, prayerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream_prayer_requests', tenantId] });
      toast.success('Prayer marked as prayed for');
    },
    onError: () => {
      toast.error('Failed to update prayer');
    },
  });

  // Toggle live status
  const toggleLiveMutation = useMutation({
    mutationFn: async ({ scheduleId, isLive }: { scheduleId: string; isLive: boolean }) => {
      const { error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .update({ [COLS.IS_LIVE]: isLive })
        .eq(COLS.ID, scheduleId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['livestream_schedules', tenantId] });
      toast.success(variables.isLive ? 'Stream is now live!' : 'Stream ended');
    },
    onError: () => {
      toast.error('Failed to update stream status');
    },
  });

  // Calculate analytics
  const liveSession = schedules.find(s => s.is_live);
  const totalPrayers = prayers.length;
  const pendingPrayers = prayers.filter(p => !p.is_prayed_for).length;
  const totalViews = 0; // Placeholder - would come from platform APIs
  const avgAttendance = 0; // Placeholder - would be calculated from historical data

  // Filter prayers
  const filteredPrayers = prayers.filter(p => {
    if (prayerFilter === 'pending') return !p.is_prayed_for;
    if (prayerFilter === 'prayed') return p.is_prayed_for;
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Livestreaming — Vestry</title>
      </Helmet>

      <div className="p-6 space-y-6 font-jakarta">
        {/* Header Section - Task 4.2 */}
        <BlurFadeIn delay={0}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/20">
                  <Video className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Livestreaming
                </h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage your church's live broadcasts
              </p>
            </div>
          </div>
        </BlurFadeIn>

        {/* Live Banner Section - Task 4.3 */}
        {liveSession && (
          <BlurFadeIn delay={0.1}>
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 to-black/40 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-semibold"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  LIVE
                </motion.div>
                <h2 className="text-xl font-bold text-white">{liveSession.title}</h2>
              </div>
              
              {liveSession.description && (
                <p className="text-slate-300 mb-4">{liveSession.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {configs.map(config => {
                  const platformInfo = detectPlatform(config.platform_url);
                  return (
                    <div key={config.id} className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={config.embed_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {configs.map(config => {
                  const platformInfo = detectPlatform(config.platform_url);
                  return config.subscribe_url ? (
                    <Button
                      key={config.id}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => window.open(config.subscribe_url, '_blank')}
                    >
                      {config.subscribe_label || platformInfo.subscribeLabel}
                    </Button>
                  ) : null;
                })}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => toggleLiveMutation.mutate({ scheduleId: liveSession.id, isLive: false })}
                >
                  Go Offline
                </Button>
              </div>
            </motion.div>
          </BlurFadeIn>
        )}

        {/* Analytics Dashboard Section - Task 4.4 */}
        <BlurFadeIn delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="h-5 w-5 text-violet-600" />
                  <Badge variant="secondary" className="text-xs">Total</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {totalViews.toLocaleString()}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Views</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  <Badge variant="secondary" className="text-xs">{pendingPrayers} pending</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {totalPrayers}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prayer Requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  0
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reminders Set</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <Badge variant="secondary" className="text-xs">Average</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {avgAttendance}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Attendance</p>
              </CardContent>
            </Card>
          </div>
        </BlurFadeIn>

        {/* Prayer Wall Section - Task 4.5 */}
        <BlurFadeIn delay={0.3}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Prayer Requests
                </h2>
                <Tabs value={prayerFilter} onValueChange={(v) => setPrayerFilter(v as any)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="prayed">Prayed For</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {prayersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : filteredPrayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Heart className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No prayer requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredPrayers.map(prayer => (
                      <motion.div
                        key={prayer.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                              {prayer.prayer_text}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>{prayer.is_anonymous ? 'Anonymous' : 'Member'}</span>
                              <span>•</span>
                              <span>{format(new Date(prayer.created_at), 'MMM d, h:mm a')}</span>
                              {prayer.is_prayed_for && prayer.prayed_at && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs">
                                    Prayed {format(new Date(prayer.prayed_at), 'MMM d')}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          {!prayer.is_prayed_for && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPrayedMutation.mutate(prayer.id)}
                              disabled={markPrayedMutation.isPending}
                            >
                              Mark as Prayed For
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFadeIn>

        {/* Schedule Management Section - Task 4.6 */}
        <BlurFadeIn delay={0.4}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Upcoming Streams
                </h2>
                <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Stream
                </Button>
              </div>

              {schedulesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    No upcoming streams scheduled
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setScheduleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule your first stream
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {schedule.title}
                          </h3>
                          {schedule.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {schedule.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{format(new Date(schedule.start_time), 'MMM d, yyyy · h:mm a')}</span>
                            {schedule.is_recurring && schedule.recurrence_pattern && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs">
                                  {schedule.recurrence_pattern}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={schedule.is_live ? 'destructive' : 'default'}
                            onClick={() =>
                              toggleLiveMutation.mutate({
                                scheduleId: schedule.id,
                                isLive: !schedule.is_live,
                              })
                            }
                          >
                            {schedule.is_live ? 'Go Offline' : 'Go Live'}
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFadeIn>

        {/* Past Streams Archive Section - Task 4.7 */}
        <BlurFadeIn delay={0.5}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Past Streams
                </h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPastStreamDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Past Stream
                  </Button>
                  <Button size="sm" variant="outline">
                    <Youtube className="h-4 w-4 mr-2" />
                    Sync from YouTube
                  </Button>
                </div>
              </div>

              {historyLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Film className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    No past streams yet
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setPastStreamDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first past stream
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map(stream => (
                    <motion.div
                      key={stream.id}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                        {stream.thumbnail_url ? (
                          <img
                            src={stream.thumbnail_url}
                            alt={stream.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                          <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                          {stream.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{format(new Date(stream.stream_date), 'MMM d, yyyy')}</span>
                          {stream.source === 'youtube_api' && (
                            <Badge variant="secondary" className="text-xs">
                              <Youtube className="h-3 w-3 mr-1" />
                              YouTube
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="ghost" className="h-7 px-2">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFadeIn>
      </div>

      {/* Schedule Stream Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Stream</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-500">
            Dialog content will be implemented in the next iteration
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Past Stream Dialog */}
      <Dialog open={pastStreamDialogOpen} onOpenChange={setPastStreamDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Past Stream</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-500">
            Dialog content will be implemented in the next iteration
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
