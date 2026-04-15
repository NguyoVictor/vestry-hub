import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function CanvaCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Canva denied access: ${error}`);
      setTimeout(() => navigate("/graphics-studio"), 3000);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing code or state from Canva.");
      setTimeout(() => navigate("/graphics-studio"), 3000);
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { error: fnErr } = await supabase.functions.invoke("canva-oauth", {
          body: { action: "callback", code, state },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (fnErr) throw fnErr;

        setStatus("success");
        setMessage("Canva connected successfully!");
        setTimeout(() => navigate("/graphics-studio"), 1500);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Something went wrong.");
        setTimeout(() => navigate("/graphics-studio"), 3000);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
            <p className="text-muted-foreground">Connecting your Canva account…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-medium text-emerald-600">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="font-medium text-red-600">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back…</p>
          </>
        )}
      </div>
    </div>
  );
}
