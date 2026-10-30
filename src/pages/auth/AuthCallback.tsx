import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirect_to");
        const tenantId = params.get("tenant_id");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw error || new Error("No authenticated session");

        if (redirectTo === "/member/welcome") {
          if (!tenantId || !/^[\da-f-]{36}$/i.test(tenantId)) throw new Error("Missing member tenant");
          const { data: tenant, error: tenantError } = await supabase
            .from("tenants").select("id,church_code,slug").eq("id", tenantId).maybeSingle();
          if (tenantError || !tenant?.church_code) throw new Error("Invalid member tenant");

          // This server function validates the signed-in Auth user, approved membership,
          // and selected tenant BEFORE it creates a member session.
          const { data: result, error: loginError } = await supabase.functions.invoke("member-login", {
            body: { churchCode: tenant.church_code },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (loginError || result?.error || !result?.member?.id ||
              result?.tenant?.id !== tenantId || !result?.sessionToken || !result?.expiresAt) {
            throw new Error("Member membership verification failed");
          }
          if (cancelled) return;
          localStorage.setItem("member_session", JSON.stringify({
            memberId: result.member.id,
            tenantId: result.tenant.id,
            tenantSlug: result.tenant.slug || tenant.slug,
            sessionToken: result.sessionToken,
            expiresAt: result.expiresAt,
          }));
          setStatus("success");
          navigate("/member/welcome", { replace: true });
          return;
        }

        const { data: userData } = await supabase.from("users")
          .select("tenant_id").eq("id", session.user.id).maybeSingle();
        const { data: tenant } = userData?.tenant_id
          ? await supabase.from("tenants").select("onboarding_completed").eq("id", userData.tenant_id).maybeSingle()
          : { data: null };
        if (cancelled) return;
        setStatus("success");
        setMessage("Signed in successfully!");
        navigate(tenant?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
      } catch (error) {
        console.error("Auth callback failed", error);
        if (cancelled) return;
        localStorage.removeItem("member_session");
        setStatus("error");
        setMessage("Unable to verify access. Please try signing in again.");
        navigate("/member/login", { replace: true });
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        {status === "loading" && <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
        {status === "success" && <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100"><CheckCircle2 className="h-12 w-12 text-green-600" /></div>}
        {status === "error" && <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10"><span className="text-4xl">!</span></div>}
        <div><h1 className="text-2xl font-bold text-foreground">{status === "success" ? "Success!" : status === "error" ? "Oops!" : "Please wait"}</h1><p className="mt-2 text-muted-foreground">{message}</p></div>
      </div>
    </div>
  );
};

export default AuthCallback;
