import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { useAgeAware, getAgeStyles, getAgeColors } from "@/contexts/AgeAwareContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TipTapViewer } from "@/components/shared/TipTapViewer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle, Play, Pause,
  Volume2, VolumeX, RotateCcw, RotateCw, Trophy,
  BookOpen, Headphones, FileText, Image, Brain,
  Clock, Target, Star, Zap
} from "lucide-react";

// ── Lesson Content Component ──────────────────────────────────────────────────
function LessonContent({ lesson, ageGroup }: { 
  lesson: any; 
  ageGroup: 'kids' | 'teens' | 'adults';
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  const renderContent = () => {
    switch (lesson.content_type) {
      case 'video':
        return (
          <div className={cn(
            "relative overflow-hidden",
            styles.cardRadius,
            ageGroup === 'kids' ? "aspect-video" : "aspect-video"
          )}>
            {lesson.video_url ? (
              <video
                src={lesson.video_url}
                controls
                className="w-full h-full"
                poster={lesson.thumbnail_url}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                <Play className="h-16 w-16 text-slate-400" />
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className={cn(
            styles.cardBg,
            styles.cardBorder,
            styles.cardRadius,
            "p-8 text-center"
          )}>
            <div className={cn(
              "mx-auto mb-6 flex items-center justify-center rounded-full",
              ageGroup === 'kids' ? "w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500" :
              ageGroup === 'teens' ? "w-20 h-20 bg-slate-700" :
              "w-16 h-16 bg-orange-100"
            )}>
              <Headphones className={cn(
                ageGroup === 'kids' ? "h-12 w-12 text-white" :
                ageGroup === 'teens' ? "h-10 w-10 text-slate-300" :
                "h-8 w-8 text-orange-500"
              )} />
            </div>
            
            {lesson.audio_url && (
              <audio controls className="w-full max-w-md mx-auto">
                <source src={lesson.audio_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        );

      case 'text':
        return (
          <div className={cn(
            styles.cardBg,
            styles.cardBorder,
            styles.cardRadius,
            styles.padding
          )}>
            {lesson.content ? (
              <TipTapViewer 
                content={lesson.content}
                className={cn(
                  ageGroup === 'kids' ? "prose-lg" : 
                  ageGroup === 'teens' ? "prose-base" : 
                  "prose-sm"
                )}
              />
            ) : (
              <p className={colors.textSecondary}>No content available for this lesson.</p>
            )}
          </div>
        );

      case 'image':
        return (
          <div className={cn(
            "overflow-hidden",
            styles.cardRadius
          )}>
            {lesson.image_url ? (
              <img 
                src={lesson.image_url} 
                alt={lesson.title}
                className="w-full h-auto"
              />
            ) : (
              <div className="w-full h-64 bg-slate-200 flex items-center justify-center">
                <Image className="h-16 w-16 text-slate-400" />
              </div>
            )}
            
            {lesson.content && (
              <div className={cn(
                styles.cardBg,
                styles.cardBorder,
                "mt-4 p-4 rounded-lg"
              )}>
                <TipTapViewer content={lesson.content} />
              </div>
            )}
          </div>
        );

      case 'quiz':
        return (
          <div className={cn(
            styles.cardBg,
            styles.cardBorder,
            styles.cardRadius,
            "p-8 text-center"
          )}>
            <div className={cn(
              "mx-auto mb-6 flex items-center justify-center rounded-full",
              ageGroup === 'kids' ? "w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500" :
              ageGroup === 'teens' ? "w-20 h-20 bg-slate-700" :
              "w-16 h-16 bg-orange-100"
            )}>
              <Brain className={cn(
                ageGroup === 'kids' ? "h-12 w-12 text-white" :
                ageGroup === 'teens' ? "h-10 w-10 text-slate-300" :
                "h-8 w-8 text-orange-500"
              )} />
            </div>
            
            <h3 className={cn(
              "font-bold mb-2",
              colors.text,
              ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
            )}>
              {ageGroup === 'kids' ? "🧠 Brain Challenge!" : 
               ageGroup === 'teens' ? "Knowledge Check" : 
               "Lesson Quiz"}
            </h3>
            
            <p className={cn(
              "mb-6",
              colors.textSecondary,
              ageGroup === 'kids' ? "text-base" : "text-sm"
            )}>
              Test your understanding with this interactive quiz.
            </p>
            
            <Button
              onClick={() => {
                // Navigate to quiz play view in solo mode
                window.open(`/quiz/play/lesson-${lesson.id}/solo`, '_blank');
              }}
              className={cn(
                styles.buttonSize,
                styles.buttonRadius,
                colors.primary,
                "text-white font-semibold"
              )}
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Quiz
            </Button>
          </div>
        );

      default:
        return (
          <div className={cn(
            styles.cardBg,
            styles.cardBorder,
            styles.cardRadius,
            "p-8 text-center"
          )}>
            <BookOpen className={cn(
              "mx-auto mb-4",
              colors.textSecondary,
              ageGroup === 'kids' ? "h-16 w-16" : ageGroup === 'teens' ? "h-12 w-12" : "h-8 w-8"
            )} />
            <p className={colors.textSecondary}>Content not available</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
      
      {/* Additional lesson description */}
      {lesson.description && (
        <div className={cn(
          styles.cardBg,
          styles.cardBorder,
          styles.cardRadius,
          styles.padding
        )}>
          <h4 className={cn(
            "font-semibold mb-2",
            colors.text,
            ageGroup === 'kids' ? "text-lg" : "text-base"
          )}>
            About this lesson
          </h4>
          <p className={cn(
            colors.textSecondary,
            ageGroup === 'kids' ? "text-base" : "text-sm"
          )}>
            {lesson.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Flashcard Player Component ────────────────────────────────────────────────
function FlashcardPlayer({ flashcards, ageGroup }: { 
  flashcards: any[]; 
  ageGroup: 'kids' | 'teens' | 'adults';
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  const currentCard = flashcards[currentIndex];

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    setIsFlipped(false);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setIsFlipped(false);
  };

  if (!currentCard) return null;

  return (
    <div className="space-y-6">
      {/* Card counter */}
      <div className="text-center">
        <span className={cn(
          colors.textSecondary,
          ageGroup === 'kids' ? "text-base" : "text-sm"
        )}>
          Card {currentIndex + 1} of {flashcards.length}
        </span>
      </div>

      {/* Flashcard */}
      <motion.div
        className={cn(
          "relative cursor-pointer",
          ageGroup === 'kids' ? "h-80" : ageGroup === 'teens' ? "h-64" : "h-48"
        )}
        onClick={() => setIsFlipped(!isFlipped)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isFlipped ? 'back' : 'front'}
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: -90 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "absolute inset-0 flex items-center justify-center text-center",
              styles.cardBg,
              styles.cardBorder,
              styles.cardRadius,
              styles.cardShadow,
              styles.padding,
              isFlipped ? colors.primary : "bg-white"
            )}
          >
            <div>
              <p className={cn(
                "font-semibold",
                isFlipped ? "text-white" : colors.text,
                ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
              )}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              
              {!isFlipped && (
                <p className={cn(
                  "mt-4 text-xs opacity-60",
                  colors.textSecondary
                )}>
                  Tap to reveal answer
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevCard}
          disabled={flashcards.length <= 1}
          className={styles.buttonRadius}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setIsFlipped(!isFlipped)}
          className={styles.buttonRadius}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Flip Card
        </Button>
        
        <Button
          variant="outline"
          onClick={nextCard}
          disabled={flashcards.length <= 1}
          className={styles.buttonRadius}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MemberLessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const member = useMemberPortal();
  const { ageGroup } = useAgeAware();
  const queryClient = useQueryClient();
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  // Fetch lesson details
  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson-detail", lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_lessons")
        .select(`
          *,
          training_courses!inner(id, title, tenant_id)
        `)
        .eq("id", lessonId!)
        .single();
      
      if (!data || data.training_courses.tenant_id !== member.churchId) {
        throw new Error("Lesson not found");
      }
      
      return data;
    },
    staleTime: 300000,
    enabled: !!lessonId,
  });

  // Check if lesson is completed
  const { data: completion } = useQuery({
    queryKey: ["lesson-completion", lessonId, member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.LESSON_COMPLETIONS)
        .select("*")
        .eq("lesson_id", lessonId!)
        .eq("member_id", member.memberId)
        .single();
      
      return data;
    },
    staleTime: 300000,
    enabled: !!lessonId,
  });

  // Mark lesson as completed
  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(TABLES.LESSON_COMPLETIONS)
        .insert({
          lesson_id: lessonId!,
          course_id: lesson?.course_id,
          member_id: member.memberId,
          tenant_id: member.churchId,
          completed_at: new Date().toISOString()
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        ageGroup === 'kids' ? "🎉 Awesome! Lesson completed!" :
        ageGroup === 'teens' ? "✅ Lesson completed!" :
        "Lesson marked as completed"
      );
      queryClient.invalidateQueries({ queryKey: ["lesson-completion", lessonId, member.memberId] });
      queryClient.invalidateQueries({ queryKey: ["lesson-completions"] });
      queryClient.invalidateQueries({ queryKey: ["member-course-detail"] });
    },
    onError: () => {
      toast.error("Failed to mark lesson as completed");
    }
  });

  const isCompleted = !!completion;

  const handleComplete = () => {
    if (!isCompleted) {
      completeLessonMutation.mutate();
    }
  };

  const handleBackToCourse = () => {
    if (lesson?.course_id) {
      navigate(`/member/training/course/${lesson.course_id}`);
    } else {
      navigate("/member/training");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: styles.background }}>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className={cn(styles.cardBg, styles.cardRadius, "p-6")}>
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-64 w-full mb-4" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: styles.background }}>
        <div className="text-center">
          <h1 className={cn("text-2xl font-bold mb-2", colors.text)}>Lesson Not Found</h1>
          <p className={cn("mb-4", colors.textSecondary)}>The lesson you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/member/training")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Training
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: styles.background }}>
      <Helmet>
        <title>{lesson.title} — Vestry</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            variant="ghost"
            onClick={handleBackToCourse}
            className={cn(colors.textSecondary, "hover:bg-white/10")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>

          {isCompleted && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </motion.div>

        {/* Lesson header */}
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
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className={cn(
                "font-bold mb-2",
                colors.text,
                ageGroup === 'kids' ? "text-3xl" : ageGroup === 'teens' ? "text-2xl" : "text-xl"
              )}>
                {lesson.title}
              </h1>
              
              <div className="flex items-center gap-4">
                <div className={cn("flex items-center gap-1", colors.textSecondary)}>
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{lesson.estimated_duration || '10 min'}</span>
                </div>
                {lesson.content_type && (
                  <div className={cn("flex items-center gap-1", colors.textSecondary)}>
                    {lesson.content_type === 'video' && <Play className="h-4 w-4" />}
                    {lesson.content_type === 'audio' && <Headphones className="h-4 w-4" />}
                    {lesson.content_type === 'text' && <FileText className="h-4 w-4" />}
                    {lesson.content_type === 'image' && <Image className="h-4 w-4" />}
                    {lesson.content_type === 'quiz' && <Brain className="h-4 w-4" />}
                    <span className="text-sm capitalize">{lesson.content_type}</span>
                  </div>
                )}
              </div>
            </div>

            {!isCompleted && (
              <Button
                onClick={handleComplete}
                disabled={completeLessonMutation.isPending}
                className={cn(
                  styles.buttonSize,
                  styles.buttonRadius,
                  "bg-green-500 hover:bg-green-600 text-white font-semibold"
                )}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {completeLessonMutation.isPending ? "Completing..." : "Mark Complete"}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Lesson content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
        >
          {lesson.flashcards && lesson.flashcards.length > 0 ? (
            <FlashcardPlayer flashcards={lesson.flashcards} ageGroup={ageGroup} />
          ) : (
            <LessonContent lesson={lesson} ageGroup={ageGroup} />
          )}
        </motion.div>

        {/* Completion celebration for kids */}
        {isCompleted && ageGroup === 'kids' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">Amazing Work!</h3>
            <p className="text-white/80">You completed this lesson! Keep going!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}