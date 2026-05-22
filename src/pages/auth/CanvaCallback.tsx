import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function CanvaCallback() {
  useEffect(() => {
    // This component is just a loading screen
    // The actual OAuth callback is handled by the canva-callback Edge Function
    // which will redirect back to /graphics-studio with success/error params
    
    // Show loading for a moment, then redirect if something goes wrong
    const timeout = setTimeout(() => {
      window.location.href = "/graphics-studio?error=callback_timeout";
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
        <p className="text-muted-foreground">Connecting your Canva account…</p>
        <p className="text-xs text-muted-foreground">This should only take a moment</p>
      </div>
    </div>
  );
}
