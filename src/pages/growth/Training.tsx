import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LaunchSessionModal } from "@/components/training/LaunchSessionModal";
import { 
  SplitText, 
  BlurText, 
  CountUp, 
  SpotlightCard
} from "@/components/ui/animated";
import { 
  Plus, 
  Play, 
  BookOpen, 
  Users, 
  Award, 
  TrendingUp,
  Search,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Edit,
  Rocket
} from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, subWeeks, startOfWeek, endOfWeek } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  status: string;
  emoji?: string;
  age_group?: string;
  enrollment_count: number;
  total_duration_minutes: number;
  modules: any[];
  created_at: string;
}

interface QuizSession {
  id: string;
  quiz_id: string;
  title: string;
  status: string;
  participant_count: number;
  avg_score: number;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGE_GROUP_COLORS = {
  kids: "bg-emerald-100 text-emerald-700",
  teens: "bg-blue-100 text-blue-700", 
  adults: "bg-purple-100 text-purple-700",
  all: "bg-orange-100 text-orange-700"
};

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-red-100 text-red-700"
};

// ─── Animations ───────────────────────────────────────────────────────────────

const prefersReduced = typeof window !== 'undefined' && 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: prefersReduced ? 0 : 0.08,
      delayChildren: prefersReduced ? 0 : 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: prefersReduced ? 0 : 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: prefersReduced ? { duration: 0 } : {
      type: "spring",
      stiffness: 300,
      damping: 28
    }
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Training() {
  const { tenantId, userId } = useChurch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my-courses");
  const [searchQuery, setSearchQuery] = useState("");
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; title: string } | null>(null);

  // ─── Data Queries ─────────────────────────────────────────────────────────

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["training-courses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_COURSES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!tenantId,
    staleTime: 300000
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["course-enrollments", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.COURSE_ENROLLMENTS)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 300000
  });

  const { data: quizSessions = [] } = useQuery({
    queryKey: ["quiz-sessions", tenantId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from(TABLES.QUIZ_SESSIONS)
          .select("*")
          .eq(COLS.TENANT_ID, tenantId)
          .order("created_at", { ascending: false });
        
        if (error) {
          // If table doesn't exist or other database error, return empty array
          console.warn('Quiz sessions query failed:', error.message);
          return [];
        }
        return data as QuizSession[];
      } catch (error) {
        // Catch any other errors and return empty array silently
        console.warn('Quiz sessions not available:', error);
        return [];
      }
    },
    enabled: !!tenantId,
    staleTime: 300000,
    retry: false // Don't retry failed queries
  });

  // ─── Computed Stats ───────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === "published").length;
    const totalEnrolled = enrollments.length;
    const thisMonth = subMonths(new Date(), 1);
    const liveSessionsThisMonth = quizSessions.filter(
      s => new Date(s.created_at) > thisMonth
    ).length;

    return {
      totalCourses,
      publishedCourses,
      totalEnrolled,
      liveSessionsThisMonth
    };
  }, [courses, enrollments, quizSessions]);

  // ─── Analytics Data ───────────────────────────────────────────────────────

  const analyticsStats = useMemo(() => {
    const totalEnrolled = enrollments.length;
    const completed = enrollments.filter((e: any) => e.completed_at).length;
    const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0;
    const activeLearners = totalEnrolled - completed;

    return {
      completionRate,
      avgQuizScore: 0, // Will be calculated when quiz data is available
      activeLearners,
      certificatesIssued: completed
    };
  }, [enrollments]);

  // ─── Chart Data ───────────────────────────────────────────────────────────

  const enrollmentChartData = useMemo(() => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = endOfWeek(weekStart);
      
      const weekEnrollments = enrollments.filter((e: any) => {
        const enrollDate = new Date(e.created_at);
        return enrollDate >= weekStart && enrollDate <= weekEnd;
      }).length;

      weeks.push({
        week: format(weekStart, 'MMM d'),
        enrollments: weekEnrollments
      });
    }
    
    return weeks;
  }, [enrollments]);

  const ageGroupData = useMemo(() => {
    const groups = { kids: 0, teens: 0, adults: 0 };
    
    courses.forEach(course => {
      const completedCount = enrollments.filter((e: any) => 
        e.course_id === course.id && e.completed_at
      ).length;
      
      if (course.age_group && groups.hasOwnProperty(course.age_group)) {
        groups[course.age_group as keyof typeof groups] += completedCount;
      } else {
        groups.adults += completedCount; // Default to adults
      }
    });

    return [
      { name: 'Kids', value: groups.kids, color: '#10b981' },
      { name: 'Teens', value: groups.teens, color: '#3b82f6' },
      { name: 'Adults', value: groups.adults, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
  }, [courses, enrollments]);

  const topCoursesData = useMemo(() => {
    return courses
      .map(course => ({
        name: course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title,
        enrollments: course.enrollment_count || 0
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5);
  }, [courses]);

  // ─── Filtered Data ────────────────────────────────────────────────────────

  const filteredCourses = useMemo(() => {
    return courses.filter(course =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  // ─── Event Handlers ───────────────────────────────────────────────────────

  const handleCreateCourse = () => {
    navigate("/training/new");
  };

  const handleLaunchQuiz = (course?: { id: string; title: string }) => {
    if (course) {
      setSelectedCourse(course);
    } else {
      setSelectedCourse(null);
    }
    setLaunchModalOpen(true);
  };

  const handleEditCourse = (courseId: string) => {
    navigate(`/training/${courseId}/edit`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Training & Courses — Vestry</title>
      </Helmet>

      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div className="relative">
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none overflow-hidden">
            <div className="w-[200%] h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 animate-gradient-x" />
          </div>
          
          <div className="relative flex items-start justify-between py-8 px-1">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <SplitText 
                className="text-3xl font-bold text-slate-900"
                delay={0}
              >
                Training & Courses
              </SplitText>
              <BlurText 
                className="text-slate-600 text-lg"
                delay={1.5}
              >
                Create courses, launch live quizzes & track member learning
              </BlurText>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            >
              <Button 
                onClick={handleCreateCourse}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleLaunchQuiz}
                className="border-purple-200 hover:border-purple-300"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Launch Live Quiz
              </Button>
            </motion.div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={cardVariants}>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Total Courses
                </div>
                <CountUp 
                  to={stats.totalCourses}
                  className="text-2xl font-semibold text-slate-900"
                  duration={1.8}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Published
                </div>
                <CountUp 
                  to={stats.publishedCourses}
                  className="text-2xl font-semibold text-slate-900"
                  duration={1.8}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Members Enrolled
                </div>
                <CountUp 
                  to={stats.totalEnrolled}
                  className="text-2xl font-semibold text-slate-900"
                  duration={1.8}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Live Sessions This Month
                </div>
                <CountUp 
                  to={stats.liveSessionsThisMonth}
                  className="text-2xl font-semibold text-slate-900"
                  duration={1.8}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Tab Navigation ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger 
                value="my-courses" 
                className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                My Courses
              </TabsTrigger>
              <TabsTrigger 
                value="library"
                className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Library
              </TabsTrigger>
              <TabsTrigger 
                value="live-sessions"
                className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Live Sessions
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── My Courses Tab ── */}
          <TabsContent value="my-courses" className="mt-6">
            {coursesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="mb-4"
                >
                  <BookOpen className="h-16 w-16 text-slate-300" />
                </motion.div>
                <BlurText className="text-xl font-semibold text-slate-600 mb-2">
                  No courses yet
                </BlurText>
                <p className="text-slate-500 mb-6">
                  Create your first course to get started
                </p>
                <Button onClick={handleCreateCourse} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filteredCourses.map((course) => (
                  <motion.div key={course.id} variants={cardVariants}>
                    <SpotlightCard className="h-full">
                      <Card className="h-full border border-slate-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-3xl">
                              {course.emoji || "📚"}
                            </div>
                            <div className="flex flex-col gap-2">
                              {course.age_group && (
                                <Badge className={AGE_GROUP_COLORS[course.age_group as keyof typeof AGE_GROUP_COLORS] || AGE_GROUP_COLORS.all}>
                                  {course.age_group}
                                </Badge>
                              )}
                              <Badge className={STATUS_COLORS[course.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft}>
                                {course.status}
                              </Badge>
                            </div>
                          </div>
                          <CardTitle className="text-lg font-semibold line-clamp-2">
                            {course.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                            {course.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                            <span>{course.modules?.length || 0} lessons</span>
                            <span>{course.enrollment_count} enrolled</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleEditCourse(course.id)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleLaunchQuiz({ id: course.id, title: course.title })}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Launch Live
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </SpotlightCard>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ── Library Tab ── */}
          <TabsContent value="library" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {["Flashcard Decks", "Standalone Quizzes", "Documents / PDFs", "Video Resources", "Audio Lessons"].map((type, index) => (
                  <Card key={type} className="border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="h-6 w-6 text-slate-600" />
                      </div>
                      <h3 className="font-medium text-sm mb-1">{type}</h3>
                      <p className="text-xs text-slate-500">0 resources</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Live Sessions Tab ── */}
          <TabsContent value="live-sessions" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Quiz Sessions</h3>
                <Button onClick={() => handleLaunchQuiz()} className="bg-purple-600 hover:bg-purple-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule New Session
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Session Name</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Course</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Participants</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Avg Score</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizSessions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              No live sessions yet. Schedule your first session to get started.
                            </td>
                          </tr>
                        ) : (
                          quizSessions.map((session) => (
                            <tr key={session.id} className="border-b hover:bg-slate-50">
                              <td className="p-4 font-medium">{session.title}</td>
                              <td className="p-4 text-slate-600">-</td>
                              <td className="p-4 text-slate-600">
                                {format(new Date(session.created_at), "MMM d, yyyy")}
                              </td>
                              <td className="p-4 text-slate-600">{session.participant_count}</td>
                              <td className="p-4 text-slate-600">{session.avg_score}%</td>
                              <td className="p-4">
                                <Badge 
                                  className={session.status === 'active' ? 
                                    'bg-emerald-100 text-emerald-700' : 
                                    'bg-slate-100 text-slate-700'
                                  }
                                >
                                  {session.status}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Button variant="ghost" size="sm">
                                  View Results
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              {/* Metrics Row */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={cardVariants}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Completion Rate
                      </div>
                      <CountUp 
                        to={analyticsStats.completionRate}
                        className="text-2xl font-semibold text-slate-900"
                        duration={1.8}
                      />
                      <span className="text-2xl font-semibold text-slate-900">%</span>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Avg Quiz Score
                      </div>
                      <CountUp 
                        to={analyticsStats.avgQuizScore}
                        className="text-2xl font-semibold text-slate-900"
                        duration={1.8}
                      />
                      <span className="text-2xl font-semibold text-slate-900">%</span>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Active Learners
                      </div>
                      <CountUp 
                        to={analyticsStats.activeLearners}
                        className="text-2xl font-semibold text-slate-900"
                        duration={1.8}
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Certificates Issued
                      </div>
                      <CountUp 
                        to={analyticsStats.certificatesIssued}
                        className="text-2xl font-semibold text-slate-900"
                        duration={1.8}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Enrollments Over Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={enrollmentChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="week" 
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="enrollments" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Completion by Age Group
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 relative">
                      {ageGroupData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                          No completion data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={ageGroupData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {ageGroupData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top Courses by Enrollment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 relative">
                      {topCoursesData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                          No courses available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topCoursesData} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              type="number"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              type="category"
                              dataKey="name"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              width={120}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                            />
                            <Bar 
                              dataKey="enrollments" 
                              fill="#8b5cf6"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      At-Risk Learners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Members who haven't started any course
                      </p>
                      <div className="text-center py-8 text-slate-500">
                        No at-risk learners found
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Launch Session Modal */}
      <LaunchSessionModal
        open={launchModalOpen}
        onClose={() => setLaunchModalOpen(false)}
        courseId={selectedCourse?.id}
        courseName={selectedCourse?.title}
      />
    </>
  );
}