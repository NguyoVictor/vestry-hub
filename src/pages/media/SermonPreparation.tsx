import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenLine, Plus, Save, Search, Trash2, FileText } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = { draft: "secondary", ready: "default", published: "default", archived: "outline" };

const SermonPreparation = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [selectedSermon, setSelectedSermon] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [manuscript, setManuscript] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [speaker, setSpeaker] = useState("");

  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ["sermons", church.tenantId],
    queryFn: async () => { const { data, error } = await supabase.from("sermons").select("*").order("created_at", { ascending: false }); if (error) throw error; return data || []; },
  });

  const saveSermon = useMutation({
    mutationFn: async () => {
      const payload = { title, scripture_reference: scripture, introduction, conclusion, manuscript, notes, status, speaker, tenant_id: church.tenantId, created_by: church.userId };
      if (selectedSermon?.id) {
        const { error } = await supabase.from("sermons").update(payload).eq("id", selectedSermon.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sermons").insert(payload).select().single();
        if (error) throw error;
        setSelectedSermon(data);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sermons"] }); toast.success("Sermon saved"); },
  });

  const deleteSermon = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sermons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sermons"] }); toast.success("Sermon deleted"); setSelectedSermon(null); },
  });

  const selectSermon = (sermon: any) => {
    setSelectedSermon(sermon);
    setTitle(sermon.title || "");
    setScripture(sermon.scripture_reference || "");
    setIntroduction(sermon.introduction || "");
    setConclusion(sermon.conclusion || "");
    setManuscript(sermon.manuscript || "");
    setNotes(sermon.notes || "");
    setStatus(sermon.status || "draft");
    setSpeaker(sermon.speaker || "");
  };

  const createNew = () => {
    setSelectedSermon({});
    setTitle(""); setScripture(""); setIntroduction(""); setConclusion(""); setManuscript(""); setNotes(""); setStatus("draft"); setSpeaker("");
  };

  const filtered = sermons.filter((s: any) => {
    if (filter !== "all" && s.status !== filter) return false;
    return s.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <Helmet><title>Sermon Preparation — Vestry</title></Helmet>
      <PageHeader title="Sermon Preparation" subtitle="Draft, organize and prepare your sermons" action={<Button size="sm" onClick={createNew}><Plus className="mr-2 h-4 w-4" />New Sermon</Button>} />

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
            <div className="flex gap-1 flex-wrap">
              {["all", "draft", "ready", "published"].map(f => (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilter(f)}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</Button>
              ))}
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-100px)] mt-3">
            {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div> :
            filtered.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No sermons</p> :
            filtered.map((s: any) => (
              <Card key={s.id} className={`mb-2 cursor-pointer hover:shadow-sm transition-shadow ${selectedSermon?.id === s.id ? "ring-2 ring-primary" : ""}`} onClick={() => selectSermon(s)}>
                <CardContent className="py-3 px-3">
                  <p className="font-medium text-sm truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={STATUS_COLORS[s.status] as any || "secondary"} className="text-xs">{s.status}</Badge>
                    {s.created_at && <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d")}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>

        <div className="flex-1 min-w-0">
          {!selectedSermon ? (
            <Card className="h-full flex items-center justify-center"><CardContent className="text-center"><PenLine className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold text-lg">Select a sermon to edit</h3><p className="text-sm text-muted-foreground mt-1">Or create a new one</p><Button className="mt-4" onClick={createNew}><Plus className="mr-2 h-4 w-4" />New Sermon</Button></CardContent></Card>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sermon Title..." className="text-xl font-bold border-0 p-0 h-auto focus-visible:ring-0 shadow-none" />
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select>
                    <Button size="sm" onClick={() => saveSermon.mutate()} disabled={saveSermon.isPending}><Save className="mr-2 h-3.5 w-3.5" />Save</Button>
                    {selectedSermon.id && <Button size="sm" variant="destructive" onClick={() => deleteSermon.mutate(selectedSermon.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <Tabs defaultValue="outline">
                  <TabsList><TabsTrigger value="outline">Outline</TabsTrigger><TabsTrigger value="manuscript">Manuscript</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
                  <TabsContent value="outline" className="space-y-4 mt-4">
                    <div><Label>Scripture Reference</Label><Input value={scripture} onChange={e => setScripture(e.target.value)} placeholder="e.g. John 15:1-8" /></div>
                    <div><Label>Speaker</Label><Input value={speaker} onChange={e => setSpeaker(e.target.value)} placeholder="Speaker name" /></div>
                    <div><Label>Introduction</Label><Textarea value={introduction} onChange={e => setIntroduction(e.target.value)} rows={4} placeholder="Sermon introduction..." /></div>
                    <div><Label>Conclusion</Label><Textarea value={conclusion} onChange={e => setConclusion(e.target.value)} rows={4} placeholder="Sermon conclusion..." /></div>
                  </TabsContent>
                  <TabsContent value="manuscript" className="mt-4">
                    <Textarea value={manuscript} onChange={e => setManuscript(e.target.value)} rows={20} placeholder="Write your full sermon manuscript here..." className="min-h-[400px]" />
                  </TabsContent>
                  <TabsContent value="notes" className="mt-4">
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={15} placeholder="Private notes, research, illustrations..." className="min-h-[300px]" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default SermonPreparation;
