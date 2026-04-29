import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactPlayer from "react-player";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Video, FileText, Music, File, CheckSquare, Link as LinkIcon,
  Lock, CheckCircle2, Play, ChevronLeft, ChevronRight, Award, Clock,
} from "lucide-react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video, text: FileText, audio: Music, document: File, quiz: CheckSquare, external_link: LinkIcon,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

// Certificate PDF
const certStyles = StyleSheet.create({
  page: { padding: 60, backgroundColor: "#fff", fontFamily: "Helvetica" },
  header: { alignItems: "center", marginBottom: 40 },
  churchName: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  title: { fontSize: 36, fontWeight: "bold", color: "#4F46E5", marginTop: 20, marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 30 },
  recipientLabel: { fontSize: 14, color: "#64748b" },
  recipientName: { fontSize: 28, fontWeight: "bold", color: "#1e293b", marginVertical: 8 },
  courseLabel: { fontSize: 14, color: "#64748b" },
  courseName: { fontSize: 20, fontStyle: "italic", color: "#4F46E5", marginVertical: 8 },
  date: { fontSize: 12, color: "#94a3b8", marginTop: 20 },
  footer: { marginTop: 60, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#cbd5e1", paddingTop: 8, width: 200, alignItems: "center" },
  signatureText: { fontSize: 11, color: "#64748b" },
  watermark: { position: "absolute", bottom: 30, right: 40, fontSize: 10, color: "#e2e8f0" },
});

function CourseCertificate({ recipientName, courseName, completionDate, instructorName, churchName }: {
  recipientName: string; courseName: string; completionDate: string; instructorName: string; churchName: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={certStyles.page}>
        <View style={certStyles.header}>
          <Text style={certStyles.churchName}>{churchName}</Text>
          <Text style={certStyles.title}>Certificate of Completion</Text>
          <Text style={certStyles.subtitle}>This certifies that</Text>
          <Text style={certStyles.recipientName}>{recipientName}</Text>
          <Text style={certStyles.courseLabel}>has successfully completed</Text>
          <Text style={certStyles.courseName}>{courseName}</Text>
          <Text style={certStyles.date}>Completed on {completionDate}</Text>
        </View>
        <View style={certStyles.footer}>
          <View style={certStyles.signatureLine}>
            <Text style={certStyles.signatureText}>{instructorName}</Text>
            <Text style={certStyles.signatureText}>Instructor</Text>
          </View>
          <View style={certStyles.signatureLine}>
            <Text style={certStyles.signatureText}>{churchName}</Text>
            <Text style={certStyles.signatureText}>Church Seal</Text>
          </View>
        </View>
        <Text style={certStyles.watermark}>Powered by Vestry</Text>
      </Page>
    </Document>
  );
}

export default function TrainingCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { tenantId, userId, userName, name: churchName } = useChurch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<{ moduleIdx: number; lessonIdx: number } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [comment, setComment] = useState("");
  const [certDialogOpen, setCertDialogOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["training-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, userId],
    queryFn: async () => {
      const { data } = await supabase.from("course_enrollments").select("*").eq("course_id", courseId!).eq("user_id", userId).maybeSingle();
      return data;
    },
    enabled: !!courseId && !!userId,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["lesson-completions", enrollment?.id],
    queryFn: async () => {
      const { data } = await supabase.from("lesson_completions").select("*").eq("enrollment_id", enrollment!.id);
      return data || [];
    },
    enabled: !!enrollment?.id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["course-comments", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("course_comments").select("*").eq("course_id", courseId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!courseId,
  });

  const modules: any[] = course?.modules || [];
  const totalLessons = modules.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0);
  const completedCount = completions.length;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const isLessonCompleted = (mIdx: number, lIdx: number) =>
    completions.some((c: any) => c.module_index === mIdx && c.lesson_index === lIdx);

  const currentLesson = selectedLesson
    ? modules[selectedLesson.moduleIdx]?.lessons?.[selectedLesson.lessonIdx]
    : null;

  const enroll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_enrollments").insert({ course_id: courseId, user_id: userId, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId, userId] });
      toast.success("Enrolled successfully");
    },
    onError: () => toast.error("Failed to enroll"),
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!enrollment || !selectedLesson) return;
      const { error } = await supabase.from("lesson_completions").insert({
        enrollment_id: enrollment.id,
        course_id: courseId,
        module_index: selectedLesson.moduleIdx,
        lesson_index: selectedLesson.lessonIdx,
      });
      if (error && !error.message.includes("duplicate")) throw error;

      // Check if all lessons completed
      const newCount = completedCount + 1;
      if (newCount >= totalLessons) {
        await supabase.from("course_enrollments").update({ completed_at: new Date().toISOString() }).eq("id", enrollment.id);
        await supabase.from("activity_log").insert({ tenant_id: tenantId, action_type: "course_completed", description: `${userName} completed ${course?.title}`, entity_id: courseId });
        toast.success("🎉 Course completed! Your certificate is ready.");
        if (course?.has_certificate) setCertDialogOpen(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-completions", enrollment?.id] });
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId, userId] });
    },
    onError: () => toast.error("Failed to mark complete"),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_comments").insert({ course_id: courseId, user_id: userId, comment });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-comments", courseId] });
      setComment("");
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const downloadCertificate = async () => {
    const blob = await pdf(
      <CourseCertificate
        recipientName={userName || "Student"}
        courseName={course?.title || ""}
        completionDate={format(new Date(enrollment?.completed_at || new Date()), "dd MMMM yyyy")}
        instructorName="Instructor"
        churchName={churchName || "Church"}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `certificate-${course?.title}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const navigateLesson = (dir: "prev" | "next") => {
    if (!selectedLesson) return;
    const { moduleIdx, lessonIdx } = selectedLesson;
    if (dir === "next") {
      const nextLessonIdx = lessonIdx + 1;
      if (nextLessonIdx < modules[moduleIdx]?.lessons?.length) {
        setSelectedLesson({ moduleIdx, lessonIdx: nextLessonIdx });
      } else if (moduleIdx + 1 < modules.length) {
        setSelectedLesson({ moduleIdx: moduleIdx + 1, lessonIdx: 0 });
      }
    } else {
      if (lessonIdx > 0) {
        setSelectedLesson({ moduleIdx, lessonIdx: lessonIdx - 1 });
      } else if (moduleIdx > 0) {
        const prevModule = modules[moduleIdx - 1];
        setSelectedLesson({ moduleIdx: moduleIdx - 1, lessonIdx: (prevModule.lessons?.length || 1) - 1 });
      }
    }
    setQuizAnswers({}); setQuizSubmitted(false);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-72 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!course) return <div className="text-center py-16 text-muted-foreground"><p>Course not found</p><Button variant="outline" onClick={() => navigate("/training")} className="mt-4">Back to Training</Button></div>;

  const totalDuration = modules.reduce((s: number, m: any) => s + (m.lessons || []).reduce((ls: number, l: any) => ls + (l.duration || 0), 0), 0);

  return (
    <>
      <Helmet><title>{course.title} — Vestry</title></Helmet>

      {/* Banner */}
      <div className="relative h-[300px] rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-indigo-600 to-indigo-800">
        {course.cover_image_url && <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className="capitalize bg-white/20 text-white border-0">{course.category?.replace(/_/g, " ")}</Badge>
            <Badge className={`capitalize ${DIFFICULTY_COLORS[course.difficulty] || ""}`}>{course.difficulty}</Badge>
            <Badge className="bg-white/20 text-white border-0 flex items-center gap-1"><Clock className="h-3 w-3" />{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</Badge>
          </div>
          <h1 className="text-3xl font-bold text-white">{course.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white/80 text-sm">{course.enrollment_count || 0} enrolled</span>
            {enrollment && !enrollment.completed_at && <span className="text-white/80 text-sm">You are enrolled ({progress}% complete)</span>}
            {enrollment?.completed_at && <span className="text-emerald-300 text-sm font-medium">✓ Completed</span>}
          </div>
        </div>
        <div className="absolute top-4 right-4">
          {!enrollment ? (
            <Button onClick={() => enroll.mutate()} disabled={enroll.isPending}>Enroll Now</Button>
          ) : enrollment.completed_at ? (
            <Button onClick={() => setCertDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Award className="h-4 w-4 mr-1" />View Certificate</Button>
          ) : (
            <Button onClick={() => { if (modules[0]?.lessons?.[0]) setSelectedLesson({ moduleIdx: 0, lessonIdx: 0 }); }}>Continue Learning</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Content Accordion */}
          <Card>
            <CardHeader><CardTitle>Course Content</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={modules.map((_: any, i: number) => `module-${i}`)}>
                {modules.map((module: any, mIdx: number) => (
                  <AccordionItem key={mIdx} value={`module-${mIdx}`}>
                    <AccordionTrigger className="text-sm font-medium">
                      <span>{module.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto mr-4">{module.lessons?.length || 0} lessons</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1">
                        {(module.lessons || []).map((lesson: any, lIdx: number) => {
                          const Icon = LESSON_ICONS[lesson.type] || FileText;
                          const completed = isLessonCompleted(mIdx, lIdx);
                          const available = !!enrollment || lesson.is_preview;
                          return (
                            <div key={lIdx}
                              className={`flex items-center gap-3 p-2 rounded-lg text-sm ${available ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" : "opacity-50"} ${selectedLesson?.moduleIdx === mIdx && selectedLesson?.lessonIdx === lIdx ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
                              onClick={() => available && setSelectedLesson({ moduleIdx: mIdx, lessonIdx: lIdx })}>
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="flex-1">{lIdx + 1}. {lesson.title}</span>
                              {lesson.duration > 0 && <span className="text-xs text-muted-foreground">{lesson.duration}m</span>}
                              {completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : available ? <Play className="h-4 w-4 text-indigo-500 shrink-0" /> : <Lock className="h-4 w-4 text-slate-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Lesson Viewer */}
          {currentLesson && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{currentLesson.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentLesson.type === "video" && currentLesson.content?.url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <ReactPlayer url={currentLesson.content.url} width="100%" height="100%" controls />
                  </div>
                )}
                {currentLesson.type === "text" && (
                  <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">{currentLesson.content?.text}</div>
                )}
                {currentLesson.type === "audio" && currentLesson.content?.url && (
                  <audio controls className="w-full"><source src={currentLesson.content.url} /></audio>
                )}
                {currentLesson.type === "document" && currentLesson.content?.url && (
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <File className="h-8 w-8 text-amber-500" />
                    <Button variant="outline" onClick={() => window.open(currentLesson.content.url, "_blank")}>Download Document</Button>
                  </div>
                )}
                {currentLesson.type === "external_link" && currentLesson.content?.url && (
                  <div className="p-4 border rounded-lg space-y-2">
                    {currentLesson.content.description && <p className="text-sm text-muted-foreground">{currentLesson.content.description}</p>}
                    <Button variant="outline" onClick={() => window.open(currentLesson.content.url, "_blank")}>Open Link</Button>
                  </div>
                )}
                {currentLesson.type === "quiz" && (
                  <div className="space-y-4">
                    {(currentLesson.content?.questions || []).map((q: any, qi: number) => (
                      <div key={qi} className="space-y-2">
                        <p className="font-medium text-sm">{qi + 1}. {q.text}</p>
                        {q.options.map((opt: string, oi: number) => (
                          <label key={oi} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${quizSubmitted ? (oi === q.correct ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : quizAnswers[qi] === oi ? "border-red-400 bg-red-50 dark:bg-red-900/20" : "") : quizAnswers[qi] === oi ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                            <input type="radio" name={`q${qi}`} checked={quizAnswers[qi] === oi} onChange={() => !quizSubmitted && setQuizAnswers(a => ({ ...a, [qi]: oi }))} disabled={quizSubmitted} />
                            {opt}
                          </label>
                        ))}
                        {quizSubmitted && q.explanation && <p className="text-xs text-muted-foreground italic">{q.explanation}</p>}
                      </div>
                    ))}
                    {!quizSubmitted ? (
                      <Button onClick={() => setQuizSubmitted(true)} disabled={Object.keys(quizAnswers).length < (currentLesson.content?.questions?.length || 0)}>Submit Quiz</Button>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm">
                        Score: {(currentLesson.content?.questions || []).filter((q: any, i: number) => quizAnswers[i] === q.correct).length} / {currentLesson.content?.questions?.length || 0}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => navigateLesson("prev")}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                  {enrollment && !isLessonCompleted(selectedLesson!.moduleIdx, selectedLesson!.lessonIdx) && (
                    <Button size="sm" onClick={() => markComplete.mutate()} disabled={markComplete.isPending}>
                      {markComplete.isPending ? "Saving..." : "Mark as Complete"}
                    </Button>
                  )}
                  {isLessonCompleted(selectedLesson!.moduleIdx, selectedLesson!.lessonIdx) && (
                    <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => navigateLesson("next")}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discussion */}
          <Card>
            <CardHeader><CardTitle>Discussion</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {enrollment && (
                <div className="flex gap-2">
                  <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." rows={2} className="flex-1" />
                  <Button onClick={() => addComment.mutate()} disabled={!comment || addComment.isPending} className="self-end">Post</Button>
                </div>
              )}
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <MemberAvatar name={c.user_id} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm">{c.comment}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-6">
          {/* Progress */}
          {enrollment && (
            <Card>
              <CardHeader><CardTitle className="text-base">Your Progress</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{completedCount} of {totalLessons} lessons completed</p>
                {totalLessons > completedCount && (
                  <p className="text-xs text-muted-foreground">
                    ~{Math.ceil((totalLessons - completedCount) * (totalDuration / Math.max(totalLessons, 1)) / 60)}h remaining
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Course Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Course Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="capitalize">{course.category?.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Difficulty</span><span className="capitalize">{course.difficulty}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Lessons</span><span>{totalLessons}</span></div>
              {course.has_certificate && <div className="flex justify-between"><span className="text-muted-foreground">Certificate</span><span className="text-emerald-600">✓ Included</span></div>}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate(`/training/${courseId}/edit`)}>Edit Course</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Certificate Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" />Certificate Ready</DialogTitle></DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Award className="h-10 w-10 text-amber-500" />
            </div>
            <p className="font-semibold">Congratulations!</p>
            <p className="text-sm text-muted-foreground">You've completed <strong>{course.title}</strong></p>
            <Button className="w-full" onClick={downloadCertificate}>Download Certificate PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
