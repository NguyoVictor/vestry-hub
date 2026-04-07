import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MemberPortalProvider } from "@/contexts/MemberPortalContext";

export function MemberAuthGuard() {
  const [status, setStatus] = useState<"loading" | "authed" | "no-session">("loading");

  useEffect(() => {
    const raw = localStorage.getItem("member_session");
    if (!raw) { setStatus("no-session"); return; }

    try {
      const session = JSON.parse(raw);
      if (!session.expiresAt || new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem("member_session");
        setStatus("no-session");
        return;
      }
      setStatus("authed");
    } catch {
      localStorage.removeItem("member_session");
      setStatus("no-session");
    }
  }, []);

  if (status === "loading") return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
  if (status === "no-session") return <Navigate to="/member/login" replace />;

  return (
    <MemberPortalProvider>
      <Outlet />
    </MemberPortalProvider>
  );
}
