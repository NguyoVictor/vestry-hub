import { useState } from "react";
import ReactPlayer from "react-player";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResourceCard, DiscipleshipResource } from "@/components/growth/ResourceCard";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DataTable, Column } from "@/components/shared/DataTable";
import { format } from "date-fns";
import { Upload, FolderOpen, BookOpen, Users, Star, Plus, Search, GripVertical, FileText, Video, Music, File, Link as LinkIcon } from "lucide-react";

const RESOURCE_TYPES = ["pdf", "video", "audio", "document", "external_link"] as const;
const CATEGORIES = ["bible_study", "prayer", "salvation", "christian_living", "giving", "service", "leadership", "evangelism", "other"];
const STAGES = [1, 2, 3, 4];

const defaultForm = {
  title: "", type: "pdf" as string, file_url: "", external_url: "", thumbnail_url: "",
  category: "bible_study", recommended_stages: [1] as number[], description: "",
  duration_label: "", tags: "", is_downloadable: true, author: "",
};

const defaultCollection = { name: "", description: "", recommended_stage: 1, resource_ids: [] as string[] };

function SortableResourceItem({ id, resource }: { id: string; resource: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-lg bg-white dark:bg-slate-800">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm flex-1 truncate">{resource?.title}</span>
      <Badge variant="outline" className="text-xs capitalize">{resource?.type?.replace("_", " ")}</Badge>
    </div>
  );
}

export default function DiscipleshipResources() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [uploadSheet, setUploadSheet] = useState(false);
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [viewSheet, setViewSheet] = useState<{ open: boolean; resource?: DiscipleshipResource }>({ open: false });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; resourceId?: string }>({ open: false });
  const [form, setForm] = useState(defaultForm);
  const [colForm, setColForm] = useState(defaultCollection);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [assignConvertId, setAssignConvertId] = useState("");
  const [collectionDetailSheet, setCollectionDetailSheet] = useState<{ open: boolean; collection?: any }>({ open: false });
  const [collectionAssignConvertId, setCollectionAssignConvertId] = useState("");
  const [collectionAssignStage, setCollectionAssignStage] = useState("");

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["discipleship-resources", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("discipleship_resources").select("*").eq("church_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiscipleshipResource[];
    },
    enabled: !!tenantId,
  });

  const { data: collections = [], isLoading: colLoading } = useQuery({
    queryKey: ["resource-collections", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("resource_collections").select("*, collection_resources(count)").eq("church_id", tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: converts = [] } = useQuery({
    queryKey: ["converts-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("new_converts").select("id, first_name, last_name, discipleship_stage").eq("church_id", tenantId).is("graduated_at", null);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: assignmentHistory = [] } = useQuery({
    queryKey: ["resource-assignments", viewSheet.resource?.id],
    queryFn: async () => {
      if (!viewSheet.resource?.id) return [];
      const { data } = await supabase
        .from("resource_assignments")
        .select("*, new_converts(first_name, last_name, discipleship_stage)")
        .eq("resource_id", viewSheet.resource.id)
        .order("assigned_at", { ascending: false });
      return data || [];
    },
    enabled: !!viewSheet.resource?.id,
  });

  const { data: collectionResources = [] } = useQuery({
    queryKey: ["collection-resources-detail", collectionDetailSheet.collection?.id],
    queryFn: async () => {
      if (!collectionDetailSheet.collection?.id) return [];
      const { data } = await supabase
        .from("collection_resources")
        .select("*, discipleship_resources(*)")
        .eq("collection_id", collectionDetailSheet.collection.id)
        .order("position", { ascending: true });
      return data || [];
    },
    enabled: !!collectionDetailSheet.collection?.id,
  });

  const stats = {
    total: resources.length,
    assignments: resources.reduce((a, r) => a + (r.assignment_count || 0), 0),
    mostUsed: resources.sort((a, b) => (b.assignment_count || 0) - (a.assignment_count || 0))[0]?.title || "—",
  };

  const filtered = resources.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchStage = stageFilter === "all" || r.recommended_stages?.includes(Number(stageFilter));
    return matchSearch && matchType && matchStage;
  });

  const createResource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discipleship_resources").insert({
        ...form,
        church_id: tenantId,
        created_by: userId,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      setUploadSheet(false);
      setForm(defaultForm);
      toast.success("Resource uploaded");
    },
    onError: () => toast.error("Failed to upload resource"),
  });

  const assignResource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("resource_assignments").insert({
        resource_id: assignDialog.resourceId,
        convert_id: assignConvertId,
        church_id: tenantId,
        assigned_by: userId,
      });
      if (error) throw error;
      await supabase.from("discipleship_resources").update({ assignment_count: (resources.find(r => r.id === assignDialog.resourceId)?.assignment_count || 0) + 1 }).eq("id", assignDialog.resourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      setAssignDialog({ open: false });
      setAssignConvertId("");
      toast.success("Resource assigned");
    },
    onError: () => toast.error("Failed to assign resource"),
  });

  const assignAllStage = useMutation({
    mutationFn: async ({ resourceId, stage }: { resourceId: string; stage: number }) => {
      const stageConverts = converts.filter((c: any) => (c.discipleship_stage || 1) === stage);
      if (stageConverts.length === 0) return;
      const inserts = stageConverts.map((c: any) => ({
        resource_id: resourceId,
        convert_id: c.id,
        church_id: tenantId,
        assigned_by: userId,
      }));
      const { error } = await supabase.from("resource_assignments").upsert(inserts, { onConflict: "resource_id,convert_id", ignoreDuplicates: true });
      if (error) throw error;
      await supabase.from("discipleship_resources").update({ assignment_count: (resources.find(r => r.id === resourceId)?.assignment_count || 0) + stageConverts.length }).eq("id", resourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      toast.success("Resource assigned to all stage converts");
    },
    onError: () => toast.error("Failed to batch assign"),
  });

  const assignCollectionToConvert = useMutation({
    mutationFn: async ({ collectionId, convertId }: { collectionId: string; convertId: string }) => {
      const { data: colResources } = await supabase.from("collection_resources").select("resource_id").eq("collection_id", collectionId);
      if (!colResources?.length) return;
      const inserts = colResources.map(cr => ({
        resource_id: cr.resource_id,
        convert_id: convertId,
        church_id: tenantId,
        assigned_by: userId,
      }));
      const { error } = await supabase.from("resource_assignments").upsert(inserts, { onConflict: "resource_id,convert_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Collection assigned to convert");
      setCollectionAssignConvertId("");
    },
    onError: () => toast.error("Failed to assign collection"),
  });

  const assignCollectionToStage = useMutation({
    mutationFn: async ({ collectionId, stage }: { collectionId: string; stage: number }) => {
      const { data: colResources } = await supabase.from("collection_resources").select("resource_id").eq("collection_id", collectionId);
      const stageConverts = converts.filter((c: any) => (c.discipleship_stage || 1) === stage);
      if (!colResources?.length || !stageConverts.length) return;
      const inserts = colResources.flatMap(cr => stageConverts.map((c: any) => ({
        resource_id: cr.resource_id,
        convert_id: c.id,
        church_id: tenantId,
        assigned_by: userId,
      })));
      const { error } = await supabase.from("resource_assignments").upsert(inserts, { onConflict: "resource_id,convert_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Collection assigned to all stage converts");
      setCollectionAssignStage("");
    },
    onError: () => toast.error("Failed to assign collection"),
  });

  const reorderCollectionResources = useMutation({
    mutationFn: async ({ collectionId, items }: { collectionId: string; items: { id: string; position: number }[] }) => {
      for (const item of items) {
        await supabase.from("collection_resources").update({ position: item.position }).eq("id", item.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collection-resources-detail"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent, items: any[], collectionId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    reorderCollectionResources.mutate({ collectionId, items: reordered.map((item, idx) => ({ id: item.id, position: idx })) });
  };

  const assignmentColumns: Column<any>[] = [
    { key: "convert", header: "Convert", render: r => <div className="flex items-center gap-2"><MemberAvatar name={`${r.new_converts?.first_name} ${r.new_converts?.last_name}`} size="sm" /><span className="text-sm">{r.new_converts?.first_name} {r.new_converts?.last_name}</span></div> },
    { key: "stage", header: "Stage", render: r => <Badge variant="outline" className="text-xs">Stage {r.new_converts?.discipleship_stage || 1}</Badge> },
    { key: "assigned_at", header: "Assigned", render: r => <span className="text-sm text-muted-foreground">{format(new Date(r.assigned_at), "dd MMM yyyy")}</span> },
    { key: "completion_status", header: "Status", render: r => <Badge className={`text-xs capitalize ${r.completion_status === "completed" ? "bg-emerald-100 text-emerald-700" : r.completion_status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{r.completion_status?.replace(/_/g, " ")}</Badge> },
  ];

  const createCollection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("resource_collections").insert({
        name: colForm.name,
        description: colForm.description,
        recommended_stage: colForm.recommended_stage,
        church_id: tenantId,
        created_by: userId,
      }).select().single();
      if (error) throw error;
      if (colForm.resource_ids.length > 0) {
        await supabase.from("collection_resources").insert(
          colForm.resource_ids.map((rid, i) => ({ collection_id: data.id, resource_id: rid, position: i }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collections", tenantId] });
      setCollectionDialog(false);
      setColForm(defaultCollection);
      toast.success("Collection created");
    },
    onError: () => toast.error("Failed to create collection"),
  });

  return (
    <>
      <Helmet><title>Discipleship Resources — Vestry</title></Helmet>
      <PageHeader
        title="Discipleship Resources"
        subtitle="Upload and manage materials for new believers"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCollectionDialog(true)}><FolderOpen className="h-4 w-4 mr-1" />Create Collection</Button>
            <Button onClick={() => setUploadSheet(true)}><Upload className="h-4 w-4 mr-1" />Upload Resource</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Resources", value: stats.total, icon: BookOpen, color: "indigo" },
          { label: "Total Assignments", value: stats.assignments, icon: Users, color: "emerald" },
          { label: "Most Used", value: stats.mostUsed, icon: Star, color: "amber" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30 shrink-0`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold truncate max-w-[160px]">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="resources">
        <TabsList className="mb-4">
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {RESOURCE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map(s => <SelectItem key={s} value={String(s)}>Stage {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No resources found</p>
              <p className="text-sm mt-1">Upload your first discipleship resource to get started</p>
              <Button className="mt-4" onClick={() => setUploadSheet(true)}><Upload className="h-4 w-4 mr-1" />Upload Resource</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(r => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  onView={() => setViewSheet({ open: true, resource: r })}
                  onAssign={() => setAssignDialog({ open: true, resourceId: r.id })}
                  onDownload={r.is_downloadable && r.file_url ? () => window.open(r.file_url!, "_blank") : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections">
          {colLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No collections yet</p>
              <Button className="mt-4" onClick={() => setCollectionDialog(true)}><Plus className="h-4 w-4 mr-1" />Create Collection</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{c.name}</h3>
                      <Badge variant="outline">Stage {c.recommended_stage}</Badge>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mb-3">{c.collection_resources?.[0]?.count || 0} resources</p>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setCollectionDetailSheet({ open: true, collection: c })}>View Collection</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Resource Sheet */}
      <Sheet open={uploadSheet} onOpenChange={setUploadSheet}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Upload Resource</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={150} />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.type === "external_link" ? (
              <div className="space-y-1.5">
                <Label>External URL</Label>
                <Input type="url" value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>File URL</Label>
                <Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="Paste Supabase Storage URL" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recommended Stages</Label>
              <div className="flex gap-2">
                {STAGES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recommended_stages: f.recommended_stages.includes(s) ? f.recommended_stages.filter(x => x !== s) : [...f.recommended_stages, s] }))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${form.recommended_stages.includes(s) ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"}`}
                  >
                    Stage {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} maxLength={500} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input value={form.duration_label} onChange={e => setForm(f => ({ ...f, duration_label: e.target.value }))} placeholder="e.g. 45 mins, 15 pages" />
            </div>
            <div className="space-y-1.5">
              <Label>Author / Source</Label>
              <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="faith, prayer, basics" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_downloadable} onCheckedChange={v => setForm(f => ({ ...f, is_downloadable: v }))} />
              <Label>Allow Download</Label>
            </div>
            <Button className="w-full" onClick={() => createResource.mutate()} disabled={!form.title || createResource.isPending}>
              {createResource.isPending ? "Uploading..." : "Upload Resource"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* View Resource Sheet */}
      <Sheet open={viewSheet.open} onOpenChange={o => setViewSheet({ open: o })}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
          <SheetHeader><SheetTitle>{viewSheet.resource?.title}</SheetTitle></SheetHeader>
          {viewSheet.resource && (
            <div className="mt-6 space-y-6">
              {/* Preview */}
              <div className="rounded-lg overflow-hidden border bg-slate-50 dark:bg-slate-900">
                {viewSheet.resource.type === "pdf" && viewSheet.resource.file_url && (
                  <iframe src={viewSheet.resource.file_url} className="w-full h-64" title={viewSheet.resource.title} />
                )}
                {viewSheet.resource.type === "video" && viewSheet.resource.file_url && (
                  <div className="aspect-video"><ReactPlayer url={viewSheet.resource.file_url} width="100%" height="100%" controls /></div>
                )}
                {viewSheet.resource.type === "audio" && viewSheet.resource.file_url && (
                  <div className="p-4"><audio controls className="w-full"><source src={viewSheet.resource.file_url} /></audio></div>
                )}
                {viewSheet.resource.type === "document" && viewSheet.resource.file_url && (
                  <div className="p-4 flex items-center gap-3">
                    <FileText className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="font-medium text-sm">{viewSheet.resource.title}</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => window.open(viewSheet.resource!.file_url!, "_blank")}>Download</Button>
                    </div>
                  </div>
                )}
                {viewSheet.resource.type === "external_link" && viewSheet.resource.external_url && (
                  <div className="p-4 flex items-center gap-3">
                    <LinkIcon className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="text-sm text-muted-foreground truncate">{viewSheet.resource.external_url}</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => window.open(viewSheet.resource!.external_url!, "_blank")}>Open Link</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{viewSheet.resource.type.replace("_", " ")}</Badge>
                <Badge variant="outline" className="capitalize">{viewSheet.resource.category.replace(/_/g, " ")}</Badge>
                {viewSheet.resource.recommended_stages?.map(s => <Badge key={s} variant="outline">Stage {s}</Badge>)}
                {viewSheet.resource.duration_label && <Badge variant="outline">{viewSheet.resource.duration_label}</Badge>}
              </div>
              {viewSheet.resource.description && <p className="text-sm text-muted-foreground">{viewSheet.resource.description}</p>}
              {viewSheet.resource.author && <p className="text-xs text-muted-foreground">By {viewSheet.resource.author}</p>}

              {/* Assignment history */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Assignment History ({assignmentHistory.length})</h3>
                <DataTable data={assignmentHistory} columns={assignmentColumns} getRowId={r => r.id} emptyTitle="Not assigned yet" />
              </div>

              {/* Assign actions */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex gap-2">
                  <Select value={assignConvertId} onValueChange={setAssignConvertId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Assign to convert..." /></SelectTrigger>
                    <SelectContent>
                      {converts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { setAssignDialog({ open: true, resourceId: viewSheet.resource!.id }); }} disabled={!assignConvertId}>Assign</Button>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={v => assignAllStage.mutate({ resourceId: viewSheet.resource!.id, stage: Number(v) })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Assign to all Stage X converts..." /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(s => <SelectItem key={s} value={String(s)}>All Stage {s} Converts</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={o => setAssignDialog({ open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Resource</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Select Convert</Label>
              <Select value={assignConvertId} onValueChange={setAssignConvertId}>
                <SelectTrigger><SelectValue placeholder="Choose a convert..." /></SelectTrigger>
                <SelectContent>
                  {converts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                        {c.first_name} {c.last_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => assignResource.mutate()} disabled={!assignConvertId || assignResource.isPending}>
              {assignResource.isPending ? "Assigning..." : "Assign Resource"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Collection Dialog */}
      <Dialog open={collectionDialog} onOpenChange={setCollectionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Collection</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Collection Name *</Label>
              <Input value={colForm.name} onChange={e => setColForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={colForm.description} onChange={e => setColForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Recommended Stage</Label>
              <Select value={String(colForm.recommended_stage)} onValueChange={v => setColForm(f => ({ ...f, recommended_stage: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s} value={String(s)}>Stage {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resources</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {resources.map(r => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                    <input
                      type="checkbox"
                      checked={colForm.resource_ids.includes(r.id)}
                      onChange={e => setColForm(f => ({ ...f, resource_ids: e.target.checked ? [...f.resource_ids, r.id] : f.resource_ids.filter(id => id !== r.id) }))}
                      className="rounded"
                    />
                    <span className="text-sm">{r.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => createCollection.mutate()} disabled={!colForm.name || createCollection.isPending}>
              {createCollection.isPending ? "Creating..." : "Create Collection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Collection Detail Sheet */}
      <Sheet open={collectionDetailSheet.open} onOpenChange={o => setCollectionDetailSheet({ open: o })}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{collectionDetailSheet.collection?.name}</SheetTitle></SheetHeader>
          {collectionDetailSheet.collection && (
            <div className="mt-6 space-y-6">
              {collectionDetailSheet.collection.description && (
                <p className="text-sm text-muted-foreground">{collectionDetailSheet.collection.description}</p>
              )}
              <Badge variant="outline">Stage {collectionDetailSheet.collection.recommended_stage}</Badge>

              {/* Draggable resource list */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Resources ({collectionResources.length})</h3>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, collectionResources, collectionDetailSheet.collection.id)}>
                  <SortableContext items={collectionResources.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {collectionResources.map((cr: any) => (
                        <SortableResourceItem key={cr.id} id={cr.id} resource={cr.discipleship_resources} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Assign collection to convert */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold text-sm">Assign Collection</h3>
                <div className="flex gap-2">
                  <Select value={collectionAssignConvertId} onValueChange={setCollectionAssignConvertId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Assign to convert..." /></SelectTrigger>
                    <SelectContent>
                      {converts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => assignCollectionToConvert.mutate({ collectionId: collectionDetailSheet.collection.id, convertId: collectionAssignConvertId })} disabled={!collectionAssignConvertId || assignCollectionToConvert.isPending}>
                    Assign
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={collectionAssignStage} onValueChange={setCollectionAssignStage}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Assign to all Stage X converts..." /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(s => <SelectItem key={s} value={String(s)}>All Stage {s} Converts</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => assignCollectionToStage.mutate({ collectionId: collectionDetailSheet.collection.id, stage: Number(collectionAssignStage) })} disabled={!collectionAssignStage || assignCollectionToStage.isPending}>
                    Assign All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
