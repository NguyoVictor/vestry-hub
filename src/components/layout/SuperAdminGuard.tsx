import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type GuardState = "loading" | "allowed" | "forbidden" | "unauthenticated";

/**
 * Protects all /superadmin/* routes.
 * Checks that the authenticated user has is_super_admin = true.
 * Never shows any super-admin UI to non-super-admins.
 */
export function SuperAdminGuard() {
  const [state, setState] = useState<GuardState>("loading");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (mounted) setState("unauthenticated"); return; }

      const { data: user } = await supabase
        .from("users")
        .select("is_super_admin")
        .eq("id", session.user.id)
        .maybeSingle();

      if (mounted) {
        setState((user as any)?.is_super_admin === true ? "allowed" : "forbidden");
      }
    };

    check();
    return () => { mounted = false; };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (state === "unauthenticated") return <Navigate to="/auth/signin" replace />;
  if (state === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <p className="text-6xl font-black text-slate-700">403</p>
          <p className="text-lg font-semibold text-slate-300">Access Denied</p>
          <p className="text-sm text-slate-500">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
