import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Church } from "lucide-react";

export default function MemberLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [churchCode, setChurchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [church, setChurch] = useState<{ name: string; logo: string | null } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Auto-fill code from URL ?code= param and look up church branding
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const upper = code.toUpperCase();
      setChurchCode(upper);
      lookupChurch(upper);
    }
  }, []);

  const lookupChurch = async (code: string) => {
    if (!code || code.length < 4) return;
    setLookingUp(true);
    const { data } = await supabase
      .from("tenants")
      .select("name, logo")
      .eq("church_code", code.trim().toUpperCase())
      .single();
    setLookingUp(false);
    if (data) setChurch(data);
    else setChurch(null);
  };

  const handleCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setChurchCode(upper);
    if (upper.length >= 9) lookupChurch(upper);
    else setChurch(null);
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !churchCode) return;
    setLoading(true);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("member-login", {
        body: { email: email.trim().toLowerCase(), churchCode: churchCode.trim().toUpperCase() },
      });

      if (fnError || fnData?.error) {
        const err = fnData?.error || "unknown";
        if (err === "invalid_code") toast.error("Invalid church code. Please check the code with your church admin.");
        else if (err === "member_not_found") toast.error("No member found with this email for this church. Did you register yet?");
        else toast.error("Sign in failed. Please check your details.");
        setLoading(false);
        return;
      }

      // Store session in localStorage
      const session = {
        memberId: fnData.member.id,
        tenantId: fnData.tenant.id,
        memberName: `${fnData.member.first_name} ${fnData.member.last_name}`,
        memberType: fnData.member.member_type || "member",
        sessionToken: fnData.sessionToken,
        expiresAt: fnData.expiresAt,
      };
      localStorage.setItem("member_session", JSON.stringify(session));
      navigate("/member");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Member Sign In — Vestry</title></Helmet>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">

          {/* Church branding */}
          <div className="text-center">
            {lookingUp ? (
              <div className="w-16 h-16 rounded-full bg-slate-200 animate-pulse mx-auto mb-3" />
            ) : church?.logo ? (
              <img src={church.logo} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white shadow" alt={church.name} />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                <Church className="text-indigo-600" size={28} />
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {church?.name ?? "Member Portal"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to access your church services</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Church Access Code</Label>
                <Input
                  value={churchCode}
                  onChange={e => handleCodeChange(e.target.value)}
                  placeholder="e.g. HOPE-2847"
                  required
                  maxLength={9}
                  className="h-11 uppercase font-mono tracking-widest text-center text-lg"
                />
                <p className="text-xs text-slate-400">
                  Forgot your church code?{" "}
                  <span className="text-slate-500">Contact your church admin — they can find it in Settings → Quick Links & QR Codes.</span>
                </p>
              </div>

              <Button type="submit" className="w-full h-11 rounded-full" disabled={loading || !email || !churchCode}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </div>

          <div className="text-center space-y-2 text-sm text-slate-500">
            <p>Not registered yet?{" "}
              <Link to="/member/join" className="text-indigo-600 font-medium">Register via QR code</Link>
            </p>
            <p><Link to="/auth/signin" className="text-slate-400 hover:text-slate-600">Admin Sign In</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
