import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, LinkIcon, ArrowLeft, Smartphone, Shield } from "lucide-react";

const MemberLogin = () => {
  const navigate = useNavigate();
  const [churchCode, setChurchCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchCode.trim() || !email.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);

    // Verify church code exists
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("church_code", churchCode.toUpperCase())
      .maybeSingle();

    if (tenantError || !tenant) {
      setLoading(false);
      toast.error("Invalid church access code. Please check with your administrator.");
      return;
    }

    // Check member exists in that tenant
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("email", email)
      .maybeSingle();

    if (userError || !user) {
      setLoading(false);
      toast.error("No member found with that email in this church. Contact your administrator.");
      return;
    }

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a login link!");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/30 lg:flex">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">Vestry</h2>
          <p className="mt-2 text-muted-foreground">Quick access for church members</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-card-foreground">Member Access</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your church access code and email to continue
              </p>
            </div>

            <form onSubmit={handleAccess} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="churchCode">Church Access Code</Label>
                <Input
                  id="churchCode"
                  type="text"
                  placeholder="Enter your code (e.g., AB12CD3)"
                  value={churchCode}
                  onChange={(e) => setChurchCode(e.target.value.toUpperCase())}
                  required
                  className="uppercase tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use the email registered with your church membership
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent to-primary text-primary-foreground"
              >
                {loading ? "Verifying…" : "Access Church Dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an access code? Ask your church administrator.
              </p>

              <Button variant="outline" className="w-full" disabled>
                <Smartphone className="mr-2 h-4 w-4" />
                Install App on Your Phone
              </Button>

              <Link
                to="/auth/signin"
                className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Sign in with email instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;
