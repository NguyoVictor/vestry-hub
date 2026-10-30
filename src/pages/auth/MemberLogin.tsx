import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, LinkIcon, ArrowLeft, Smartphone, Shield } from "lucide-react";

const MemberLogin = () => {
  const [churchCode, setChurchCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = churchCode.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (!code || !normalizedEmail) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const generic = "If your church code and email are correct, a login link has been sent.";
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .eq("church_code", code)
        .maybeSingle();
      if (tenantError) throw tenantError;
      if (tenant) {
        // Do NOT test membership using public.users (which contains admins).
        // The member-login Edge Function authorizes membership after email verification.
        // This request never creates a new Auth identity.
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/auth/callback?tenant_id=${encodeURIComponent(tenant.id)}&redirect_to=%2Fmember%2Fwelcome`,
          },
        });
        if (error) {
          // Never expose whether an account exists to a public caller.
          console.warn("Member magic link unavailable", { code: error.code, status: error.status });
        }
      }
      toast.success(generic);
    } catch (error) {
      console.error("Member login request failed", error);
      toast.error("Could not process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/30 lg:flex">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">Vestry</h2>
          <p className="mt-2 text-muted-foreground">Quick access for church members</p>
        </div>
      </div>
      <div className="flex w-full flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-card-foreground">Member Access</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your church access code and email to continue</p>
            </div>
            <form onSubmit={handleAccess} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="churchCode">Church Access Code</Label>
                <Input id="churchCode" type="text" placeholder="Enter your code (e.g., AB12CD3)" value={churchCode} onChange={e => setChurchCode(e.target.value.toUpperCase())} required className="uppercase tracking-widest" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input id="email" type="email" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Use the email registered with your church membership</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-accent to-primary text-primary-foreground">
                {loading ? "Verifying…" : "Access Church Dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <div className="mt-6 space-y-3">
              <p className="text-center text-sm text-muted-foreground">Don't have an access code? Ask your church administrator.</p>
              <Button variant="outline" className="w-full" disabled><Smartphone className="mr-2 h-4 w-4" />Install App on Your Phone</Button>
              <Link to="/auth/signin" className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Sign in with email instead</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;
