import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { MemberPortalProvider } from "@/contexts/MemberPortalContext";

export function MemberAuthGuard() {
  const [status, setStatus] = useState<"loading" | "authed" | "no-session" | "no-church">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("no-session"); return; }

      const { data: membership } = await supabase
        .from("role_permissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single();

      setStatus(membership ? "authed" : "no-church");
    };
    check();
  }, []);

  if (status === "loading") return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
  if (status === "no-session") return <Navigate to="/member/login" replace />;
  if (status === "no-church") return <Navigate to="/member/join" replace />;

  return (
    <MemberPortalProvider>
      <Outlet />
    </MemberPortalProvider>
  );
}
