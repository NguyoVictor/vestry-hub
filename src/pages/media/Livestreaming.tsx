import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Radio, Plus, ExternalLink, Trash2, Clock } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import ReactPlayer from "react-player";

const PLATFORMS: Record<string, string> = { youtube: "YouTube Live", zoom: "Zoom", facebook: "Facebook Live", rtmp: "Custom RTMP", other: "Other" };

const Livestreaming = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const form = useForm({ defaultValues: { title: "", platform: "youtube", stream_url: "", embed_url: "", description: "", scheduled_start: "", estimated_duration: 60, show_on_public_page: true, notify_members: true } });

  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["livestreams", church.tenantId],
    queryFn: async () => { const { data, error } = await supabase.from("livestreams").select("id, tenant_id, title, platform, stream_url, embed_url, chat_embed_url, linked_service_id, linked_event_id, scheduled_start, estimated_duration, description, show_on_public_page, notify_members, status, actual_start, actual_end, created_by, created_at, updated_at").order("scheduled_start", { ascending: false }); if (error) throw error; return data || []; },
  });

  const createStream = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("livestreams").insert({ ...values, tenant_id: church.tenantId, created_by: church.userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livestreams"] }); toast.success("Stream scheduled"); setFormOpen(false); form.reset(); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "live") updates.actual_start = new Date().toISOString();
      if (status === "ended") updates.actual_end = new Date().toISOString();
      const { error } = await supabase.from("livestreams").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livestreams"] }); toast.success("Stream updated"); },
  });

  const deleteStream = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("livestreams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livestreams"] }); toast.success("Stream deleted"); },
  });

  const liveStreams = streams.filter((s: any) => s.status === "live");
  const upcoming = streams.filter((s: any) => s.status === "scheduled");
  const past = streams.filter((s: any) => s.status === "ended" || s.status === "cancelled");

  return (
    <>
      <Helmet><title>Livestreaming — Vestry</title></Helmet>
      <PageHeader title="Livestreaming" subtitle="Manage and embed live streams for your church" action={<Button size="sm" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule Stream</Button>} />

      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">Active / Upcoming</TabsTrigger><TabsTrigger value="past">Past Streams</TabsTrigger></TabsList>

        <TabsContent value="active" className="mt-4 space-y-6">
          {liveStreams.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />Live Now</h3>
              {liveStreams.map((stream: any) => (
                <Card key={stream.id} className="border-destructive">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 mb-3"><Badge variant="destructive">🔴 LIVE</Badge><h3 className="font-semibold">{stream.title}</h3></div>
                    {stream.stream_url && ReactPlayer.canPlay(stream.stream_url) && (
                      <div className="aspect-video rounded-lg overflow-hidden mb-3"><ReactPlayer {...{url: stream.stream_url, width: "100%", height: "100%", controls: true} as any} /></div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(stream.stream_url, "_blank")}><ExternalLink className="mr-2 h-3.5 w-3.5" />Open Stream</Button>
                      <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate({ id: stream.id, status: "ended" })}>End Stream</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-3">Upcoming Streams</h3>
            {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div> :
            upcoming.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12"><Radio className="h-12 w-12 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">No upcoming streams</p><Button className="mt-3" variant="outline" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule</Button></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((stream: any) => (
                  <Card key={stream.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="rounded-lg bg-primary/10 p-3"><Radio className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{stream.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="secondary">{PLATFORMS[stream.platform]}</Badge>
                          {stream.scheduled_start && <span><Clock className="inline h-3.5 w-3.5 mr-1" />{format(new Date(stream.scheduled_start), "MMM d, yyyy · h:mm a")}</span>}
                          {stream.scheduled_start && new Date(stream.scheduled_start) > new Date() && <span className="text-primary">Starts {formatDistanceToNow(new Date(stream.scheduled_start), { addSuffix: true })}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: stream.id, status: "live" })}>Go Live</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteStream.mutate(stream.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {past.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No past streams</CardContent></Card> : (
            <div className="space-y-2">
              {past.map((stream: any) => (
                <Card key={stream.id}><CardContent className="flex items-center gap-4 py-3">
                  <div className="flex-1"><p className="font-medium text-sm">{stream.title}</p><p className="text-xs text-muted-foreground"><Badge variant="secondary" className="mr-2">{PLATFORMS[stream.platform]}</Badge>{stream.scheduled_start && format(new Date(stream.scheduled_start), "MMM d, yyyy")}</p></div>
                  <Badge variant={stream.status === "ended" ? "secondary" : "destructive"}>{stream.status}</Badge>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Schedule Stream</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(v => createStream.mutate(v))} className="mt-6 space-y-4">
            <div><Label>Stream Title *</Label><Input {...form.register("title", { required: true })} /></div>
            <div><Label>Platform</Label><Select value={form.watch("platform")} onValueChange={v => form.setValue("platform", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLATFORMS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Stream URL *</Label><Input {...form.register("stream_url", { required: true })} placeholder="https://youtube.com/live/..." /></div>
            <div><Label>Embed URL</Label><Input {...form.register("embed_url")} placeholder="Embed URL (optional)" /></div>
            <div><Label>Scheduled Start</Label><Input type="datetime-local" {...form.register("scheduled_start")} /></div>
            <div><Label>Estimated Duration (minutes)</Label><Input type="number" {...form.register("estimated_duration", { valueAsNumber: true })} /></div>
            <div><Label>Description</Label><Textarea {...form.register("description")} /></div>
            <div className="flex items-center justify-between"><Label>Show on Public Page</Label><Switch checked={form.watch("show_on_public_page")} onCheckedChange={v => form.setValue("show_on_public_page", v)} /></div>
            <div className="flex items-center justify-between"><Label>Notify Members</Label><Switch checked={form.watch("notify_members")} onCheckedChange={v => form.setValue("notify_members", v)} /></div>
            {form.watch("stream_url") && ReactPlayer.canPlay(form.watch("stream_url")) && (
              <div><Label>Preview</Label><div className="aspect-video rounded-lg overflow-hidden border"><ReactPlayer {...{url: form.watch("stream_url"), width: "100%", height: "100%", controls: false} as any} /></div></div>
            )}
            <Button type="submit" className="w-full" disabled={createStream.isPending}>Schedule Stream</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Livestreaming;
