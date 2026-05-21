import { useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { useAgeAware, getAgeStyles, getAgeColors } from "@/contexts/AgeAwareContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft, Download, Share2, Trophy, Award,
  Star, Crown, Sparkles, Medal, Printer
} from "lucide-react";

// ── Certificate Design Component ──────────────────────────────────────────────
function CertificateDesign({ 
  course, 
  member, 
  completion, 
  ageGroup 
}: { 
  course: any; 
  member: any; 
  completion: any;
  ageGroup: 'kids' | 'teens' | 'adults';
}) {
  const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.displayName || 'Member';
  const completionDate = completion?.completed_at ? format(new Date(completion.completed_at), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');

  // Age-specific certificate designs
  const getCertificateDesign = () => {
    switch (ageGroup) {
      case 'kids':
        return {
          background: "linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)",
          border: "border-8 border-white",
          shadow: "shadow-2xl",
          titleColor: "text-white",
          textColor: "text-white/90",
          decorations: (
            <>
              {/* Floating stars */}
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute text-yellow-300"
                  style={{
                    left: `${10 + (i % 4) * 25}%`,
                    top: `${10 + Math.floor(i / 4) * 25}%`,
                    fontSize: '24px'
                  }}
                >
                  ⭐
                </motion.div>
              ))}
              
              {/* Rainbow border */}
              <div className="absolute inset-4 border-4 border-dashed border-white/30 rounded-3xl" />
            </>
          )
        };
      
      case 'teens':
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "border-4 border-slate-700",
          shadow: "shadow-xl",
          titleColor: "text-white",
          textColor: "text-slate-200",
          decorations: (
            <>
              {/* Geometric patterns */}
              <div className="absolute top-8 left-8 w-16 h-16 border-2 border-white/20 rotate-45" />
              <div className="absolute top-8 right-8 w-16 h-16 border-2 border-white/20 rotate-12" />
              <div className="absolute bottom-8 left-8 w-12 h-12 bg-white/10 rotate-45" />
              <div className="absolute bottom-8 right-8 w-12 h-12 bg-white/10 rotate-12" />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
            </>
          )
        };
      
      case 'adults':
        return {
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          border: "border-2 border-slate-300",
          shadow: "shadow-lg",
          titleColor: "text-slate-800",
          textColor: "text-slate-600",
          decorations: (
            <>
              {/* Professional border design */}
              <div className="absolute inset-8 border border-slate-200 rounded-lg" />
              <div className="absolute inset-12 border border-slate-100 rounded-lg" />
              
              {/* Corner ornaments */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-orange-500" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-orange-500" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-orange-500" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-orange-500" />
            </>
          )
        };
    }
  };

  const design = getCertificateDesign();

  return (
    <div 
      className={cn(
        "relative w-full aspect-[4/3] rounded-2xl overflow-hidden",
        design.border,
        design.shadow
      )}
      style={{ background: design.background }}
    >
      {design.decorations}
      
      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-12">
        {/* Header */}
        <div className="mb-8">
          {ageGroup === 'kids' ? (
            <div className="text-6xl mb-4">🏆</div>
          ) : ageGroup === 'teens' ? (
            <Award className="h-16 w-16 text-white mx-auto mb-4" />
          ) : (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-12 w-12 text-orange-500" />
            </div>
          )}
          
          <h1 className={cn(
            "font-bold",
            design.titleColor,
            ageGroup === 'kids' ? "text-4xl" : ageGroup === 'teens' ? "text-3xl" : "text-2xl"
          )}>
            {ageGroup === 'kids' ? "🌟 SUPER STAR CERTIFICATE 🌟" :
             ageGroup === 'teens' ? "ACHIEVEMENT UNLOCKED" :
             "CERTIFICATE OF COMPLETION"}
          </h1>
        </div>

        {/* Recipient */}
        <div className="mb-8">
          <p className={cn(
            "mb-2",
            design.textColor,
            ageGroup === 'kids' ? "text-xl" : ageGroup === 'teens' ? "text-lg" : "text-base"
          )}>
            {ageGroup === 'kids' ? "This awesome certificate is awarded to" :
             ageGroup === 'teens' ? "Awarded to" :
             "This is to certify that"}
          </p>
          
          <h2 className={cn(
            "font-bold border-b-2 pb-2 mb-4 inline-block",
            design.titleColor,
            ageGroup === 'kids' ? "text-3xl border-white" :
            ageGroup === 'teens' ? "text-2xl border-white/50" :
            "text-xl border-slate-400"
          )}>
            {memberName}
          </h2>
          
          <p className={cn(
            design.textColor,
            ageGroup === 'kids' ? "text-lg" : ageGroup === 'teens' ? "text-base" : "text-sm"
          )}>
            {ageGroup === 'kids' ? "has successfully completed the amazing learning adventure" :
             ageGroup === 'teens' ? "has successfully completed the course" :
             "has successfully completed"}
          </p>
        </div>

        {/* Course title */}
        <div className="mb-8">
          <h3 className={cn(
            "font-bold",
            design.titleColor,
            ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
          )}>
            "{course.title}"
          </h3>
          
          {course.description && (
            <p className={cn(
              "mt-2 max-w-md mx-auto",
              design.textColor,
              ageGroup === 'kids' ? "text-base" : "text-sm"
            )}>
              {course.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between w-full max-w-md">
          <div className="text-center">
            <p className={cn(
              "text-xs mb-1",
              design.textColor
            )}>
              Date Completed
            </p>
            <p className={cn(
              "font-semibold",
              design.titleColor,
              ageGroup === 'kids' ? "text-base" : "text-sm"
            )}>
              {completionDate}
            </p>
          </div>
          
          <div className="text-center">
            {ageGroup === 'kids' ? (
              <div className="text-4xl">🎉</div>
            ) : ageGroup === 'teens' ? (
              <Medal className="h-8 w-8 text-yellow-400 mx-auto" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className={cn(
              "text-xs mb-1",
              design.textColor
            )}>
              Vestry Training
            </p>
            <p className={cn(
              "font-semibold",
              design.titleColor,
              ageGroup === 'kids' ? "text-base" : "text-sm"
            )}>
              Certificate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CertificateView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const member = useMemberPortal();
  const { ageGroup } = useAgeAware();
  const certificateRef = useRef<HTMLDivElement>(null);
  const styles = getAgeStyles(ageGroup);
  const colors = getAgeColors(ageGroup);

  // Fetch course and completion data
  const { data: courseData, isLoading } = useQuery({
    queryKey: ["certificate-data", courseId, member.memberId],
    queryFn: async () => {
      // Get course details
      const { data: course } = await supabase
        .from(TABLES.TRAINING_COURSES)
        .select("*")
        .eq("id", courseId!)
        .eq(COLS.TENANT_ID, member.churchId)
        .single();
      
      if (!course) throw new Error("Course not found");

      // Get enrollment/completion data
      const { data: enrollment } = await supabase
        .from(TABLES.COURSE_ENROLLMENTS)
        .select("*")
        .eq("course_id", courseId!)
        .eq("member_id", member.memberId)
        .single();
      
      if (!enrollment?.completed_at) {
        throw new Error("Course not completed");
      }

      return { course, enrollment };
    },
    staleTime: 300000,
    enabled: !!courseId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // In a real implementation, you would generate a PDF here
    // For now, we'll just trigger the print dialog
    handlePrint();
  };

  const handleShare = async () => {
    const shareData = {
      title: `Certificate - ${courseData?.course.title}`,
      text: `I just completed "${courseData?.course.title}" on Vestry!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        alert("Certificate link copied to clipboard!");
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      alert("Certificate link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: styles.background }}>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className={cn(styles.cardBg, styles.cardRadius, "p-6")}>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: styles.background }}>
        <div className="text-center">
          <h1 className={cn("text-2xl font-bold mb-2", colors.text)}>Certificate Not Available</h1>
          <p className={cn("mb-4", colors.textSecondary)}>
            You need to complete the course to view your certificate.
          </p>
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
        <title>Certificate - {courseData.course.title} — Vestry</title>
      </Helmet>
      
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .certificate-container, .certificate-container * {
            visibility: visible;
          }
          .certificate-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center justify-between mb-8 no-print"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/member/training/course/${courseId}`)}
            className={cn(colors.textSecondary, "hover:bg-white/10")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleShare}
              className={styles.buttonRadius}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownload}
              className={styles.buttonRadius}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button
              onClick={handlePrint}
              className={cn(
                styles.buttonRadius,
                colors.primary,
                "text-white"
              )}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </motion.div>

        {/* Certificate */}
        <motion.div
          ref={certificateRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
          className="certificate-container"
        >
          <CertificateDesign
            course={courseData.course}
            member={member}
            completion={courseData.enrollment}
            ageGroup={ageGroup}
          />
        </motion.div>

        {/* Congratulations message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
          className={cn(
            "text-center mt-8 no-print",
            styles.cardBg,
            styles.cardBorder,
            styles.cardRadius,
            styles.padding
          )}
        >
          <div className="text-4xl mb-4">
            {ageGroup === 'kids' ? "🎉" : ageGroup === 'teens' ? "🚀" : "🏆"}
          </div>
          
          <h2 className={cn(
            "font-bold mb-2",
            colors.text,
            ageGroup === 'kids' ? "text-2xl" : ageGroup === 'teens' ? "text-xl" : "text-lg"
          )}>
            {ageGroup === 'kids' ? "You're Amazing!" :
             ageGroup === 'teens' ? "Achievement Unlocked!" :
             "Congratulations!"}
          </h2>
          
          <p className={cn(
            colors.textSecondary,
            ageGroup === 'kids' ? "text-base" : "text-sm"
          )}>
            {ageGroup === 'kids' ? "You completed this awesome course! Keep learning and growing!" :
             ageGroup === 'teens' ? "You've successfully completed this course. Ready for the next challenge?" :
             "You have successfully completed this training course. Continue your learning journey with more courses."}
          </p>
          
          <div className="mt-6">
            <Button
              onClick={() => navigate("/member/training")}
              className={cn(
                styles.buttonSize,
                styles.buttonRadius,
                colors.primary,
                "text-white font-semibold"
              )}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {ageGroup === 'kids' ? "Find More Adventures!" :
               ageGroup === 'teens' ? "Explore More Courses" :
               "Continue Learning"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}