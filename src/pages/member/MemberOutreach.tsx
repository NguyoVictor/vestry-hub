import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Globe, Users, Heart, Clock, ArrowLeft, MapPin, UserCheck,
  Sparkles, AlertCircle, Image as ImageIcon, Calendar,
} from "lucide-react";

// Activity type gradients
const ACTIVITY_TYPE_GRADIENTS: Record<string, string> = {
  street_evangelism: "from-orange-500 to-orange-600",
  prison_ministry: "from-purple-500 to-purple-600",
  hospital_visitation: "from-blue-400 to-blue-600",
  school_outreach: "from-yellow-500 to-amber-600",
  community_service: "from-green-500 to-emerald-600",
  feeding_programme: "from-amber-500 to-orange-600",
  medical_camp: "from-teal-400 to-cyan-600",
  sports_outreach: "from-indigo-500 to-purple-600",
  door_to_door: "from-cyan-400 to-blue-500",
  other: "from-gray-500 to-slate-600",
};

// Animated counter hook
function useAnimatedCounter(end: number, duration = 1200) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(end * easeOut));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

export default function MemberOutreach() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const thisYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  // Fetch completed outreach activities
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ["member-outreach-activities", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.OUTREACH_ACTIVITIES)
        .select("id, name, type, activity_date, location, description, target_community, people_reached, salvations, volunteer_ids, report, photo_urls, start_time, end_time, status")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "completed")
        .order("activity_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  // Fetch planned activities
  const { data: plannedActivities = [] } = useQuery({
    queryKey: ["member-outreach-planned", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.OUTREACH_ACTIVITIES)
        .select("id, name, type, activity_date, location, start_time, status")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "planned")
        .gte("activity_date", today)
        .order("activity_date", { ascending: true })
        .limit(3);
      
      return data || [];
    },
    staleTime: 300000,
  });

  // Calculate stats
  const thisYearActivities = activities.filter((a: any) => 
    new Date(a.activity_date).getFullYear() === thisYear
  );
  
  const stats = {
    totalActivities: thisYearActivities.length,
    peopleReached: thisYearActivities.reduce((s: number, a: any) => s + (a.people_reached || 0), 0),
    salvations: thisYearActivities.reduce((s: number, a: any) => s + (a.salvations || 0), 0),
    volunteerHours: activities.reduce((s: number, a: any) => {
      if (!a.start_time || !a.end_time) return s;
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      const hours = (eh * 60 + em - sh * 60 - sm) / 60;
      return s + hours * (a.volunteer_ids?.length || 1);
    }, 0),
  };

  const recentActivities = activities.slice(0, 5);
  const communitiesServed = new Set(thisYearActivities.map((a: any) => a.location).filter(Boolean)).size;
  const livesTouched = stats.peopleReached;

  // Animated counters
  const animatedTotal = useAnimatedCounter(stats.totalActivities);
  const animatedReached = useAnimatedCounter(stats.peopleReached);
  const animatedSalvations = useAnimatedCounter(stats.salvations);
  const animatedHours = useAnimatedCounter(Math.round(stats.volunteerHours));

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <p className="text-base font-semibold text-slate-600 dark:text-slate-400">Could not load outreach data</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Please try again later</p>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Outreach Impact — {member.churchName}</title></Helmet>
      
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{member.churchName}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-orange-500" />
              Outreach Impact
            </h1>
          </div>
        </div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-[200px] rounded-2xl overflow-hidden relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500"
        >
          <Globe className="absolute right-8 bottom-0 h-[120px] w-[120px] text-white opacity-10 pointer-events-none" />
          <div className="absolute bottom-6 left-6">
            <p className="text-xs tracking-widest uppercase text-white/70 font-semibold">COMMUNITY IMPACT</p>
            <h2 className="text-2xl font-bold text-white mt-1">Our Outreach Impact</h2>
            <p className="text-sm text-white/80 mt-1">See how {member.churchName} is transforming lives beyond our walls</p>
          </div>
        </motion.div>

        {/* Impact Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Globe, label: "Total Activities", value: animatedTotal, color: "orange" },
              { icon: Users, label: "People Reached", value: animatedReached.toLocaleString(), color: "blue" },
              { icon: Heart, label: "Salvations", value: animatedSalvations, color: "emerald" },
              { icon: Clock, label: "Volunteer Hours", value: `${animatedHours} hrs`, color: "violet" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center relative overflow-hidden"
                >
                  <div className={`w-10 h-10 rounded-xl mx-auto mb-3 bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 text-${stat.color}-500`} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
                  <div className={`absolute bottom-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full translate-x-8 translate-y-8`} />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Recent Outreach Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Outreach</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stats.totalActivities} activities this year</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <Globe className="h-10 w-10 text-orange-500/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No outreach activities yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Check back soon to see our community impact</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity: any, i: number) => {
                const gradient = ACTIVITY_TYPE_GRADIENTS[activity.type] || "from-gray-500 to-slate-600";
                const hasPhotos = activity.photo_urls && activity.photo_urls.length > 0;
                const firstPhoto = hasPhotos ? activity.photo_urls[0] : null;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    whileHover={{ y: -3, scale: 1.01 }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                  >
                    {/* Card Top */}
                    <div className={`h-[140px] relative bg-gradient-to-br ${gradient}`}>
                      {firstPhoto ? (
                        <>
                          <img src={firstPhoto} alt={activity.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl font-black text-white opacity-20">
                            {activity.name?.charAt(0) || "O"}
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute bottom-3 left-4">
                        <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs text-white font-medium">
                          {activity.type?.replace(/_/g, " ")}
                        </span>
                        <p className="text-xs text-white/80 mt-1">{format(new Date(activity.activity_date), "dd MMMM yyyy")}</p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white leading-snug">{activity.name}</h4>
                      
                      {activity.location && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3 text-orange-500" />
                          {activity.location}
                        </p>
                      )}
                      
                      {activity.target_community && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Users className="h-3 w-3" />
                          {activity.target_community}
                        </p>
                      )}
                      
                      {activity.report && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed italic mt-2">
                          {activity.report}
                        </p>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          {activity.salvations > 0 && (
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {activity.salvations} salvations
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {activity.people_reached || 0} reached
                          </span>
                          {activity.volunteer_ids && activity.volunteer_ids.length > 0 && (
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {activity.volunteer_ids.length} volunteers
                            </span>
                          )}
                        </div>
                        
                        {hasPhotos && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {activity.photo_urls.length} photos
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Outreaches */}
        {plannedActivities.length > 0 && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Get Involved</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming outreach opportunities</p>
            </div>

            <div className="space-y-3">
              {plannedActivities.map((activity: any, i: number) => {
                const activityDate = new Date(activity.activity_date);
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex gap-4 items-start"
                  >
                    <div className="w-14 flex-shrink-0 rounded-xl bg-orange-500/10 p-2 text-center">
                      <p className="text-2xl font-bold text-orange-600">{format(activityDate, "d")}</p>
                      <p className="text-xs text-orange-500/80 uppercase">{format(activityDate, "MMM")}</p>
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{activity.name}</p>
                      {activity.location && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <MapPin className="h-3 w-3" />
                          {activity.location}
                        </p>
                      )}
                      <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 mt-2">
                        {activity.type?.replace(/_/g, " ")}
                      </span>
                      {activity.start_time && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="h-3 w-3" />
                          {activity.start_time}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-3 text-center">
              Interested in volunteering? Contact your church coordinator.
            </p>
          </div>
        )}

        {/* Year in Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-orange-500/5 to-transparent p-5"
        >
          <div className="flex items-center mb-4">
            <Sparkles className="h-4 w-4 text-orange-500 mr-2" />
            <p className="text-base font-semibold text-slate-900 dark:text-white">{thisYear} Impact Summary</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalActivities}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Activities Completed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{communitiesServed}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Communities Served</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{livesTouched.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lives Touched</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
              "Going into all the world" — Mark 16:15
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
