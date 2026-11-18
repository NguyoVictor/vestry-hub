import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isValidInvitedStaffProfile } from "./inviteCallbackGuards";

/** The Edge Function creates the Auth user and the staff profile before the email is sent.
 * This callback must only verify them; never create or change tenant roles in the browser.
 */
export default function InviteCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verifyInvitation = async () => {
      try {
        // Supabase's browser client processes Auth tokens from the invite URL.
        // getUser() revalidates the session with Supabase Auth.
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error("This invitation link is invalid or has expired. Ask your administrator for a new invitation.");
        }

        // RLS permits the signed-in user to read their own staff profile.
        // The profile was created by the authenticated, tenant-authorized Edge Function.
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, tenant_id, email, role, status, invitation_sent")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !isValidInvitedStaffProfile(user, profile)) {
          throw new Error("Your staff invitation is not ready. Please contact your church administrator.");
        }

        if (!cancelled) navigate("/auth/reset-password", { replace: true });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to verify this invitation.");
        }
      }
    };

    void verifyInvitation();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm" role="status">
        <h1 className="text-xl font-semibold text-card-foreground">
          {errorMessage ? "Unable to accept invitation" : "Verifying your invitation"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {errorMessage || "Checking your account before password setup..."}
        </p>
        {errorMessage && (
          <Link to="/auth/signin" className="mt-5 inline-block text-sm font-medium text-primary underline">
            Go to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
