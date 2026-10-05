import { useEffect, useState, useRef, useCallback } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChurchProvider, type ChurchData } from "@/contexts/ChurchContext";
import { Loader2 } from "lucide-react";
import { buildTenantUrl, currentTenantBaseDomain, tenantSlugMatchesHostname } from "@/lib/tenantHost";
import { normalizeModuleConfig } from "@/config/modules";

type AuthState = "loading" | "unauthenticated" | "needs-onboarding" | "tenant-mismatch" | "ready";

export const AuthGuard = () => {
  const [state, setState] = useState<AuthState>("loading");
  const [churchData, setChurchData] = useState<ChurchData | null>(null);
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUserName = useCallback((firstName: string, lastName: string) => {
    setChurchData(prev => prev ? {
      ...prev,
      userName: `${firstName} ${lastName}`.trim(),
      userFirstName: firstName,
      userLastName: lastName,
    } : null);
  }, []);

  const updateEnabledModules = useCallback((enabledModules: ChurchData["enabledModules"]) => {
    setChurchData(prev => prev ? { ...prev, enabledModules } : null);
  }, []);

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

      const tenantSlug = String((tenant as any)?.slug || "").toLowerCase();
      if (!tenantSlug || !tenantSlugMatchesHostname(window.location.hostname, tenantSlug, currentTenantBaseDomain())) {
        if (mounted) {
          setChurchData({
            tenantId: user.tenant_id,
            slug: tenantSlug,
            name: (tenant as any)?.name || "",
            currency: (tenant as any)?.currency || "KES",
            city: (tenant as any)?.city || null,
            country: (tenant as any)?.country || null,
            logoUrl: (tenant as any)?.logo || null,
            userId: session.user.id,
            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            userEmail: user.email || session.user.email || "",
            userRole: user.role || "member",
            userFirstName: user.first_name || "",
            userLastName: user.last_name || "",
            enabledModules: normalizeModuleConfig((tenant as any)?.enabled_modules),
          });
          setState("tenant-mismatch");
        }
        return;
      }

      if (mounted) {
        setChurchData({
          tenantId: user.tenant_id,
          slug: tenantSlug,
          name: (tenant as any)?.name || "",
          currency: (tenant as any)?.currency || "KES",
          city: (tenant as any)?.city || null,
          country: (tenant as any)?.country || null,
          logoUrl: (tenant as any)?.logo || null,
          userId: session.user.id,
          userName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          userEmail: user.email || session.user.email || "",
          userRole: user.role || "member",
          userFirstName: user.first_name || "",
          userLastName: user.last_name || "",
          enabledModules: normalizeModuleConfig((tenant as any)?.enabled_modules),
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

  // Real-time name sync — updates sidebar/topnav instantly when name changes
  useEffect(() => {
    if (!churchData?.userId) return;
    const channel = supabase
      .channel(`user-name-sync-${churchData.userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${churchData.userId}`,
        },
        (payload: any) => {
          const u = payload.new;
          setChurchData(prev => prev ? {
            ...prev,
            userName: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
            userFirstName: u.first_name || "",
            userLastName: u.last_name || "",
          } : null);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [churchData?.userId]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "unauthenticated") return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  if (state === "needs-onboarding") return <Navigate to="/onboarding" replace />;
  if (state === "tenant-mismatch" && churchData?.slug) {
    const canonicalUrl = buildTenantUrl(churchData.slug, `${location.pathname}${location.search}${location.hash}`, { baseDomain: currentTenantBaseDomain() });
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">This session belongs to another church workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">Open the church's verified VestryHub address to continue.</p>
          <a className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href={canonicalUrl}>Open {churchData.name || "church workspace"}</a>
        </div>
      </div>
    );
  }

  return (
    <ChurchProvider value={churchData ? { ...churchData, updateUserName, updateEnabledModules } : null!}>
      <Outlet />
    </ChurchProvider>
  );
};
