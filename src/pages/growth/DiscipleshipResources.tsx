import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen, FileText, Video, Link as LinkIcon, GraduationCap,
  Search, Plus, Trash2, Upload, X, FolderOpen, Eye, Download, UserPlus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ResourceType = "document" | "video" | "link" | "lesson";

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  resource_type: ResourceType;
  // legacy column kept for compatibility
  type?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  video_url?: string | null;
  lesson_content?: string | null;
  category_id?: string | null;
  duration_minutes?: number | null;
  sequence_order?: number;
  is_required?: boolean;
  is_published?: boolean;
  tenant_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  tenant_id: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META: Record<ResourceType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  document: { label: "Document", icon: FileText,      color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  video:    { label: "Video",    icon: Video,          color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20" },
  link:     { label: "Link",     icon: LinkIcon,       color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  lesson:   { label: "Lesson",   icon: GraduationCap,  color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  resource_type: "document" as ResourceType,
  file_url: "",
  external_url: "",
  video_url: "",
  lesson_content: "",
  category_id: "",
  duration_minutes: "" as string | number,
  sequence_order: 0,
  is_required: false,
  is_published: true,
};

// ─── Resource Card ────────────────────────────────────────────────────────────
function ResourceItemCard({ resource, categoryName, onView }: { resource: Resource; categoryName?: string; onView: () => void }) {
  const meta = TYPE_META[resource.resource_type] || TYPE_META.document;
  const Icon = meta.icon;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${meta.bg}`}>
          <Icon className={`h-5 w-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground line-clamp-1">{resource.title}</h3>
            {!resource.is_published && <Badge variant="outline" className="text-xs text-slate-400">Draft</Badge>}
          </div>
          {resource.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-xs capitalize">{meta.label}</Badge>
        {categoryName && <Badge variant="outline" className="text-xs">{categoryName}</Badge>}
        {resource.duration_minutes && (
          <Badge variant="outline" className="text-xs">{resource.duration_minutes} min</Badge>
        )}
      </div>
      <div className="flex gap-2 mt-auto">
        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onView}>
          <Eye className="h-3 w-3" /> View
        </Button>
        {(resource.file_url || resource.external_url || resource.video_url) && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => window.open(resource.file_url || resource.external_url || resource.video_url || "", "_blank")}>
            <Download className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DiscipleshipResources() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();

  // UI state
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [viewResource, setViewResource] = useState<Resource | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["discipleship-resources", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.DISCIPLESHIP_RESOURCES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order("sequence_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Resource[];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["resource-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_categories")
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: resources.length,
    documents: resources.filter(r => r.resource_type === "document").length,
    videos: resources.filter(r => r.resource_type === "video").length,
    lessons: resources.filter(r => r.resource_type === "lesson").length,
  };

  // ─── Filtered list ──────────────────────────────────────────────────────────
  const filtered = resources.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.resource_type === typeFilter;
    const matchCat = categoryFilter === "all" || r.category_id === categoryFilter;
    return matchSearch && matchType && matchCat;
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("resource_categories")
        .insert({ name: name.trim(), tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-categories", tenantId] });
      setNewCategoryName("");
      toast.success("Category added");
    },
    onError: () => toast.error("Failed to add category"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resource_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-categories", tenantId] });
      toast.success("Category removed");
    },
    onError: () => toast.error("Failed to remove category"),
  });

  const createResource = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        resource_type: form.resource_type,
        category_id: form.category_id || null,
        sequence_order: Number(form.sequence_order) || 0,
        duration_minutes: form.duration_minutes !== "" ? Number(form.duration_minutes) : null,
        is_required: form.is_required,
        is_published: form.is_published,
        tenant_id: tenantId,
      };
      if (form.resource_type === "document") payload.file_url = form.file_url || null;
      if (form.resource_type === "video") {
        payload.video_url = form.video_url || null;
        payload.file_url = form.file_url || null;
      }
      if (form.resource_type === "link") payload.external_url = form.external_url || null;
      if (form.resource_type === "lesson") {
        payload.lesson_content = form.lesson_content || null;
        payload.file_url = form.file_url || null;
      }
      const { error } = await supabase.from(TABLES.DISCIPLESHIP_RESOURCES).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipleship-resources", tenantId] });
      setAddResourceOpen(false);
      setForm({ ...EMPTY_FORM });
      setFormErrors({});
      toast.success("Resource created");
    },
    onError: () => toast.error("Failed to create resource"),
  });

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (form.resource_type === "link" && !form.external_url.trim()) errors.external_url = "URL is required for a link resource";
    if (form.resource_type === "link" && form.external_url && !form.external_url.startsWith("http")) errors.external_url = "Must be a valid URL starting with http";
    if (form.resource_type === "video" && !form.video_url.trim() && !form.file_url.trim()) errors.video_url = "Provide a video URL or upload a file";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (validate()) createResource.mutate();
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: "" }));
  }

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  return (
    <>
      <Helmet><title>Discipleship Resources — Vestry</title></Helmet>

      {/* ── Header ── */}
      <PageHeader
        title="Learning & Growth Library"
        subtitle="Organise, publish and share discipleship materials with your congregation"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-1.5" />Categories
            </Button>
            <Button onClick={() => setAddResourceOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Add Resource
            </Button>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Resources", value: stats.total,     icon: BookOpen,     color: "indigo" },
          { label: "Documents",       value: stats.documents, icon: FileText,     color: "blue" },
          { label: "Videos",          value: stats.videos,    icon: Video,        color: "red" },
          { label: "Lessons",         value: stats.lessons,   icon: GraduationCap,color: "violet" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30 shrink-0`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="link">Links</SelectItem>
            <SelectItem value="lesson">Lessons</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Resource Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-base">No resources found</p>
          <p className="text-sm mt-1">Add your first resource to get started</p>
          <Button className="mt-4" onClick={() => setAddResourceOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Create First Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ResourceItemCard
              key={r.id}
              resource={r}
              categoryName={r.category_id ? categoryMap[r.category_id] : undefined}
              onView={() => setViewResource(r)}
            />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MANAGE CATEGORIES DIALOG
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Add new */}
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newCategoryName.trim()) createCategory.mutate(newCategoryName); }}
                className="flex-1"
              />
              <Button
                size="icon"
                className="bg-orange-400 hover:bg-orange-500 text-white shrink-0"
                disabled={!newCategoryName.trim() || createCategory.isPending}
                onClick={() => createCategory.mutate(newCategoryName)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* List */}
            {catLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : categories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No categories yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-medium">{c.name}</span>
                    <button
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      onClick={() => deleteCategory.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          ADD RESOURCE DIALOG
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addResourceOpen} onOpenChange={o => { setAddResourceOpen(o); if (!o) { setForm({ ...EMPTY_FORM }); setFormErrors({}); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Resource</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["document", "video", "link", "lesson"] as ResourceType[]).map(t => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  const active = form.resource_type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setField("resource_type", t)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-sm font-medium
                        ${active ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
                    >
                      <Icon className="h-5 w-5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Resource title"
                value={form.title}
                onChange={e => setField("title", e.target.value)}
                className={formErrors.title ? "border-red-400" : ""}
              />
              {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this resource"
                value={form.description}
                onChange={e => setField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Type-specific fields */}
            {form.resource_type === "document" && (
              <div className="space-y-1.5">
                <Label>Upload Document</Label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-muted-foreground">Click to upload PDF, Word, or PowerPoint</p>
                  <Input
                    type="url"
                    placeholder="Or paste file URL"
                    value={form.file_url}
                    onChange={e => setField("file_url", e.target.value)}
                    className="mt-3"
                  />
                </div>
              </div>
            )}

            {form.resource_type === "video" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Video URL</Label>
                  <Input
                    placeholder="YouTube or Vimeo URL"
                    value={form.video_url}
                    onChange={e => setField("video_url", e.target.value)}
                    className={formErrors.video_url ? "border-red-400" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Paste a YouTube or Vimeo link</p>
                  {formErrors.video_url && <p className="text-xs text-red-500">{formErrors.video_url}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="space-y-1.5">
                  <Label>Upload Video File</Label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors">
                    <Video className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-muted-foreground">Click to upload MP4, WebM, or MOV (max 100MB)</p>
                    <Input
                      type="url"
                      placeholder="Or paste video file URL"
                      value={form.file_url}
                      onChange={e => setField("file_url", e.target.value)}
                      className="mt-3"
                    />
                  </div>
                </div>
              </div>
            )}

            {form.resource_type === "link" && (
              <div className="space-y-1.5">
                <Label>External URL <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="https://..."
                  value={form.external_url}
                  onChange={e => setField("external_url", e.target.value)}
                  className={formErrors.external_url ? "border-red-400" : ""}
                />
                {formErrors.external_url && <p className="text-xs text-red-500">{formErrors.external_url}</p>}
              </div>
            )}

            {form.resource_type === "lesson" && (
              <>
                <div className="space-y-1.5">
                  <Label>Lesson Content</Label>
                  <Textarea
                    placeholder="Write your lesson content here..."
                    value={form.lesson_content}
                    onChange={e => setField("lesson_content", e.target.value)}
                    rows={5}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Attach File or Video</Label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-muted-foreground">Upload PDF, document, video, or image</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Max 100MB</p>
                    <Input
                      type="url"
                      placeholder="Or paste file URL"
                      value={form.file_url}
                      onChange={e => setField("file_url", e.target.value)}
                      className="mt-3"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Category + Milestone row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category_id || "none"} onValueChange={v => setField("category_id", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={form.duration_minutes}
                  onChange={e => setField("duration_minutes", e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Sequence order */}
            <div className="space-y-1.5">
              <Label>Sequence Order</Label>
              <Input
                type="number"
                value={form.sequence_order}
                onChange={e => setField("sequence_order", Number(e.target.value))}
                min={0}
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_required} onCheckedChange={v => setField("is_required", v)} />
                <Label className="cursor-pointer">Required for completion</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={v => setField("is_published", v)} />
                <Label className="cursor-pointer">Published</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setAddResourceOpen(false); setForm({ ...EMPTY_FORM }); setFormErrors({}); }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={createResource.isPending}>
                {createResource.isPending ? "Creating..." : "Create Resource"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW RESOURCE DIALOG
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewResource} onOpenChange={o => { if (!o) setViewResource(null); }}>
        <DialogContent className="max-w-lg">
          {viewResource && (() => {
            const meta = TYPE_META[viewResource.resource_type];
            const Icon = meta.icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${meta.bg}`}><Icon className={`h-4 w-4 ${meta.color}`} /></span>
                    {viewResource.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {viewResource.description && <p className="text-sm text-muted-foreground">{viewResource.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{meta.label}</Badge>
                    {viewResource.category_id && categoryMap[viewResource.category_id] && (
                      <Badge variant="outline">{categoryMap[viewResource.category_id]}</Badge>
                    )}
                    {viewResource.duration_minutes && <Badge variant="outline">{viewResource.duration_minutes} min</Badge>}
                    {viewResource.is_required && <Badge className="bg-amber-100 text-amber-700">Required</Badge>}
                    {!viewResource.is_published && <Badge variant="outline" className="text-slate-400">Draft</Badge>}
                  </div>
                  {viewResource.lesson_content && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {viewResource.lesson_content}
                    </div>
                  )}
                  {(viewResource.file_url || viewResource.external_url || viewResource.video_url) && (
                    <Button variant="outline" className="w-full gap-2" onClick={() => window.open(viewResource.file_url || viewResource.external_url || viewResource.video_url || "", "_blank")}>
                      <LinkIcon className="h-4 w-4" /> Open Resource
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
