import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { detectPlatform } from "@/utils/streamPlatform";
import { format, differenceInSeconds } from "date-fns";
import {
  Video,
  Bell,
  BellOff,
  Play,
  X,
  Check,
  Calendar,
  Clock,
  Repeat,
} from "lucide-react";

interface LivestreamConfig {
  id: string;
  name: string;
  platform_type: string;
  platform_url: string;
  embed_url: string;
  subscribe_url: string | null;
  subscribe_label: string | null;
}

interface LivestreamSchedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_day: number | null;
  is_live: boolean;
}

interface LivestreamHistory {
  id: string;
  title: string;
  stream_date: string;
  thumbnail_url: string | null;
  embed_url: string;
}

interface LivestreamReminder {
  id: string;
  schedule_id: string;
}

export default function MemberLivestreaming() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);
  const [modalStream, setModalStream] = useState<LivestreamHistory | null>(null);
  const [prayerText, setPrayerText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  // Fetch livestream configs
  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ["livestream-configs", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.LIVESTREAM_CONFIGS)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .order(COLS.CREATED_AT, { ascending: true });
      return (data || []) as LivestreamConfig[];
    },
    staleTime: 300000,
  });

  // Fetch livestream schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["livestream-schedules", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .order(COLS.START_TIME, { ascending: true });
      return (data || []) as LivestreamSchedule[];
    },
    staleTime: 300000,
  });

  // Fetch past streams
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["livestream-history", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.LIVESTREAM_HISTORY)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .order(COLS.STREAM_DATE, { ascending: false });
      return (data || []) as LivestreamHistory[];
    },
    staleTime: 300000,
  });

  // Fetch member's reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ["livestream-reminders", member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.LIVESTREAM_REMINDERS)
        .select("*")
        .eq(COLS.MEMBER_ID, member.memberId);
      return (data || []) as LivestreamReminder[];
    },
    staleTime: 300000,
  });

  // Check if any schedule is live
  const liveSchedule = schedules.find((s) => s.is_live);
  const isLive = !!liveSchedule;

  // Get next upcoming schedule
  const now = new Date();
  const upcomingSchedules = schedules.filter(
    (s) => !s.is_live && new Date(s.start_time) > now
  );
  const nextSchedule = upcomingSchedules[0];

  // Countdown timer effect
  useEffect(() => {
    if (!nextSchedule || isLive) return;

    const interval = setInterval(() => {
      const target = new Date(nextSchedule.start_time);
      const diff = differenceInSeconds(target, new Date());

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0, secs: 0 });
        queryClient.invalidateQueries({ queryKey: ["livestream-schedules"] });
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;

      setCountdown({ days, hours, mins, secs });
    }, 1000);

    return () => clearInterval(interval);
  }, [nextSchedule, isLive, queryClient]);

  // Submit prayer request mutation
  const submitPrayerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.LIVESTREAM_PRAYER_REQUESTS).insert({
        [COLS.TENANT_ID]: member.churchId,
        [COLS.MEMBER_ID]: isAnonymous ? null : member.memberId,
        [COLS.PRAYER_TEXT]: prayerText,
        [COLS.IS_ANONYMOUS]: isAnonymous,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your prayer has been received ✓");
      setPrayerText("");
      setIsAnonymous(false);
    },
    onError: () => {
      toast.error("Failed to submit prayer request");
    },
  });

  // Toggle reminder mutation
  const toggleReminderMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const existing = reminders.find((r) => r.schedule_id === scheduleId);

      if (existing) {
        const { error } = await supabase
          .from(TABLES.LIVESTREAM_REMINDERS)
          .delete()
          .eq(COLS.ID, existing.id);
        if (error) throw error;
        return "removed";
      } else {
        const { error } = await supabase.from(TABLES.LIVESTREAM_REMINDERS).insert({
          [COLS.TENANT_ID]: member.churchId,
          [COLS.MEMBER_ID]: member.memberId,
          [COLS.SCHEDULE_ID]: scheduleId,
        });
        if (error) throw error;
        return "added";
      }
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["livestream-reminders"] });
      toast.success(action === "added" ? "Reminder set ✓" : "Reminder removed");
    },
    onError: () => {
      toast.error("Failed to update reminder");
    },
  });

  const handlePrayerSubmit = () => {
    if (!prayerText.trim() || prayerText.trim().length < 10) {
      toast.error("Prayer request must be at least 10 characters");
      return;
    }
    submitPrayerMutation.mutate();
  };

  const hasReminder = (scheduleId: string) => {
    return reminders.some((r) => r.schedule_id === scheduleId);
  };

  return (
    <>
      <Helmet>
        <title>Livestreaming — {member.churchName}</title>
      </Helmet>

      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        {/* Hero Section — Live State */}
        {isLive && liveSchedule && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 to-black/40 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                We're Live Right Now
              </motion.div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{liveSchedule.title}</h2>
            {liveSchedule.description && (
              <p className="text-slate-300 mb-4">{liveSchedule.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {configs.map((config) => {
                const platform = detectPlatform(config.platform_url);
                if (!config.subscribe_url) return null;
                return (
                  <Button
                    key={config.id}
                    size="sm"
                    asChild
                    style={{ backgroundColor: platform.color }}
                    className="text-white hover:opacity-90"
                  >
                    <a href={config.subscribe_url} target="_blank" rel="noopener noreferrer">
                      {config.subscribe_label || platform.subscribeLabel}
                    </a>
                  </Button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Hero Section — Countdown Timer */}
        {!isLive && nextSchedule && (
          <BlurFadeIn delay={0.1}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <h2 className="text-xl font-bold mb-2">{nextSchedule.title}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {format(new Date(nextSchedule.start_time), "EEEE, MMMM d 'at' h:mm a")}
              </p>

              <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                {[
                  { label: "Days", value: countdown.days },
                  { label: "Hours", value: countdown.hours },
                  { label: "Mins", value: countdown.mins },
                  { label: "Secs", value: countdown.secs },
                ].map((unit) => (
                  <motion.div
                    key={unit.label}
                    whileHover={{ scale: 1.05 }}
                    className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={unit.value}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-3xl font-bold text-violet-600 dark:text-violet-400"
                      >
                        {String(unit.value).padStart(2, "0")}
                      </motion.div>
                    </AnimatePresence>
                    <p className="text-xs text-muted-foreground mt-1">{unit.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </BlurFadeIn>
        )}

        {!isLive && !nextSchedule && (
          <BlurFadeIn delay={0.1}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                No upcoming streams scheduled
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for live broadcasts
              </p>
            </div>
          </BlurFadeIn>
        )}

        {/* Stream Players Section (only when live) */}
        {isLive && configs.length > 0 && (
          <BlurFadeIn delay={0.2}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              {/* Platform Tabs */}
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800">
                {configs.map((config, idx) => {
                  const platform = detectPlatform(config.platform_url);
                  return (
                    <button
                      key={config.id}
                      onClick={() => setSelectedTab(idx)}
                      className="relative px-4 py-2 text-sm font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: platform.color }}
                        />
                        <span>{config.name}</span>
                      </div>
                      {selectedTab === idx && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Platform Player */}
              {configs[selectedTab] && (
                <div className="space-y-4">
                  <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <iframe
                      src={configs[selectedTab].embed_url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{configs[selectedTab].name}</Badge>
                    {configs[selectedTab].subscribe_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={configs[selectedTab].subscribe_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {configs[selectedTab].subscribe_label ||
                            detectPlatform(configs[selectedTab].platform_url).subscribeLabel}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </BlurFadeIn>
        )}

        {/* Prayer Request Submission (only when live) */}
        {isLive && (
          <BlurFadeIn delay={0.3}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold mb-4">🙏 Submit a Prayer Request</h3>

              <Textarea
                value={prayerText}
                onChange={(e) => setPrayerText(e.target.value)}
                placeholder="Share your prayer request..."
                className="mb-3 min-h-[100px]"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                  />
                  <label htmlFor="anonymous" className="text-sm text-muted-foreground">
                    Submit anonymously
                  </label>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={handlePrayerSubmit}
                    disabled={submitPrayerMutation.isPending || prayerText.trim().length < 10}
                  >
                    {submitPrayerMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        Send Prayer 🙏
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>
          </BlurFadeIn>
        )}

        {/* Upcoming Streams Section */}
        {upcomingSchedules.length > 0 && (
          <BlurFadeIn delay={0.4}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Upcoming Streams</h3>

              <div className="space-y-3">
                {upcomingSchedules.map((schedule) => {
                  const hasReminderSet = hasReminder(schedule.id);
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1">{schedule.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(schedule.start_time), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(schedule.start_time), "h:mm a")}
                          </div>
                          {schedule.is_recurring && (
                            <div className="flex items-center gap-1">
                              <Repeat className="h-3.5 w-3.5" />
                              Recurring
                            </div>
                          )}
                        </div>
                      </div>

                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          variant={hasReminderSet ? "default" : "outline"}
                          onClick={() => toggleReminderMutation.mutate(schedule.id)}
                          disabled={toggleReminderMutation.isPending}
                        >
                          {hasReminderSet ? (
                            <>
                              <Check className="h-4 w-4 mr-1.5" />
                              Reminder Set
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 mr-1.5" />
                              Remind Me
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          </BlurFadeIn>
        )}

        {/* Past Streams Archive */}
        {history.length > 0 && (
          <BlurFadeIn delay={0.5}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Past Streams</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((stream) => (
                  <motion.div
                    key={stream.id}
                    whileHover={{ y: -4 }}
                    className="group cursor-pointer"
                    onClick={() => setModalStream(stream)}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                      {stream.thumbnail_url ? (
                        <img
                          src={stream.thumbnail_url}
                          alt={stream.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-12 w-12 text-slate-300" />
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-6 w-6 text-slate-900 ml-0.5" />
                        </div>
                      </motion.div>
                    </div>

                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">{stream.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(stream.stream_date), "MMM d, yyyy")}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </BlurFadeIn>
        )}

        {history.length === 0 && !historyLoading && (
          <BlurFadeIn delay={0.5}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                No past streams yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Previous broadcasts will appear here
              </p>
            </div>
          </BlurFadeIn>
        )}

        {/* Loading States */}
        {(configsLoading || schedulesLoading || historyLoading) && (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        )}
      </div>

      {/* Past Stream Modal */}
      <Dialog open={!!modalStream} onOpenChange={() => setModalStream(null)}>
        <DialogContent className="max-w-4xl p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={() => setModalStream(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {modalStream && (
              <>
                <div className="aspect-video bg-slate-900">
                  <iframe
                    src={modalStream.embed_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{modalStream.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(modalStream.stream_date), "MMMM d, yyyy")}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
