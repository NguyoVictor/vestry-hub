import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toUserFacingError } from "@/lib/userFacingError";
import { QUIZ_LIMITS, blankQuestion, liveQuiz, normalizeQuestion, quizProblem, type QuizQuestionDraft } from "@/lib/liveQuiz";

interface QuizRow { id: string; title: string; questions: QuizQuestionDraft[] | null; updated_at: string | null }

const OPTION_COLORS = ["bg-red-500", "bg-blue-600", "bg-amber-500", "bg-green-600"];

export default function QuizLibrary() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tenantId, userId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly("groups_ministries");

  const [editing, setEditing] = useState<{ id: string | null; title: string; questions: QuizQuestionDraft[] } | null>(null);
  const [toDelete, setToDelete] = useState<QuizRow | null>(null);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["live-quizzes", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes")
        .select("id, title, questions, updated_at").eq("tenant_id", tenantId!).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QuizRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (draft: { id: string | null; title: string; questions: QuizQuestionDraft[] }) => {
      const problem = quizProblem(draft.title, draft.questions);
      if (problem) throw new Error(problem);
      const payload = { title: draft.title.trim(), questions: draft.questions.map(normalizeQuestion) as unknown as never, status: "ready" };
      if (draft.id) {
        const { data, error } = await supabase.from("quizzes").update(payload).eq("id", draft.id).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("The quiz was not saved (no permission or it was removed).");
      } else {
        const { error } = await supabase.from("quizzes").insert({ ...payload, tenant_id: tenantId!, user_id: userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-quizzes", tenantId] });
      setEditing(null);
      toast.success("Quiz saved");
    },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("quizzes").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("The quiz was not deleted (no permission).");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["live-quizzes", tenantId] }); toast.success("Quiz deleted"); },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
    onSettled: () => setToDelete(null),
  });

  const host = useMutation({
    mutationFn: (quizId: string) => liveQuiz.createSession(quizId),
    onSuccess: (s) => navigate(`/training/host/${s.session_id}`),
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });

  const updateQ = (i: number, patch: Partial<QuizQuestionDraft>) =>
    setEditing(ed => ed && { ...ed, questions: ed.questions.map((q, n) => (n === i ? { ...q, ...patch } : q)) });

  return (
    <>
      <Helmet><title>Live Quizzes — Vestry</title></Helmet>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/training")}><ArrowLeft className="h-4 w-4 mr-1" />Training</Button>
        <PageHeader
          title="Live Quizzes"
          subtitle="Write a quiz, then host it live: people join on their phones with a game PIN."
          actions={!readOnly ? (
            <Button onClick={() => setEditing({ id: null, title: "", questions: [blankQuestion()] })}>
              <Plus className="h-4 w-4 mr-2" />New quiz
            </Button>
          ) : undefined}
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : quizzes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-slate-500">
            No quizzes yet.{!readOnly && " Create one with “New quiz”."}
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map(q => (
              <Card key={q.id} data-testid="quiz-card">
                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 break-words">{q.title}</h3>
                    <p className="text-sm text-slate-500">{q.questions?.length ?? 0} question{(q.questions?.length ?? 0) === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!readOnly && (
                      <Button size="sm" onClick={() => host.mutate(q.id)} disabled={host.isPending} aria-label={`Host ${q.title} live`}>
                        {host.isPending && host.variables === q.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}Host live
                      </Button>
                    )}
                    {!readOnly && (
                      <Button size="sm" variant="outline" aria-label={`Edit ${q.title}`}
                        onClick={() => setEditing({ id: q.id, title: q.title, questions: (q.questions ?? []).map(x => ({ ...x, options: [...x.options, "", "", "", ""].slice(0, 4) })) })}>
                        <Pencil className="h-4 w-4 mr-1" />Edit
                      </Button>
                    )}
                    {!readOnly && (
                      <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Delete ${q.title}`} onClick={() => setToDelete(q)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit quiz" : "New quiz"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-5">
              <div className="space-y-1">
                <Label htmlFor="quiz-title">Title</Label>
                <Input id="quiz-title" value={editing.title} maxLength={120}
                  onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Book of Acts quiz" />
              </div>
              {editing.questions.map((q, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3" data-testid="question-editor">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`q-${i}`}>Question {i + 1}</Label>
                    {editing.questions.length > 1 && (
                      <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Remove question ${i + 1}`}
                        onClick={() => setEditing({ ...editing, questions: editing.questions.filter((_, n) => n !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Input id={`q-${i}`} value={q.text} maxLength={QUIZ_LIMITS.maxQuestionChars}
                    onChange={e => updateQ(i, { text: e.target.value })} placeholder="Type the question" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((o, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <button type="button" aria-label={`Mark answer ${k + 1} correct`} aria-pressed={q.correct_index === k}
                          onClick={() => updateQ(i, { correct_index: k })}
                          className={`h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center ${q.correct_index === k ? "border-green-600 bg-green-600 text-white" : "border-slate-300"}`}>
                          {q.correct_index === k && <Check className="h-4 w-4" />}
                        </button>
                        <span className={`h-3 w-3 rounded-sm ${OPTION_COLORS[k]}`} aria-hidden />
                        <Input value={o} maxLength={QUIZ_LIMITS.maxOptionChars} aria-label={`Question ${i + 1} answer ${k + 1}`}
                          placeholder={k < 2 ? `Answer ${k + 1}` : `Answer ${k + 1} (optional)`}
                          onChange={e => updateQ(i, { options: q.options.map((x, n) => (n === k ? e.target.value : x)) })} />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`t-${i}`}>Time (seconds)</Label>
                      <Input id={`t-${i}`} type="number" className="w-28" min={QUIZ_LIMITS.minTime} max={QUIZ_LIMITS.maxTime}
                        value={q.time_limit} onChange={e => updateQ(i, { time_limit: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`p-${i}`}>Points</Label>
                      <Input id={`p-${i}`} type="number" className="w-28" min={QUIZ_LIMITS.minPoints} max={QUIZ_LIMITS.maxPoints} step={100}
                        value={q.points} onChange={e => updateQ(i, { points: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
              ))}
              {editing.questions.length < QUIZ_LIMITS.maxQuestions && (
                <Button variant="outline" onClick={() => setEditing({ ...editing, questions: [...editing.questions, blankQuestion()] })}>
                  <Plus className="h-4 w-4 mr-1" />Add question
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={o => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This also removes the results of games played with this quiz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => toDelete && remove.mutate(toDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
