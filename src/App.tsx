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

const ChurchProfile = lazy(() => import("./pages/settings/ChurchProfile"));
const ServicesModules = lazy(() => import("./pages/settings/ServicesModules"));
const RolesPermissions = lazy(() => import("./pages/settings/RolesPermissions"));
const Notifications = lazy(() => import("./pages/settings/Notifications"));
const Billing = lazy(() => import("./pages/settings/Billing"));
const Security = lazy(() => import("./pages/settings/Security"));
const Integrations = lazy(() => import("./pages/settings/Integrations"));
const SeoPublicPage = lazy(() => import("./pages/settings/SeoPublicPage"));

const queryClient = new QueryClient();

const Fallback = () => <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

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
                {allNavItems
                  .filter(i => i.path !== "/dashboard" && i.path !== "/settings")
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
