import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, LinkIcon } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { captureEvent, identifyUser } from "@/lib/monitoring";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      captureEvent("login_failed", { reason: error.message });
    } else {
      toast.success("Signed in successfully!");
      captureEvent("login_success");
      identifyUser(data.session.user.id, { email: data.session.user.email });
      // Check onboarding status
      const { data: user } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", data.session.user.id)
        .single();
      if (user?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("onboarding_completed")
          .eq("id", user.tenant_id)
          .single();
        navigate(tenant?.onboarding_completed ? "/dashboard" : "/onboarding");
      } else {
        navigate("/onboarding");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) toast.error(error.message);
  };

  return (
    <AuthLayout>
      <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your church dashboard
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@church.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-accent to-primary text-primary-foreground"
          >
            {loading ? "Signing in…" : "Sign In"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">or continue with</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/auth/signup" className="font-medium text-accent hover:underline">
            Create Account
          </Link>
        </p>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Link
            to="/member/login"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <LinkIcon className="h-4 w-4" />
            Member App Login
          </Link>
          <a
            href={`${import.meta.env.VITE_BASE_URL || window.location.origin}/visitor-registration/`}
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={e => { e.preventDefault(); window.location.href = `${import.meta.env.VITE_BASE_URL || window.location.origin}/visitor-registration/`; }}
          >
            Visiting for the first time? Register here
          </a>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignIn;
