import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, Clock, Users, Share2, ArrowLeft, CheckCircle2 } from "lucide-react";

function EventCard({ event, memberId, churchId }: { event: any; memberId: string; churchId: string }) {
  const queryClient = useQueryClient();

  const { data: rsvp } = useQuery({
    queryKey: ["event-rsvp", event.id, memberId],
    queryFn: async () => {
      const { data } = await supabase.from("event_rsvps").select("id, status").eq("event_id", event.id).eq("member_id", memberId).maybeSingle();
      return data;
    },
  });

  const toggleRsvp = useMutation({
    mutationFn: async () => {
      if (rsvp?.status === "confirmed") {
        await supabase.from("event_rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
      } else if (rsvp) {
        await supabase.from("event_rsvps").update({ status: "confirmed" }).eq("id", rsvp.id);
      } else {
        await supabase.from("event_rsvps").insert({ event_id: event.id, church_id: churchId, member_id: memberId, status: "confirmed", rsvp_source: "self" });
        await supabase.from("activity_log").insert({ church_id: churchId, action_type: "event_rsvp", description: `RSVP for ${event.title}`, entity_id: event.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-rsvp", event.id, memberId] });
      const isNowGoing = !(rsvp?.status === "confirmed");
      if (isNowGoing) toast.success(`You're going to ${event.title}!`);
    },
    onError: () => toast.error("Failed to update RSVP"),
  });

  const isGoing = rsvp?.status === "confirmed";

  return (
    <Link to={`/member/events/${event.id}`} className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="h-36 bg-gradient-to-br from-indigo-400 to-indigo-600 relative">
        {event.banner_url && <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-white rounded-xl px-2 py-1 text-center shadow-sm">
          <p className="text-xs font-medium text-indigo-600 uppercase">{format(new Date(event.event_date), "MMM")}</p>
          <p className="text-lg font-bold text-slate-800 leading-none">{format(new Date(event.event_date), "d")}</p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold">{event.title}</h3>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {event.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.start_time}</span>}
          {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
        </div>
        <Button
          size="sm"
          className={`w-full rounded-full h-9 ${isGoing ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
          onClick={e => { e.preventDefault(); toggleRsvp.mutate(); }}
          disabled={toggleRsvp.isPending}
        >
          {isGoing ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Going</> : "RSVP"}
        </Button>
      </div>
    </Link>
  );
}

export function MemberEvents() {
  const member = useMemberPortal();
  const [filter, setFilter] = useState("upcoming");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["member-events", member.churchId, filter],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let q = supabase.from("events").select("*").eq("church_id", member.churchId).eq("status", "published");
      if (filter === "upcoming") q = q.gte("event_date", today).order("event_date", { ascending: true });
      else q = q.lt("event_date", today).order("event_date", { ascending: false });
      const { data } = await q.limit(20);
      return data || [];
    },
  });

  return (
    <>
      <Helmet><title>Events — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex gap-2">
          {["upcoming", "past"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>{f}</button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}</div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No {filter} events</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(e => <EventCard key={e.id} event={e} memberId={member.memberId} churchId={member.churchId} />)}
          </div>
        )}
      </div>
    </>
  );
}

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
  });

  const { data: rsvp } = useQuery({
    queryKey: ["event-rsvp", eventId, member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from("event_rsvps").select("id, status").eq("event_id", eventId!).eq("member_id", member.memberId).maybeSingle();
      return data;
    },
    enabled: !!eventId,
  });

  const toggleRsvp = useMutation({
    mutationFn: async () => {
      if (rsvp?.status === "confirmed") {
        await supabase.from("event_rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
      } else if (rsvp) {
        await supabase.from("event_rsvps").update({ status: "confirmed" }).eq("id", rsvp.id);
      } else {
        await supabase.from("event_rsvps").insert({ event_id: eventId, church_id: member.churchId, member_id: member.memberId, status: "confirmed", rsvp_source: "self" });
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
  if (!event) return <div className="text-center py-16 text-muted-foreground"><p>Event not found</p><Button variant="outline" asChild className="mt-4"><Link to="/member/events"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button></div>;

  const isGoing = rsvp?.status === "confirmed";

  return (
    <>
      <Helmet><title>{event.title} — Vestry</title></Helmet>
      <div className="max-w-lg mx-auto space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1"><Link to="/member/events"><ArrowLeft className="h-4 w-4" />Events</Link></Button>
        <div className="h-48 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl overflow-hidden">
          {event.banner_url && <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{format(new Date(event.event_date), "EEEE, dd MMM yyyy")}{event.start_time ? ` · ${event.start_time}` : ""}</span>
            {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>}
          </div>
          {event.description && <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>}
          <div className="flex gap-3">
            <Button className={`flex-1 h-12 rounded-full ${isGoing ? "bg-emerald-600 hover:bg-emerald-700" : ""}`} onClick={() => toggleRsvp.mutate()} disabled={toggleRsvp.isPending}>
              {isGoing ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Going</> : "RSVP for this Event"}
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={share}><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </>
  );
}
