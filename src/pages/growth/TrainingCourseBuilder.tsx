import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Plus, Trash2, ChevronDown, ChevronRight, Video, FileText,
  Music, File, CheckSquare, Link as LinkIcon, ArrowLeft, Save, BookOpen,
} from "lucide-react";

const CATEGORIES = ["leadership","pastoral_care","administration","worship_ministry","childrens_ministry","youth_ministry","finance","communications","technology","personal_development","other"];
const DIFFICULTIES = ["beginner","intermediate","advanced"];
const LESSON_TYPES = [
  { value: "video", label: "Video", icon: Video },
  { value: "text", label: "Text", icon: FileText },
  { value: "audio", label: "Audio", icon: Music },
  { value: "document", label: "Document", icon: File },
  { value: "quiz", label: "Quiz", icon: CheckSquare },
  { value: "external_link", label: "External Link", icon: LinkIcon },
];

interface Lesson { id: string; title: string; type: string; duration: number; content: any; is_preview: boolean; notes: string; }
interface Module { id: string; title: string; lessons: Lesson[]; expanded: boolean; }

function newLesson(): Lesson { return { id: crypto.randomUUID(), title: "New Lesson", type: "video", duration: 0, content: {}, is_preview: false, notes: "" }; }
function newModule(): Module { return { id: crypto.randomUUID(), title: "New Module", lessons: [newLesson()], expanded: true }; }

function SortableModule({ module, onUpdate, onDelete, onSelectLesson, selectedLessonId }: {
  module: Module; onUpdate: (m: Module) => void; onDelete: () => void;
  onSelectLesson: (moduleId: string, lesson: Lesson) => void; selectedLessonId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = module.lessons.findIndex(l => l.id === active.id);
    const newIdx = module.lessons.findIndex(l => l.id === over.id);
    onUpdate({ ...module, lessons: arrayMove(module.lessons, oldIdx, newIdx) });
  };

  const LessonIcon = (type: string) => LESSON_TYPES.find(t => t.value === type)?.icon || FileText;

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
        <Input value={module.title} onChange={e => onUpdate({ ...module, title: e.target.value })} className="flex-1 h-7 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-0" />
        <span className="text-xs text-muted-foreground">{module.lessons.length} lessons</span>
        <button onClick={() => onUpdate({ ...module, expanded: !module.expanded })} className="text-muted-foreground">
          {module.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>
      {module.expanded && (
        <div className="p-2 space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
            <SortableContext items={module.lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
              {module.lessons.map((lesson, idx) => {
                const Icon = LessonIcon(lesson.type);
                const { attributes: la, listeners: ll, setNodeRef: lr, transform: lt, transition: ltr } = useSortable({ id: lesson.id });
                return (
                  <div key={lesson.id} ref={lr} style={{ transform: CSS.Transform.toString(lt), transition: ltr }}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedLessonId === lesson.id ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700" : ""}`}
                    onClick={() => onSelectLesson(module.id, lesson)}>
                    <button {...la} {...ll} className="cursor-grab text-muted-foreground" onClick={e => e.stopPropagation()}><GripVertical className="h-3 w-3" /></button>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">{idx + 1}. {lesson.title}</span>
                    {lesson.duration > 0 && <span className="text-xs text-muted-foreground">{lesson.duration}m</span>}
                    {lesson.is_preview && <Badge variant="outline" className="text-xs">Preview</Badge>}
                    <button onClick={e => { e.stopPropagation(); onUpdate({ ...module, lessons: module.lessons.filter(l => l.id !== lesson.id) }); }} className="text-red-400 hover:text-red-600 ml-1"><Trash2 className="h-3 w-3" /></button>
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>
          <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => onUpdate({ ...module, lessons: [...module.lessons, newLesson()] })}>
            <Plus className="h-3 w-3 mr-1" />Add Lesson
          </Button>
        </div>
      )}
    </div>
  );
}

function LessonEditor({ lesson, onUpdate }: { lesson: Lesson; onUpdate: (l: Lesson) => void }) {
  const [quizQuestions, setQuizQuestions] = useState<any[]>(lesson.content?.questions || []);

  const addQuestion = () => setQuizQuestions(q => [...q, { text: "", options: ["", "", "", ""], correct: 0, explanation: "" }]);

  useEffect(() => {
    if (lesson.type === "quiz") onUpdate({ ...lesson, content: { ...lesson.content, questions: quizQuestions } });
  }, [quizQuestions]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Lesson Title</Label><Input value={lesson.title} onChange={e => onUpdate({ ...lesson, title: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Lesson Type</Label>
        <Select value={lesson.type} onValueChange={v => onUpdate({ ...lesson, type: v, content: {} })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{LESSON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {lesson.type === "video" && (
        <div className="space-y-1.5">
          <Label>Video URL (YouTube, Vimeo, or direct)</Label>
          <Input value={lesson.content?.url || ""} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, url: e.target.value } })} placeholder="https://youtube.com/watch?v=..." />
        </div>
      )}
      {lesson.type === "text" && (
        <div className="space-y-1.5">
          <Label>Content</Label>
          <Textarea value={lesson.content?.text || ""} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, text: e.target.value } })} rows={8} placeholder="Write lesson content..." />
        </div>
      )}
      {lesson.type === "audio" && (
        <div className="space-y-1.5">
          <Label>Audio URL</Label>
          <Input value={lesson.content?.url || ""} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, url: e.target.value } })} placeholder="Supabase Storage URL" />
        </div>
      )}
      {lesson.type === "document" && (
        <div className="space-y-1.5">
          <Label>Document URL</Label>
          <Input value={lesson.content?.url || ""} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, url: e.target.value } })} placeholder="Supabase Storage URL" />
        </div>
      )}
      {lesson.type === "external_link" && (
        <div className="space-y-2">
          <div className="space-y-1.5"><Label>URL</Label><Input value={lesson.content?.url || ""} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, url: e.target.value } })} placeholder="https://" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={lesson.content?.description || ""} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, description: e.target.value } })} rows={2} /></div>
        </div>
      )}
      {lesson.type === "quiz" && (
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Pass Mark (%)</Label><Input type="number" min="0" max="100" value={lesson.content?.pass_mark || 70} onChange={e => onUpdate({ ...lesson, content: { ...lesson.content, pass_mark: Number(e.target.value) } })} /></div>
          {quizQuestions.map((q, qi) => (
            <Card key={qi}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={q.text} onChange={e => setQuizQuestions(qs => qs.map((qq, i) => i === qi ? { ...qq, text: e.target.value } : qq))} placeholder={`Question ${qi + 1}`} className="flex-1" />
                  <button onClick={() => setQuizQuestions(qs => qs.filter((_, i) => i !== qi))} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
                {q.options.map((opt: string, oi: number) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" checked={q.correct === oi} onChange={() => setQuizQuestions(qs => qs.map((qq, i) => i === qi ? { ...qq, correct: oi } : qq))} />
                    <Input value={opt} onChange={e => setQuizQuestions(qs => qs.map((qq, i) => i === qi ? { ...qq, options: qq.options.map((o: string, j: number) => j === oi ? e.target.value : o) } : qq))} placeholder={`Option ${oi + 1}`} className="flex-1 h-7 text-sm" />
                  </div>
                ))}
                <Input value={q.explanation} onChange={e => setQuizQuestions(qs => qs.map((qq, i) => i === qi ? { ...qq, explanation: e.target.value } : qq))} placeholder="Explanation (shown after submit)" className="text-sm" />
              </CardContent>
            </Card>
          ))}
          <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" />Add Question</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Duration (minutes)</Label><Input type="number" min="0" value={lesson.duration} onChange={e => onUpdate({ ...lesson, duration: Number(e.target.value) })} /></div>
      </div>
      <div className="flex items-center gap-3"><Switch checked={lesson.is_preview} onCheckedChange={v => onUpdate({ ...lesson, is_preview: v })} /><Label>Is Preview (visible without enrollment)</Label></div>
      <div className="space-y-1.5"><Label>Notes for Instructor</Label><Textarea value={lesson.notes} onChange={e => onUpdate({ ...lesson, notes: e.target.value })} rows={2} /></div>
    </div>
  );
}

export default function TrainingCourseBuilder() {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const isEdit = !!courseId;

  const [modules, setModules] = useState<Module[]>([newModule()]);
  const [selectedLesson, setSelectedLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);
  const [courseInfo, setCourseInfo] = useState({
    title: "", category: "leadership", difficulty: "beginner", description: "",
    cover_image_url: "", target_audience: "", has_certificate: false,
    certificate_title: "Certificate of Completion", status: "draft",
    instructor_member_id: "",
  });

  const { data: existingCourse } = useQuery({
    queryKey: ["training-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("training_courses").select("*").eq("id", courseId!).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingCourse) {
      setCourseInfo({
        title: existingCourse.title || "",
        category: existingCourse.category || "leadership",
        difficulty: existingCourse.difficulty || "beginner",
        description: existingCourse.description || "",
        cover_image_url: existingCourse.cover_image_url || "",
        target_audience: existingCourse.target_audience || "",
        has_certificate: existingCourse.has_certificate || false,
        certificate_title: existingCourse.certificate_title || "Certificate of Completion",
        status: existingCourse.status || "draft",
        instructor_member_id: existingCourse.instructor_member_id || "",
      });
      if (existingCourse.modules?.length) {
        setModules(existingCourse.modules.map((m: any) => ({ ...m, id: m.id || crypto.randomUUID(), expanded: false, lessons: (m.lessons || []).map((l: any) => ({ ...l, id: l.id || crypto.randomUUID() })) })));
      }
    }
  }, [existingCourse]);

  const totalDuration = modules.reduce((s, m) => s + m.lessons.reduce((ls, l) => ls + (l.duration || 0), 0), 0);

  const updateLesson = (moduleId: string, updatedLesson: Lesson) => {
    setModules(ms => ms.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l) } : m));
    if (selectedLesson?.lesson.id === updatedLesson.id) setSelectedLesson({ moduleId, lesson: updatedLesson });
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = modules.findIndex(m => m.id === active.id);
    const newIdx = modules.findIndex(m => m.id === over.id);
    setModules(arrayMove(modules, oldIdx, newIdx));
  };

  const saveCourse = useMutation({
    mutationFn: async (publish: boolean) => {
      const payload = {
        ...courseInfo,
        status: publish ? "published" : courseInfo.status,
        church_id: tenantId,
        created_by: userId,
        modules: modules.map(m => ({ id: m.id, title: m.title, lessons: m.lessons })),
        total_duration_minutes: totalDuration,
      };
      if (isEdit) {
        const { error } = await supabase.from("training_courses").update(payload).eq("id", courseId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, publish) => {
      queryClient.invalidateQueries({ queryKey: ["training-courses", tenantId] });
      toast.success(publish ? "Course published!" : "Draft saved");
      navigate("/training");
    },
    onError: () => toast.error("Failed to save course"),
  });

  return (
    <>
      <Helmet><title>{isEdit ? "Edit Course" : "New Course"} — Vestry</title></Helmet>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/training")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit Course" : "Create Course"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveCourse.mutate(false)} disabled={!courseInfo.title || saveCourse.isPending}>
            <Save className="h-4 w-4 mr-1" />Save Draft
          </Button>
          <Button onClick={() => saveCourse.mutate(true)} disabled={!courseInfo.title || saveCourse.isPending}>
            Publish Course
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Course Builder */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />Course Modules
                <span className="text-xs text-muted-foreground font-normal ml-auto">Total: {Math.floor(totalDuration / 60)}h {totalDuration % 60}m</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
                <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  {modules.map(module => (
                    <SortableModule
                      key={module.id}
                      module={module}
                      onUpdate={updated => setModules(ms => ms.map(m => m.id === updated.id ? updated : m))}
                      onDelete={() => setModules(ms => ms.filter(m => m.id !== module.id))}
                      onSelectLesson={(moduleId, lesson) => setSelectedLesson({ moduleId, lesson })}
                      selectedLessonId={selectedLesson?.lesson.id}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" className="w-full" onClick={() => setModules(ms => [...ms, newModule()])}>
                <Plus className="h-4 w-4 mr-1" />Add Module
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right — Lesson Editor or Course Info */}
        <div>
          {selectedLesson ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Lesson Editor</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedLesson(null)}>Course Info</Button>
                </div>
              </CardHeader>
              <CardContent>
                <LessonEditor
                  lesson={selectedLesson.lesson}
                  onUpdate={updated => updateLesson(selectedLesson.moduleId, updated)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Course Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label>Course Title *</Label><Input value={courseInfo.title} onChange={e => setCourseInfo(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={courseInfo.category} onValueChange={v => setCourseInfo(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select value={courseInfo.difficulty} onValueChange={v => setCourseInfo(f => ({ ...f, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={courseInfo.description} onChange={e => setCourseInfo(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                <div className="space-y-1.5"><Label>Cover Image URL</Label><Input value={courseInfo.cover_image_url} onChange={e => setCourseInfo(f => ({ ...f, cover_image_url: e.target.value }))} placeholder="Supabase Storage URL" /></div>
                <div className="space-y-1.5"><Label>Target Audience</Label><Input value={courseInfo.target_audience} onChange={e => setCourseInfo(f => ({ ...f, target_audience: e.target.value }))} /></div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs text-muted-foreground">
                  Total Duration: {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                </div>
                <div className="flex items-center gap-3"><Switch checked={courseInfo.has_certificate} onCheckedChange={v => setCourseInfo(f => ({ ...f, has_certificate: v }))} /><Label>Certificate on Completion</Label></div>
                {courseInfo.has_certificate && <div className="space-y-1.5"><Label>Certificate Title</Label><Input value={courseInfo.certificate_title} onChange={e => setCourseInfo(f => ({ ...f, certificate_title: e.target.value }))} /></div>}
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={courseInfo.status} onValueChange={v => setCourseInfo(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
