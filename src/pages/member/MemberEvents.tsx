import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin, Clock, ArrowLeft, CheckCircle2, Share2,
  CalendarDays, Church, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "event" | "service";

interface FeedItem {
  id: string;
  type: ItemType;
  title: string;
  date: string;          // ISO date string YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  bannerUrl: string | null;
  serviceType: string | null; // for services
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string | null) {
  if (!t) return null;
  // t is "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function serviceTypeLabel(type: string | null) {
  if (!type) return "Service";
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Feed Item Card ───────────────────────────────────────────────────────────

function FeedCard({ item, memberId, churchId }: { item: FeedItem; memberId: string; churchId: string }) {
  const queryClient = useQueryClient();

  const { data: rsvp } = useQuery({
    queryKey: ["event-rsvp", item.id, memberId],
    queryFn: async () => {
      if (item.type !== "event") return null;
      const { data } = await supabase
        .from("event_rsvps")
        .select("id, status")
        .eq("event_id", item.id)
        .eq("member_id", memberId)
        .maybeSingle();
      return data;
    },
    enabled: item.type === "event",
    staleTime: 60_000,
  });

  const toggleRsvp = useMutation({
    mutationFn: async () => {
      if (rsvp?.status === "confirmed") {
        await supabase.from("event_rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
      } else if (rsvp) {
        await supabase.from("event_rsvps").update({ status: "confirmed" }).eq("id", rsvp.id);
      } else {
        await supabase.from(TABLES.EVENT_RSVPS).insert({
          event_id: item.id,
          tenant_id: churchId,
          member_id: memberId,
          status: "confirmed",
          rsvp_source: "self",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-rsvp", item.id, memberId] });
      const going = !(rsvp?.status === "confirmed");
      toast.success(going ? `You're going to ${item.title}!` : "RSVP cancelled");
    },
    onError: () => toast.error("Failed to update RSVP"),
  });

  const isGoing = rsvp?.status === "confirmed";
  const isEvent = item.type === "event";

  const dateObj = new Date(item.date + "T00:00:00");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Banner / date strip */}
      <div className={cn(
        "h-32 relative flex items-end p-4",
        isEvent
          ? "bg-gradient-to-br from-violet-500 to-indigo-600"
          : "bg-gradient-to-br from-orange-400 to-orange-600"
      )}>
        {item.bannerUrl && (
          <img src={item.bannerUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        {/* Date badge */}
        <div className="relative bg-white rounded-xl px-2.5 py-1.5 text-center shadow-sm min-w-[44px]">
          <p className={cn("text-[10px] font-semibold uppercase", isEvent ? "text-violet-600" : "text-orange-500")}>
            {format(dateObj, "MMM")}
          </p>
          <p className="text-lg font-bold text-slate-800 leading-none">{format(dateObj, "d")}</p>
        </div>
        {/* Type badge */}
        <div className="relative ml-auto">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white",
            isEvent ? "bg-violet-600/80" : "bg-orange-600/80"
          )}>
            {isEvent ? <Calendar className="h-3 w-3" /> : <Church className="h-3 w-3" />}
            {isEvent ? "Event" : serviceTypeLabel(item.serviceType)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{item.title}</h3>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {item.startTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(item.startTime)}
              {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* RSVP only for events */}
        {isEvent && (
          <Button
            size="sm"
            className={cn(
              "w-full rounded-full h-9 mt-1",
              isGoing ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
            onClick={() => toggleRsvp.mutate()}
            disabled={toggleRsvp.isPending}
          >
            {isGoing ? (
              <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Going</>
            ) : "RSVP"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabFilter = "all" | "services" | "events";
type TimeFilter = "upcoming" | "all_time" | "past";

export function MemberEvents() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabFilter>("all");

  const today = new Date().toISOString().split("T")[0];

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["member-events-feed", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.EVENTS)
        .select("id, title, event_date, start_time, end_time, location, description, banner_url")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq(COLS.EVENT_IS_PUBLISHED, true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(30);
      return (data ?? []).map((e: any): FeedItem => ({
        id: e.id,
        type: "event",
        title: e.title,
        date: e.event_date,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        description: e.description,
        bannerUrl: e.banner_url,
        serviceType: null,
      }));
    },
    staleTime: 300_000,
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["member-services-feed", member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.SERVICES)
        .select("id, name, service_date, start_time, end_time, location, description, service_type")
        .eq("tenant_id", member.churchId)
        .gte("service_date", today)
        .order("service_date", { ascending: true })
        .limit(30);
      return (data ?? []).map((s: any): FeedItem => ({
        id: s.id,
        type: "service",
        title: s.name,
        date: s.service_date,
        startTime: s.start_time,
        endTime: s.end_time,
        location: s.location ?? null,
        description: s.description ?? null,
        bannerUrl: null,
        serviceType: s.service_type,
      }));
    },
    staleTime: 300_000,
  });

  const isLoading = eventsLoading || servicesLoading;

  // Merge and sort by date
  const allItems: FeedItem[] = [...events, ...services].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const filtered = tab === "all" ? allItems : tab === "events" ? events : services;

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: allItems.length },
    { key: "services", label: "Services", count: services.length },
    { key: "events",   label: "Events",   count: events.length },
  ];

  return (
    <>
      <Helmet><title>Events & Services — {member.churchName}</title></Helmet>

      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            {/* Church name from context — never hardcoded */}
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{member.churchName}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              Upcoming Events & Services
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-5 mt-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {t.key === "services" && <Church className="h-3.5 w-3.5" />}
              {t.key === "events" && <Calendar className="h-3.5 w-3.5" />}
              {t.label}
              <span className={cn(
                "text-xs rounded-full px-1.5 py-0.5 font-semibold",
                tab === t.key ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
            <CalendarDays className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No upcoming {tab === "all" ? "events or services" : tab} at this time.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(item => (
              <FeedCard
                key={`${item.type}-${item.id}`}
                item={item}
                memberId={member.memberId}
                churchId={member.churchId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Event Detail (unchanged, kept for route compatibility) ───────────────────

export function MemberEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const member = useMemberPortal();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["member-event", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", eventId!).single();
      return data;
    },
    enabled: !!eventId,
    staleTime: 300_000,
  });

  const { data: rsvp } = useQuery({
    queryKey: ["event-rsvp", eventId, member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("event_rsvps").select("id, status").eq("event_id", eventId!).eq("member_id", member.memberId).maybeSingle();
      return data;
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });

  const toggleRsvp = useMutation({
    mutationFn: async () => {
      if (rsvp?.status === "confirmed") {
        await supabase.from("event_rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
      } else if (rsvp) {
        await supabase.from("event_rsvps").update({ status: "confirmed" }).eq("id", rsvp.id);
      } else {
        await supabase.from(TABLES.EVENT_RSVPS).insert({
          event_id: eventId,
          tenant_id: member.churchId,
          member_id: member.memberId,
          status: "confirmed",
          rsvp_source: "self",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-rsvp", eventId, member.memberId] });
      toast.success(rsvp?.status === "confirmed" ? "RSVP cancelled" : `You're going to ${event?.title}!`);
    },
    onError: () => toast.error("Failed to update RSVP"),
  });

  const share = () => {
    if (navigator.share) navigator.share({ title: event?.title, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
  };

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!event) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Event not found</p>
      <Button variant="outline" asChild className="mt-4">
        <Link to="/member/events"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
      </Button>
    </div>
  );

  const isGoing = rsvp?.status === "confirmed";

  return (
    <>
      <Helmet><title>{event.title} — {member.churchName}</title></Helmet>
      <div className="max-w-lg mx-auto space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/member/events"><ArrowLeft className="h-4 w-4" />Events & Services</Link>
        </Button>
        <div className="h-48 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl overflow-hidden">
          {event.banner_url && <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {format(new Date(event.event_date), "EEEE, dd MMM yyyy")}
              {event.start_time ? ` · ${event.start_time}` : ""}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>
            )}
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          )}
          <div className="flex gap-3">
            <Button
              className={cn("flex-1 h-12 rounded-full", isGoing ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700")}
              onClick={() => toggleRsvp.mutate()}
              disabled={toggleRsvp.isPending}
            >
              {isGoing ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Going</> : "RSVP for this Event"}
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={share}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
