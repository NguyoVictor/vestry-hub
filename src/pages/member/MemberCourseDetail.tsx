import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { useAgeAware, getAgeStyles, getAgeColors } from "@/contexts/AgeAwareContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Play, BookOpen, Clock, Users, Star, Trophy,
  CheckCircle, Circle, Lock, Zap, Target, Award, Crown,
  PlayCircle, FileText, Headphones, Image, Brain
} from "lucide-react";

// ── Lesson Row Component ──────────────────────────────────────────────────────
function LessonRow({ 
  lesson, 
  index, 
  isUnlocked, 
  isCompleted, 
  ageGroup,
  onStart 
}: { 
  lesson: any; 
  index: number; 
  isUnlocked: boolean; 
  isCompleted: boolean;
  ageGroup: 'kids' | 'teens' | 'adults';
  onStart: () => void;
}) {
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return PlayCircle;
      case 'audio': return Headphones;
      case 'text': return FileText;
      case 'image': return Image;
      case 'quiz': return Brain;
      default: return BookOpen;
    }
  };

  const ContentIcon = getContentIcon(lesson.content_type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.05 }}
      className={cn(
        styles.cardBg,
        styles.cardBorder,
        styles.cardRadius,
        "p-4 group cursor-pointer transition-all duration-200",
        isUnlocked ? "hover:shadow-md" : "opacity-60",
        isCompleted && ageGroup === 'kids' && "ring-2 ring-green-400 ring-opacity-50"
      )}
      onClick={isUnlocked ? onStart : undefined}
    >
      <div className="flex items-center gap-4">
        {/* Lesson number/status */}
        <div className={cn(
          "flex items-center justify-center rounded-full shrink-0",
          ageGroup === 'kids' ? "w-12 h-12" : ageGroup === 'teens' ? "w-10 h-10" : "w-8 h-8"
        )}>
          {isCompleted ? (
            <CheckCircle className={cn(
              "text-green-500",
              ageGroup === 'kids' ? "h-8 w-8" : ageGroup === 'teens' ? "h-6 w-6" : "h-5 w-5"
            )} />
          ) : isUnlocked ? (
            <div className={cn(
              "rounded-full flex items-center justify-center font-bold",
              ageGroup === 'kids' ? "bg-gradient-to-br from-blue-400 to-purple-500 text-white w-12 h-12 text-lg" :
              ageGroup === 'teens' ? "bg-slate-600 text-white w-10 h-10 text-sm" :
              "bg-orange-100 text-orange-600 w-8 h-8 text-xs"
            )}>
              {index + 1}
            </div>
          ) : (
            <Lock className={cn(
              "text-slate-400",
              ageGroup === 'kids' ? "h-6 w-6" : ageGroup === 'teens' ? "h-5 w-5" : "h-4 w-4"
            )} />
          )}
        </div>

        {/* Content icon */}
        <div className={cn(
          "flex items-center justify-center rounded-lg shrink-0",
          ageGroup === 'kids' ? "w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500" :
          ageGroup === 'teens' ? "w-8 h-8 bg-slate-700" :
          "w-6 h-6 bg-slate-100"
        )}>
          <ContentIcon className={cn(
            ageGroup === 'kids' ? "h-5 w-5 text-white" :
            ageGroup === 'teens' ? "h-4 w-4 text-slate-300" :
            "h-3 w-3 text-slate-500"
          )} />
        </div>

        {/* Lesson info */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold line-clamp-1",
            colors.text,
            ageGroup === 'kids' ? "text-lg" : ageGroup === 'teens' ? "text-base" : "text-sm"
          )}>
            {lesson.title}
          </h4>
          {lesson.description && (
            <p className={cn(
              "line-clamp-1 mt-1",
              colors.textSecondary,
              ageGroup === 'kids' ? "text-base" : ageGroup === 'teens' ? "text-sm" : "text-xs"
            )}>
              {lesson.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <div className={cn("flex items-center gap-1", colors.textSecondary)}>
              <Clock className="h-3 w-3" />
              <span className="text-xs">{lesson.estimated_duration || '10 min'}</span>
            </div>
            {lesson.content_type && (
              <Badge variant="secondary" className="text-xs">
                {lesson.content_type}
              </Badge>
            )}
          </div>
        </div>

        {/* Action indicator */}
        {isUnlocked && (
          <div className="shrink-0">
            {isCompleted ? (
              <Trophy className={cn(
                "text-yellow-500",
                ageGroup === 'kids' ? "h-6 w-6" : ageGroup === 'teens' ? "h-5 w-5" : "h-4 w-4"
              )} />
            ) : (
              <Play className={cn(
                colors.accent,
                ageGroup === 'kids' ? "h-6 w-6" : ageGroup === 'teens' ? "h-5 w-5" : "h-4 w-4"
              )} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Kids Journey Path Component ───────────────────────────────────────────────
function KidsJourneyPath({ lessons, completedLessons, onLessonStart }: {
  lessons: any[];
  completedLessons: Set<string>;
  onLessonStart: (lessonId: string) => void;
}) {
  return (
    <div className="relative">
      {/* Winding path background */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
        <path
          d={`M 50 50 Q 200 100 350 50 T 650 100 T 950 50`}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="4"
          fill="none"
          strokeDasharray="10,5"
        />
      </svg>
      
      <div className="relative z-10 space-y-6">
        {lessons.map((lesson, index) => {
          const isCompleted = completedLessons.has(lesson.id);
          const isUnlocked = index === 0 || completedLessons.has(lessons[index - 1]?.id);
          
          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25, 
                delay: index * 0.1 
              }}
              className={cn(
                "relative",
                index % 2 === 0 ? "ml-0" : "ml-auto mr-0",
                "w-80 max-w-full"
              )}
            >
              <LessonRow
                lesson={lesson}
                index={index}
                isUnlocked={isUnlocked}
                isCompleted={isCompleted}
                ageGroup="kids"
                onStart={() => onLessonStart(lesson.id)}
              />
              
              {/* Floating stars for completed lessons */}
              {isCompleted && (
                <div className="absolute -top-2 -right-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Star className="h-6 w-6 text-yellow-400 fill-current" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MemberCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const member = useMemberPortal();
  const { ageGroup } = useAgeAware();
  const queryClient = useQueryClient();
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  // Fetch course details
  const { data: course, isLoading } = useQuery({
    queryKey: ["member-course-detail", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.TRAINING_COURSES)
        .select(`
          *,
          course_enrollments!left(
            id,
            progress_percentage,
            completed_at,
            member_id
          )
        `)
        .eq("id", courseId!)
        .eq(COLS.TENANT_ID, member.churchId)
        .single();
      
      if (!data) throw new Error("Course not found");
      
      return {
        ...data,
        enrollment: data.course_enrollments?.find((e: any) => e.member_id === member.memberId)
      };
    },
    staleTime: 300000,
    enabled: !!courseId,
  });

  // Fetch lessons
  const { data: lessons = [] } = useQuery({
    queryKey: ["course-lessons", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("order_index", { ascending: true });
      
      return data || [];
    },
    staleTime: 300000,
    enabled: !!courseId,
  });

  // Fetch lesson completions
  const { data: completions = [] } = useQuery({
    queryKey: ["lesson-completions", courseId, member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.LESSON_COMPLETIONS)
        .select("lesson_id")
        .eq("course_id", courseId!)
        .eq("member_id", member.memberId);
      
      return data || [];
    },
    staleTime: 300000,
    enabled: !!courseId,
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.COURSE_ENROLLMENTS)
        .insert({
          course_id: courseId!,
          member_id: member.memberId,
          tenant_id: member.churchId,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Successfully enrolled in course!");
      queryClient.invalidateQueries({ queryKey: ["member-course-detail", courseId] });
    },
    onError: () => {
      toast.error("Failed to enroll in course");
    }
  });

  const completedLessons = new Set(completions.map(c => c.lesson_id));
  const isEnrolled = !!course?.enrollment;
  const isCompleted = course?.enrollment?.completed_at;
  const progress = course?.enrollment?.progress_percentage || 0;

  const handleLessonStart = (lessonId: string) => {
    navigate(`/member/training/lesson/${lessonId}`);
  };

  const handleEnroll = () => {
    enrollMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: styles.background }}>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className={cn(styles.cardBg, styles.cardRadius, "p-6 mb-6")}>
            <Skeleton className="h-48 w-full mb-4 rounded" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: styles.background }}>
        <div className="text-center">
          <h1 className={cn("text-2xl font-bold mb-2", colors.text)}>Course Not Found</h1>
          <p className={cn("mb-4", colors.textSecondary)}>The course you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/member/training")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: styles.background }}>
      <Helmet>
        <title>{course.title} — Vestry</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/member/training")}
            className={cn(colors.textSecondary, "hover:bg-white/10")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </motion.div>

        {/* Course header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            styles.cardBg,
            styles.cardBorder,
            styles.cardRadius,
            styles.cardShadow,
            styles.padding,
            "mb-8"
          )}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Course thumbnail */}
            <div className={cn(
              "shrink-0 overflow-hidden",
              styles.cardRadius,
              ageGroup === 'kids' ? "w-full lg:w-64 h-48" :
              ageGroup === 'teens' ? "w-full lg:w-56 h-40" :
              "w-full lg:w-48 h-32"
            )}>
              {course.thumbnail_url ? (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={cn(
                  "w-full h-full flex items-center justify-center",
                  ageGroup === 'kids' ? "bg-gradient-to-br from-pink-400 to-purple-500" :
                  ageGroup === 'teens' ? "bg-gradient-to-br from-slate-700 to-slate-900" :
                  "bg-gradient-to-br from-orange-400 to-orange-500"
                )}>
                  <BookOpen className={cn(
                    "text-white",
                    ageGroup === 'kids' ? "h-16 w-16" : ageGroup === 'teens' ? "h-12 w-12" : "h-8 w-8"
                  )} />
                </div>
              )}
            </div>

            {/* Course info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className={cn(
                    "font-bold mb-2",
                    colors.text,
                    ageGroup === 'kids' ? "text-3xl" : ageGroup === 'teens' ? "text-2xl" : "text-xl"
                  )}>
                    {course.title}
                  </h1>
                  
                  <div className="flex items-center gap-4 mb-3">
                    <div className={cn("flex items-center gap-1", colors.textSecondary)}>
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{course.estimated_duration || '2 hours'}</span>
                    </div>
                    <div className={cn("flex items-center gap-1", colors.textSecondary)}>
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{course.enrollment_count || 0} enrolled</span>
                    </div>
                    {course.difficulty && (
                      <Badge variant="secondary">{course.difficulty}</Badge>
                    )}
                  </div>
                </div>

                {isCompleted && (
                  <div className="flex items-center gap-2 text-green-500">
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>

              <p className={cn(
                "mb-6 leading-relaxed",
                colors.textSecondary,
                ageGroup === 'kids' ? "text-base" : "text-sm"
              )}>
                {course.description}
              </p>

              {/* Progress bar for enrolled courses */}
              {isEnrolled && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className={colors.textSecondary}>Progress</span>
                    <span className={colors.accent}>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              )}

              {/* Action button */}
              <div>
                {!isEnrolled ? (
                  <Button
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending}
                    className={cn(
                      styles.buttonSize,
                      styles.buttonRadius,
                      colors.primary,
                      "text-white font-semibold"
                    )}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
                  </Button>
                ) : isCompleted ? (
                  <Button
                    onClick={() => navigate(`/member/training/certificate/${courseId}`)}
                    className={cn(
                      styles.buttonSize,
                      styles.buttonRadius,
                      "bg-green-500 hover:bg-green-600 text-white font-semibold"
                    )}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    View Certificate
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const nextLesson = lessons.find(l => !completedLessons.has(l.id));
                      if (nextLesson) handleLessonStart(nextLesson.id);
                    }}
                    className={cn(
                      styles.buttonSize,
                      styles.buttonRadius,
                      colors.primary,
                      "text-white font-semibold"
                    )}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continue Learning
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lessons section */}
        {isEnrolled && lessons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
          >
            <h2 className={cn(
              "font-bold mb-6",
              colors.text,
              ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
            )}>
              {ageGroup === 'kids' ? "🗺️ Learning Adventure" : 
               ageGroup === 'teens' ? "📚 Course Content" : 
               "Course Lessons"}
            </h2>

            {ageGroup === 'kids' ? (
              <KidsJourneyPath
                lessons={lessons}
                completedLessons={completedLessons}
                onLessonStart={handleLessonStart}
              />
            ) : (
              <div className={cn("space-y-3", styles.spacing)}>
                {lessons.map((lesson, index) => {
                  const isCompleted = completedLessons.has(lesson.id);
                  const isUnlocked = index === 0 || completedLessons.has(lessons[index - 1]?.id);
                  
                  return (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={index}
                      isUnlocked={isUnlocked}
                      isCompleted={isCompleted}
                      ageGroup={ageGroup}
                      onStart={() => handleLessonStart(lesson.id)}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}