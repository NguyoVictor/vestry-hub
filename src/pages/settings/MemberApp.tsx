import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Heart, Target, Receipt, Megaphone, MessageCircle, MessageSquare,
  Quote, Share2, Wrench, DollarSign, Lightbulb, Stethoscope, Clock,
  CalendarDays, Tv, PlayCircle, Image, Globe, HandHeart, Users,
  Home, BarChart2, BookOpen, BookCheck, Video, UserCheck,
  Building2, ShoppingBag,
} from "lucide-react";

const MODULES = [
  { key: "give_online", label: "Give Online", desc: "Tithes, offerings, and donations", icon: Heart, defaultOn: true },
  { key: "pledge_campaigns", label: "Pledge Campaigns", desc: "View and commit to pledges", icon: Target, defaultOn: true },
  { key: "my_giving_history", label: "My Giving History", desc: "View complete giving records and tax receipts", icon: Receipt, defaultOn: true },
  { key: "announcements", label: "Announcements", desc: "Latest church news and updates", icon: Megaphone, defaultOn: true },
  { key: "messages", label: "Messages", desc: "Direct messages between staff and members", icon: MessageCircle, defaultOn: true },
  { key: "chat_on_whatsapp", label: "Chat on WhatsApp", desc: "WhatsApp Business API integration", icon: MessageSquare, defaultOn: false },
  { key: "testimonies", label: "Testimonies", desc: "Read inspiring testimonies from members", icon: Quote, defaultOn: true },
  { key: "share_your_testimony", label: "Share Your Testimony", desc: "Members can submit their own testimonies", icon: Share2, defaultOn: true },
  { key: "service_request", label: "Service Request", desc: "Submit a request to the church", icon: Wrench, defaultOn: true },
  { key: "expense_request", label: "Expense Request", desc: "Submit an expense requisition for approval", icon: DollarSign, defaultOn: true },
  { key: "opinion_box", label: "Opinion Box", desc: "Give suggestions and church awareness", icon: Lightbulb, defaultOn: true },
  { key: "counselling", label: "Counselling", desc: "Request a pastoral session", icon: Stethoscope, defaultOn: true },
  { key: "my_appointments", label: "My Appointments", desc: "View scheduled counselling meetings", icon: Clock, defaultOn: true },
  { key: "upcoming_events", label: "Upcoming Events & Services", desc: "Church services and programs", icon: CalendarDays, defaultOn: true },
  { key: "watch_live", label: "Watch Live", desc: "Join our live stream services", icon: Tv, defaultOn: true },
  { key: "sermons", label: "Sermons & Messages", desc: "Watch and listen to teachings", icon: PlayCircle, defaultOn: true },
  { key: "church_media", label: "Church Media", desc: "Photos, videos, and audio", icon: Image, defaultOn: true },
  { key: "outreach_impact", label: "Outreach Impact", desc: "Statistics & data from our outreach", icon: Globe, defaultOn: false },
  { key: "volunteer", label: "Volunteer", desc: "View current service and sign up to serve", icon: HandHeart, defaultOn: true },
  { key: "join_volunteer_groups", label: "Join Volunteer Groups", desc: "Browse and join ministry teams", icon: Users, defaultOn: true },
  { key: "house_fellowships", label: "House Fellowships", desc: "Join and view home cell groups", icon: Home, defaultOn: true },
  { key: "surveys", label: "Surveys", desc: "Participate in church surveys", icon: BarChart2, defaultOn: true },
  { key: "bible_explorer", label: "Bible Explorer", desc: "Access the built-in Bible reading tool", icon: BookOpen, defaultOn: true },
  { key: "daily_devotionals", label: "Daily Devotionals", desc: "Access daily Bible readings", icon: BookCheck, defaultOn: true },
  { key: "training_courses", label: "Training & Courses", desc: "Enroll in discipleship training programs", icon: Video, defaultOn: true },
  { key: "my_discipleship_journey", label: "My Discipleship Journey", desc: "Track discipleship, maturity & milestones", icon: UserCheck, defaultOn: true },
  { key: "facility_booking", label: "Facility Booking", desc: "Book church spaces for personal events", icon: Building2, defaultOn: false },
  { key: "resource_store", label: "Resource Store", desc: "Books, courses, and resources", icon: ShoppingBag, defaultOn: true },
];

export default function MemberApp() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [modules, setModules] = useState<Record<string, boolean>>({});

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-modules", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("enabled_modules").eq("id", tenantId).single();
      return data;
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  useEffect(() => {
    if (!tenant) return;
    const saved = (tenant.enabled_modules as any)?.member_portal || {};
    // Merge with defaults — if key not in saved, use defaultOn
    const merged: Record<string, boolean> = {};
    MODULES.forEach(m => {
      merged[m.key] = saved[m.key] !== undefined ? saved[m.key] : m.defaultOn;
    });
    setModules(merged);
  }, [tenant]);

  const save = useMutation({
    mutationFn: async (updated: Record<string, boolean>) => {
      const current = (tenant?.enabled_modules as any) || {};
      const { error } = await supabase.from("tenants").update({
        enabled_modules: { ...current, member_portal: updated },
      }).eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-modules", tenantId] });
      toast.success("Portal updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const toggle = (key: string) => {
    const updated = { ...modules, [key]: !modules[key] };
    setModules(updated);
    save.mutate(updated);
  };

  return (
    <>
      <Helmet><title>Member App — Vestry</title></Helmet>
      <PageHeader title="Member App" subtitle="Control which features are visible in the member portal" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Portal Module Visibility</CardTitle>
          <p className="text-sm text-muted-foreground">Toggle modules on or off. Hidden modules are completely removed from the member portal — not greyed out.</p>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full my-2" />)
          ) : (
            MODULES.map(mod => {
              const Icon = mod.icon;
              const enabled = modules[mod.key] !== false;
              return (
                <div key={mod.key} className="flex items-center gap-4 py-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${enabled ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                    <Icon className={`h-4 w-4 ${enabled ? "text-indigo-600" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!enabled ? "text-muted-foreground" : ""}`}>{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.desc}</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={() => toggle(mod.key)} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
