import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { cn } from "@/lib/utils";
import { Home, Heart, CalendarDays, MessageCircle, User, BookOpen, Megaphone, Users, Bell, LogOut, HandHeart, ShoppingBag, BookCheck, Quote, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";

const BOTTOM_NAV = [
  { path: "/member", label: "Home", icon: Home, exact: true },
  { path: "/member/give", label: "Give", icon: Heart },
  { path: "/member/events", label: "Events & Services", icon: CalendarDays },
  { path: "/member/messages", label: "Messages", icon: MessageCircle },
  { path: "/member/profile", label: "Profile", icon: User },
];

const SIDEBAR_NAV = [
  { path: "/member", label: "Home", icon: Home, exact: true },
  { path: "/member/give", label: "Give Online", icon: Heart },
  { path: "/member/events", label: "Events & Services", icon: CalendarDays },
  { path: "/member/sermons", label: "Sermons", icon: BookOpen },
  { path: "/member/bible", label: "Bible", icon: BookOpen },
  { path: "/member/announcements", label: "Announcements", icon: Megaphone },
  { path: "/member/messages", label: "Messages", icon: MessageCircle },
  { path: "/member/groups", label: "My Groups", icon: Users },
  { path: "/member/giving-history", label: "My Giving", icon: Heart },
  { path: "/member/requests", label: "My Requests", icon: HandHeart },
  { path: "/member/children", label: "My Children", icon: Baby },
  { path: "/member/testimonies", label: "Testimonies", icon: Quote },
  { path: "/member/settings", label: "Settings", icon: User },
];

export function MemberPortalLayout() {
  const member = useMemberPortal();
  const navigate = useNavigate();

  const signOut = async () => {
    localStorage.removeItem("member_session");
    navigate("/member/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed inset-y-0 left-0 z-30">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          {member.churchLogoUrl ? (
            <img src={member.churchLogoUrl} alt={member.churchName} className="h-8 w-auto mb-1" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm mb-1">
              {member.churchName.charAt(0)}
            </div>
          )}
          <p className="font-semibold text-sm truncate">{member.churchName}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SIDEBAR_NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
              {member.firstName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-slate-500" onClick={signOut}>
            <LogOut className="h-4 w-4" />Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {member.churchLogoUrl ? (
              <img src={member.churchLogoUrl} alt={member.churchName} className="h-7 w-auto" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {member.churchName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-sm">{member.churchName}</span>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 pb-24 lg:pb-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex">
          {BOTTOM_NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors",
                isActive ? "text-indigo-600 border-t-2 border-indigo-600" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
