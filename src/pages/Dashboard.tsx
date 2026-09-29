import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { formatCurrencyFull } from "@/lib/format";
import { useActivityLog } from "@/hooks/useActivityLog";
import { usePermissions } from '@/hooks/usePermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Users, TrendingUp, CalendarDays, Users2, UserPlus, CreditCard,
  Megaphone, Calendar, CalendarPlus, BarChart2, MapPin, Clock,
  Activity, Sparkles, CheckCircle2, MessageSquare, Send,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { fetchCanonicalAnalyticsMetrics } from "@/lib/analyticsMetrics";

// ─── CountUp Number Component ─────────────────────────────────────────────────
function CountUpNumber({ value, prefix = "", duration = 1.5, delay = 0.3 }: {
  value: number;
  prefix?: string;
  duration?: number;
  delay?: number;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const displayValue = useTransform(rounded, (latest) => 
    prefix + latest.toLocaleString()
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [motionValue, value, duration, delay]);

  return (
    <motion.span className="text-3xl font-bold text-slate-900 tracking-tight">
      {displayValue}
    </motion.span>
  );
}

// ─── Animation Variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const activityVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.6 + i * 0.07,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

// ─── Activity icon + colour map ──────────────────────────────────────────────
const ACTIVITY_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  new_member:          { icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  member_updated:      { icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  member_removed:      { icon: Users,        color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800" },
  new_donation:        { icon: CreditCard,   color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  new_event:           { icon: CalendarDays, color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  event_updated:       { icon: CalendarDays, color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  event_cancelled:     { icon: CalendarDays, color: "text-red-500",     bg: "bg-red-100 dark:bg-red-900/30" },
  new_announcement:    { icon: Megaphone,    color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/30" },
  announcement_published: { icon: Megaphone, color: "text-amber-600",  bg: "bg-amber-100 dark:bg-amber-900/30" },
  new_visitor:         { icon: UserPlus,     color: "text-cyan-600",    bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  visitor_converted:   { icon: UserPlus,     color: "text-cyan-600",    bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  new_convert:         { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  stage_advanced:      { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  convert_graduated:   { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  baptism_completed:   { icon: Sparkles,     color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  attendance_recorded: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  new_request:         { icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  request_resolved:    { icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  new_broadcast:       { icon: Send,         color: "text-blue-600",    bg: "bg-blue-100 dark:bg-blue-900/30" },
};

function getActivityMeta(actionType: string) {
  return ACTIVITY_META[actionType] ?? { icon: Activity, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" };
}

const CHART_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#64748b"];

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const Dashboard = () => {
  const church = useChurch();
  const { isReadOnly } = usePermissions();
  const [chartMonths, setChartMonths] = useState(6);
  
  // Check if user has visited dashboard before (using localStorage)
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    const hasVisited = localStorage.getItem(`dashboard-visited-${church.tenantId}`);
    return !hasVisited;
  });

  // Mark dashboard as visited after component mounts
  useEffect(() => {
    if (isFirstVisit) {
      localStorage.setItem(`dashboard-visited-${church.tenantId}`, 'true');
      // Set to false after a short delay to avoid immediate re-render
      const timer = setTimeout(() => setIsFirstVisit(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, church.tenantId]);

  // Use full church name, not just first word
  const welcomeMessage = isFirstVisit 
    ? `Welcome, ${church.name} 👋` 
    : `Welcome back, ${church.name} 👋`;

  const todayStr = getLocalDateString(new Date());
  const monthStart = `${todayStr.slice(0, 7)}-01`;

  const { data: dashStats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", church.tenantId, todayStr],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: () => fetchCanonicalAnalyticsMetrics(
      church.tenantId,
      monthStart,
      todayStr,
      todayStr,
    ),
  });

  const memberCount = dashStats?.snapshot.active_members ?? 0;
  const eventsCount = dashStats?.dashboard.upcoming_events_7d ?? 0;
  const groupCount = dashStats?.snapshot.active_groups ?? 0;
  const todaysTotal = dashStats?.dashboard.giving_today ?? 0;

  const { data: givingTrend, isLoading: trendLoading } = useQuery({
    queryKey: ["dashboard", "giving-trend", chartMonths, church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const start = new Date();
      start.setMonth(start.getMonth() - chartMonths);
      const { data } = await supabase.from(TABLES.GIVING_RECORDS).select("amount, given_at")
        .eq("tenant_id", church.tenantId)
        .eq("payment_status", "confirmed")
        .is("voided_at", null)
        .gte("given_at", start.toISOString().split("T")[0]).order("given_at", { ascending: true });
      const monthly: Record<string, number> = {};
      data?.forEach(r => {
        const m = r.given_at.substring(0, 7);
        monthly[m] = (monthly[m] || 0) + Number(r.amount);
      });
      return Object.entries(monthly).map(([m, total]) => ({
        month: new Date(m + "-15").toLocaleDateString("en", { month: "short" }),
        total,
      }));
    },
  });

  const { data: groupDistribution, isLoading: distLoading } = useQuery({
    queryKey: ["dashboard", "group-distribution", church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: groups } = await supabase.from(TABLES.GROUPS).select("id, name").eq("tenant_id", church.tenantId).eq("is_active", true);
      if (!groups?.length) return [];
      const groupIds = groups.map(g => g.id);
      const { data: gm } = await supabase.from(TABLES.GROUP_MEMBERS).select("group_id").in("group_id", groupIds);
      const counts: Record<string, number> = {};
      gm?.forEach(m => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
      return groups.map(g => ({ name: g.name, value: counts[g.id] || 0 }))
        .sort((a, b) => b.value - a.value).slice(0, 5);
    },
  });

  const { data: upcomingEvents, isLoading: upEventsLoading } = useQuery({
    queryKey: ["dashboard", "upcoming-events-list", church.tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      const today = getLocalDateString(new Date());
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 6);
      const { data } = await supabase.from(TABLES.EVENTS).select("id, title, event_date, start_time, location")
        .eq("tenant_id", church.tenantId)
        .eq("is_published", true)
        .gte("event_date", today)
        .lte("event_date", getLocalDateString(weekEnd))
        .order("event_date", { ascending: true }).limit(5);
      return data || [];
    },
  });

  // Today's confirmed, non-voided donations use the same canonical date semantics.
  const { data: todaysDonations, isLoading: donationsLoading, error: donationsError } = useQuery({
    queryKey: ["dashboard", "todays-donations", church.tenantId, todayStr],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.GIVING_RECORDS)
        .select("id, amount, giving_type, payment_method, given_at, created_at, currency, member_id, donor_name, is_anonymous")
        .eq("tenant_id", church.tenantId)
        .eq("payment_status", "confirmed")
        .is("voided_at", null)
        .eq("given_at", todayStr)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
  });

  // Get member names for donations that have member_id
  const { data: members = [] } = useQuery({
    queryKey: ["dashboard", "members-for-donations", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS)
        .select("id, first_name, last_name")
        .eq("tenant_id", church.tenantId);
      
      // Debug: Log member data
      
      return data || [];
    },
    staleTime: 300_000, // 5 minutes - member names don't change often
  });

  const totalGroupMembers = groupDistribution?.reduce((s, g) => s + g.value, 0) || 0;

  // Recent Activity — live feed with Realtime
  const { data: activityEntries = [], isLoading: activityLoading } = useActivityLog(10);

  return (
    <>
      <Helmet><title>Dashboard — Vestry</title></Helmet>
      
      {/* Page Entrance Animation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
        {/* Premium Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-semibold uppercase tracking-[0.12em] text-purple-600"
            >
              OVERVIEW
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl font-semibold text-slate-900 tracking-tight"
            >
              {welcomeMessage}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm text-slate-600"
            >
              Here's what's happening at {church.name} today
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"
          >
            <span className="text-sm font-medium text-slate-700">
              {format(new Date(), "EEEE, d MMMM yyyy")}
            </span>
          </motion.div>
        </div>

        {/* Hero Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Total Members */}
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              boxShadow: "0 12px 40px rgba(124,58,237,0.12)" 
            }}
            className="relative bg-white border border-slate-100 rounded-2xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-b-sm" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                Current
              </span>
            </div>
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
              ) : (
                <CountUpNumber value={memberCount} />
              )}
              <p className="text-sm font-medium text-slate-600">Active Members</p>
            </div>
          </motion.div>

          {/* Today's Giving */}
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              boxShadow: "0 12px 40px rgba(249,115,22,0.12)" 
            }}
            className="relative bg-white border border-slate-100 rounded-2xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-b-sm" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                <TrendingUp className="w-2.5 h-2.5 mr-1" />
                Today
              </span>
            </div>
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
              ) : (
                <CountUpNumber value={todaysTotal || 0} prefix="KSh " />
              )}
              <p className="text-sm font-medium text-slate-600">
                Today's Giving
              </p>
            </div>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              boxShadow: "0 12px 40px rgba(14,165,233,0.12)" 
            }}
            className="relative bg-white border border-slate-100 rounded-2xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-sky-500 to-sky-600 rounded-b-sm" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-sky-600" />
              </div>
              <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                Next 7 days
              </span>
            </div>
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-8 w-12 bg-slate-200 rounded animate-pulse" />
              ) : (
                <CountUpNumber value={eventsCount} />
              )}
              <p className="text-sm font-medium text-slate-600">Upcoming Events</p>
            </div>
          </motion.div>

          {/* Active Groups */}
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              boxShadow: "0 12px 40px rgba(16,185,129,0.12)" 
            }}
            className="relative bg-white border border-slate-100 rounded-2xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-b-sm" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Users2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                Current
              </span>
            </div>
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-8 w-12 bg-slate-200 rounded animate-pulse" />
              ) : (
                <CountUpNumber value={groupCount} />
              )}
              <p className="text-sm font-medium text-slate-600">Active Groups</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Giving Overview Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white border border-slate-100 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Giving Overview</h3>
            <div className="flex gap-1">
              {[3, 6, 12].map(months => (
                <motion.button
                  key={months}
                  whileHover={{ 
                    backgroundColor: chartMonths === months ? "#7C3AED" : "#7C3AED",
                    color: "#ffffff"
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setChartMonths(months)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    chartMonths === months
                      ? "bg-purple-600 text-white"
                      : "bg-transparent text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {months}mo
                </motion.button>
              ))}
            </div>
          </div>
          
          {trendLoading ? (
            <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
          ) : givingTrend?.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={givingTrend}>
                <defs>
                  <linearGradient id="givingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `KSh ${v.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    fontSize: "13px"
                  }}
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Total"]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  fill="url(#givingGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#7C3AED", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4"
              >
                <BarChart2 className="w-6 h-6 text-purple-600" />
              </motion.div>
              <p className="text-sm font-medium text-slate-700 mb-1">No giving data yet</p>
              <p className="text-sm text-slate-500">Donations will appear here once recorded</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Add Member", icon: UserPlus, color: "#7C3AED", bg: "rgba(124,58,237,0.06)", href: "/members", disabled: isReadOnly('member_management') },
            { label: "Record Giving", icon: CreditCard, color: "#F97316", bg: "rgba(249,115,22,0.06)", href: "/give-online", disabled: isReadOnly('financial_records') },
            { label: "Create Event", icon: CalendarPlus, color: "#0EA5E9", bg: "rgba(14,165,233,0.06)", href: "/events", disabled: isReadOnly('event_management') },
            { label: "Announcement", icon: Megaphone, color: "#10B981", bg: "rgba(16,185,129,0.06)", href: "/announcements", disabled: isReadOnly('communication_tools') },
          ].map((action, index) => (
            <TooltipProvider key={action.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                      whileHover={!action.disabled ? { y: -3, boxShadow: `0 8px 25px ${action.color}33` } : {}}
                      whileTap={!action.disabled ? { scale: 0.97 } : {}}
                      className={`bg-white border border-slate-100 rounded-xl p-5 flex flex-col items-center gap-3 transition-all ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => { if (!action.disabled) window.location.href = action.href; }}
                      disabled={action.disabled}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                        <action.icon className="w-5 h-5" style={{ color: action.color }} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{action.label}</span>
                    </motion.button>
                  </span>
                </TooltipTrigger>
                {action.disabled && (
                  <TooltipContent>
                    <p>Read Only Access — contact your church admin</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-white border border-slate-100 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
            
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded animate-pulse" />
                      <div className="h-2 bg-slate-100 rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4"
                >
                  <Activity className="w-6 h-6 text-slate-400" />
                </motion.div>
                <p className="text-sm font-medium text-slate-700 mb-1">No recent activity</p>
                <p className="text-sm text-slate-500">Actions across your church will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityEntries.slice(0, 6).map((entry, index) => {
                  const meta = getActivityMeta(entry.action_type);
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={entry.id}
                      custom={index}
                      variants={activityVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex items-start gap-3"
                    >
                      <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-purple-600">
                          {entry.actor_name?.charAt(0) || "A"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 leading-relaxed">
                          {entry.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-white border border-slate-100 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Upcoming Events</h3>
              <Link 
                to="/events" 
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                View All
              </Link>
            </div>
            
            {upEventsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingEvents?.length ? (
              <div className="space-y-4">
                {upcomingEvents.slice(0, 4).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-1 h-12 bg-sky-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{event.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.event_date), "MMM d")}
                          {event.start_time && ` • ${String(event.start_time).substring(0, 5)}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center mb-4"
                  >
                    <Calendar className="w-6 h-6 text-sky-600" />
                  </motion.div>
                </motion.div>
                <p className="text-sm font-medium text-slate-700 mb-3">No upcoming events</p>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: "#7C3AED", color: "#ffffff" }}
                  whileTap={{ scale: 0.97 }}
                  className="border border-slate-200 rounded-lg px-5 py-2 text-sm font-medium text-slate-700 transition-all"
                  onClick={() => window.location.href = "/events"}
                >
                  Create Event
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Today's Donations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="bg-white border border-slate-100 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Today's Donations</h3>
            <Link 
              to="/giving-records" 
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View All
            </Link>
          </div>
          
          {donationsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : todaysDonations?.length ? (
            <div className="space-y-3">
              {todaysDonations.slice(0, 6).map((donation, index) => {
                // Optimize member lookup - find once and reuse
                const member = donation.member_id ? members.find(m => m.id === donation.member_id) : null;
                
                // Determine donor name with proper fallback logic (no is_anonymous or donor_name columns)
                const donorName = member 
                  ? `${member.first_name} ${member.last_name}`.trim()
                  : donation.donor_name || 'Anonymous Donor';

                return (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.05 }}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-600">
                          {member ? donorName.charAt(0).toUpperCase() : 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {donorName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full capitalize">
                            {donation.giving_type?.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-500">
                            {donation.created_at ? new Date(donation.created_at).toLocaleTimeString('en-KE', {
                              timeZone: 'Africa/Nairobi',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">
                      KSh {Number(donation.amount).toLocaleString()}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4"
              >
                <CreditCard className="w-6 h-6 text-orange-600" />
              </motion.div>
              <p className="text-sm font-medium text-slate-700 mb-1">No donations recorded yet</p>
              <p className="text-sm text-slate-500">Donations will appear here once recorded</p>
            </div>
          )}
        </motion.div>

        {/* Group Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="bg-white border border-slate-100 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Group Distribution</h3>
          
          {distLoading ? (
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-slate-100 rounded-full animate-pulse" />
            </div>
          ) : groupDistribution?.length ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <Pie
                    data={groupDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {groupDistribution.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={['#7C3AED', '#F97316', '#0EA5E9', '#10B981', '#F59E0B'][index % 5]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "10px",
                      padding: "8px 12px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-sm">
                {groupDistribution.map((group, index) => (
                  <div key={group.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: ['#7C3AED', '#F97316', '#0EA5E9', '#10B981', '#F59E0B'][index % 5] 
                      }}
                    />
                    <span className="text-sm text-slate-600 truncate">{group.name}</span>
                    <span className="text-sm font-medium text-slate-900">{group.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4"
              >
                <Users2 className="w-6 h-6 text-emerald-600" />
              </motion.div>
              <p className="text-sm font-medium text-slate-700 mb-1">No groups yet</p>
              <p className="text-sm text-slate-500">Group distribution will appear here</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default Dashboard;
