import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { Building2, LayoutGrid, ShieldCheck, Bell, CreditCard, Lock, Plug, Globe, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const settingsNav = [
  { label: "Church Profile", icon: Building2, path: "/settings/profile" },
  { label: "Services & Modules", icon: LayoutGrid, path: "/settings/services" },
  { label: "Roles & Permissions", icon: ShieldCheck, path: "/settings/roles" },
  { label: "Notifications", icon: Bell, path: "/settings/notifications" },
  { label: "Billing & Subscription", icon: CreditCard, path: "/settings/billing" },
  { label: "Security", icon: Lock, path: "/settings/security" },
  { label: "Integrations", icon: Plug, path: "/settings/integrations" },
  { label: "SEO & Public Page", icon: Globe, path: "/settings/seo" },
  { label: "Member App", icon: Smartphone, path: "/settings/member-app" },
];

export const SettingsLayout = () => {
  const location = useLocation();
  if (location.pathname === "/settings") return <Navigate to="/settings/profile" replace />;

  return (
    <div className="flex flex-col lg:flex-row gap-0 -m-6 min-h-[calc(100vh-64px)]">
      {/* Mobile tab strip */}
      <div className="lg:hidden border-b border-border bg-muted/30">
        <ScrollArea className="w-full">
          <div className="flex gap-1 p-2">
            {settingsNav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors shrink-0",
                    isActive
                      ? "bg-card text-primary font-medium shadow-sm"
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
      <div className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-muted/30 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your church account</p>
        </div>
        <nav className="space-y-1">
          {settingsNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-card text-primary font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
};
