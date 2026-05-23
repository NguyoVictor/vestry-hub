import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Church } from "lucide-react";
import Threads from "@/components/Threads";
import logo from "@/assets/logo.png";

// Brand primary: #3D1C8E  →  normalized [0.239, 0.110, 0.557]
const THREADS_COLOR: [number, number, number] = [0.239, 0.110, 0.557];
const PRIMARY = "#3D1C8E";
const PRIMARY_HOVER = "#4e24b5";
const PANEL_BG = "#0d0e24";

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
        else if (err === "pending_approval") toast.error("Your membership is pending approval. Please wait for your church admin to approve your account.", { duration: 6000 });
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
      <Helmet><title>Member Sign In — Vestry Hub</title></Helmet>

      <div className="flex h-screen overflow-hidden">

        {/* ── LEFT PANEL (hidden on mobile) ──────────────────────── */}
        <div
          className="hidden md:flex md:w-[45%] relative overflow-hidden flex-col"
          style={{ background: PANEL_BG }}
        >
          {/* Threads WebGL layer */}
          <div className="absolute inset-0">
            <Threads
              color={THREADS_COLOR}
              amplitude={1.5}
              distance={0}
              enableMouseInteraction={true}
            />
          </div>

          {/* Logo — top left */}
          <div className="absolute top-8 left-8 z-10">
            <img src={logo} width={48} height={48} alt="Vestry Hub" className="object-contain" />
          </div>

          {/* Centered copy */}
          <div className="relative z-10 flex flex-col justify-center h-full px-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="font-bold text-white"
              style={{ fontSize: "2.5rem", lineHeight: 1.15 }}
            >
              Welcome back.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="mt-3 max-w-[280px]"
              style={{ fontSize: "1rem", color: "rgba(255,255,255,0.65)" }}
            >
              Your church is running. Let's keep it that way.
            </motion.p>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#fafafa] px-6 md:px-12 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="w-full max-w-[400px] py-12"
          >

            {/* Church branding */}
            <div className="text-center mb-8">
              {lookingUp ? (
                <div className="w-16 h-16 rounded-full bg-slate-200 animate-pulse mx-auto mb-3" />
              ) : church?.logo ? (
                <img
                  src={church.logo}
                  className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white shadow-sm"
                  alt={church.name}
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(61,28,142,0.1)" }}>
                  <Church size={28} style={{ color: PRIMARY }} />
                </div>
              )}
              <h1 className="text-xl font-semibold text-slate-900">
                {church?.name ?? "Member Portal"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">Sign in to access your church services</p>
            </div>

            {/* Form — no card border/shadow */}
            <form onSubmit={signIn} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-12 text-[0.95rem] border-[#e2e2e2] focus-visible:ring-[rgba(61,28,142,0.3)] focus-visible:border-[#3D1C8E]"
                  style={{ borderRadius: 8, padding: "12px 16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Church Access Code</Label>
                <Input
                  value={churchCode}
                  onChange={e => handleCodeChange(e.target.value)}
                  placeholder="e.g. HOPE-2847"
                  required
                  maxLength={9}
                  className="h-12 uppercase font-mono tracking-widest text-center text-lg border-[#e2e2e2] focus-visible:ring-[rgba(61,28,142,0.3)] focus-visible:border-[#3D1C8E]"
                  style={{ borderRadius: 8, padding: "12px 16px" }}
                />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Forgot your church code?{" "}
                  <span className="text-slate-500">Contact your church admin — they can find it in Settings → Quick Links & QR Codes.</span>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-white font-medium transition-all duration-200 border-0 shadow-none"
                disabled={loading || !email || !churchCode}
                style={{
                  borderRadius: 8,
                  background: loading || !email || !churchCode ? "rgba(61,28,142,0.45)" : PRIMARY,
                }}
                onMouseEnter={e => {
                  if (!loading && email && churchCode)
                    (e.currentTarget as HTMLButtonElement).style.background = PRIMARY_HOVER;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    loading || !email || !churchCode ? "rgba(61,28,142,0.45)" : PRIMARY;
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>

            {/* Footer links */}
            <div className="mt-8 text-center space-y-2.5 text-sm text-slate-400">
              <p>
                Not registered yet?{" "}
                <Link to="/member/join" className="font-medium" style={{ color: PRIMARY }}>
                  Register
                </Link>
              </p>
              <p>
                <Link to="/auth/signin" className="text-slate-400 hover:text-slate-600 transition-colors">
                  Admin Sign In
                </Link>
              </p>
            </div>

          </motion.div>
        </div>

      </div>
    </>
  );
}
