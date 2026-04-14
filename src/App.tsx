import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { capturePageView } from "./lib/monitoring";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import MemberLogin from "./pages/auth/MemberLogin";
import AuthCallback from "./pages/auth/AuthCallback";
import Onboarding from "./pages/Onboarding";
import PlaceholderPage from "./pages/PlaceholderPage";
import ChurchPublicPage from "./pages/ChurchPublicPage";
import { AuthGuard } from "./components/layout/AuthGuard";
import { AppLayout } from "./components/layout/AppLayout";
import { MemberAuthGuard } from "./components/layout/MemberAuthGuard";
import { MemberPortalLayout } from "./components/layout/MemberPortalLayout";
import { SettingsLayout } from "./components/settings/SettingsLayout";
import { allNavItems } from "./config/navigation";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Dashboard — lazy loaded
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Analytics & Branches pages
const Reports = lazy(() => import("./pages/analytics/Reports"));
const Branches = lazy(() => import("./pages/analytics/Branches"));
const BranchDetail = lazy(() => import("./pages/analytics/BranchDetail"));

// Member Portal pages
const MemberLoginPage = lazy(() => import("./pages/member/MemberLogin"));
const JoinChurch = lazy(() => import("./pages/member/JoinChurch"));
const ProfileSetup = lazy(() => import("./pages/member/ProfileSetup"));
const MemberHome = lazy(() => import("./pages/member/MemberHome"));
const MemberGive = lazy(() => import("./pages/member/MemberGive"));
const MemberGivingHistory = lazy(() => import("./pages/member/MemberGivingHistory"));
const MemberAnnouncements = lazy(() => import("./pages/member/MemberAnnouncements"));
const MemberRequests = lazy(() => import("./pages/member/MemberRequests"));
const MemberTestimonies = lazy(() => import("./pages/member/MemberTestimonies"));
const MemberProfilePage = lazy(() => import("./pages/member/MemberProfile"));
const MemberSettingsPage = lazy(() => import("./pages/member/MemberSettings"));
const MemberEventsPage = lazy(() => import("./pages/member/MemberEvents").then(m => ({ default: m.MemberEvents })));
const MemberEventDetailPage = lazy(() => import("./pages/member/MemberEvents").then(m => ({ default: m.MemberEventDetail })));
const MemberGroupsPage = lazy(() => import("./pages/member/MemberGroups").then(m => ({ default: m.MemberGroups })));
const MemberGroupDetailPage = lazy(() => import("./pages/member/MemberGroups").then(m => ({ default: m.MemberGroupDetail })));
const MemberSermonsPage = lazy(() => import("./pages/member/MemberSermons").then(m => ({ default: m.MemberSermons })));
const MemberSermonDetailPage = lazy(() => import("./pages/member/MemberSermons").then(m => ({ default: m.MemberSermonDetail })));
const MemberBiblePage = lazy(() => import("./pages/member/MemberBible"));
const MemberMessagesPage = lazy(() => import("./pages/member/MemberMessages"));
const MemberVolunteerPage = lazy(() => import("./pages/member/MemberVolunteer"));

// Media pages
const AssetManagementPage = lazy(() => import("./pages/media/AssetManagement"));
const SongLibraryPage = lazy(() => import("./pages/media/SongLibrary"));
const ChurchMediaPage = lazy(() => import("./pages/media/ChurchMedia"));
const SermonPreparationPage = lazy(() => import("./pages/media/SermonPreparation"));
const BibleExplorerPage = lazy(() => import("./pages/media/BibleExplorer"));
const SermonsPage = lazy(() => import("./pages/media/Sermons"));
const Discipleship = lazy(() => import("./pages/growth/Discipleship"));
const DiscipleshipResources = lazy(() => import("./pages/growth/DiscipleshipResources"));
const DiscipleshipGraduates = lazy(() => import("./pages/growth/DiscipleshipGraduates"));
const Outreach = lazy(() => import("./pages/growth/Outreach"));
const OutreachDetail = lazy(() => import("./pages/growth/OutreachDetail"));
const ResourcesStore = lazy(() => import("./pages/growth/ResourcesStore"));
const Training = lazy(() => import("./pages/growth/Training"));
const TrainingCourseBuilder = lazy(() => import("./pages/growth/TrainingCourseBuilder"));
const TrainingCourseDetail = lazy(() => import("./pages/growth/TrainingCourseDetail"));

// Settings pages
const ChurchProfile = lazy(() => import("./pages/settings/ChurchProfile"));
const ServicesModules = lazy(() => import("./pages/settings/ServicesModules"));
const RolesPermissions = lazy(() => import("./pages/settings/RolesPermissions"));
const Notifications = lazy(() => import("./pages/settings/Notifications"));
const Billing = lazy(() => import("./pages/settings/Billing"));
const Security = lazy(() => import("./pages/settings/Security"));
const Integrations = lazy(() => import("./pages/settings/Integrations"));
const SeoPublicPage = lazy(() => import("./pages/settings/SeoPublicPage"));
const MemberAppSettings = lazy(() => import("./pages/settings/MemberApp"));

// People pages
const Members = lazy(() => import("./pages/people/Members"));
const MemberProfile = lazy(() => import("./pages/people/MemberProfile"));
const Groups = lazy(() => import("./pages/people/Groups"));
const GroupDetail = lazy(() => import("./pages/people/GroupDetail"));
const HouseFellowships = lazy(() => import("./pages/people/HouseFellowships"));
const Families = lazy(() => import("./pages/people/Families"));
const Visitors = lazy(() => import("./pages/people/Visitors"));
const FollowUpTasks = lazy(() => import("./pages/people/FollowUpTasks"));
const NewConverts = lazy(() => import("./pages/people/NewConverts"));

// Finance pages
const GiveOnline = lazy(() => import("./pages/finance/GiveOnline"));
const GivingRecords = lazy(() => import("./pages/finance/GivingRecords"));
const PledgeCampaigns = lazy(() => import("./pages/finance/PledgeCampaigns"));
const ChurchExpenses = lazy(() => import("./pages/finance/ChurchExpenses"));
const BudgetManagement = lazy(() => import("./pages/finance/BudgetManagement"));
const Payroll = lazy(() => import("./pages/finance/Payroll"));
const FundAccounting = lazy(() => import("./pages/finance/FundAccounting"));
const AccountsPayable = lazy(() => import("./pages/finance/AccountsPayable"));
const GeneralLedger = lazy(() => import("./pages/finance/GeneralLedger"));
const Payouts = lazy(() => import("./pages/finance/Payouts"));

// Operations pages
const ServicesPage = lazy(() => import("./pages/operations/Services"));
const EventsPage = lazy(() => import("./pages/operations/Events"));
const Volunteering = lazy(() => import("./pages/operations/Volunteering"));
const MemberRequestsPage = lazy(() => import("./pages/operations/MemberRequests"));
const BoardMeetingsPage = lazy(() => import("./pages/operations/BoardMeetings"));
const FacilityBooking = lazy(() => import("./pages/operations/FacilityBooking"));

// Security pages
const SecurityCentre = lazy(() => import("./pages/security/SecurityCentre"));
const IncidentManagement = lazy(() => import("./pages/security/IncidentManagement"));

// Public pages
const VisitorRegistration = lazy(() => import("./pages/VisitorRegistration"));

// Communications pages
const CommunicationsPage = lazy(() => import("./pages/communications/Communications"));
const AnnouncementsPage = lazy(() => import("./pages/communications/Announcements"));
const MemberMessaging = lazy(() => import("./pages/communications/MemberMessaging"));
const TestimoniesPage = lazy(() => import("./pages/communications/Testimonies"));
const SurveysPage = lazy(() => import("./pages/communications/Surveys"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300_000,        // 5 minutes — data stays fresh, no unnecessary refetches
      gcTime: 600_000,           // 10 minutes cache retention
      refetchOnWindowFocus: false, // never refetch just because user switches tabs
      retry: 1,                  // only retry once on failure
    },
  },
});

const Fallback = () => <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

// Track page views on every route change
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => { capturePageView(location.pathname); }, [location.pathname]);
  return null;
}

const PEOPLE_PATHS = ["/members", "/groups", "/house-fellowships", "/families", "/visitors", "/follow-up-tasks", "/new-converts"];
const FINANCE_PATHS = ["/give-online", "/giving-records", "/pledge-campaigns", "/church-expenses", "/budget-management", "/payroll", "/fund-accounting", "/accounts-payable", "/general-ledger", "/payouts"];
const OPS_PATHS = ["/services", "/events", "/volunteering", "/member-requests", "/board-meetings", "/facility-booking"];
const SEC_COMM_PATHS = ["/security-centre", "/incident-management", "/communications", "/announcements", "/member-messaging", "/testimonies", "/surveys"];
const GROWTH_PATHS = ["/discipleship", "/discipleship/graduates", "/discipleship-resources", "/outreach", "/resources-store", "/training"];
const ADMIN_PATHS = ["/reports", "/branches"];
const MEDIA_PATHS = ["/church-media", "/asset-management", "/song-library", "/sermon-preparation", "/bible-explorer", "/sermons"];

const App = () => (
  <Sentry.ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen p-12 text-muted-foreground">Something went wrong. Please refresh the page.</div>}>
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PageViewTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/member-login" element={<Navigate to="/member/login" replace />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/church/:slug" element={<ChurchPublicPage />} />
            <Route path="/visitor-registration/:churchId" element={<Suspense fallback={<Fallback />}><VisitorRegistration /></Suspense>} />
            <Route element={<AuthGuard />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                {/* People routes */}
                <Route path="/members" element={<Suspense fallback={<Fallback />}><Members /></Suspense>} />
                <Route path="/members/:memberId" element={<Suspense fallback={<Fallback />}><MemberProfile /></Suspense>} />
                <Route path="/groups" element={<Suspense fallback={<Fallback />}><Groups /></Suspense>} />
                <Route path="/groups/:groupId" element={<Suspense fallback={<Fallback />}><GroupDetail /></Suspense>} />
                <Route path="/house-fellowships" element={<Suspense fallback={<Fallback />}><HouseFellowships /></Suspense>} />
                <Route path="/families" element={<Suspense fallback={<Fallback />}><Families /></Suspense>} />
                <Route path="/visitors" element={<Suspense fallback={<Fallback />}><Visitors /></Suspense>} />
                <Route path="/follow-up-tasks" element={<Suspense fallback={<Fallback />}><FollowUpTasks /></Suspense>} />
                <Route path="/new-converts" element={<Suspense fallback={<Fallback />}><NewConverts /></Suspense>} />
                {/* Finance routes */}
                <Route path="/give-online" element={<Suspense fallback={<Fallback />}><GiveOnline /></Suspense>} />
                <Route path="/giving-records" element={<Suspense fallback={<Fallback />}><GivingRecords /></Suspense>} />
                <Route path="/pledge-campaigns" element={<Suspense fallback={<Fallback />}><PledgeCampaigns /></Suspense>} />
                <Route path="/church-expenses" element={<Suspense fallback={<Fallback />}><ChurchExpenses /></Suspense>} />
                <Route path="/budget-management" element={<Suspense fallback={<Fallback />}><BudgetManagement /></Suspense>} />
                <Route path="/payroll" element={<Suspense fallback={<Fallback />}><Payroll /></Suspense>} />
                <Route path="/fund-accounting" element={<Suspense fallback={<Fallback />}><FundAccounting /></Suspense>} />
                <Route path="/accounts-payable" element={<Suspense fallback={<Fallback />}><AccountsPayable /></Suspense>} />
                <Route path="/general-ledger" element={<Suspense fallback={<Fallback />}><GeneralLedger /></Suspense>} />
                <Route path="/payouts" element={<Suspense fallback={<Fallback />}><Payouts /></Suspense>} />
                {/* Operations routes */}
                <Route path="/services" element={<Suspense fallback={<Fallback />}><ServicesPage /></Suspense>} />
                <Route path="/events" element={<Suspense fallback={<Fallback />}><EventsPage /></Suspense>} />
                <Route path="/volunteering" element={<Suspense fallback={<Fallback />}><Volunteering /></Suspense>} />
                <Route path="/member-requests" element={<Suspense fallback={<Fallback />}><MemberRequestsPage /></Suspense>} />
                <Route path="/board-meetings" element={<Suspense fallback={<Fallback />}><BoardMeetingsPage /></Suspense>} />
                <Route path="/facility-booking" element={<Suspense fallback={<Fallback />}><FacilityBooking /></Suspense>} />
                {/* Security & Communications routes */}
                <Route path="/security-centre" element={<Suspense fallback={<Fallback />}><SecurityCentre /></Suspense>} />
                <Route path="/incident-management" element={<Suspense fallback={<Fallback />}><IncidentManagement /></Suspense>} />
                <Route path="/communications" element={<Suspense fallback={<Fallback />}><CommunicationsPage /></Suspense>} />
                <Route path="/announcements" element={<Suspense fallback={<Fallback />}><AnnouncementsPage /></Suspense>} />
                <Route path="/member-messaging" element={<Suspense fallback={<Fallback />}><MemberMessaging /></Suspense>} />
                <Route path="/testimonies" element={<Suspense fallback={<Fallback />}><TestimoniesPage /></Suspense>} />
                <Route path="/surveys" element={<Suspense fallback={<Fallback />}><SurveysPage /></Suspense>} />
                {/* Growth & Discipleship routes */}
                <Route path="/discipleship" element={<Suspense fallback={<Fallback />}><Discipleship /></Suspense>} />
                <Route path="/discipleship/graduates" element={<Suspense fallback={<Fallback />}><DiscipleshipGraduates /></Suspense>} />
                <Route path="/discipleship-resources" element={<Suspense fallback={<Fallback />}><DiscipleshipResources /></Suspense>} />
                <Route path="/outreach" element={<Suspense fallback={<Fallback />}><Outreach /></Suspense>} />
                <Route path="/outreach/:activityId" element={<Suspense fallback={<Fallback />}><OutreachDetail /></Suspense>} />
                <Route path="/resources-store" element={<Suspense fallback={<Fallback />}><ResourcesStore /></Suspense>} />
                <Route path="/training" element={<Suspense fallback={<Fallback />}><Training /></Suspense>} />
                <Route path="/training/new" element={<Suspense fallback={<Fallback />}><TrainingCourseBuilder /></Suspense>} />
                <Route path="/training/:courseId/edit" element={<Suspense fallback={<Fallback />}><TrainingCourseBuilder /></Suspense>} />
                <Route path="/training/:courseId" element={<Suspense fallback={<Fallback />}><TrainingCourseDetail /></Suspense>} />
                {/* Analytics & Branches routes */}
                <Route path="/reports" element={<Suspense fallback={<Fallback />}><Reports /></Suspense>} />
                <Route path="/branches" element={<Suspense fallback={<Fallback />}><Branches /></Suspense>} />
                <Route path="/branches/:branchId" element={<Suspense fallback={<Fallback />}><BranchDetail /></Suspense>} />
                {/* Media routes */}
                <Route path="/church-media" element={<Suspense fallback={<Fallback />}><ChurchMediaPage /></Suspense>} />
                <Route path="/asset-management" element={<Suspense fallback={<Fallback />}><AssetManagementPage /></Suspense>} />
                <Route path="/song-library" element={<Suspense fallback={<Fallback />}><SongLibraryPage /></Suspense>} />
                <Route path="/sermon-preparation" element={<Suspense fallback={<Fallback />}><SermonPreparationPage /></Suspense>} />
                <Route path="/bible-explorer" element={<Suspense fallback={<Fallback />}><BibleExplorerPage /></Suspense>} />
                <Route path="/sermons" element={<Suspense fallback={<Fallback />}><SermonsPage /></Suspense>} />
                {/* Settings */}
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="/settings/profile" replace />} />
                  <Route path="profile" element={<Suspense fallback={<Fallback />}><ChurchProfile /></Suspense>} />
                  <Route path="services" element={<Suspense fallback={<Fallback />}><ServicesModules /></Suspense>} />
                  <Route path="roles" element={<Suspense fallback={<Fallback />}><RolesPermissions /></Suspense>} />
                  <Route path="notifications" element={<Suspense fallback={<Fallback />}><Notifications /></Suspense>} />
                  <Route path="billing" element={<Suspense fallback={<Fallback />}><Billing /></Suspense>} />
                  <Route path="security" element={<Suspense fallback={<Fallback />}><Security /></Suspense>} />
                  <Route path="integrations" element={<Suspense fallback={<Fallback />}><Integrations /></Suspense>} />
                  <Route path="seo" element={<Suspense fallback={<Fallback />}><SeoPublicPage /></Suspense>} />
                  <Route path="member-app" element={<Suspense fallback={<Fallback />}><MemberAppSettings /></Suspense>} />
                </Route>
                {/* Remaining placeholder routes */}
                {allNavItems
                  .filter(i => i.path !== "/dashboard" && i.path !== "/settings" && !PEOPLE_PATHS.includes(i.path) && !FINANCE_PATHS.includes(i.path) && !OPS_PATHS.includes(i.path) && !SEC_COMM_PATHS.includes(i.path) && !GROWTH_PATHS.includes(i.path) && !ADMIN_PATHS.includes(i.path) && !MEDIA_PATHS.includes(i.path))
                  .map(item => (
                    <Route key={item.path} path={item.path} element={<PlaceholderPage />} />
                  ))}
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
            {/* Member Portal — standalone auth pages */}
            <Route path="/member/login" element={<Suspense fallback={<Fallback />}><MemberLoginPage /></Suspense>} />
            <Route path="/member/join" element={<Suspense fallback={<Fallback />}><JoinChurch /></Suspense>} />
            {/* Member Portal — authenticated pages */}
            <Route element={<MemberAuthGuard />}>
              <Route path="/member/profile-setup" element={<Suspense fallback={<Fallback />}><ProfileSetup /></Suspense>} />
              <Route element={<MemberPortalLayout />}>
                <Route path="/member" element={<Suspense fallback={<Fallback />}><MemberHome /></Suspense>} />
                <Route path="/member/give" element={<Suspense fallback={<Fallback />}><MemberGive /></Suspense>} />
                <Route path="/member/giving-history" element={<Suspense fallback={<Fallback />}><MemberGivingHistory /></Suspense>} />
                <Route path="/member/events" element={<Suspense fallback={<Fallback />}><MemberEventsPage /></Suspense>} />
                <Route path="/member/events/:eventId" element={<Suspense fallback={<Fallback />}><MemberEventDetailPage /></Suspense>} />
                <Route path="/member/announcements" element={<Suspense fallback={<Fallback />}><MemberAnnouncements /></Suspense>} />
                <Route path="/member/groups" element={<Suspense fallback={<Fallback />}><MemberGroupsPage /></Suspense>} />
                <Route path="/member/groups/:groupId" element={<Suspense fallback={<Fallback />}><MemberGroupDetailPage /></Suspense>} />
                <Route path="/member/requests" element={<Suspense fallback={<Fallback />}><MemberRequests /></Suspense>} />
                <Route path="/member/testimonies" element={<Suspense fallback={<Fallback />}><MemberTestimonies /></Suspense>} />
                <Route path="/member/profile" element={<Suspense fallback={<Fallback />}><MemberProfilePage /></Suspense>} />
                <Route path="/member/settings" element={<Suspense fallback={<Fallback />}><MemberSettingsPage /></Suspense>} />
                <Route path="/member/messages" element={<Suspense fallback={<Fallback />}><MemberMessagesPage /></Suspense>} />
                <Route path="/member/sermons" element={<Suspense fallback={<Fallback />}><MemberSermonsPage /></Suspense>} />
                <Route path="/member/sermons/:sermonId" element={<Suspense fallback={<Fallback />}><MemberSermonDetailPage /></Suspense>} />
                <Route path="/member/bible" element={<Suspense fallback={<Fallback />}><MemberBiblePage /></Suspense>} />
                <Route path="/member/volunteer" element={<Suspense fallback={<Fallback />}><MemberVolunteerPage /></Suspense>} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </Sentry.ErrorBoundary>
);

export default App;
