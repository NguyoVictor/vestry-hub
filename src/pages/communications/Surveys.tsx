import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, Plus, Trash2, GripVertical, ClipboardList, Eye, Copy, Link } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Question {
  type: string;
  text: string;
  required: boolean;
  options?: string[];
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-muted text-muted-foreground",
};

const QUESTION_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox (Multi)" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "yes_no", label: "Yes / No" },
];

export default function Surveys() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [surveyForm, setSurveyForm] = useState({ title: "", description: "", is_published: false });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState<Question>({ type: "short_text", text: "", required: false, options: [] });
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["surveys", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("surveys")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createSurvey = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("surveys").insert({
        tenant_id: tenantId,
        title: surveyForm.title,
        description: surveyForm.description || null,
        questions: questions as unknown as Json,
        is_published: surveyForm.is_published,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey created");
      setShowBuilder(false);
      setSurveyForm({ title: "", description: "", is_published: false });
      setQuestions([]);
    },
    onError: () => toast.error("Failed to create survey"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("surveys").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey updated");
    },
  });

  const addQuestion = () => {
    if (!newQuestion.text) return;
    setQuestions([...questions, { ...newQuestion }]);
    setNewQuestion({ type: "short_text", text: "", required: false, options: [] });
    setShowAddQuestion(false);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const getQuestionCount = (survey: any) => {
    const q = survey.questions;
    return Array.isArray(q) ? q.length : 0;
  };

  return (
    <div>
      <PageHeader title="Surveys" subtitle="Create and distribute surveys to your congregation" action={<Button onClick={() => setShowBuilder(true)}><Plus className="mr-2 h-4 w-4" />Create Survey</Button>} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : !surveys?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium">No surveys yet</p>
            <p className="text-muted-foreground text-sm">Create your first survey to gather feedback.</p>
            <Button className="mt-4" onClick={() => setShowBuilder(true)}>Create Survey</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map(survey => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{survey.title}</h3>
                  <Badge className={statusColors[survey.is_published ? "active" : "draft"]}>{survey.is_published ? "Active" : "Draft"}</Badge>
                </div>
                {survey.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{survey.description}</p>}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><ClipboardList className="inline h-3.5 w-3.5 mr-1" />{getQuestionCount(survey)} questions</p>
                  <p className="text-xs">{survey.created_at ? format(new Date(survey.created_at), "dd MMM yyyy") : ""}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => togglePublish.mutate({ id: survey.id, published: !survey.is_published })}>
                    {survey.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Survey Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Survey</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div><Label>Survey Title *</Label><Input value={surveyForm.title} onChange={(e) => setSurveyForm(f => ({ ...f, title: e.target.value }))} placeholder="Survey title..." /></div>
            <div><Label>Description</Label><Textarea value={surveyForm.description} onChange={(e) => setSurveyForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={3} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Questions ({questions.length})</Label>
                <Button size="sm" variant="outline" onClick={() => setShowAddQuestion(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Question</Button>
              </div>

              {questions.length === 0 ? (
                <div className="border rounded-md p-6 text-center text-muted-foreground text-sm">No questions added yet. Click "Add Question" to start.</div>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="border rounded-md p-3 flex items-start gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
                          {q.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        </div>
                        <p className="text-sm">{q.text}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.options.map((opt, oi) => <Badge key={oi} variant="outline" className="text-xs">{opt}</Badge>)}
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeQuestion(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Publish immediately</Label>
              <Switch checked={surveyForm.is_published} onCheckedChange={(v) => setSurveyForm(f => ({ ...f, is_published: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
            <Button disabled={!surveyForm.title || questions.length === 0 || createSurvey.isPending} onClick={() => createSurvey.mutate()}>
              {createSurvey.isPending ? "Creating..." : "Create Survey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question Type</Label>
              <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion(q => ({ ...q, type: v, options: ["multiple_choice", "checkbox"].includes(v) ? [""] : [] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Question Text *</Label><Input value={newQuestion.text} onChange={(e) => setNewQuestion(q => ({ ...q, text: e.target.value }))} placeholder="Enter your question..." /></div>
            {["multiple_choice", "checkbox"].includes(newQuestion.type) && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {newQuestion.options?.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt} onChange={(e) => {
                        const opts = [...(newQuestion.options || [])];
                        opts[i] = e.target.value;
                        setNewQuestion(q => ({ ...q, options: opts }));
                      }} placeholder={`Option ${i + 1}`} />
                      <Button size="icon" variant="ghost" onClick={() => setNewQuestion(q => ({ ...q, options: q.options?.filter((_, j) => j !== i) }))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setNewQuestion(q => ({ ...q, options: [...(q.options || []), ""] }))}><Plus className="h-3.5 w-3.5 mr-1" />Add Option</Button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch checked={newQuestion.required} onCheckedChange={(v) => setNewQuestion(q => ({ ...q, required: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuestion(false)}>Cancel</Button>
            <Button disabled={!newQuestion.text} onClick={addQuestion}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
