import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import MemberLogin from "./pages/auth/MemberLogin";
import AuthCallback from "./pages/auth/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import ChurchPublicPage from "./pages/ChurchPublicPage";
import { AuthGuard } from "./components/layout/AuthGuard";
import { AppLayout } from "./components/layout/AppLayout";
import { SettingsLayout } from "./components/settings/SettingsLayout";
import { allNavItems } from "./config/navigation";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Settings pages
const ChurchProfile = lazy(() => import("./pages/settings/ChurchProfile"));
const ServicesModules = lazy(() => import("./pages/settings/ServicesModules"));
const RolesPermissions = lazy(() => import("./pages/settings/RolesPermissions"));
const Notifications = lazy(() => import("./pages/settings/Notifications"));
const Billing = lazy(() => import("./pages/settings/Billing"));
const Security = lazy(() => import("./pages/settings/Security"));
const Integrations = lazy(() => import("./pages/settings/Integrations"));
const SeoPublicPage = lazy(() => import("./pages/settings/SeoPublicPage"));

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

const queryClient = new QueryClient();

const Fallback = () => <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

const PEOPLE_PATHS = ["/members", "/groups", "/house-fellowships", "/families", "/visitors", "/follow-up-tasks", "/new-converts"];
const FINANCE_PATHS = ["/give-online", "/giving-records", "/pledge-campaigns", "/church-expenses", "/budget-management", "/payroll", "/fund-accounting", "/accounts-payable", "/general-ledger", "/payouts"];

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/member-login" element={<MemberLogin />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/church/:slug" element={<ChurchPublicPage />} />
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
                </Route>
                {/* Remaining placeholder routes */}
                {allNavItems
                  .filter(i => i.path !== "/dashboard" && i.path !== "/settings" && !PEOPLE_PATHS.includes(i.path) && !FINANCE_PATHS.includes(i.path))
                  .map(item => (
                    <Route key={item.path} path={item.path} element={<PlaceholderPage />} />
                  ))}
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
