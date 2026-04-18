import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { LayoutGrid, Save, Info } from "lucide-react";

// ─── Feature definitions ──────────────────────────────────────────────────────
interface Feature { key: string; name: string; description: string }
interface FeatureGroup { label: string; features: Feature[] }

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "Giving & Financial",
    features: [
      { key: "give_online",       name: "Give Online",        description: "Tithe, offerings, and donations" },
      { key: "pledge_campaigns",  name: "Pledge Campaigns",   description: "View and contribute to pledges" },
      { key: "giving_history",    name: "Giving History",     description: "View personal giving records and tax receipts" },
    ],
  },
  {
    label: "Communication",
    features: [
      { key: "announcements",     name: "Announcements",      description: "Latest church news and updates" },
      { key: "messages_inbox",    name: "Messages / Inbox",   description: "Direct messages from church admin" },
      { key: "whatsapp_chat",     name: "WhatsApp Chat",      description: "Message the church directly on WhatsApp" },
      { key: "community_forum",   name: "Community Forum",    description: "Group messaging and community discussions" },
    ],
  },
  {
    label: "Community & Engagement",
    features: [
      { key: "testimonies",       name: "Testimonies",        description: "Read inspiring testimonies from members" },
      { key: "share_testimony",   name: "Share Testimony",    description: "Members can share what God has done" },
      { key: "opinion_box",       name: "Opinion Box",        description: "Share suggestions with church leadership" },
      { key: "surveys",           name: "Surveys",            description: "Participate in church surveys" },
      { key: "volunteer",         name: "Volunteer",          description: "View opportunities and sign up to serve" },
      { key: "volunteer_groups",  name: "Volunteer Groups",   description: "Browse and join ministry teams" },
      { key: "outreach_impact",   name: "Outreach Impact",    description: "Stories and data from outreach" },
      { key: "house_fellowships", name: "House Fellowships",  description: "Join and view home cell groups" },
    ],
  },
  {
    label: "Services & Support",
    features: [
      { key: "service_request",   name: "Service Request",    description: "Submit a request to the church" },
      { key: "counselling",       name: "Counselling",        description: "Book a pastoral session" },
      { key: "my_appointments",   name: "My Appointments",    description: "View scheduled counselling/meetings" },
      { key: "facility_booking",  name: "Facility Booking",   description: "Book church spaces for personal events" },
      { key: "resource_store",    name: "Resource Store",     description: "Books, courses, and materials" },
    ],
  },
  {
    label: "Events & Media",
    features: [
      { key: "events_services",   name: "Events & Services",  description: "Church services, events and programs" },
      { key: "watch_live",        name: "Watch Live",         description: "Join live stream services" },
      { key: "sermons_messages",  name: "Sermons & Messages", description: "Watch and listen to teachings" },
      { key: "church_media",      name: "Church Media",       description: "Videos, audio & photos" },
    ],
  },
  {
    label: "Spiritual Growth",
    features: [
      { key: "bible_explorer",        name: "Bible Explorer",         description: "Built-in Bible reading tool" },
      { key: "daily_devotionals",     name: "Daily Devotionals",      description: "Access daily Bible readings" },
      { key: "training_courses",      name: "Training & Courses",     description: "Enroll in discipleship/training programs" },
      { key: "discipleship_journey",  name: "Discipleship Journey",   description: "Track milestones, classes & resources" },
      { key: "sermon_notes",          name: "Sermon Notes",           description: "View and manage saved sermon notes" },
    ],
  },
];

const ALL_KEYS = FEATURE_GROUPS.flatMap(g => g.features.map(f => f.key));
const TOTAL = ALL_KEYS.length;

// Default: all enabled
function defaultModules(): Record<string, boolean> {
  return Object.fromEntries(ALL_KEYS.map(k => [k, true]));
}

export default function MemberAppFeatures() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [modules, setModules] = useState<Record<string, boolean>>(defaultModules());

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("enabled_modules")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!tenant) return;
    const saved = tenant.enabled_modules as Record<string, boolean> | null;
    if (saved && typeof saved === "object") {
      // Merge saved with defaults so new features default to true
      setModules({ ...defaultModules(), ...saved });
    }
  }, [tenant]);

  function toggle(key: string) {
    setModules(m => ({ ...m, [key]: !m[key] }));
  }

  function enableAll()  { setModules(defaultModules()); }
  function disableAll() { setModules(Object.fromEntries(ALL_KEYS.map(k => [k, false]))); }

  const activeCount = ALL_KEYS.filter(k => modules[k]).length;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.TENANTS)
        .update({ enabled_modules: modules, updated_at: new Date().toISOString() })
        .eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", tenantId] });
      toast.success("Member app features saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-3xl">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Member App Features — Vestry</title></Helmet>

      <div className="max-w-3xl pb-24 space-y-0">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <LayoutGrid className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Member App Features</h2>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
                    Control which features are visible to your members in the Member Services app. Home, Profile, and Inbox are always available.
                  </p>
                  <Badge className="mt-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">
                    {activeCount} of {TOTAL} features active
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={enableAll}>Enable All</Button>
                <Button variant="outline" size="sm" onClick={disableAll}>Disable All</Button>
              </div>
            </div>
          </div>

          {/* Feature groups */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {FEATURE_GROUPS.map(group => {
              const groupActive = group.features.filter(f => modules[f.key]).length;
              const groupTotal  = group.features.length;
              return (
                <div key={group.label}>
                  {/* Group header */}
                  <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-900/40">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      {group.label}
                    </p>
                    <span className="text-xs font-semibold text-orange-500">
                      {groupActive}/{groupTotal}
                    </span>
                  </div>

                  {/* Feature rows */}
                  {group.features.map(feature => (
                    <div
                      key={feature.key}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Orange dot icon */}
                      <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                        <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      </div>

                      {/* Name + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                          {feature.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-tight">{feature.description}</p>
                      </div>

                      {/* Toggle */}
                      <Switch
                        checked={!!modules[feature.key]}
                        onCheckedChange={() => toggle(feature.key)}
                        className="shrink-0"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Disabling a feature only hides it from the member app. No data is lost — re-enabling will restore the feature with all previous data intact.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
