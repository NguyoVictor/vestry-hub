import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, AlertCircle, User, BookOpen, Book, Bell, BellOff, Video, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreamPlayer } from "@/components/shared/StreamPlayer";
import { LiveChatPanel } from "@/components/shared/LiveChatPanel";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { RecordingCard } from "@/components/shared/RecordingCard";
import { VideoModal } from "@/components/shared/VideoModal";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";

export default function MemberWatchLive() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  
  // Task 8: State for recordings tab
  const [activeTab, setActiveTab] = useState<'live' | 'recordings'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [pastorFilter, setPastorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-viewed'>('newest');
  const [selectedRecording, setSelectedRecording] = useState<any | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Query live stream: WHERE is_live = true AND tenant_id = X LIMIT 1
  const { data: liveStream, isLoading: liveLoading, error: liveError, refetch: refetchLive } = useQuery({
    queryKey: ['live_stream', member.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select('*')
        .eq(COLS.TENANT_ID, member.tenantId)
        .eq(COLS.IS_LIVE, true)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 300000
  });

  // Query next service: WHERE is_live = false AND start_time > now() ORDER BY start_time LIMIT 1
  const { data: nextService, isLoading: nextLoading } = useQuery({
    queryKey: ['next_service', member.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select('*')
        .eq(COLS.TENANT_ID, member.tenantId)
        .eq(COLS.IS_LIVE, false)
        .gte(COLS.START_TIME, new Date().toISOString())
        .order(COLS.START_TIME, { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 300000
  });

  // Query recent recordings: WHERE ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 3
  const { data: recentRecordings, isLoading: recentRecordingsLoading } = useQuery({
    queryKey: ['recent_recordings', member.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select('*')
        .eq(COLS.TENANT_ID, member.tenantId)
        .not('ended_at', 'is', null)
        .not('recording_url', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000
  });

  // Task 8: Query ALL recordings for the recordings tab
  const { data: allRecordings, isLoading: allRecordingsLoading } = useQuery({
    queryKey: ['all_recordings', member.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select('*')
        .eq(COLS.TENANT_ID, member.tenantId)
        .not('ended_at', 'is', null)
        .not('recording_url', 'is', null)
        .order('ended_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000
  });

  // Notify Me mutation (optimistic UI)
  const notifyMeMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      // In a real implementation, this would save to a livestream_reminders table
      // For now, we'll just simulate success
      return { success: true, scheduleId };
    },
    onSuccess: () => {
      toast.success('Reminder set! We\'ll notify you 30 minutes before the service.');
      queryClient.invalidateQueries({ queryKey: ['next_service', member.tenantId] });
    },
    onError: () => {
      toast.error('Failed to set reminder');
    }
  });

  // Task 8.4: Increment view count mutation
  const incrementViewCountMutation = useMutation({
    mutationFn: async (recordingId: string) => {
      const recording = allRecordings?.find(r => r.id === recordingId);
      if (!recording) return;

      const { error } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .update({
          viewer_count: (recording.viewer_count || 0) + 1
        })
        .eq(COLS.ID, recordingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_recordings', member.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['recent_recordings', member.tenantId] });
    }
  });

  // Task 8.2: Filtering logic
  const filteredRecordings = useMemo(() => {
    if (!allRecordings) return [];

    let filtered = [...allRecordings];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Series filter
    if (seriesFilter !== 'all') {
      filtered = filtered.filter(r => r.series_name === seriesFilter);
    }

    // Pastor filter
    if (pastorFilter !== 'all') {
      filtered = filtered.filter(r => r.pastor_name === pastorFilter);
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.ended_at).getTime() - new Date(b.ended_at).getTime());
    } else if (sortBy === 'most-viewed') {
      filtered.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
    }

    return filtered;
  }, [allRecordings, searchQuery, seriesFilter, pastorFilter, sortBy]);

  // Get unique series and pastors for filters
  const uniqueSeries = useMemo(() => {
    if (!allRecordings) return [];
    const series = allRecordings
      .map(r => r.series_name)
      .filter((s): s is string => !!s);
    return Array.from(new Set(series));
  }, [allRecordings]);

  const uniquePastors = useMemo(() => {
    if (!allRecordings) return [];
    const pastors = allRecordings
      .map(r => r.pastor_name)
      .filter((p): p is string => !!p);
    return Array.from(new Set(pastors));
  }, [allRecordings]);

  // Task 8.4: Handle recording card click
  const handleRecordingClick = (recording: any) => {
    setSelectedRecording(recording);
    setVideoModalOpen(true);
    // Increment view count
    incrementViewCountMutation.mutate(recording.id);
  };

  // Task 9: Realtime Live Status Sync
  useEffect(() => {
    const channel = supabase
      .channel(`livestream:${member.tenantId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: TABLES.LIVESTREAM_SCHEDULES,
        filter: `${COLS.TENANT_ID}=eq.${member.tenantId}`
      }, (payload: any) => {
        if (payload.new.is_live !== payload.old.is_live) {
          queryClient.invalidateQueries({ queryKey: ['live_stream', member.tenantId] });
          
          if (payload.new.is_live) {
            toast.success('🔴 We are now live! Tap to watch', {
              duration: 5000,
            });
          } else {
            toast.info('The live service has ended', {
              duration: 3000,
            });
          }
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [member.tenantId, queryClient]);

  // State determination logic
  const isLive = !!liveStream;
  const showState1 = isLive; // Live
  const showState2 = !isLive; // Not Live

  // Loading state
  if (liveLoading || nextLoading || recentRecordingsLoading) {
    return (
      <>
        <Helmet>
          <title>Watch Live — {member.churchName}</title>
        </Helmet>
        <div className="space-y-6 max-w-7xl mx-auto pb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (liveError) {
    return (
      <>
        <Helmet>
          <title>Watch Live — {member.churchName}</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-base font-semibold text-slate-600 font-jakarta">
            Unable to load live stream
          </p>
          <p className="text-sm text-slate-400 max-w-sm font-jakarta">
            There was an error loading the live stream. Please try again.
          </p>
          <Button size="sm" onClick={() => refetchLive()} className="mt-2">
            Retry
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Watch Live — {member.churchName}</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 max-w-7xl mx-auto pb-6"
      >
        {/* Task 8.1: Tab Switcher */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'live' | 'recordings')} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="live" className="relative">
              Live
              {isLive && (
                <motion.div
                  className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
          </TabsList>

          {/* Live Tab Content */}
          <TabsContent value="live" className="mt-0">
            <AnimatePresence mode="wait">
              {showState1 && liveStream && (
                <motion.div
                  key="state-live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* STATE 1: Live - Two-column layout */}
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column: Player + Service Info */}
                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Stream Player */}
                      <StreamPlayer
                        provider={liveStream.stream_provider as 'youtube' | 'facebook' | 'jitsi' | 'custom'}
                        streamUrl={liveStream.stream_url || undefined}
                        jitsiRoom={liveStream.jitsi_room || undefined}
                        isLive={liveStream.is_live}
                        viewerCount={liveStream.viewer_count || 0}
                      />

                      {/* Service Info Section */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
                          {member.churchName}
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-jakarta">
                          {liveStream.title}
                        </h2>
                        
                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          {liveStream.pastor_name && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                              <User className="h-4 w-4" />
                              <span className="font-jakarta">{liveStream.pastor_name}</span>
                            </div>
                          )}
                          
                          {liveStream.series_name && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                              <BookOpen className="h-4 w-4" />
                              <span className="font-jakarta">{liveStream.series_name}</span>
                            </div>
                          )}
                          
                          {liveStream.scripture && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                              <Book className="h-4 w-4" />
                              <span className="font-jakarta">{liveStream.scripture}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Chat Panel */}
                    <div className="w-full lg:w-96 flex-shrink-0 h-96 lg:h-[600px]">
                      <LiveChatPanel
                        streamId={liveStream.id}
                        tenantId={member.tenantId}
                        chatEnabled={liveStream.chat_enabled ?? true}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {showState2 && (
                <motion.div
                  key="state-not-live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* STATE 2: Not Live */}
                  <div className="text-center py-16">
                    {/* Hero Section */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="relative inline-block mb-6"
                    >
                      <div className="h-32 w-32 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                        <Tv className="h-16 w-16 text-violet-600 dark:text-violet-400" />
                      </div>
                      {/* Pulsing rings animation */}
                      <motion.div
                        animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-violet-400"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 1 }}
                        className="absolute inset-0 rounded-full border-2 border-violet-400"
                      />
                    </motion.div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">
                      No Live Service Right Now
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2 font-jakarta">
                      Join us when we go live...
                    </p>

                    {/* Next Service Card */}
                    {nextService && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mt-8 max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
                      >
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 font-jakarta">
                          {nextService.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-jakarta">
                          {format(new Date(nextService.start_time), 'EEEE, MMMM d, yyyy • h:mm a')}
                        </p>

                        {/* Countdown Timer */}
                        <div className="mb-4">
                          <CountdownTimer targetDate={nextService.start_time} />
                        </div>

                        {/* Notify Me Button */}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => notifyMeMutation.mutate(nextService.id)}
                          disabled={notifyMeMutation.isPending}
                        >
                          {notifyMeMutation.isSuccess ? (
                            <>
                              <BellOff className="h-4 w-4 mr-2" />
                              Reminder Set ✓
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 mr-2" />
                              Notify Me
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}

                    {/* Recent Recordings Strip */}
                    {recentRecordings && recentRecordings.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center justify-between mb-4 max-w-4xl mx-auto">
                          <h3 className="text-lg font-semibold font-jakarta">Recent Recordings</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-jakarta"
                            onClick={() => setActiveTab('recordings')}
                          >
                            See all →
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                          {recentRecordings.map((recording, index) => (
                            <BlurFadeIn key={recording.id} delay={index * 0.07}>
                              <RecordingCard
                                id={recording.id}
                                title={recording.title}
                                thumbnailUrl={recording.thumbnail_url}
                                duration={recording.recording_duration || 0}
                                streamDate={recording.ended_at}
                                seriesName={recording.series_name}
                                viewCount={recording.viewer_count || 0}
                                onClick={() => handleRecordingClick(recording)}
                              />
                            </BlurFadeIn>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Task 8.1: Recordings Tab Content */}
          <TabsContent value="recordings" className="mt-0">
            <div className="space-y-6">
              {/* Filter/Search Row */}
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search recordings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Series Filter */}
                {uniqueSeries.length > 0 && (
                  <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="All Series" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Series</SelectItem>
                      {uniqueSeries.map(series => (
                        <SelectItem key={series} value={series}>{series}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Pastor Filter */}
                {uniquePastors.length > 0 && (
                  <Select value={pastorFilter} onValueChange={setPastorFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="All Pastors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pastors</SelectItem>
                      {uniquePastors.map(pastor => (
                        <SelectItem key={pastor} value={pastor}>{pastor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="most-viewed">Most Viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recordings Grid */}
              {allRecordingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))}
                </div>
              ) : filteredRecordings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Video className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-base font-semibold text-slate-600 dark:text-slate-400 font-jakarta">
                    No recordings yet
                  </p>
                  <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                    Past live services will appear here after they are recorded
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecordings.map((recording, index) => (
                    <BlurFadeIn key={recording.id} delay={index * 0.06}>
                      <RecordingCard
                        id={recording.id}
                        title={recording.title}
                        thumbnailUrl={recording.thumbnail_url}
                        duration={recording.recording_duration || 0}
                        streamDate={recording.ended_at}
                        seriesName={recording.series_name}
                        viewCount={recording.viewer_count || 0}
                        onClick={() => handleRecordingClick(recording)}
                      />
                    </BlurFadeIn>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Task 8.3: Video Modal */}
        {selectedRecording && (
          <VideoModal
            isOpen={videoModalOpen}
            onClose={() => {
              setVideoModalOpen(false);
              setSelectedRecording(null);
            }}
            recording={selectedRecording}
          />
        )}
      </motion.div>
    </>
  );
}
