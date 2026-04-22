import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2, Plus, Trash2, GripVertical, ClipboardList, Users,
  Link, Pencil, BarChart, Calendar, EyeOff, Eye, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { TABLES } from "@/lib/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  type: string;
  text: string;
  description?: string;
  required: boolean;
  options?: string[];
  min_label?: string;
  max_label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft:  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  closed: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const QUESTION_TYPES = [
  { value: "short_text",      label: "Short Text" },
  { value: "long_text",       label: "Long Text" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox",        label: "Checkbox (Multi)" },
  { value: "rating",          label: "Rating (1–5)" },
  { value: "yes_no",          label: "Yes / No" },
  { value: "dropdown",        label: "Dropdown" },
  { value: "date",            label: "Date" },
  { value: "number",          label: "Number" },
  { value: "file_upload",     label: "File Upload" },
];

const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;

function getSurveyStatus(survey: any): "active" | "draft" | "closed" {
  if (!survey.is_published) return "draft";
  if (survey.closing_date && new Date(survey.closing_date) < new Date()) return "closed";
  return "active";
}

// ─── Add Question Dialog ──────────────────────────────────────────────────────
function AddQuestionDialog({
  open, onClose, onAdd, editQuestion, editIndex,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (q: Question, index?: number) => void;
  editQuestion?: Question;
  editIndex?: number;
}) {
  const [q, setQ] = useState<Question>(
    editQuestion ?? { type: "short_text", text: "", required: false, options: [], description: "" }
  );
  const [showDesc, setShowDesc] = useState(!!editQuestion?.description);

  const needsOptions = ["multiple_choice", "checkbox", "dropdown"].includes(q.type);
  const needsRatingLabels = q.type === "rating";

  const handleTypeChange = (v: string) => {
    setQ(prev => ({
      ...prev, type: v,
      options: ["multiple_choice", "checkbox", "dropdown"].includes(v) ? (prev.options?.length ? prev.options : ["", ""]) : [],
    }));
  };

  const addOption = () => setQ(prev => ({ ...prev, options: [...(prev.options || []), ""] }));
  const removeOption = (i: number) => setQ(prev => ({ ...prev, options: prev.options?.filter((_, j) => j !== i) }));
  const updateOption = (i: number, val: string) => {
    const opts = [...(q.options || [])];
    opts[i] = val;
    setQ(prev => ({ ...prev, options: opts }));
  };

  const handleSave = () => {
    if (!q.text.trim()) return;
    if (needsOptions && (q.options?.filter(o => o.trim()).length ?? 0) < 2) {
      toast.error("Add at least 2 options");
      return;
    }
    onAdd(q, editIndex);
    setQ({ type: "short_text", text: "", required: false, options: [], description: "" });
    setShowDesc(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editIndex !== undefined ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Question Type</Label>
            <Select value={q.type} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Question Text *</Label>
            <Input value={q.text} onChange={e => setQ(prev => ({ ...prev, text: e.target.value }))} placeholder="Enter your question..." />
          </div>

          {showDesc ? (
            <div>
              <Label>Description (optional)</Label>
              <Input value={q.description || ""} onChange={e => setQ(prev => ({ ...prev, description: e.target.value }))} placeholder="Additional context for this question..." />
            </div>
          ) : (
            <button className="text-xs text-orange-500 hover:underline" onClick={() => setShowDesc(true)}>+ Add Description</button>
          )}

          {needsOptions && (
            <div>
              <Label>Options (min. 2)</Label>
              <div className="space-y-2 mt-1">
                {q.options?.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    {(q.options?.length ?? 0) > 2 && (
                      <Button size="icon" variant="ghost" onClick={() => removeOption(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1" />Add Option</Button>
              </div>
            </div>
          )}

          {needsRatingLabels && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Label</Label>
                <Input value={q.min_label || ""} onChange={e => setQ(prev => ({ ...prev, min_label: e.target.value }))} placeholder="e.g. Poor" />
              </div>
              <div>
                <Label>Max Label</Label>
                <Input value={q.max_label || ""} onChange={e => setQ(prev => ({ ...prev, max_label: e.target.value }))} placeholder="e.g. Excellent" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Required</Label>
              <p className="text-xs text-slate-500">Members must answer this question</p>
            </div>
            <Switch checked={q.required} onCheckedChange={v => setQ(prev => ({ ...prev, required: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!q.text.trim()} onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white">
            {editIndex !== undefined ? "Save Changes" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create/Edit Survey Dialog ────────────────────────────────────────────────
function SurveyFormDialog({
  open, onClose, onSave, initial, groups,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any, questions: Question[]) => void;
  initial?: any;
  groups: any[];
}) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    is_published: initial?.is_published || false,
    is_anonymous: initial?.is_anonymous || false,
    closing_date: initial?.closing_date || "",
    target_audience: initial?.target_audience || "everyone",
    target_group_id: initial?.target_group_id || "",
  });
  const [questions, setQuestions] = useState<Question[]>(
    Array.isArray(initial?.questions) ? initial.questions : []
  );
  const [showAddQ, setShowAddQ] = useState(false);
  const [editQ, setEditQ] = useState<{ q: Question; i: number } | null>(null);

  const handleAddQuestion = (q: Question, index?: number) => {
    if (index !== undefined) {
      setQuestions(prev => prev.map((item, i) => i === index ? q : item));
    } else {
      setQuestions(prev => [...prev, q]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Survey" : "Create Survey"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic info */}
          <div>
            <Label>Survey Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sunday Service Feedback" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this survey..." rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Closing Date (optional)</Label>
              <Input type="date" value={form.closing_date} onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">Survey auto-closes on this date</p>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={form.target_audience} onValueChange={v => setForm(f => ({ ...f, target_audience: v, target_group_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="members">Members Only</SelectItem>
                  <SelectItem value="visitors">Visitors Only</SelectItem>
                  <SelectItem value="group">Specific Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.target_audience === "group" && (
            <div>
              <Label>Select Group</Label>
              <Select value={form.target_group_id} onValueChange={v => setForm(f => ({ ...f, target_group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium">Anonymous Responses</p>
                <p className="text-xs text-slate-500">Responses will not be linked to member identities</p>
              </div>
              <Switch checked={form.is_anonymous} onCheckedChange={v => setForm(f => ({ ...f, is_anonymous: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium">Publish immediately</p>
                <p className="text-xs text-slate-500">Make this survey visible to members</p>
              </div>
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Questions ({questions.length})</Label>
              <Button size="sm" variant="outline" onClick={() => setShowAddQ(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Question
              </Button>
            </div>
            {questions.length === 0 ? (
              <div className="border rounded-lg p-6 text-center text-slate-400 text-sm">
                No questions yet. Click "Add Question" to start.
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={i} className="border rounded-lg p-3 flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <GripVertical className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-orange-500">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
                        {q.required && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                      </div>
                      <p className="text-sm font-medium">{q.text}</p>
                      {q.description && <p className="text-xs text-slate-400 mt-0.5">{q.description}</p>}
                      {q.options && q.options.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {q.options.map((opt, oi) => <Badge key={oi} variant="outline" className="text-xs">{opt}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditQ({ q, i })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQuestions(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.title.trim() || questions.length === 0}
            onClick={() => onSave(form, questions)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {initial ? "Save Changes" : "Create Survey"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AddQuestionDialog
        open={showAddQ}
        onClose={() => setShowAddQ(false)}
        onAdd={handleAddQuestion}
      />
      {editQ && (
        <AddQuestionDialog
          open={!!editQ}
          onClose={() => setEditQ(null)}
          onAdd={handleAddQuestion}
          editQuestion={editQ.q}
          editIndex={editQ.i}
        />
      )}
    </Dialog>
  );
}

// ─── Survey Card ──────────────────────────────────────────────────────────────
function SurveyCard({
  survey, responseCount, onEdit, onDelete, onTogglePublish, onViewResponses,
}: {
  survey: any;
  responseCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onViewResponses: () => void;
}) {
  const status = getSurveyStatus(survey);
  const questionCount = Array.isArray(survey.questions) ? survey.questions.length : 0;

  const copyShareLink = () => {
    const url = `${BASE_URL}/survey/${survey.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Survey link copied! Share it with your congregation.");
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{survey.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={STATUS_COLORS[status]}>
              {status === "active" ? "Active" : status === "closed" ? "Closed" : "Draft"}
            </Badge>
            {survey.is_anonymous && (
              <Badge variant="outline" className="text-xs text-slate-500">Anonymous</Badge>
            )}
          </div>
        </div>

        {survey.description && (
          <p className="text-sm text-slate-500 line-clamp-2">{survey.description}</p>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />{questionCount} question{questionCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />{responseCount} response{responseCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Created {survey.created_at ? format(new Date(survey.created_at), "dd MMM yyyy") : "—"}
          </span>
          {survey.closing_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
              Closes {format(new Date(survey.closing_date), "dd MMM yyyy")}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 min-w-0" onClick={onViewResponses}>
            <BarChart className="h-3.5 w-3.5 mr-1.5" />View Responses
          </Button>
          <Button size="sm" variant="outline" onClick={copyShareLink} title="Copy share link">
            <Link className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit} title="Edit survey">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onTogglePublish} title={survey.is_published ? "Unpublish" : "Publish"}>
            {survey.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Delete survey" className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Surveys() {
  const { tenantId, userId } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: surveys = [], isLoading } = useQuery({
    queryKey: [TABLES.SURVEYS, tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.SURVEYS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: responseCounts = {} } = useQuery({
    queryKey: ["survey-response-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.SURVEY_RESPONSES)
        .select("survey_id")
        .eq("tenant_id", tenantId);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.survey_id] = (counts[r.survey_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const { data: groups = [] } = useQuery({
    queryKey: [TABLES.GROUPS, tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.GROUPS)
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");
      return data || [];
    },
    staleTime: 300_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [TABLES.SURVEYS, tenantId] });
    queryClient.invalidateQueries({ queryKey: ["survey-response-counts", tenantId] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async ({ form, questions }: { form: any; questions: Question[] }) => {
      const { error } = await supabase.from(TABLES.SURVEYS).insert({
        tenant_id: tenantId,
        title: form.title,
        description: form.description || null,
        questions: questions as unknown as Json,
        is_published: form.is_published,
        is_anonymous: form.is_anonymous,
        closing_date: form.closing_date || null,
        target_audience: form.target_audience,
        target_group_id: form.target_group_id || null,
        created_by: userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Survey created"); setShowCreate(false); },
    onError: () => toast.error("Failed to create survey"),
  });

  const editMutation = useMutation({
    mutationFn: async ({ form, questions }: { form: any; questions: Question[] }) => {
      const { error } = await supabase.from(TABLES.SURVEYS).update({
        title: form.title,
        description: form.description || null,
        questions: questions as unknown as Json,
        is_published: form.is_published,
        is_anonymous: form.is_anonymous,
        closing_date: form.closing_date || null,
        target_audience: form.target_audience,
        target_group_id: form.target_group_id || null,
      } as any).eq("id", editingSurvey.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Survey updated"); setEditingSurvey(null); },
    onError: () => toast.error("Failed to update survey"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from(TABLES.SURVEYS).update({ is_published: published } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { published }) => { invalidate(); toast.success(published ? "Survey published" : "Survey unpublished"); },
    onError: () => toast.error("Failed to update survey"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.SURVEYS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Survey deleted"); setDeletingId(null); },
    onError: () => toast.error("Failed to delete survey"),
  });

  return (
    <div>
      <PageHeader
        title="Surveys"
        subtitle="Create and distribute surveys to your congregation"
        action={
          <Button onClick={() => setShowCreate(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="mr-2 h-4 w-4" />Create Survey
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : !surveys.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-600">No surveys yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first survey to gather feedback from your congregation.</p>
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Create Survey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map(survey => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              responseCount={responseCounts[survey.id] || 0}
              onEdit={() => setEditingSurvey(survey)}
              onDelete={() => setDeletingId(survey.id)}
              onTogglePublish={() => togglePublish.mutate({ id: survey.id, published: !survey.is_published })}
              onViewResponses={() => navigate(`/surveys/${survey.id}/responses`)}
            />
          ))}
        </div>
      )}

      {/* Create */}
      {showCreate && (
        <SurveyFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSave={(form, questions) => createMutation.mutate({ form, questions })}
          groups={groups}
        />
      )}

      {/* Edit */}
      {editingSurvey && (
        <SurveyFormDialog
          open={!!editingSurvey}
          onClose={() => setEditingSurvey(null)}
          onSave={(form, questions) => editMutation.mutate({ form, questions })}
          initial={editingSurvey}
          groups={groups}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={v => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this survey?</AlertDialogTitle>
            <AlertDialogDescription>All responses will also be permanently deleted. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
