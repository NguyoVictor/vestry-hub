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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, Mic2, Video, Play, MoreVertical, Trash2, Download, Clock, HardDrive, Search } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";

const ChurchStudio = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const form = useForm({ defaultValues: { title: "", media_type: "audio", speaker: "", scripture_reference: "", description: "", status: "published" } });

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["studio_media", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("studio_media").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: series = [] } = useQuery({
    queryKey: ["sermon_series", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("sermon_series").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createMedia = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("studio_media").insert({ ...values, tenant_id: church.tenantId, created_by: church.userId, file_url: values.file_url || "pending" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studio_media"] }); toast.success("Media added"); setUploadOpen(false); form.reset(); },
  });

  const deleteMedia = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("studio_media").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studio_media"] }); toast.success("Media deleted"); },
  });

  const filtered = media.filter((m: any) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalDuration = media.reduce((s: number, m: any) => s + (m.duration_seconds || 0), 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${church.tenantId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("sermon-recordings").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("sermon-recordings").getPublicUrl(path);
    form.setValue("file_url" as any, publicUrl);
    toast.success("File uploaded");
  };

  return (
    <>
      <Helmet><title>Church Studio — Vestry</title></Helmet>
      <PageHeader title="Church Studio" subtitle="Your audio and video sermon library" action={<Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload Media</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2.5"><Mic2 className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{media.length}</p><p className="text-sm text-muted-foreground">Total Sermons</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-500/10 p-2.5"><Clock className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m</p><p className="text-sm text-muted-foreground">Total Duration</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2.5"><HardDrive className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{(media.reduce((s: number, m: any) => s + (Number(m.file_size) || 0), 0) / 1024 / 1024).toFixed(1)} MB</p><p className="text-sm text-muted-foreground">Storage Used</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="all">
        <div className="flex items-center gap-3 mb-4">
          <TabsList><TabsTrigger value="all">All Media</TabsTrigger><TabsTrigger value="series">Series</TabsTrigger></TabsList>
          <div className="relative flex-1 ml-auto max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
        </div>

        <TabsContent value="all">
          {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div> :
          filtered.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16"><Mic2 className="h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold text-lg">No media yet</h3><p className="text-sm text-muted-foreground mt-1">Upload your first sermon recording</p><Button className="mt-4" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload Media</Button></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((m: any) => (
                <Card key={m.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center gap-4 py-3">
                    <div className={`rounded-lg p-2.5 ${m.media_type === "video" ? "bg-violet-500/10" : "bg-primary/10"}`}>
                      {m.media_type === "video" ? <Video className="h-5 w-5 text-violet-500" /> : <Mic2 className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.speaker && <span className="text-xs text-muted-foreground">{m.speaker}</span>}
                        {m.recording_date && <span className="text-xs text-muted-foreground">· {format(new Date(m.recording_date), "MMM d, yyyy")}</span>}
                      </div>
                    </div>
                    <Badge variant="secondary">{m.media_type}</Badge>
                    {m.duration_seconds && <span className="text-xs text-muted-foreground">{Math.floor(m.duration_seconds / 60)}:{String(m.duration_seconds % 60).padStart(2, "0")}</span>}
                    <Badge variant={m.status === "published" ? "default" : "secondary"}>{m.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {m.file_url && m.file_url !== "pending" && <DropdownMenuItem onClick={() => window.open(m.file_url, "_blank")}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMedia.mutate(m.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="series">
          {series.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16"><p className="text-muted-foreground">No sermon series yet</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {series.map((s: any) => (
                <Card key={s.id}><CardContent className="pt-5"><h3 className="font-semibold">{s.title}</h3><p className="text-sm text-muted-foreground mt-1">{s.description}</p>{s.start_date && <p className="text-xs text-muted-foreground mt-2">{format(new Date(s.start_date), "MMM yyyy")}</p>}</CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Upload Media</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(v => createMedia.mutate(v))} className="mt-6 space-y-4">
            <div><Label>Title *</Label><Input {...form.register("title", { required: true })} placeholder="Sermon title" /></div>
            <div><Label>Media Type</Label><Select value={form.watch("media_type")} onValueChange={v => form.setValue("media_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="audio">Audio</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent></Select></div>
            <div><Label>File</Label><Input type="file" accept="audio/*,video/*" onChange={handleFileUpload} /></div>
            <div><Label>Speaker</Label><Input {...form.register("speaker")} placeholder="Speaker name" /></div>
            <div><Label>Scripture Reference</Label><Input {...form.register("scripture_reference")} placeholder="e.g. John 3:16" /></div>
            <div><Label>Description</Label><Textarea {...form.register("description")} /></div>
            <div><Label>Status</Label><Select value={form.watch("status")} onValueChange={v => form.setValue("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="published">Published</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
            <Button type="submit" className="w-full" disabled={createMedia.isPending}>Save Media</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ChurchStudio;
