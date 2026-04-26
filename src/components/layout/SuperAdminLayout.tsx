import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart2, Building2, Database, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/superadmin",                label: "Dashboard",         icon: BarChart2 },
  { path: "/superadmin/churches",       label: "Churches",          icon: Building2 },
  { path: "/superadmin/storage-requests", label: "Storage Requests", icon: Database },
];

export function SuperAdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth/signin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-jakarta">
      {/* Dark sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 fixed inset-y-0 left-0 z-40">
        {/* Branding */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">VestryHub</p>
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Platform</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center rounded-full bg-violet-900/50 border border-violet-700/50 px-2 py-0.5">
            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">SUPER ADMIN</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/superadmin"}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-600/20 text-violet-300 border border-violet-600/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-slate-800 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-56 min-h-screen bg-slate-950">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
