import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Settings, Eye, Palette, Phone, GitBranch, LayoutGrid, Smartphone,
  Users, UserCheck, ClipboardList, ShieldCheck,
  CreditCard, Banknote, Heart, Receipt,
  SlidersHorizontal, CalendarCheck, Bell, MessageSquare, Wrench, Globe,
  Lock, Scale, Database, BadgeCheck, QrCode, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    label: "CHURCH SETUP",
    items: [
      { label: "General",          icon: Settings,        path: "/settings/general" },
      { label: "Vision & Mission", icon: Eye,             path: "/settings/vision" },
      { label: "Branding",         icon: Palette,         path: "/settings/branding" },
      { label: "Contact & Social", icon: Phone,           path: "/settings/contact" },
      { label: "Branches",         icon: GitBranch,       path: "/settings/branches" },
      { label: "Modules",          icon: LayoutGrid,      path: "/settings/modules" },
      { label: "Member App",       icon: Smartphone,      path: "/settings/member-app" },
    ],
  },
  {
    label: "PEOPLE & ACCESS",
    items: [
      { label: "Users",            icon: Users,           path: "/settings/users" },
      { label: "Staff",            icon: UserCheck,       path: "/settings/staff" },
      { label: "Registration",     icon: ClipboardList,   path: "/settings/registration" },
      { label: "Access Control",   icon: ShieldCheck,     path: "/settings/access-control" },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { label: "Subscription",     icon: CreditCard,      path: "/settings/billing" },
      { label: "Payments",         icon: Banknote,        path: "/settings/payments" },
      { label: "Giving",           icon: Heart,           path: "/settings/giving" },
      { label: "Tax",              icon: Receipt,         path: "/settings/tax" },
    ],
  },
  {
    label: "FEATURES",
    items: [
      { label: "Preferences",      icon: SlidersHorizontal, path: "/settings/preferences" },
      { label: "Attendance",       icon: CalendarCheck,   path: "/settings/attendance" },
      { label: "Notifications",    icon: Bell,            path: "/settings/notifications" },
      { label: "WhatsApp",         icon: MessageSquare,   path: "/settings/whatsapp" },
      { label: "Service Requests", icon: Wrench,          path: "/settings/service-requests" },
      { label: "Website",          icon: Globe,           path: "/settings/seo" },
    ],
  },
  {
    label: "SECURITY & DATA",
    items: [
      { label: "Privacy",          icon: Lock,            path: "/settings/privacy" },
      { label: "Legal",            icon: Scale,           path: "/settings/legal" },
      { label: "Backup",           icon: Database,        path: "/settings/backup" },
      { label: "Verification",     icon: BadgeCheck,      path: "/settings/verification" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export const SettingsLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === "/settings") return <Navigate to="/settings/general" replace />;

  const SidebarContent = () => (
    <nav className="space-y-5">
      {NAV_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-1.5">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-orange-500 text-white font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-0 -m-6 min-h-[calc(100vh-64px)]">
      {/* Mobile tab strip */}
      <div className="lg:hidden border-b border-border bg-muted/30">
        <ScrollArea className="w-full">
          <div className="flex gap-1 p-2">
            {ALL_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors shrink-0",
                    isActive
                      ? "bg-orange-500 text-white font-medium"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Desktop side nav */}
      <div className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
        <div className="p-4 pb-2">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Settings</h2>
          <p className="text-xs text-slate-500">Configure your church settings</p>
        </div>
        <div className="px-3 pb-6 pt-2">
          <SidebarContent />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        {/* Quick Links & QR Codes banner */}
        <div className="px-6 pt-6 pb-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <QrCode className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quick Links & QR Codes</p>
                <p className="text-xs text-slate-500">Generate and share QR codes for easy access to church features</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => navigate("/settings/qr-codes")}
            >
              <QrCode className="h-3.5 w-3.5" />
              Manage QR Codes
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="px-6 pb-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
