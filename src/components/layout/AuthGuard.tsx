import { useEffect, useState, useRef } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChurchProvider, type ChurchData } from "@/contexts/ChurchContext";
import { Loader2 } from "lucide-react";

type AuthState = "loading" | "unauthenticated" | "needs-onboarding" | "ready";

export const AuthGuard = () => {
  const [state, setState] = useState<AuthState>("loading");
  const [churchData, setChurchData] = useState<ChurchData | null>(null);
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (mounted) setState("unauthenticated"); return; }

      const { data: user } = await supabase
        .from("users")
        .select("tenant_id, first_name, last_name, email, role")
        .eq("id", session.user.id)
        .maybeSingle();

      console.log("[AuthGuard] user row:", user);

      if (!user?.tenant_id) {
        console.log("[AuthGuard] no tenant_id — redirecting to onboarding");
        if (mounted) setState("needs-onboarding");
        return;
      }

      // Update last_login_at for this admin — fire and forget
      supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .then();

      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", user.tenant_id)
        .maybeSingle();

      console.log("[AuthGuard] tenant row — id:", user.tenant_id, "onboarding_completed:", (tenant as any)?.onboarding_completed);

      if (!(tenant as any)?.onboarding_completed) {
        console.log("[AuthGuard] onboarding not completed — redirecting to onboarding");
        if (mounted) setState("needs-onboarding");
        return;
      }

      if (mounted) {
        setChurchData({
          tenantId: user.tenant_id,
          name: (tenant as any)?.name || "",
          currency: (tenant as any)?.currency || "KES",
          city: (tenant as any)?.city || null,
          country: (tenant as any)?.country || null,
          logoUrl: (tenant as any)?.logo_url || null,
          userId: session.user.id,
          userName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          userEmail: user.email || session.user.email || "",
          userRole: user.role || "member",
          userFirstName: user.first_name || "",
          userLastName: user.last_name || "",
        });
        setState("ready");
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && mounted) setState("unauthenticated");
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (state !== "ready") return;

    const clearTimers = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };

    const handleSignOut = async () => {
      clearTimers();
      toast.dismiss("inactivity-warning");
      await supabase.auth.signOut();
      toast.info("You were signed out due to inactivity.");
    };

    const startTimers = () => {
      clearTimers();
      // Warning at 28 minutes
      warningRef.current = setTimeout(() => {
        toast.warning(
          "You'll be signed out in 2 minutes due to inactivity. Click anywhere to stay logged in.",
          { duration: 120000, id: "inactivity-warning" }
        );
      }, 28 * 60 * 1000);
      // Sign out at 30 minutes
      timeoutRef.current = setTimeout(handleSignOut, 30 * 60 * 1000);
    };

    const resetTimers = () => {
      toast.dismiss("inactivity-warning");
      startTimers();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(event => window.addEventListener(event, resetTimers, { passive: true }));
    startTimers();

    return () => {
      clearTimers();
      toast.dismiss("inactivity-warning");
      events.forEach(event => window.removeEventListener(event, resetTimers));
    };
  }, [state]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "unauthenticated") return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  if (state === "needs-onboarding") return <Navigate to="/onboarding" replace />;

  return (
    <ChurchProvider value={churchData!}>
      <Outlet />
    </ChurchProvider>
  );
};
