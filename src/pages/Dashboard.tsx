import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/signin", { replace: true });
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name, tenant_id")
        .eq("id", session.user.id)
        .single();

      if (user) {
        setUserName(`${user.first_name} ${user.last_name}`);
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name, onboarding_completed")
          .eq("id", user.tenant_id)
          .single();

        if (tenant && !tenant.onboarding_completed) {
          navigate("/onboarding", { replace: true });
          return;
        }
        setChurchName(tenant?.name || "");
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Vestry</p>
              <p className="text-xs text-muted-foreground">{churchName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {userName}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Welcome to {churchName}! 🎉</h1>
          <p className="mt-2 text-muted-foreground">
            Your dashboard is being built. Stay tuned for powerful church management tools.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
