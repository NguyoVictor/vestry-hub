import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Baby, CheckSquare, BookOpen, Users, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';

const NAV = [
  { label: "Overview",         icon: Baby,        path: "/childrens-ministry" },
  { label: "Check-in",         icon: CheckSquare, path: "/childrens-ministry/checkin" },
  { label: "Classes",          icon: BookOpen,    path: "/childrens-ministry/classes" },
  { label: "Children",         icon: Users,       path: "/childrens-ministry/children" },
  { label: "Reports",          icon: BarChart2,   path: "/childrens-ministry/reports" },
  { label: "Settings",         icon: Settings,    path: "/childrens-ministry/settings" },
];

export default function CMLayout() {
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management');
  
  return (
    <div className="min-h-screen bg-slate-50 font-jakarta">
      {/* Sub-nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map(({ label, icon: Icon, path }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/childrens-ministry"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                    isActive
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {readOnly && <ReadOnlyBanner section="Member Management" />}
        <Outlet />
      </div>
    </div>
  );
}
