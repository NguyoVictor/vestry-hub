import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { useAgeAware, getAgeStyles, getAgeColors } from "@/contexts/AgeAwareContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BookOpen, Play, Trophy, Star, Clock, Users, 
  ChevronRight, Sparkles, Target, Award,
  GraduationCap, Zap, Heart, Crown
} from "lucide-react";

// ── Course Card Component ─────────────────────────────────────────────────────
function CourseCard({ course, ageGroup }: { course: any; ageGroup: 'kids' | 'teens' | 'adults' }) {
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);
  
  const progress = course.enrollment?.progress_percentage || 0;
  const isCompleted = progress >= 100;
  const isEnrolled = !!course.enrollment;

  return (
    <motion.div
      whileHover={styles.animation}
      className={cn(
        styles.cardBg,
        styles.cardBorder,
        styles.cardRadius,
        styles.cardShadow,
        styles.padding,
        "cursor-pointer group relative overflow-hidden"
      )}
    >
      <Link to={`/member/training/course/${course.id}`} className="block">
        {/* Course thumbnail */}
        <div className={cn(
          "relative mb-4 overflow-hidden",
          styles.cardRadius,
          ageGroup === 'kids' ? "h-32" : ageGroup === 'teens' ? "h-28" : "h-24"
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
                colors.text,
                ageGroup === 'kids' ? "h-12 w-12" : ageGroup === 'teens' ? "h-10 w-10" : "h-8 w-8"
              )} />
            </div>
          )}
          
          {/* Status badges */}
          <div className="absolute top-2 right-2 flex gap-1">
            {isCompleted && (
              <div className="bg-green-500 text-white rounded-full p-1">
                <Trophy className="h-3 w-3" />
              </div>
            )}
            {course.difficulty && (
              <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {course.difficulty}
              </div>
            )}
          </div>
        </div>

        {/* Course info */}
        <div className="space-y-2">
          <h3 className={cn(
            "font-bold line-clamp-2 group-hover:text-orange-500 transition-colors",
            colors.text,
            styles.textSize
          )}>
            {course.title}
          </h3>
          
          <p className={cn(
            "line-clamp-2 leading-relaxed",
            colors.textSecondary,
            ageGroup === 'kids' ? "text-base" : ageGroup === 'teens' ? "text-sm" : "text-xs"
          )}>
            {course.description}
          </p>

          {/* Course stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className={cn("flex items-center gap-1", colors.textSecondary)}>
              <Clock className="h-3 w-3" />
              <span>{course.estimated_duration || '2h'}</span>
            </div>
            <div className={cn("flex items-center gap-1", colors.textSecondary)}>
              <Users className="h-3 w-3" />
              <span>{course.enrollment_count || 0} enrolled</span>
            </div>
            {course.rating && (
              <div className={cn("flex items-center gap-1", colors.textSecondary)}>
                <Star className="h-3 w-3 fill-current text-yellow-400" />
                <span>{course.rating}</span>
              </div>
            )}
          </div>

          {/* Progress bar for enrolled courses */}
          {isEnrolled && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={colors.textSecondary}>Progress</span>
                <span className={colors.accent}>{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className={cn(
                  "h-2",
                  ageGroup === 'kids' ? "h-3" : "h-2"
                )}
              />
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="mt-4">
          <Button 
            className={cn(
              "w-full",
              styles.buttonSize,
              styles.buttonRadius,
              colors.primary,
              "text-white font-semibold"
            )}
          >
            {isCompleted ? (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                View Certificate
              </>
            ) : isEnrolled ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Continue Learning
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Start Course
              </>
            )}
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Progress Ring Component ───────────────────────────────────────────────────
function ProgressRing({ progress, size = 120, ageGroup }: { 
  progress: number; 
  size?: number; 
  ageGroup: 'kids' | 'teens' | 'adults';
}) {
  const colors = getAgeColors(ageGroup);
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ageGroup === 'adults' ? "#e2e8f0" : "rgba(255,255,255,0.2)"}
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ageGroup === 'kids' ? "#10b981" : ageGroup === 'teens' ? "#06b6d4" : "#f97316"}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "font-bold",
          colors.text,
          ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
        )}>
          {progress}%
        </span>
      </div>
    </div>
  );
}

// ── Age Background Component ──────────────────────────────────────────────────
function AgeBackground({ ageGroup, children }: { 
  ageGroup: 'kids' | 'teens' | 'adults'; 
  children: React.ReactNode;
}) {
  const styles = getAgeStyles(ageGroup);

  if (ageGroup === 'adults') {
    return (
      <div className="min-h-screen" style={{ background: styles.background }}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: ageGroup === 'kids' ? styles.background : styles.background
      }}
    >
      {/* Floating decorations for kids */}
      {ageGroup === 'kids' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, 30, 0],
                x: [0, 15, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={cn(
                "absolute w-12 h-12 rounded-full opacity-10",
                i % 3 === 0 ? "bg-yellow-400" : 
                i % 3 === 1 ? "bg-green-400" : "bg-pink-400"
              )}
              style={{
                left: `${10 + i * 15}%`,
                top: `${5 + i * 12}%`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Grid pattern for teens */}
      {ageGroup === 'teens' && (
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
      )}
      
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MemberTraining() {
  const member = useMemberPortal();
  const { ageGroup } = useAgeAware();
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  // Fetch available courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["member-training-courses", member.churchId],
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
        .eq(COLS.TENANT_ID, member.churchId)
        .eq(COLS.STATUS, "published")
        .order("created_at", { ascending: false });
      
      return (data || []).map(course => ({
        ...course,
        enrollment: course.course_enrollments?.find((e: any) => e.member_id === member.memberId)
      }));
    },
    staleTime: 300000,
  });

  // Calculate overall progress
  const enrolledCourses = courses.filter(c => c.enrollment);
  const completedCourses = enrolledCourses.filter(c => c.enrollment?.completed_at);
  const overallProgress = enrolledCourses.length > 0 
    ? Math.round(enrolledCourses.reduce((sum, c) => sum + (c.enrollment?.progress_percentage || 0), 0) / enrolledCourses.length)
    : 0;

  // Age-specific content
  const getAgeContent = () => {
    switch (ageGroup) {
      case 'kids':
        return {
          title: "🌟 Learning Adventure",
          subtitle: "Discover amazing stories and grow in faith!",
          emptyTitle: "Ready for an Adventure?",
          emptyDesc: "Start your first course and begin an exciting journey of learning!",
          progressTitle: "Your Learning Journey"
        };
      case 'teens':
        return {
          title: "🚀 Faith Academy",
          subtitle: "Level up your faith with premium courses",
          emptyTitle: "Your Journey Starts Here",
          emptyDesc: "Explore courses designed to challenge and inspire your faith journey.",
          progressTitle: "Learning Progress"
        };
      case 'adults':
        return {
          title: "Training & Development",
          subtitle: "Professional development and spiritual growth resources",
          emptyTitle: "No Courses Available",
          emptyDesc: "Check back later for new training opportunities and courses.",
          progressTitle: "Learning Dashboard"
        };
    }
  };

  const content = getAgeContent();

  return (
    <AgeBackground ageGroup={ageGroup}>
      <Helmet>
        <title>{content.title} — Vestry</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="text-center mb-8"
        >
          <h1 className={cn(
            "font-bold mb-2",
            colors.text,
            styles.titleSize,
            ageGroup === 'kids' ? "text-4xl" : ageGroup === 'teens' ? "text-3xl" : "text-2xl"
          )}>
            {content.title}
          </h1>
          <p className={cn(
            colors.textSecondary,
            ageGroup === 'kids' ? "text-lg" : ageGroup === 'teens' ? "text-base" : "text-sm"
          )}>
            {content.subtitle}
          </p>
        </motion.div>

        {/* Progress Overview */}
        {enrolledCourses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
            className={cn(
              styles.cardBg,
              styles.cardBorder,
              styles.cardRadius,
              styles.cardShadow,
              styles.padding,
              "mb-8"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={cn(
                  "font-semibold mb-1",
                  colors.text,
                  ageGroup === 'kids' ? "text-xl" : ageGroup === 'teens' ? "text-lg" : "text-base"
                )}>
                  {content.progressTitle}
                </h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className={colors.textSecondary}>
                    {enrolledCourses.length} courses enrolled
                  </span>
                  <span className={colors.textSecondary}>
                    {completedCourses.length} completed
                  </span>
                </div>
              </div>
              <ProgressRing 
                progress={overallProgress} 
                size={ageGroup === 'kids' ? 100 : ageGroup === 'teens' ? 90 : 80}
                ageGroup={ageGroup}
              />
            </div>
          </motion.div>
        )}

        {/* Courses Grid */}
        {isLoading ? (
          <div className={cn(
            "grid gap-6",
            ageGroup === 'kids' ? "grid-cols-1 md:grid-cols-2" :
            ageGroup === 'teens' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn(styles.cardBg, styles.cardRadius, styles.padding)}>
                <Skeleton className="h-24 w-full mb-4 rounded" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="text-center py-16"
          >
            <div className={cn(
              "mx-auto mb-4 flex items-center justify-center rounded-full",
              ageGroup === 'kids' ? "w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500" :
              ageGroup === 'teens' ? "w-16 h-16 bg-slate-700" :
              "w-12 h-12 bg-slate-200"
            )}>
              <BookOpen className={cn(
                ageGroup === 'kids' ? "h-10 w-10 text-white" :
                ageGroup === 'teens' ? "h-8 w-8 text-slate-300" :
                "h-6 w-6 text-slate-400"
              )} />
            </div>
            <h3 className={cn(
              "font-semibold mb-2",
              colors.text,
              ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
            )}>
              {content.emptyTitle}
            </h3>
            <p className={cn(
              colors.textSecondary,
              ageGroup === 'kids' ? "text-base" : "text-sm"
            )}>
              {content.emptyDesc}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
            className={cn(
              "grid gap-6",
              ageGroup === 'kids' ? "grid-cols-1 md:grid-cols-2" :
              ageGroup === 'teens' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25, 
                  delay: 0.1 * index 
                }}
              >
                <CourseCard course={course} ageGroup={ageGroup} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AgeBackground>
  );
}