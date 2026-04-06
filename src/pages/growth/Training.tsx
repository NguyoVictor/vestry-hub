import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { CourseProgressCard, Course, Enrollment } from "@/components/growth/CourseProgressCard";
import { toast } from "sonner";
import { format } from "date-fns";
import { BookCheck, Plus, Search, GraduationCap, Users, Award } from "lucide-react";

const CATEGORIES = ["leadership", "pastoral_care", "administration", "worship_ministry", "childrens_ministry", "youth_ministry", "finance", "communications", "technology", "personal_development", "other"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

const defaultCourseForm = {
  title: "", category: "leadership", difficulty: "beginner" as string,
  description: "", target_audience: "", has_certificate: false,
  certificate_title: "Certificate of Completion", status: "draft" as string,
};

export default function Training() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [courseSheet, setCourseSheet] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState(defaultCourseForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["training-courses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_courses").select("*").eq("church_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!tenantId,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      const { data } = await supabase.from("course_enrollments").select("*, lesson_completions(count)").eq("user_id", userId);
      return data || [];
    },
    enabled: !!userId,
  });

  const getEnrollment = (courseId: string): Enrollment | undefined => {
    const e = enrollments.find((e: any) => e.course_id === courseId);
    if (!e) return undefined;
    return { id: e.id, completed_at: e.completed_at, lesson_completions_count: e.lesson_completions?.[0]?.count || 0 };
  };

  const myEnrolled = courses.filter(c => enrollments.some((e: any) => e.course_id === c.id && !e.completed_at));
  const myCompleted = courses.filter(c => enrollments.some((e: any) => e.course_id === c.id && e.completed_at));

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || c.category === categoryFilter;
    const matchDiff = difficultyFilter === "all" || c.difficulty === difficultyFilter;
    return matchSearch && matchCat && matchDiff;
  });

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("course_enrollments").insert({ course_id: courseId, user_id: userId, church_id: tenantId });
      if (error) throw error;
      await supabase.from("training_courses").update({ enrollment_count: (courses.find(c => c.id === courseId)?.enrollment_count || 0) + 1 }).eq("id", courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments", userId] });
      queryClient.invalidateQueries({ queryKey: ["training-courses", tenantId] });
      toast.success("Enrolled successfully");
    },
    onError: () => toast.error("Failed to enroll"),
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      const payload = { ...courseForm, church_id: tenantId, created_by: userId };
      if (editCourseId) {
        const { error } = await supabase.from("training_courses").update(payload).eq("id", editCourseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-courses", tenantId] });
      setCourseSheet(false);
      setCourseForm(defaultCourseForm);
      setEditCourseId(null);
      toast.success(editCourseId ? "Course updated" : "Course created");
    },
    onError: () => toast.error("Failed to save course"),
  });

  const handleCourseClick = (course: Course) => {
    const enrollment = getEnrollment(course.id);
    if (!enrollment) {
      enroll.mutate(course.id);
    } else {
      navigate(`/training/${course.id}`);
    }
  };

  return (
    <>
      <Helmet><title>Training — Vestry</title></Helmet>
      <PageHeader
        title="Training"
        subtitle="Staff development courses and learning management"
        action={<Button onClick={() => navigate("/training/new")}><Plus className="h-4 w-4 mr-1" />Create Course</Button>}
      />

      <Tabs defaultValue="my-learning">
        <TabsList className="mb-4">
          <TabsTrigger value="my-learning">My Learning</TabsTrigger>
          <TabsTrigger value="library">Course Library</TabsTrigger>
        </TabsList>

        <TabsContent value="my-learning" className="space-y-6">
          {/* Continue Learning */}
          {myEnrolled.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Continue Learning</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {myEnrolled.map(c => (
                  <div key={c.id} className="w-64 shrink-0">
                    <CourseProgressCard course={c} enrollment={getEnrollment(c.id)} onClick={() => navigate(`/training/${c.id}`)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recommended for You</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {courses.filter(c => c.status === "published" && !enrollments.some((e: any) => e.course_id === c.id)).slice(0, 3).map(c => (
                  <CourseProgressCard key={c.id} course={c} onClick={() => handleCourseClick(c)} />
                ))}
                {courses.filter(c => c.status === "published" && !enrollments.some((e: any) => e.course_id === c.id)).length === 0 && (
                  <div className="col-span-3 text-center py-8 text-muted-foreground">
                    <BookCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>You're enrolled in all available courses</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Completed */}
          {myCompleted.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Completed Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {myCompleted.map(c => (
                  <CourseProgressCard key={c.id} course={c} enrollment={getEnrollment(c.id)} onClick={() => navigate(`/training/${c.id}`)} />
                ))}
              </div>
            </div>
          )}

          {myEnrolled.length === 0 && myCompleted.length === 0 && !isLoading && (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No courses yet</p>
              <p className="text-sm mt-1">Browse the course library to get started</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="library">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No courses found</p>
              <Button className="mt-4" onClick={() => setCourseSheet(true)}><Plus className="h-4 w-4 mr-1" />Create Course</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => (
                <div key={c.id} className="relative">
                  <CourseProgressCard course={c} enrollment={getEnrollment(c.id)} onClick={() => handleCourseClick(c)} />
                  <button
                    className="absolute top-2 left-2 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                    onClick={e => { e.stopPropagation(); setCourseForm({ ...defaultCourseForm, ...c }); setEditCourseId(c.id); setCourseSheet(true); }}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Course Sheet */}
      <Sheet open={courseSheet} onOpenChange={setCourseSheet}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editCourseId ? "Edit Course" : "Create Course"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Course Title *</Label><Input value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={courseForm.category} onValueChange={v => setCourseForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={courseForm.difficulty} onValueChange={v => setCourseForm(f => ({ ...f, difficulty: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="space-y-1.5"><Label>Target Audience</Label><Input value={courseForm.target_audience} onChange={e => setCourseForm(f => ({ ...f, target_audience: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={courseForm.has_certificate} onCheckedChange={v => setCourseForm(f => ({ ...f, has_certificate: v }))} />
              <Label>Certificate on Completion</Label>
            </div>
            {courseForm.has_certificate && (
              <div className="space-y-1.5"><Label>Certificate Title</Label><Input value={courseForm.certificate_title} onChange={e => setCourseForm(f => ({ ...f, certificate_title: e.target.value }))} /></div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={courseForm.status} onValueChange={v => setCourseForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => saveCourse.mutate()} disabled={!courseForm.title || saveCourse.isPending}>
              {saveCourse.isPending ? "Saving..." : editCourseId ? "Update Course" : "Create Course"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
