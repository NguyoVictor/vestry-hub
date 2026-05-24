import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useChurch } from "@/contexts/ChurchContext";
import { navigationGroups } from "@/config/navigation";
import { supabase } from "@/integrations/supabase/client";
import { TopNavbar } from "./TopNavbar";
import { useFcmToken } from "@/hooks/useFcmToken";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, LogOut, GitBranch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TABLES, COLS } from "@/lib/schema";

// ─── Branch switching helpers (sessionStorage-based) ─────────────────────────
function getActiveBranch(): { id: string; name: string } | null {
  try { return JSON.parse(sessionStorage.getItem("active_branch") || "null"); } catch { return null; }
}

export function setActiveBranch(branch: { id: string; name: string } | null) {
  if (branch) sessionStorage.setItem("active_branch", JSON.stringify(branch));
  else sessionStorage.removeItem("active_branch");
  window.dispatchEvent(new Event("branch_changed"));
}

// ─── AppLayout ────────────────────────────────────────────────────────────────
export const AppLayout = () => {
  const church = useChurch();
  const navigate = useNavigate();
  // Register FCM token for push notifications
  useFcmToken(church.userId, church.tenantId);
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("sidebar_collapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeBranch, setActiveBranchState] = useState<{ id: string; name: string } | null>(getActiveBranch);
  const [isLiveNow, setIsLiveNow] = useState(false);

  // Persist sidebar scroll position across navigation
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const location = useLocation();

  // Auto-expand group containing active route - removed to allow collapsing active groups

  // Save scroll position before navigation
  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    // Restore saved position after route change
    el.scrollTop = scrollPosRef.current;
  }, [location.pathname]);

  const handleSidebarScroll = () => {
    if (sidebarScrollRef.current) {
      scrollPosRef.current = sidebarScrollRef.current.scrollTop;
    }
  };

  // Listen for branch changes dispatched by Branches/BranchDetail pages
  useState(() => {
    const handler = () => setActiveBranchState(getActiveBranch());
    window.addEventListener("branch_changed", handler);
    return () => window.removeEventListener("branch_changed", handler);
  });

  // Subscribe to livestream status changes
  useEffect(() => {
    const checkLiveStatus = async () => {
      const { data } = await supabase
        .from(TABLES.LIVESTREAM_SCHEDULES)
        .select(COLS.IS_LIVE)
        .eq(COLS.TENANT_ID, church.tenantId)
        .eq(COLS.IS_LIVE, true)
        .limit(1);
      
      setIsLiveNow(!!data && data.length > 0);
    };

    // Check initial status
    checkLiveStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`livestream_status:${church.tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.LIVESTREAM_SCHEDULES,
          filter: `${COLS.TENANT_ID}=eq.${church.tenantId}`
        },
        () => {
          checkLiveStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [church.tenantId]);

  const clearBranch = () => {
    setActiveBranch(null);
    setActiveBranchState(null);
    toast.success("Returned to main church");
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth/signin", { replace: true });
  };

  const initials = church.name.slice(0, 2).toUpperCase();
  const userInitials = `${church.userFirstName?.[0] || ""}${church.userLastName?.[0] || ""}`;

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
      const currentPath = window.location.pathname;
      const activeGroup = navigationGroups.find(group =>
        group.items.some(item => currentPath.startsWith(item.path))
      );
      return activeGroup ? [activeGroup.label] : [navigationGroups[0]?.label ?? ''];
    });

    useEffect(() => {
      const activeGroup = navigationGroups.find(group =>
        group.items.some(item => location.pathname.startsWith(item.path))
      );
      if (activeGroup) {
        setExpandedGroups(prev =>
          prev.includes(activeGroup.label) ? prev : [...prev, activeGroup.label]
        );
      }
    }, [location.pathname]);

    const toggleGroup = (groupLabel: string) => {
      setExpandedGroups(prev =>
        prev.includes(groupLabel)
          ? prev.filter(g => g !== groupLabel)
          : [...prev, groupLabel]
      );
    };

    return (
      <div className="flex h-full flex-col font-jakarta overflow-hidden">
        {/* Church logo / name */}
        <div className={cn("flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 p-4 flex-shrink-0", !mobile && collapsed && "justify-center")}>
          {church.logoUrl ? (
            <img src={church.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          {(mobile || !collapsed) && (
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{church.name}</span>
          )}
        </div>

        {/* Nav items */}
        <div
          ref={mobile ? undefined : sidebarScrollRef}
          onScroll={mobile ? undefined : handleSidebarScroll}
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400"
        >
          {navigationGroups.map(group => (
            <div key={group.label} className="mb-1">
              {(mobile || !collapsed) && (
                <>
                  {!mobile && !collapsed ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {group.label}
                      </span>
                      <ChevronRight
                        className="h-3 w-3 text-slate-400 transition-transform duration-200"
                        style={{
                          transform: expandedGroups.includes(group.label) ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                      />
                    </button>
                  ) : (
                    <div className="px-4 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {group.label}
                      </span>
                    </div>
                  )}
                </>
              )}

              {(mobile || collapsed || expandedGroups.includes(group.label)) && (
                <div>
                  {group.items.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => mobile && setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
                          !mobile && collapsed && "justify-center px-2"
                        )
                      }
                    >
                      <div className="relative">
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.path === "/livestreaming" && isLiveNow && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse absolute -top-1 -right-1" />
                        )}
                      </div>
                      {(mobile || !collapsed) && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex-shrink-0">
          {!mobile && (
            <Button variant="ghost" size="sm" className="mb-2 w-full justify-center text-slate-400 hover:text-slate-600" onClick={toggleCollapsed}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
          <div className={cn("flex items-center gap-3", !mobile && collapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              {userInitials}
            </div>
            {(mobile || !collapsed) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{church.userName}</p>
                <p className="truncate text-xs text-slate-400">{church.userEmail}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn("mt-2 w-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30", !mobile && collapsed ? "justify-center" : "justify-start")}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {(mobile || !collapsed) && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300 lg:flex lg:flex-col",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent mobile />
        </SheetContent>
      </Sheet>

      <div className={cn("flex flex-col transition-all duration-300", collapsed ? "lg:ml-16" : "lg:ml-60")}>
        {/* Branch viewing banner */}
        {activeBranch && (
          <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-400 dark:bg-amber-500 px-4 py-2 text-amber-900 dark:text-amber-950">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4" />
              Viewing branch: <strong>{activeBranch.name}</strong>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-amber-900 hover:bg-amber-500 dark:hover:bg-amber-600"
              onClick={clearBranch}
            >
              <X className="h-3.5 w-3.5" />Back to Main Church
            </Button>
          </div>
        )}
        <TopNavbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 font-jakarta">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
