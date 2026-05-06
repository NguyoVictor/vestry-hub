import { useState, useEffect, useMemo, useCallback } from "react";
import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import confetti from "canvas-confetti";

import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import TipTapEditor from "@/components/announcements/TipTapEditor";
import { MagneticButton, SpotlightCard } from "@/components/ui/animated";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { 
  ArrowLeft,
  Check,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Rocket,
  CalendarIcon,
  Users,
  FileText,
  Video,
  Headphones,
  FileImage,
  CreditCard,
  Loader2,
  Play,
  Upload,
  CloudUpload,
  CheckCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id?: string;
  title: string;
  emoji: string;
  subject: string;
  age_group: string;
  description: string;
  estimated_duration: number;
  color_theme: string;
  status: string;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
}

interface Lesson {
  id?: string;
  course_id?: string;
  title: string;
  content_type: 'text' | 'video' | 'audio' | 'pdf' | 'flashcards';
  content: any;
  order_index: number;
  has_quiz: boolean;
  tenant_id: string;
}

interface QuizQuestion {
  id?: string;
  lesson_id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank';
  options: QuestionOption[];
  explanation: string;
  time_limit: number;
  points: number;
  order_index: number;
}

interface QuestionOption {
  text: string;
  is_correct: boolean;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface Group {
  id: string;
  name: string;
  member_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_EMOJIS = ["📖", "🙏", "✝️", "🎵", "👑", "🌱", "🧒", "📋", "🎯", "💡", "🕊️", "⭐"];

const SUBJECTS = [
  { id: "bible", label: "Bible Knowledge", emoji: "📖" },
  { id: "leadership", label: "Leadership", emoji: "👑" },
  { id: "children", label: "Children's Ministry", emoji: "🧒" },
  { id: "worship", label: "Worship", emoji: "🎵" },
  { id: "administration", label: "Administration", emoji: "📋" },
  { id: "discipleship", label: "Discipleship", emoji: "🌱" },
  { id: "other", label: "Other", emoji: "✨" }
];

const AGE_GROUPS = [
  {
    id: "kids",
    title: "Kids",
    subtitle: "Engaging content for children",
    description: "4–12",
    icon: "⭐",
    borderColor: "border-l-green-500",
    bgColor: "bg-green-50"
  },
  {
    id: "teens", 
    title: "Teens",
    subtitle: "Dynamic content for young adults",
    description: "13–17",
    icon: "⚡",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50"
  },
  {
    id: "adults",
    title: "Adults", 
    subtitle: "In-depth training for members",
    description: "18+",
    icon: "📚",
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-50"
  },
  {
    id: "all",
    title: "All Ages",
    subtitle: "Content for everyone", 
    description: "Everyone",
    icon: "👥",
    borderColor: "border-l-orange-500",
    bgColor: "bg-orange-50"
  }
];

const COLOR_THEMES = [
  { id: "purple-indigo", gradient: "from-purple-500 to-indigo-600" },
  { id: "blue-cyan", gradient: "from-blue-500 to-cyan-500" },
  { id: "green-teal", gradient: "from-green-500 to-teal-500" },
  { id: "orange-red", gradient: "from-orange-500 to-red-500" },
  { id: "pink-rose", gradient: "from-pink-500 to-rose-500" },
  { id: "yellow-orange", gradient: "from-yellow-400 to-orange-500" },
  { id: "indigo-purple", gradient: "from-indigo-600 to-purple-700" },
  { id: "teal-green", gradient: "from-teal-500 to-green-400" }
];

const CONTENT_TYPES = [
  { id: "text", label: "Text", icon: FileText },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Headphones },
  { id: "pdf", label: "PDF", icon: FileImage },
  { id: "flashcards", label: "Flashcards", icon: CreditCard }
];

// ─── Step Indicator Component ─────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: "Course Details" },
    { number: 2, label: "Build Lessons" },
    { number: 3, label: "AI Quiz Builder" },
    { number: 4, label: "Assign & Publish" }
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200 py-6">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between relative">
          {/* Connecting lines */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
          <motion.div 
            className="absolute top-6 left-0 h-0.5 bg-purple-600 -z-10"
            initial={{ scaleX: 0 }}
            animate={{ 
              scaleX: completedSteps.length > 0 ? completedSteps.length / (steps.length - 1) : 0 
            }}
            style={{ transformOrigin: "left" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.number);
            const isActive = currentStep === step.number;
            const isFuture = step.number > currentStep && !isCompleted;
            
            return (
              <div key={step.number} className="flex flex-col items-center relative">
                <motion.div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold
                    ${isCompleted 
                      ? "bg-purple-600 text-white" 
                      : isActive 
                        ? "bg-white border-2 border-purple-600 text-purple-600 shadow-lg" 
                        : "bg-slate-200 text-slate-500"
                    }
                  `}
                  animate={isActive ? {
                    boxShadow: [
                      "0 0 0 0px rgba(124, 58, 237, 0.4)",
                      "0 0 0 8px rgba(124, 58, 237, 0.1)",
                      "0 0 0 0px rgba(124, 58, 237, 0.4)"
                    ]
                  } : {}}
                  transition={{ 
                    duration: 2, 
                    repeat: isActive ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </motion.div>
                <span className="text-xs text-slate-500 mt-2 font-medium">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TrainingCourseBuilder() {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!courseId;

  // ─── State ─────────────────────────────────────────────────────────────────
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Step 1 - Course Details
  const [courseData, setCourseData] = useState<Course>({
    title: "",
    emoji: "📖",
    subject: "",
    age_group: "",
    description: "",
    estimated_duration: 30,
    color_theme: "purple-indigo",
    status: "draft",
    tenant_id: tenantId || ""
  });

  // Step 2 - Lessons
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null);

  // Step 3 - Quiz
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<{ [lessonIndex: number]: QuizQuestion[] }>({});
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Step 4 - Publish
  const [assignmentType, setAssignmentType] = useState<'all' | 'members' | 'groups'>('all');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [publishTiming, setPublishTiming] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [issueCertificate, setIssueCertificate] = useState(false);
  const [passMark, setPassMark] = useState(70);

  return (
    <>
      <Helmet>
        <title>{isEditing ? "Edit Course" : "Create Course"} — Vestry</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/training")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Training
            </Button>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait" initial={false}>
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Course Details</h1>
                  <p className="text-slate-600">Set up the basic information for your course</p>
                </div>

                {/* Step 1 Content */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Left Panel - Form */}
                  <div className="lg:col-span-3 space-y-8">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
                      
                      {/* Course Title */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Course Title
                        </label>
                        <Input
                          value={courseData.title}
                          onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                          placeholder="e.g. Bible Foundations for New Members"
                          className="text-lg py-3"
                          autoFocus
                        />
                      </div>

                      {/* Emoji Selector */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Course Icon
                        </label>
                        <div className="grid grid-cols-6 gap-2 mb-3">
                          {PRESET_EMOJIS.map((emoji) => (
                            <motion.button
                              key={emoji}
                              type="button"
                              onClick={() => setCourseData({ ...courseData, emoji })}
                              className={`
                                h-9 w-9 rounded-lg border-2 text-lg flex items-center justify-center
                                ${courseData.emoji === emoji 
                                  ? "border-purple-600 bg-purple-50 scale-110" 
                                  : "border-slate-200 hover:border-slate-300"
                                }
                              `}
                              whileTap={{ scale: 0.95 }}
                              animate={courseData.emoji === emoji ? { scale: 1.1 } : { scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </div>
                        <Input
                          value={courseData.emoji}
                          onChange={(e) => setCourseData({ ...courseData, emoji: e.target.value })}
                          placeholder="or type your own emoji"
                          className="text-center text-lg w-32"
                        />
                      </div>
                    </div>

                    {/* Subject & Category */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Subject & Category</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {SUBJECTS.map((subject) => (
                          <motion.button
                            key={subject.id}
                            type="button"
                            onClick={() => setCourseData({ ...courseData, subject: subject.id })}
                            className={`
                              p-3 rounded-lg border text-sm font-medium text-center
                              ${courseData.subject === subject.id
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                              }
                            `}
                            whileTap={{ scale: 0.96 }}
                            animate={courseData.subject === subject.id ? { scale: 1.04 } : { scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          >
                            <div className="text-lg mb-1">{subject.emoji}</div>
                            {subject.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Target Audience</h3>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Age Group</label>
                      <div className="grid grid-cols-2 gap-4">
                        {AGE_GROUPS.map((group) => (
                          <motion.div
                            key={group.id}
                            onClick={() => setCourseData({ ...courseData, age_group: group.id })}
                            className={`
                              relative p-4 rounded-lg border-2 cursor-pointer
                              ${group.borderColor} ${courseData.age_group === group.id ? group.bgColor : "bg-white"}
                              ${courseData.age_group === group.id ? "border-opacity-100" : "border-opacity-30"}
                            `}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-2xl mb-1">{group.icon}</div>
                                <h4 className="font-semibold text-slate-900">{group.title}</h4>
                                <p className="text-sm text-slate-600 mb-1">{group.subtitle}</p>
                                <p className="text-xs text-slate-500">{group.description}</p>
                              </div>
                              <AnimatePresence>
                                {courseData.age_group === group.id && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                  >
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Details</h3>
                      
                      {/* Description */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Description
                        </label>
                        <Textarea
                          value={courseData.description}
                          onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                          placeholder="What will members learn in this course?"
                          maxLength={300}
                          rows={4}
                        />
                        <div className={`text-xs mt-1 text-right ${courseData.description.length > 270 ? "text-red-500" : "text-slate-500"}`}>
                          {courseData.description.length} / 300
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Estimated Duration
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={courseData.estimated_duration}
                            onChange={(e) => setCourseData({ ...courseData, estimated_duration: parseInt(e.target.value) || 0 })}
                            placeholder="30"
                            className="w-20"
                          />
                          <span className="text-sm text-slate-600">minutes</span>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Color */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Course Color Theme</h3>
                      <div className="flex gap-2 flex-wrap">
                        {COLOR_THEMES.map((theme) => (
                          <motion.button
                            key={theme.id}
                            type="button"
                            onClick={() => setCourseData({ ...courseData, color_theme: theme.id })}
                            className={`
                              w-10 h-10 rounded-lg bg-gradient-to-br ${theme.gradient}
                              border-2 ${courseData.color_theme === theme.id ? "border-slate-800" : "border-transparent"}
                              relative
                            `}
                            whileTap={{ scale: 0.9 }}
                          >
                            {courseData.color_theme === theme.id && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - Preview */}
                  <div className="lg:col-span-2">
                    <div className="sticky top-6">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
                        Member Preview
                      </label>
                      
                      {/* Course Card Preview */}
                      <SpotlightCard className="mb-6">
                        <Card className="border border-slate-200">
                          <div className={`h-20 bg-gradient-to-br ${COLOR_THEMES.find(t => t.id === courseData.color_theme)?.gradient || "from-purple-500 to-indigo-600"} rounded-t-lg flex items-center justify-center`}>
                            <div className="text-3xl">{courseData.emoji || "📖"}</div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex gap-2 mb-2">
                              {courseData.subject && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                  {SUBJECTS.find(s => s.id === courseData.subject)?.label}
                                </Badge>
                              )}
                              {courseData.age_group && (
                                <Badge className="bg-slate-100 text-slate-700 text-xs">
                                  {AGE_GROUPS.find(g => g.id === courseData.age_group)?.title}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                              {courseData.title || "Course Title"}
                            </h3>
                            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                              {courseData.description || "Course description will appear here..."}
                            </p>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                              <span>{lessons.length} lessons</span>
                              <span>{courseData.estimated_duration} min</span>
                            </div>
                            <Badge className="bg-slate-100 text-slate-700 text-xs">
                              Draft
                            </Badge>
                          </CardContent>
                        </Card>
                      </SpotlightCard>

                      {/* Completion Checklist */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {courseData.title ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className={`text-sm ${courseData.title ? "text-green-600" : "text-slate-500"}`}>
                            Course title
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {courseData.subject ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className={`text-sm ${courseData.subject ? "text-green-600" : "text-slate-500"}`}>
                            Subject selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {courseData.age_group ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className={`text-sm ${courseData.age_group ? "text-green-600" : "text-slate-500"}`}>
                            Age group selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {courseData.description ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className={`text-sm ${courseData.description ? "text-green-600" : "text-slate-500"}`}>
                            Description added
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Build Lessons</h1>
                  <p className="text-slate-600">Create engaging content for your course</p>
                </div>
                {/* Step 2 content placeholder */}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Quiz Builder</h1>
                  <p className="text-slate-600">Create interactive quizzes for your lessons</p>
                </div>
                {/* Step 3 content placeholder */}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Assign & Publish</h1>
                  <p className="text-slate-600">Choose who can access your course and publish it</p>
                </div>
                {/* Step 4 content placeholder */}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-end gap-3 mt-12">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </Button>
            )}
            
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => {
                  if (currentStep < 4) {
                    setCurrentStep(currentStep + 1);
                    if (!completedSteps.includes(currentStep)) {
                      setCompletedSteps([...completedSteps, currentStep]);
                    }
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {currentStep === 1 && "Continue to Lessons →"}
                {currentStep === 2 && "Build Quiz →"}
                {currentStep === 3 && "Review & Publish →"}
                {currentStep === 4 && (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Publish Course
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Supporting Components ────────────────────────────────────────────────────

interface SortableLessonItemProps {
  lesson: Lesson;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function SortableLessonItem({ lesson, index, isSelected, onClick }: SortableLessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.order_index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-lg border cursor-pointer
        ${isSelected ? "bg-purple-50 border-l-4 border-l-purple-600 border-purple-200" : "border-slate-200 hover:border-slate-300"}
        ${isDragging ? "opacity-60 scale-105 shadow-lg" : ""}
      `}
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
        {index + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {lesson.title || `Lesson ${index + 1}`}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {CONTENT_TYPES.find(t => t.id === lesson.content_type)?.icon && (
          <div className="text-slate-400">
            {React.createElement(CONTENT_TYPES.find(t => t.id === lesson.content_type)!.icon, { className: "h-4 w-4" })}
          </div>
        )}
        
        <Badge className={lesson.has_quiz ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}>
          {lesson.has_quiz ? "✓ Quiz" : "+ Quiz"}
        </Badge>
      </div>
    </div>
  );
}

interface LessonEditorProps {
  lesson: Lesson;
  onUpdate: (lesson: Lesson) => void;
}

function LessonEditor({ lesson, onUpdate }: LessonEditorProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const updateLesson = (updates: Partial<Lesson>) => {
    onUpdate({ ...lesson, ...updates });
  };

  const renderContentEditor = () => {
    switch (lesson.content_type) {
      case "text":
        return (
          <TipTapEditor
            value={lesson.content || ""}
            onChange={(content) => updateLesson({ content })}
            placeholder="Write your lesson content..."
            className="min-h-[300px]"
          />
        );

      case "video":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Video URL</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube or Vimeo URL..."
                onBlur={() => updateLesson({ content: videoUrl })}
              />
            </div>
            <div className="bg-slate-100 rounded-lg min-h-[200px] flex items-center justify-center">
              {videoUrl ? (
                <div className="text-center">
                  <Play className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Video preview will appear here</p>
                </div>
              ) : (
                <div className="text-center">
                  <Play className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Enter a video URL to see preview</p>
                </div>
              )}
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-slate-200">
              <button className="pb-2 border-b-2 border-purple-600 text-purple-600 font-medium">URL</button>
              <button className="pb-2 text-slate-500">Upload</button>
            </div>
            <div>
              <Input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="Paste audio URL..."
                onBlur={() => updateLesson({ content: audioUrl })}
              />
            </div>
            <div className="bg-slate-100 rounded-lg p-8 text-center">
              <CloudUpload className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Drop audio file here or click to upload</p>
            </div>
          </div>
        );

      case "pdf":
        return (
          <div className="bg-slate-100 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">Drop PDF here or click to upload</p>
            <p className="text-xs text-slate-500">Max size: 50MB</p>
          </div>
        );

      case "flashcards":
        return <FlashcardEditor lesson={lesson} onUpdate={updateLesson} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Lesson Title */}
      <div>
        <Input
          value={lesson.title}
          onChange={(e) => updateLesson({ title: e.target.value })}
          placeholder="Lesson title..."
          className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0"
        />
      </div>

      {/* Content Type Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Content Type</label>
        <div className="flex gap-3">
          {CONTENT_TYPES.map((type) => (
            <motion.button
              key={type.id}
              type="button"
              onClick={() => updateLesson({ content_type: type.id as any, content: "" })}
              className={`
                flex flex-col items-center p-3 rounded-lg border
                ${lesson.content_type === type.id 
                  ? "border-purple-600 bg-purple-50 text-purple-600" 
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                }
              `}
              whileTap={{ scale: 0.95 }}
            >
              <type.icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content Editor */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lesson.content_type}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContentEditor()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface FlashcardEditorProps {
  lesson: Lesson;
  onUpdate: (updates: Partial<Lesson>) => void;
}

function FlashcardEditor({ lesson, onUpdate }: FlashcardEditorProps) {
  const [cards, setCards] = useState(lesson.content?.cards || [{ front: "", back: "" }]);

  const updateCards = (newCards: any[]) => {
    setCards(newCards);
    onUpdate({ content: { cards: newCards } });
  };

  const addCard = () => {
    updateCards([...cards, { front: "", back: "" }]);
  };

  const removeCard = (index: number) => {
    updateCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, field: 'front' | 'back', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    updateCards(newCards);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-8">
          <span className="text-sm font-medium text-slate-700">Front</span>
          <span className="text-sm font-medium text-slate-700">Back</span>
        </div>
        <span className="text-xs text-slate-500">{cards.length} cards</span>
      </div>

      <div className="space-y-3">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex gap-3 items-center"
          >
            <Input
              value={card.front}
              onChange={(e) => updateCard(index, 'front', e.target.value)}
              placeholder="Front of card"
              className="flex-1"
            />
            <Input
              value={card.back}
              onChange={(e) => updateCard(index, 'back', e.target.value)}
              placeholder="Back of card"
              className="flex-1"
            />
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-600 cursor-grab"
              >
                <GripVertical className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCard(index)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addCard}
        className="w-full border-dashed border-slate-300"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Card
      </Button>
    </div>
  );
}

// ─── Quiz Builder Component ───────────────────────────────────────────────────

interface QuizBuilderProps {
  lessonIndex: number;
  lesson: Lesson;
  questions: QuizQuestion[];
  onQuestionsUpdate: (questions: QuizQuestion[]) => void;
  courseData: Course;
}

function QuizBuilder({ lessonIndex, lesson, questions, onQuestionsUpdate, courseData }: QuizBuilderProps) {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Quiz Builder</h3>
        <p className="text-slate-600">AI Quiz generation and manual question creation coming soon...</p>
      </div>
    </div>
  );
}

// ─── Question Card Component ──────────────────────────────────────────────────

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  onUpdate: (question: QuizQuestion) => void;
  onDelete: () => void;
}

function QuestionCard({ question, index, onUpdate, onDelete }: QuestionCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p>Question Card Component</p>
    </div>
  );
}

// ─── Publish Settings Component ───────────────────────────────────────────────

interface PublishSettingsProps {
  assignmentType: 'all' | 'members' | 'groups';
  setAssignmentType: (type: 'all' | 'members' | 'groups') => void;
  selectedMembers: Member[];
  setSelectedMembers: (members: Member[]) => void;
  selectedGroups: Group[];
  setSelectedGroups: (groups: Group[]) => void;
  publishTiming: 'now' | 'schedule';
  setPublishTiming: (timing: 'now' | 'schedule') => void;
  scheduledDate?: Date;
  setScheduledDate: (date?: Date) => void;
  notifyMembers: boolean;
  setNotifyMembers: (notify: boolean) => void;
  issueCertificate: boolean;
  setIssueCertificate: (issue: boolean) => void;
  passMark: number;
  setPassMark: (mark: number) => void;
}

function PublishSettings(props: PublishSettingsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Assign Course</h3>
        
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: 'All Members' },
            { id: 'members', label: 'Specific Members' },
            { id: 'groups', label: 'Specific Groups' }
          ].map((option) => (
            <motion.button
              key={option.id}
              onClick={() => props.setAssignmentType(option.id as any)}
              className={`px-4 py-2 rounded-lg font-medium relative ${
                props.assignmentType === option.id
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              layoutId={props.assignmentType === option.id ? "assignment-type-indicator" : undefined}
            >
              {option.label}
            </motion.button>
          ))}
        </div>

        {props.assignmentType === 'all' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-600 mt-0.5" />
            <p className="text-purple-700">
              This course will be visible to all members in your church.
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Publishing Settings</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            onClick={() => props.setPublishTiming('now')}
            className={`p-4 rounded-lg border-2 cursor-pointer ${
              props.publishTiming === 'now' 
                ? "border-purple-600 bg-purple-50" 
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <Rocket className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-semibold text-slate-900">Publish Now</h4>
            <p className="text-sm text-slate-600">Goes live immediately</p>
          </motion.div>

          <motion.div
            onClick={() => props.setPublishTiming('schedule')}
            className={`p-4 rounded-lg border-2 cursor-pointer ${
              props.publishTiming === 'schedule' 
                ? "border-purple-600 bg-purple-50" 
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <CalendarIcon className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-semibold text-slate-900">Schedule</h4>
            <p className="text-sm text-slate-600">Choose a date and time</p>
          </motion.div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Notify assigned members</h4>
              <p className="text-sm text-slate-600">Send in-app notification when published</p>
            </div>
            <Switch
              checked={props.notifyMembers}
              onCheckedChange={props.setNotifyMembers}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Issue completion certificate</h4>
              <p className="text-sm text-slate-600">Auto-issued when member completes all lessons and passes the quiz</p>
            </div>
            <Switch
              checked={props.issueCertificate}
              onCheckedChange={props.setIssueCertificate}
            />
          </div>

          {props.issueCertificate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="ml-4 pt-2"
            >
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Pass mark:</label>
                <Input
                  type="number"
                  value={props.passMark}
                  onChange={(e) => props.setPassMark(parseInt(e.target.value) || 70)}
                  min={1}
                  max={100}
                  className="w-20"
                />
                <span className="text-sm text-slate-600">%</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Course Summary Component ─────────────────────────────────────────────────

interface CourseSummaryProps {
  courseData: Course;
  lessons: Lesson[];
  quizQuestions: { [lessonIndex: number]: QuizQuestion[] };
  assignmentType: 'all' | 'members' | 'groups';
  selectedMembers: Member[];
  selectedGroups: Group[];
}

function CourseSummary({ courseData, lessons, quizQuestions, assignmentType, selectedMembers, selectedGroups }: CourseSummaryProps) {
  const totalQuestions = Object.values(quizQuestions).reduce((sum, questions) => sum + questions.length, 0);
  
  const getAssignmentText = () => {
    switch (assignmentType) {
      case 'all':
        return 'All Members';
      case 'members':
        return `${selectedMembers.length} members`;
      case 'groups':
        return `${selectedGroups.length} groups`;
      default:
        return 'Not set';
    }
  };

  return (
    <div className="sticky top-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Course Summary</h3>
      
      <Card className="border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">{courseData.emoji}</div>
            <div>
              <h4 className="font-semibold text-slate-900">{courseData.title || "Untitled Course"}</h4>
              <div className="flex gap-2 mt-1">
                {courseData.subject && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    {SUBJECTS.find(s => s.id === courseData.subject)?.label}
                  </Badge>
                )}
                {courseData.age_group && (
                  <Badge className="bg-slate-100 text-slate-700 text-xs">
                    {AGE_GROUPS.find(g => g.id === courseData.age_group)?.title}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Lessons:</span>
              <span className="font-medium">{lessons.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Duration:</span>
              <span className="font-medium">{courseData.estimated_duration} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Quiz Questions:</span>
              <span className="font-medium">{totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Assigned to:</span>
              <span className="font-medium">{getAssignmentText()}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <motion.button
              onClick={() => {
                // Publish logic here
                confetti({
                  particleCount: 120,
                  spread: 80,
                  origin: { x: 0.5, y: 0.85 },
                  colors: ['#7c3aed', '#a855f7', '#c084fc', '#e9d5ff', '#ffffff']
                });
                toast.success("Course published! 🎉");
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              whileTap={{ scale: 0.98 }}
            >
              <Rocket className="h-4 w-4" />
              Publish Course
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}