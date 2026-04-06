import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Heart, HandHeart, CalendarDays, MessageCircle, BookOpen, Share2 } from "lucide-react";
import { toast } from "sonner";

const VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd, I lack nothing.", ref: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getVerseOfDay() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return VERSES[dayOfYear % VERSES.length];
}

export default function MemberHome() {
  const member = useMemberPortal();
  const verse = getVerseOfDay();

  const { data: announcements = [], isLoading: annLoading } = useQuery({
    queryKey: ["member-announcements", member.churchId],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").eq("church_id", member.churchId).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["member-upcoming-events", member.churchId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("events").select("*").eq("church_id", member.churchId).gte("event_date", today).order("event_date", { ascending: true }).limit(3);
      return data || [];
    },
  });

  const { data: myGroups = [] } = useQuery({
    queryKey: ["member-groups", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("groups(id, name, group_type)").eq("member_id", member.memberId).limit(5);
      return (data || []).map((gm: any) => gm.groups).filter(Boolean);
    },
  });

  const { data: latestSermon } = useQuery({
    queryKey: ["member-latest-sermon", member.churchId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("studio_media")
        .select("id, title, speaker, duration, thumbnail_url, media_url")
        .eq("church_id", member.churchId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const shareVerse = () => {
    const text = `"${verse.text}" — ${verse.ref}`;
    if (navigator.share) { navigator.share({ text }); }
    else { navigator.clipboard.writeText(text); toast.success("Verse copied to clipboard"); }
  };

  return (
    <>
      <Helmet><title>Home — Vestry</title></Helmet>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, {member.firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{member.churchName} · Member since {format(new Date(member.memberSince), "MMM yyyy")}</p>
        </div>

        {/* Profile completion */}
        {member.profileComplete < 100 && (
          <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Complete your profile</p>
                <span className="text-sm font-bold text-indigo-600">{member.profileComplete}%</span>
              </div>
              <Progress value={member.profileComplete} className="h-2 mb-2" />
              <Button size="sm" variant="outline" asChild className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
                <Link to="/member/profile">Complete Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Verse of the Day */}
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0">
          <CardContent className="p-5">
            <p className="text-xs font-medium opacity-80 mb-2 uppercase tracking-wide">Verse of the Day</p>
            <p className="text-base italic leading-relaxed mb-3">"{verse.text}"</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-indigo-200">{verse.ref}</span>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 gap-1.5 h-8" onClick={shareVerse}>
                <Share2 className="h-3.5 w-3.5" />Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Give", icon: Heart, path: "/member/give", color: "bg-indigo-100 text-indigo-600" },
            { label: "Pray", icon: HandHeart, path: "/member/requests", color: "bg-violet-100 text-violet-600" },
            { label: "Events", icon: CalendarDays, path: "/member/events", color: "bg-amber-100 text-amber-600" },
            { label: "Messages", icon: MessageCircle, path: "/member/messages", color: "bg-emerald-100 text-emerald-600" },
          ].map(({ label, icon: Icon, path, color }) => (
            <Link key={label} to={path} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-sm transition-shadow">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Announcements</h2>
            <Link to="/member/announcements" className="text-sm text-indigo-600">See all</Link>
          </div>
          {annLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-56 shrink-0 rounded-2xl" />)}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {announcements.map((a: any) => (
                <Link key={a.id} to="/member/announcements" className="shrink-0 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-sm transition-shadow">
                  <Badge variant="secondary" className="text-xs mb-2 capitalize">{a.target_audience || "general"}</Badge>
                  <p className="font-medium text-sm line-clamp-2">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "dd MMM")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming Events</h2>
            <Link to="/member/events" className="text-sm text-indigo-600">See all</Link>
          </div>
          {eventsLoading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {events.map((e: any) => (
                <Link key={e.id} to={`/member/events/${e.id}`} className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-sm transition-shadow">
                  <div className="text-center bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-2 w-14 shrink-0">
                    <p className="text-xs text-indigo-600 font-medium uppercase">{format(new Date(e.event_date), "MMM")}</p>
                    <p className="text-xl font-bold text-indigo-700">{format(new Date(e.event_date), "d")}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.location || "Church"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Latest Sermon */}
        {latestSermon && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Latest Sermon</h2>
              <Link to="/member/sermons" className="text-sm text-indigo-600">See all</Link>
            </div>
            <Link to={`/member/sermons/${latestSermon.id}`} className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-sm transition-shadow">
              <div className="h-16 w-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                {latestSermon.thumbnail_url ? (
                  <img src={latestSermon.thumbnail_url} alt={latestSermon.title} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <BookOpen className="h-6 w-6 text-indigo-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{latestSermon.title}</p>
                {latestSermon.speaker && <p className="text-xs text-muted-foreground mt-0.5">{latestSermon.speaker}</p>}
                {latestSermon.duration && <p className="text-xs text-muted-foreground">{latestSermon.duration}</p>}
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 text-white fill-white" />
              </div>
            </Link>
          </div>
        )}

        {/* My Groups */}
        {myGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">My Groups</h2>
              <Link to="/member/groups" className="text-sm text-indigo-600">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {myGroups.map((g: any) => (
                <Link key={g.id} to={`/member/groups/${g.id}`} className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 w-44 hover:shadow-sm transition-shadow">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-2">{g.name?.charAt(0)}</div>
                  <p className="font-medium text-sm truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{g.group_type?.replace(/_/g, " ")}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
