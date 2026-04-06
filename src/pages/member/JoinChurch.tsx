import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Church, CheckCircle2 } from "lucide-react";

export default function JoinChurch() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [church, setChurch] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  const lookupCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data } = await supabase.from("churches").select("id, name, logo_url, city, country").eq("access_code", code.trim().toUpperCase()).single();
    setLoading(false);
    if (!data) { toast.error("Invalid access code. Please check and try again."); return; }
    setChurch(data);
  };

  const joinChurch = async () => {
    if (!church) return;
    setJoining(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/member/login"); return; }

    const { data: existing } = await supabase.from("church_members").select("id").eq("church_id", church.id).eq("user_id", user.id).single();
    if (existing) { toast.info("You're already a member of this church"); navigate("/member"); return; }

    const { error: memberError } = await supabase.from("church_members").insert({ church_id: church.id, user_id: user.id, role: "member", status: "active" });
    if (memberError) { toast.error("Failed to join church"); setJoining(false); return; }

    const { data: existingMember } = await supabase.from("members").select("id").eq("church_id", church.id).eq("user_id", user.id).single();
    if (!existingMember) {
      await supabase.from("members").insert({ church_id: church.id, user_id: user.id, first_name: user.email?.split("@")[0] || "Member", status: "active" });
    }

    await supabase.from("activity_log").insert({ church_id: church.id, action_type: "new_member", description: `New member joined via access code` });
    toast.success(`Welcome to ${church.name}!`);
    navigate("/member/profile-setup");
  };

  return (
    <>
      <Helmet><title>Join a Church — Vestry</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 mb-4">
              <Church className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Join a Church</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter your church access code to get started</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            {!church ? (
              <>
                <div className="space-y-1.5">
                  <Label>Church Access Code</Label>
                  <Input
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="h-12 text-center text-lg font-mono tracking-widest"
                    onKeyDown={e => e.key === "Enter" && lookupCode()}
                  />
                </div>
                <Button className="w-full h-11 rounded-full" onClick={lookupCode} disabled={!code.trim() || loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find Church"}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  {church.logo_url ? (
                    <img src={church.logo_url} alt={church.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">{church.name.charAt(0)}</div>
                  )}
                  <div>
                    <p className="font-semibold">{church.name}</p>
                    {(church.city || church.country) && <p className="text-sm text-muted-foreground">{[church.city, church.country].filter(Boolean).join(", ")}</p>}
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
                </div>
                <Button className="w-full h-11 rounded-full" onClick={joinChurch} disabled={joining}>
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : `Join ${church.name}`}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setChurch(null)}>Try a different code</Button>
              </div>
            )}
          </div>

          <p className="text-center mt-4 text-sm text-muted-foreground">
            Already a member? <Link to="/member/login" className="text-indigo-600 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </>
  );
}
