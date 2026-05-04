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
  stream_provider?: string;
  stream_url?: string;
  jitsi_room?: string;
  pastor_name?: string;
  series_name?: string;
  scripture?: string;
  chat_enabled?: boolean;
  thumbnail_url?: string;
  recording_url?: string;
  recording_duration?: number;
  viewer_count?: number;
  ended_at?: string;
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
  const { tenantId, churchName } = useChurch();
  const queryClient = useQueryClient();
  const [prayerFilter, setPrayerFilter] = useState<'all' | 'pending' | 'prayed'>('all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pastStreamDialogOpen, setPastStreamDialogOpen] = useState(false);
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'youtube' | 'facebook' | 'jitsi' | 'custom'>('jitsi');
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  
  // Go Live form state
  const [serviceTitle, setServiceTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [scripture, setScripture] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);

  // Add Recording Dialog state
  const [addRecordingDialogOpen, setAddRecordingDialogOpen] = useState(false);
  const [selectedScheduleForRecording, setSelectedScheduleForRecording] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingDurationMinutes, setRecordingDurationMinutes] = useState('');
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState('');
  const [recordingThumbnailUrl, setRecordingThumbnailUrl] = useState('');

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

  // Task 2.4: Stats calculations
  const totalStreams = schedules.length;
  const liveNow = schedules.filter(s => s.is_live).length;
  const totalRecordings = schedules.filter(s => s.recording_url).length;
  const totalViewers = schedules.reduce((sum, s) => sum + (s.viewer_count || 0), 0);

  // Generate Jitsi room name
  const jitsiRoom = `vestryhub-live-${tenantId.slice(-6)}`;

  // Go Live mutation
  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .insert({
          [COLS.TENANT_ID]: tenantId,
          title: serviceTitle,
          [COLS.IS_LIVE]: true,
          stream_provider: selectedProvider,
          stream_url: selectedProvider === 'jitsi' ? undefined : streamUrl,
          jitsi_room: selectedProvider === 'jitsi' ? jitsiRoom : undefined,
          pastor_name: pastorName || undefined,
          series_name: seriesName || undefined,
          scripture: scripture || undefined,
          chat_enabled: chatEnabled,
          [COLS.START_TIME]: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream_schedules', tenantId] });
      toast.success('You are now live!');
      setGoLiveDialogOpen(false);
      // Reset form
      setServiceTitle('');
      setStreamUrl('');
      setPastorName('');
      setSeriesName('');
      setScripture('');
      setChatEnabled(true);
      setSelectedProvider('jitsi');
      setShowServiceDetails(false);
    },
    onError: () => {
      toast.error('Failed to go live');
    },
  });

  // Task 2.3: End Stream mutation
  const endStreamMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .update({
          [COLS.IS_LIVE]: false,
          ended_at: new Date().toISOString(),
        })
        .eq(COLS.ID, scheduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream_schedules', tenantId] });
      toast.success('Stream ended');
    },
    onError: () => {
      toast.error('Failed to end stream');
    },
  });

  // Task 3.1: Add Recording mutation
  const addRecordingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScheduleForRecording) throw new Error('No schedule selected');
      
      // Calculate total duration in seconds
      const minutes = parseInt(recordingDurationMinutes) || 0;
      const seconds = parseInt(recordingDurationSeconds) || 0;
      const totalSeconds = (minutes * 60) + seconds;

      const { error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .update({
          recording_url: recordingUrl,
          recording_duration: totalSeconds,
          thumbnail_url: recordingThumbnailUrl || undefined,
        })
        .eq(COLS.ID, selectedScheduleForRecording);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream_schedules', tenantId] });
      toast.success('Recording added successfully');
      setAddRecordingDialogOpen(false);
      // Reset form
      setSelectedScheduleForRecording(null);
      setRecordingUrl('');
      setRecordingDurationMinutes('');
      setRecordingDurationSeconds('');
      setRecordingThumbnailUrl('');
    },
    onError: () => {
      toast.error('Failed to add recording');
    },
  });

  // Task 3.3: Delete Recording mutation
  const deleteRecordingMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .update({
          recording_url: null,
          recording_duration: null,
          thumbnail_url: null,
        })
        .eq(COLS.ID, scheduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream_schedules', tenantId] });
      toast.success('Recording deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete recording');
    },
  });

  // Helper function to open add recording dialog
  const openAddRecordingDialog = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      setSelectedScheduleForRecording(scheduleId);
      
      // Pre-populate form if editing existing recording
      if (schedule.recording_url) {
        setRecordingUrl(schedule.recording_url);
        if (schedule.recording_duration) {
          const minutes = Math.floor(schedule.recording_duration / 60);
          const seconds = schedule.recording_duration % 60;
          setRecordingDurationMinutes(String(minutes));
          setRecordingDurationSeconds(String(seconds));
        }
        if (schedule.thumbnail_url) {
          setRecordingThumbnailUrl(schedule.thumbnail_url);
        }
      }
      
      setAddRecordingDialogOpen(true);
    }
  };

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
        {/* Header Section - Task 2 */}
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
                {/* Task 2.1: Live Badge */}
                {liveSession && (
                  <motion.div
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500 text-white text-sm font-semibold"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <span className="h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </motion.div>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage your church's live broadcasts
              </p>
            </div>
            {/* Task 2.2: Action Buttons */}
            <div className="flex items-center gap-2">
              {liveSession ? (
                <Button 
                  onClick={() => endStreamMutation.mutate(liveSession.id)}
                  disabled={endStreamMutation.isPending}
                  variant="destructive"
                >
                  End Stream
                </Button>
              ) : (
                <Button onClick={() => setGoLiveDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Go Live
                </Button>
              )}
            </div>
          </div>
        </BlurFadeIn>

        {/* Go Live Panel - Task 1 */}
        {!liveSession && (
          <BlurFadeIn delay={0.05}>
            <Card className="border-2 border-violet-200 dark:border-violet-800">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Start a Live Service
                </h2>

                {/* Service Title Input - Subtask 1.2 */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="service-title" className="text-sm font-medium mb-1.5">
                      Service Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="service-title"
                      placeholder="e.g., Sunday Morning Worship"
                      value={serviceTitle}
                      onChange={(e) => setServiceTitle(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Provider Selector - Subtask 1.2 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Streaming Provider
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* YouTube Card */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedProvider('youtube')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedProvider === 'youtube'
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                        }`}
                      >
                        <Youtube className="h-8 w-8 text-red-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          YouTube Live
                        </p>
                      </motion.div>

                      {/* Facebook Card */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedProvider('facebook')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedProvider === 'facebook'
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                        }`}
                      >
                        <Users className="h-8 w-8 text-blue-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Facebook Live
                        </p>
                      </motion.div>

                      {/* Jitsi Card */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedProvider('jitsi')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedProvider === 'jitsi'
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                        }`}
                      >
                        <Video className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Jitsi (built-in)
                        </p>
                      </motion.div>

                      {/* Custom URL Card */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedProvider('custom')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedProvider === 'custom'
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                        }`}
                      >
                        <Film className="h-8 w-8 text-slate-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Custom URL
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Conditional Stream URL Input - Subtask 1.3 */}
                  {selectedProvider === 'youtube' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="youtube-url" className="text-sm font-medium mb-1.5">
                        YouTube Live URL
                      </Label>
                      <Input
                        id="youtube-url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="h-10"
                      />
                    </motion.div>
                  )}

                  {selectedProvider === 'facebook' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="facebook-url" className="text-sm font-medium mb-1.5">
                        Facebook Live URL
                      </Label>
                      <Input
                        id="facebook-url"
                        placeholder="https://facebook.com/..."
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="h-10"
                      />
                    </motion.div>
                  )}

                  {selectedProvider === 'jitsi' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="jitsi-room" className="text-sm font-medium mb-1.5">
                        Jitsi Room (auto-generated)
                      </Label>
                      <Input
                        id="jitsi-room"
                        value={jitsiRoom}
                        readOnly
                        className="h-10 bg-slate-50 dark:bg-slate-900"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        This room will be created automatically when you go live
                      </p>
                    </motion.div>
                  )}

                  {selectedProvider === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="custom-url" className="text-sm font-medium mb-1.5">
                        Custom Stream URL
                      </Label>
                      <Input
                        id="custom-url"
                        placeholder="https://..."
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="h-10"
                      />
                    </motion.div>
                  )}

                  {/* Service Details Collapsible - Subtask 1.4 */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowServiceDetails(!showServiceDetails)}
                      className="mb-3"
                    >
                      {showServiceDetails ? 'Hide' : 'Add'} service details
                    </Button>

                    <AnimatePresence>
                      {showServiceDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <div>
                            <Label htmlFor="pastor-name" className="text-sm font-medium mb-1.5">
                              Pastor Name
                            </Label>
                            <Input
                              id="pastor-name"
                              placeholder="e.g., Pastor John Smith"
                              value={pastorName}
                              onChange={(e) => setPastorName(e.target.value)}
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label htmlFor="series-name" className="text-sm font-medium mb-1.5">
                              Series Name
                            </Label>
                            <Input
                              id="series-name"
                              placeholder="e.g., Faith Series"
                              value={seriesName}
                              onChange={(e) => setSeriesName(e.target.value)}
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label htmlFor="scripture" className="text-sm font-medium mb-1.5">
                              Scripture Reference
                            </Label>
                            <Input
                              id="scripture"
                              placeholder="e.g., John 3:16"
                              value={scripture}
                              onChange={(e) => setScripture(e.target.value)}
                              className="h-10"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Chat Toggle & Go Live Button - Subtask 1.5 */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="chat-enabled"
                        checked={chatEnabled}
                        onCheckedChange={setChatEnabled}
                      />
                      <Label htmlFor="chat-enabled" className="text-sm font-medium cursor-pointer">
                        Enable live chat
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={() => goLiveMutation.mutate()}
                    disabled={!serviceTitle.trim() || goLiveMutation.isPending || (selectedProvider !== 'jitsi' && !streamUrl.trim())}
                    className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                  >
                    {goLiveMutation.isPending ? 'Going Live...' : 'Go Live Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </BlurFadeIn>
        )}

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

        {/* Analytics Dashboard Section - Task 2.4: Stats Row Enhancement */}
        <BlurFadeIn delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Streams */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Video className="h-5 w-5 text-violet-600" />
                  <Badge variant="secondary" className="text-xs">Total</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {totalStreams}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Streams</p>
              </CardContent>
            </Card>

            {/* Live Now */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="h-5 w-5 text-red-600" />
                  <Badge variant="secondary" className="text-xs">{liveNow > 0 ? 'Active' : 'Offline'}</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {liveNow}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live Now</p>
              </CardContent>
            </Card>

            {/* Total Recordings */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Film className="h-5 w-5 text-blue-600" />
                  <Badge variant="secondary" className="text-xs">Archived</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {totalRecordings}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Recordings</p>
              </CardContent>
            </Card>

            {/* Total Viewers */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <Badge variant="secondary" className="text-xs">Cumulative</Badge>
                </div>
                <motion.div
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {totalViewers.toLocaleString()}
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Viewers</p>
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

        {/* Past Streams Archive Section - Task 3: Admin Recordings Tab Enhancement */}
        <BlurFadeIn delay={0.5}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Past Streams & Recordings
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

              {schedulesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : schedules.filter(s => s.ended_at).length === 0 ? (
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-jakarta">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Provider
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Views
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Recording
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules
                        .filter(s => s.ended_at)
                        .map(schedule => {
                          const durationMinutes = schedule.recording_duration 
                            ? Math.floor(schedule.recording_duration / 60)
                            : 0;
                          const durationSeconds = schedule.recording_duration 
                            ? schedule.recording_duration % 60
                            : 0;
                          const formattedDuration = schedule.recording_duration
                            ? `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`
                            : '-';

                          return (
                            <tr 
                              key={schedule.id}
                              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors"
                            >
                              <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                                <div>
                                  <p className="font-medium">{schedule.title}</p>
                                  {schedule.pastor_name && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {schedule.pastor_name}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                                {format(new Date(schedule.ended_at), 'MMM d, yyyy')}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                                {formattedDuration}
                              </td>
                              <td className="px-4 py-3.5">
                                {schedule.stream_provider && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {schedule.stream_provider}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                                {schedule.viewer_count || 0}
                              </td>
                              <td className="px-4 py-3.5">
                                {schedule.recording_url ? (
                                  <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    None
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center justify-end gap-2">
                                  {schedule.recording_url ? (
                                    <>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => openAddRecordingDialog(schedule.id)}
                                        className="h-7 px-2"
                                        title="Edit Recording"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
                                            deleteRecordingMutation.mutate(schedule.id);
                                          }
                                        }}
                                        disabled={deleteRecordingMutation.isPending}
                                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="Delete Recording"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => openAddRecordingDialog(schedule.id)}
                                      className="h-7 text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Recording
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
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

      {/* Add Recording Dialog - Task 3.1 */}
      <Dialog open={addRecordingDialogOpen} onOpenChange={setAddRecordingDialogOpen}>
        <DialogContent className="max-w-2xl font-jakarta">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedScheduleForRecording && schedules.find(s => s.id === selectedScheduleForRecording)?.recording_url
                ? 'Edit Recording'
                : 'Add Recording'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Recording URL Input */}
            <div className="space-y-2">
              <Label htmlFor="recording-url" className="text-sm font-medium">
                Recording URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recording-url"
                type="url"
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter the URL of the recorded video (YouTube, Vimeo, or direct video link)
              </p>
            </div>

            {/* Duration Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Duration <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    placeholder="Minutes"
                    value={recordingDurationMinutes}
                    onChange={(e) => setRecordingDurationMinutes(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Minutes</p>
                </div>
                <span className="text-slate-400 font-semibold">:</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Seconds"
                    value={recordingDurationSeconds}
                    onChange={(e) => setRecordingDurationSeconds(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Seconds</p>
                </div>
              </div>
            </div>

            {/* Thumbnail URL Input (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="thumbnail-url" className="text-sm font-medium">
                Thumbnail URL <span className="text-slate-400 text-xs">(optional)</span>
              </Label>
              <Input
                id="thumbnail-url"
                type="url"
                placeholder="https://example.com/thumbnail.jpg"
                value={recordingThumbnailUrl}
                onChange={(e) => setRecordingThumbnailUrl(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Custom thumbnail image for the recording
              </p>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                setAddRecordingDialogOpen(false);
                // Reset form
                setSelectedScheduleForRecording(null);
                setRecordingUrl('');
                setRecordingDurationMinutes('');
                setRecordingDurationSeconds('');
                setRecordingThumbnailUrl('');
              }}
              disabled={addRecordingMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addRecordingMutation.mutate()}
              disabled={
                !recordingUrl.trim() ||
                (!recordingDurationMinutes && !recordingDurationSeconds) ||
                addRecordingMutation.isPending
              }
              className="bg-violet-600 hover:bg-violet-700"
            >
              {addRecordingMutation.isPending 
                ? 'Saving...' 
                : selectedScheduleForRecording && schedules.find(s => s.id === selectedScheduleForRecording)?.recording_url
                  ? 'Update Recording'
                  : 'Add Recording'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
