import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check URL parameters for member portal redirect
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect_to');
        const tenantId = urlParams.get('tenant_id');

        // Let the SDK handle PKCE code exchange automatically via getSession().
        // It detects ?code= in the URL, reads the code_verifier from localStorage,
        // and exchanges them — no manual exchangeCodeForSession needed.
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          // Track OAuth login event
          try {
            await supabase.from('login_events').insert({
              id: crypto.randomUUID(),
              user_id: data.session.user.id,
              status: 'success',
              ip_address: null, // not available client-side
              user_agent: navigator.userAgent,
              location: null,
              created_at: new Date().toISOString()
            });
          } catch (trackingError) {
            console.error('Failed to track OAuth login event:', trackingError);
          }

          setStatus("success");
          setMessage("Signed in successfully!");

          // Handle member portal redirect
          if (redirectTo === '/member/welcome' && tenantId) {
            // Store tenant ID for member portal
            localStorage.setItem('member_tenant_id', tenantId);
            navigate(redirectTo, { replace: true });
            return;
          }

          // Existing admin redirect logic
          const { data: userData } = await supabase
            .from("users")
            .select("tenant_id")
            .eq("id", data.session.user.id)
            .maybeSingle();

          if (userData?.tenant_id) {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("onboarding_completed")
              .eq("id", userData.tenant_id)
              .maybeSingle();

            setTimeout(() => {
              if (tenant?.onboarding_completed) {
                navigate("/dashboard", { replace: true });
              } else {
                navigate("/onboarding", { replace: true });
              }
            }, 2500);
          } else {
            setTimeout(() => navigate("/onboarding", { replace: true }), 2500);
          }
        } else {
          throw new Error("No session returned");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Redirecting…");
        setTimeout(() => navigate("/auth/signin", { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        {status === "loading" && (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {status === "success" && (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        )}
        {status === "error" && (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-4xl">⚠️</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {status === "success" ? "Success!" : status === "error" ? "Oops!" : "Please wait"}
          </h1>
          <p className="mt-2 text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;