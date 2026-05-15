import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MemberNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  metadata?: {
    announcementId?: string;
    categoryColor?: string;
    categoryLabel?: string;
  };
}

interface NotificationBellProps {
  notifications: MemberNotification[];
  onMarkAllRead: () => void;
  onNotificationClick: (notif: MemberNotification) => void;
}

export function NotificationBell({
  notifications,
  onMarkAllRead,
  onNotificationClick,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  const handleNotificationClick = (notif: MemberNotification) => {
    onNotificationClick(notif);
    setOpen(false);
    
    // Show toast for broadcast notifications since they don't navigate anywhere
    if (notif.type === "broadcast") {
      toast.success("Message marked as read");
    }
  };

  return (
    <div className="font-jakarta relative" ref={panelRef}>
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
        <div className="absolute left-0 bottom-full mb-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                onClick={() => { onMarkAllRead(); }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
              </div>
            ) : (
              // Only show unread notifications to avoid flooding
              notifications.filter(n => !n.is_read).length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">All caught up!</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No new notifications</p>
                </div>
              ) : (
                <>
                  {notifications.filter(n => !n.is_read).map(n => (
                    <button
                      key={n.id}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0",
                        "bg-orange-50/60 dark:bg-orange-900/10"
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <span
                        className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {n.created_at
                            ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                            : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                  {notifications.filter(n => !n.is_read).length >= 20 && (
                    <div className="px-4 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
                      Showing latest unread notifications
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
