import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Home, Heart, CalendarDays, MessageCircle, User, BookOpen,
  Megaphone, Users, Bell, LogOut, HandHeart, Quote, Baby, ChevronRight,
} from "lucide-react";
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

// ─── Notification Bell ────────────────────────────────────────────────────────

function MemberNotificationBell({ memberId, tenantId }: { memberId: string; tenantId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["member-notifications", memberId, tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", memberId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    staleTime: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`member-notifs-${memberId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${memberId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["member-notifications", memberId, tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memberId, tenantId, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-notifications", memberId, tenantId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications")
        .update({ is_read: true } as any)
        .eq("tenant_id", tenantId)
        .eq("user_id", memberId)
        .eq("is_read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-notifications", memberId, tenantId] }),
  });

  const handleNotifClick = (notif: any) => {
    markRead.mutate(notif.id);
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="relative h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <button
                  key={n.id}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0",
                    !n.is_read && "bg-indigo-50/60 dark:bg-indigo-900/10"
                  )}
                  onClick={() => handleNotifClick(n)}
                >
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                  {n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{n.body || n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ""}
                    </p>
                  </div>
                  {n.link && <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

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
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                {member.firstName.charAt(0)}
              </div>
              <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
            </div>
            {/* Desktop bell */}
            <MemberNotificationBell memberId={member.memberId} tenantId={member.tenantId} />
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
          {/* Mobile bell */}
          <MemberNotificationBell memberId={member.memberId} tenantId={member.tenantId} />
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
