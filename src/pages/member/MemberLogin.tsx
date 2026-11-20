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
import { isValidChurchCode, isValidMemberOtp, MEMBER_OTP_MAX_LENGTH, normalizeMemberEmail, sendExistingMemberOtp, verifyMemberOtpAndLogin } from "@/lib/memberOtpLogin";
import Threads from "@/components/Threads";
import logo from "@/assets/logo.png";
import { currentTenantBaseDomain, tenantSlugMatchesHostname } from "@/lib/tenantHost";

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
  const [verificationSent, setVerificationSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Prefill the code from the URL, but perform the same debounced lookup
  // used for manually typed codes (including the existing 8-character codes).
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setChurchCode(code.trim().toUpperCase().slice(0, 32));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    if (!isValidChurchCode(churchCode)) {
      setChurch(null);
      setLookingUp(false);
      return;
    }
    setLookingUp(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("tenants")
          .select("name, logo")
          .eq("church_code", churchCode)
          .maybeSingle();
        if (!cancelled) setChurch(data ?? null);
      } catch {
        if (!cancelled) setChurch(null);
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [churchCode]);

  const handleCodeChange = (val: string) => {
    setChurchCode(val.trim().toUpperCase());
    setChurch(null);
    setVerificationSent(false);
    setOtp("");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email.trim() || !isValidChurchCode(churchCode)) return;
    setLoading(true);
    try {
      if (!verificationSent) {
        const sent = await sendExistingMemberOtp(supabase, email, churchCode);
        if (!sent) {
          toast.error("Unable to send a sign-in code. Check your details or contact your church admin.");
          return;
        }
        setVerificationSent(true);
        toast.success("If your account is eligible, check your email for your sign-in code.");
        return;
      }

      const result = await verifyMemberOtpAndLogin(supabase, email, churchCode, otp);
      if (result.kind !== "success") {
        setOtp("");
        toast.error(result.kind === "verification_failed"
          ? "The verification code could not be confirmed. Please try again."
          : "Sign in could not be completed. Check your church membership or contact your church admin.");
        return;
      }
      const fnData = result.login;
      const tenantSlug = fnData.tenant.slug.toLowerCase();
      if (!tenantSlug || !tenantSlugMatchesHostname(window.location.hostname, tenantSlug, currentTenantBaseDomain())) {
        toast.error("This church account belongs to a different VestryHub workspace.");
        return;
      }
      const session = {
        memberId: fnData.member.id,
        tenantId: fnData.tenant.id,
        tenantSlug: fnData.tenant.slug,
        memberName: `${fnData.member.first_name || ""} ${fnData.member.last_name || ""}`.trim(),
        memberType: fnData.member.member_type || "member",
        enabledModules: fnData.tenant.enabled_modules || null,
        sessionToken: fnData.sessionToken,
        expiresAt: fnData.expiresAt,
      };
      localStorage.setItem("member_session", JSON.stringify(session));
      setOtp("");
      navigate("/member");
    } catch {
      toast.error("Sign in could not be completed. Please try again.");
    } finally {
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
                  onChange={e => { setEmail(e.target.value); setVerificationSent(false); setOtp(""); }}
                  placeholder="you@example.com"
                  disabled={verificationSent}
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
                  disabled={verificationSent}
                  maxLength={32}
                  className="h-12 uppercase font-mono tracking-widest text-center text-lg border-[#e2e2e2] focus-visible:ring-[rgba(61,28,142,0.3)] focus-visible:border-[#3D1C8E]"
                  style={{ borderRadius: 8, padding: "12px 16px" }}
                />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Forgot your church code?{" "}
                  <span className="text-slate-500">Contact your church admin.</span>
                </p>
              </div>

              {verificationSent && (
                <div className="space-y-1.5">
                  <Label htmlFor="member-email-otp" className="text-sm font-medium text-slate-700">
                    Six-digit email verification code
                  </Label>
                  <Input
                    id="member-email-otp"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6,10}"
                    maxLength={MEMBER_OTP_MAX_LENGTH}
                    placeholder="Enter the code from your email"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, MEMBER_OTP_MAX_LENGTH))}
                    required
                    className="h-12 text-center tracking-widest text-lg border-[#e2e2e2]"
                    aria-label="Email verification code"
                  />
                  <button
                    type="button"
                    className="text-sm underline text-slate-500"
                    onClick={() => { setVerificationSent(false); setOtp(""); }}
                    disabled={loading}
                  >
                    Change email or church code
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-white font-medium transition-all duration-200 border-0 shadow-none"
                disabled={loading || !normalizeMemberEmail(email) || !isValidChurchCode(churchCode) || (verificationSent && !isValidMemberOtp(otp))}
                style={{
                  borderRadius: 8,
                  background: loading || !email || !isValidChurchCode(churchCode) || (verificationSent && !isValidMemberOtp(otp)) ? "rgba(61,28,142,0.45)" : PRIMARY,
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : verificationSent ? "Verify code & sign in" : "Send verification code"}
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
