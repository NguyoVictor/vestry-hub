import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Heart, HandHeart, CalendarDays, MessageCircle, BookOpen, Share2,
  Receipt, Megaphone, MessageSquare, Quote, DollarSign, Wrench,
  Lightbulb, Users, Video, PlayCircle, Image, Globe, UserCheck,
  Home, BarChart2, BookCheck, PenLine, Building2, ShoppingBag,
  Target, Stethoscope, Clock, Tv, ChevronRight,
} from "lucide-react";

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

// All portal service modules — key matches enabled_modules.member_portal
const ALL_MODULES = [
  { key: "give_online", label: "Give Online", desc: "Tithes, offerings, and donations", icon: Heart, color: "bg-red-500", path: "/member/give" },
  { key: "pledge_campaigns", label: "Pledge Campaigns", desc: "View and commit to pledges", icon: Target, color: "bg-orange-500", path: "/member/give" },
  { key: "my_giving_history", label: "My Giving History", desc: "View complete giving records and tax receipts", icon: Receipt, color: "bg-amber-500", path: "/member/giving-history" },
  { key: "announcements", label: "Announcements", desc: "Latest church news and updates", icon: Megaphone, color: "bg-yellow-500", path: "/member/announcements" },
  { key: "messages", label: "Messages", desc: "Direct messages from church staff", icon: MessageCircle, color: "bg-blue-500", path: "/member/messages" },
  { key: "chat_on_whatsapp", label: "Chat on WhatsApp", desc: "WhatsApp not yet configured for your church", icon: MessageSquare, color: "bg-green-500", path: "#" },
  { key: "testimonies", label: "Testimonies", desc: "Read inspiring testimonies from members", icon: Quote, color: "bg-purple-500", path: "/member/testimonies" },
  { key: "share_your_testimony", label: "Share Your Testimony", desc: "Share what God has done for you", icon: Share2, color: "bg-pink-500", path: "/member/testimonies" },
  { key: "service_request", label: "Service Request", desc: "Submit a request to the church", icon: Wrench, color: "bg-slate-500", path: "/member/requests" },
  { key: "expense_request", label: "Expense Request", desc: "Submit an expense requisition for approval", icon: DollarSign, color: "bg-emerald-500", path: "/member/requests" },
  { key: "opinion_box", label: "Opinion Box", desc: "Give suggestions and church awareness", icon: Lightbulb, color: "bg-yellow-400", path: "/member/requests" },
  { key: "counselling", label: "Counselling", desc: "Request a pastoral session", icon: Stethoscope, color: "bg-teal-500", path: "/member/requests" },
  { key: "my_appointments", label: "My Appointments", desc: "View scheduled counselling meetings", icon: Clock, color: "bg-indigo-400", path: "/member/requests" },
  { key: "upcoming_events", label: "Upcoming Events & Services", desc: "Church services, events and programs", icon: CalendarDays, color: "bg-violet-500", path: "/member/events" },
  { key: "watch_live", label: "Watch Live", desc: "Join our live stream services", icon: Tv, color: "bg-red-600", path: "/member/sermons" },
  { key: "sermons", label: "Sermons & Messages", desc: "Watch and listen to teachings", icon: PlayCircle, color: "bg-indigo-500", path: "/member/sermons" },
  { key: "church_media", label: "Church Media", desc: "Photos, videos, and audio photos", icon: Image, color: "bg-cyan-500", path: "/member/sermons" },
  { key: "outreach_impact", label: "Outreach Impact", desc: "Statistics & data from our outreach", icon: Globe, color: "bg-green-600", path: "#" },
  { key: "volunteer", label: "Volunteer", desc: "View current service and sign up to serve", icon: HandHeart, color: "bg-orange-400", path: "/member/volunteer" },
  { key: "join_volunteer_groups", label: "Join Volunteer Groups", desc: "Browse and join ministry teams", icon: Users, color: "bg-blue-400", path: "/member/volunteer" },
  { key: "house_fellowships", label: "House Fellowships", desc: "Join and view home cell groups", icon: Home, color: "bg-amber-600", path: "/member/groups" },
  { key: "surveys", label: "Surveys", desc: "Participate in church surveys", icon: BarChart2, color: "bg-purple-400", path: "#" },
  { key: "bible_explorer", label: "Bible Explorer", desc: "Access the built-in Bible reading tool", icon: BookOpen, color: "bg-emerald-600", path: "/member/bible" },
  { key: "daily_devotionals", label: "Daily Devotionals", desc: "Access daily Bible readings", icon: BookCheck, color: "bg-teal-600", path: "/member/bible" },
  { key: "training_courses", label: "Training & Courses", desc: "Enroll in discipleship training programs", icon: Video, color: "bg-indigo-600", path: "#" },
  { key: "my_discipleship_journey", label: "My Discipleship Journey", desc: "Track your discipleship, maturity & milestones", icon: UserCheck, color: "bg-violet-600", path: "#" },
  { key: "my_sermon_notes", label: "My Sermon Notes", desc: "View and edit your sermon notes", icon: PenLine, color: "bg-slate-600", path: "#" },
  { key: "facility_booking", label: "Facility Booking", desc: "Book church spaces for personal events", icon: Building2, color: "bg-gray-500", path: "#" },
  { key: "resource_store", label: "Resource Store", desc: "Books, courses, and resources", icon: ShoppingBag, color: "bg-orange-600", path: "#" },
];

export default function MemberHome() {
  const member = useMemberPortal();
  const verse = getVerseOfDay();

  const { data: latestSermon } = useQuery({
    queryKey: ["member-latest-sermon", member.churchId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from(TABLES.STUDIO_MEDIA)
        .select("id, title, speaker, duration, thumbnail_url, media_url")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq(COLS.STATUS, "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    staleTime: 300000,
  });

  const { data: volunteerRoles = [] } = useQuery({
    queryKey: ["member-volunteer-roles", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.VOLUNTEERS)
        .select("role_id, volunteer_roles(name)")
        .eq("member_id", member.memberId)
        .eq(COLS.TENANT_ID, member.churchId);
      return data || [];
    },
    staleTime: 300000,
  });

  const shareVerse = () => {
    const text = `"${verse.text}" — ${verse.ref}`;
    if (navigator.share) navigator.share({ text });
    else { navigator.clipboard.writeText(text); toast.success("Verse copied to clipboard"); }
  };

  // Filter modules by enabled_modules.member_portal
  const visibleModules = ALL_MODULES.filter(m => member.enabledModules[m.key] !== false);

  return (
    <>
      <Helmet><title>Home — Vestry</title></Helmet>
      <div className="space-y-5 max-w-2xl mx-auto pb-6">

        {/* Profile completion banner */}
        {member.profileComplete < 100 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Update Your Profile</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Please update your profile to get the most out of church services.</p>
              </div>
              <Button size="sm" variant="outline" asChild className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
                <Link to="/member/profile">Complete</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Welcome */}
        <div className="text-center py-2">
          <h1 className="text-2xl font-bold">Welcome! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Access all church services and resources from this place.</p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-2 gap-3">
          {visibleModules.map(mod => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.key}
                to={mod.path}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:shadow-sm transition-shadow group"
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${mod.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{mod.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{mod.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
              </Link>
            );
          })}
        </div>

        {/* My Service Roles */}
        {volunteerRoles.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">My Service Roles</p>
              <Link to="#" className="text-xs text-indigo-600">View details →</Link>
            </div>
            <div className="space-y-2">
              {volunteerRoles.map((r: any) => (
                <div key={r.role_id} className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4 text-indigo-500" />
                  <span>{(r.volunteer_roles as any)?.name || "Volunteer"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Dashboard */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Your Dashboard</p>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
          {latestSermon ? (
            <Link to={`/member/sermons/${latestSermon.id}`} className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {latestSermon.thumbnail_url
                  ? <img src={latestSermon.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  : <BookOpen className="h-5 w-5 text-indigo-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{latestSermon.title}</p>
                {latestSermon.speaker && <p className="text-xs text-muted-foreground">{latestSermon.speaker}</p>}
              </div>
            </Link>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No assignments found</p>
              <p className="text-xs mt-1">You don't have any service roles assigned for this period.</p>
            </div>
          )}
        </div>

        {/* Need Help */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-sm">Need Help?</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your church office or visit the church page for more information.</p>
          <Button variant="link" size="sm" asChild className="mt-2 text-indigo-600">
            <Link to={`/church/${member.churchId}`}>Visit Church Page</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
