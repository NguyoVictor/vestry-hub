import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useChurch } from "@/contexts/ChurchContext";
import { navigationGroups } from "@/config/navigation";
import { supabase } from "@/integrations/supabase/client";
import { TopNavbar } from "./TopNavbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, LogOut, GitBranch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("sidebar_collapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeBranch, setActiveBranchState] = useState<{ id: string; name: string } | null>(getActiveBranch);

  // Persist sidebar scroll position across navigation
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const location = useLocation();

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

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-3 border-b border-border p-4", !mobile && collapsed && "justify-center")}>
        {church.logoUrl ? (
          <img src={church.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        {(mobile || !collapsed) && (
          <span className="truncate text-sm font-semibold text-foreground">{church.name}</span>
        )}
      </div>

      <div
          ref={mobile ? undefined : sidebarScrollRef}
          onScroll={mobile ? undefined : handleSidebarScroll}
          className="flex-1 overflow-y-auto py-2"
        >
        {navigationGroups.map(group => (
          <div key={group.label} className="mb-1">
            {(mobile || !collapsed) && (
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
              </div>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => mobile && setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "border-l-2 border-primary bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    !mobile && collapsed && "justify-center px-2"
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(mobile || !collapsed) && <span className="truncate">{item.title}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        {!mobile && (
          <Button variant="ghost" size="sm" className="mb-2 w-full justify-center" onClick={toggleCollapsed}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
        <div className={cn("flex items-center gap-3", !mobile && collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {userInitials}
          </div>
          {(mobile || !collapsed) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{church.userName}</p>
              <p className="truncate text-xs text-muted-foreground">{church.userEmail}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn("mt-2 w-full text-muted-foreground hover:text-destructive", !mobile && collapsed ? "justify-center" : "justify-start")}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {(mobile || !collapsed) && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card transition-all duration-300 lg:flex lg:flex-col",
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
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
