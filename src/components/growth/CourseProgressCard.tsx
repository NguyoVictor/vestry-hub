import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { BookOpen, Clock } from "lucide-react";

export interface Course {
  id: string;
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  cover_image_url?: string | null;
  total_duration_minutes: number;
  modules: { lessons: unknown[] }[];
  instructor_name?: string | null;
  enrollment_count?: number;
}

export interface Enrollment {
  id: string;
  completed_at?: string | null;
  lesson_completions_count?: number;
  total_lessons?: number;
}

interface CourseProgressCardProps {
  course: Course;
  enrollment?: Enrollment;
  onClick: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function CourseProgressCard({ course, enrollment, onClick }: CourseProgressCardProps) {
  const totalLessons = course.modules?.reduce((acc, m: any) => acc + (m.lessons?.length || 0), 0) || 0;
  const completedLessons = enrollment?.lesson_completions_count || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hours = Math.round((course.total_duration_minutes || 0) / 60 * 10) / 10;
  const isCompleted = !!enrollment?.completed_at;

  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 relative overflow-hidden">
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="h-12 w-12 text-indigo-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFFICULTY_COLORS[course.difficulty]}`}>
            {course.difficulty}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <Badge variant="secondary" className="text-xs mb-1 capitalize">{course.category?.replace(/_/g, " ")}</Badge>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">{course.title}</h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{totalLessons} lessons</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{hours}h</span>
        </div>

        {course.instructor_name && (
          <div className="flex items-center gap-2">
            <MemberAvatar name={course.instructor_name} size="sm" />
            <span className="text-xs text-muted-foreground">{course.instructor_name}</span>
          </div>
        )}

        {enrollment && !isCompleted && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedLessons} of {totalLessons} lessons</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <Button
          size="sm"
          className="w-full"
          variant={enrollment ? "default" : "outline"}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          {isCompleted ? "View Certificate" : enrollment ? "Continue" : "Enroll"}
        </Button>
      </div>
    </div>
  );
}
